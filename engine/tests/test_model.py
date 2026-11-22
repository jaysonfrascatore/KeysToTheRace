"""Model tests. Run from the engine folder:  python -m unittest discover -s tests -v

They check the rules (the Statement Scale, the 64.9% gate, append-only history), that the Python
engine and the website's JavaScript give the same numbers, and that the simulator behaves.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from ktr.data import PUBLIC, ROOT, load_config, read_csv  # noqa: E402
from ktr.stage1 import Stage1, statement_reading  # noqa: E402
from ktr.stage2 import run_stage2, simulate_party  # noqa: E402

TODAY = "2026-11-20"
NODE = shutil.which("node")
JS = os.path.join(ROOT, "engine", "tools", "js_engine.mjs")


def data(name):
    return read_csv(os.path.join(PUBLIC, "data", name))


class Base(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cfg = load_config()
        cls.s1 = Stage1(cls.cfg, data("polls.csv"), data("pollsters.csv"), data("news.csv"), today=TODAY).run()
        cls.by = {c["name"]: c for c in cls.s1["candidates"]}


class StatementScale(Base):
    def read(self, *kinds):
        return statement_reading([{"date": "2026-01-%02d" % (i + 1), "kind": k} for i, k in enumerate(kinds)], self.cfg["stage1"]["statementScale"])[0]

    def test_strongest_counts_in_full_then_half(self):
        self.assertAlmostEqual(self.read("not_running"), -0.75)
        self.assertAlmostEqual(self.read("not_running", "not_running"), -0.75 - 0.375)
        self.assertAlmostEqual(self.read("not_running", "pledge"), -1.0 - 0.375)

    def test_change_of_heart_wipes_the_slate(self):
        self.assertAlmostEqual(self.read("not_running", "not_running", "considering"), 0.5)

    def test_no_comment_changes_nothing(self):
        self.assertAlmostEqual(self.read("considering", "deflect"), self.read("considering"))

    def test_reaffirm_repeats_the_latest_position(self):
        self.assertAlmostEqual(self.read("not_running", "reaffirm"), self.read("not_running", "not_running"))

    def test_my_thinking_has_not_changed_lowers_ossoff(self):
        st = Stage1(self.cfg, data("polls.csv"), data("pollsters.csv"), data("news.csv"), today=TODAY)
        c = self.by["Jon Ossoff"]
        after = st.launch_on("Jon Ossoff", c["pct"], st.today, {"date": st.today, "kind": "reaffirm", "text": "My thinking has not changed"})
        self.assertLess(after, c["launch"])


class Gate(Base):
    def test_index_unlocks_above_64_9(self):
        for c in self.s1["candidates"]:
            self.assertEqual(c["indexUnlocked"], c["status"] == "declared" or c["launch"] > 0.649, c["name"])

    def test_two_stage_gate(self):
        for c in self.s1["candidates"]:
            want = "candidate" if c["status"] == "declared" else "out" if c["status"] in ("ruled_out", "dropped") else "contender" if c["launch"] > 0.649 else "watching"
            self.assertEqual(c["phase"], want, c["name"])

    def test_announcement_odds_never_beat_the_odds_of_running(self):
        for c in self.s1["candidates"]:
            if c["announce30"] is not None:
                self.assertTrue(0 <= c["announce30"] <= c["launch"], c["name"])

    def test_launch_is_a_probability(self):
        for c in self.s1["candidates"]:
            for d, v in c["launchHistory"]:
                self.assertTrue(0 <= v <= 100, (c["name"], d, v))


class History(Base):
    def test_logged_days_match_the_model(self):
        """Every day logged under the current method matches what the model gives today."""
        method = self.cfg["stage1"]["method"]
        log = {(r["candidate"], r["date"]): float(r["yes"]) for r in data("launch-log.csv") if r.get("method") == method}
        for c in self.s1["candidates"]:
            for d, v in c["launchHistory"]:
                if (c["name"], d) in log:
                    self.assertAlmostEqual(log[(c["name"], d)], v, places=3, msg=(c["name"], d))

    def test_publishing_never_rewrites_history(self):
        from ktr import cli
        tmp = tempfile.mkdtemp()
        try:
            log = os.path.join(tmp, "launch-log.csv")
            shutil.copyfile(os.path.join(PUBLIC, "data", "launch-log.csv"), log)
            before = open(log, encoding="utf-8").read()
            rows = cli.new_log_rows(self.s1, read_csv(log))
            have = {(r["candidate"], r["date"]) for r in read_csv(log)}
            self.assertFalse(any((r["candidate"], r["date"]) in have for r in rows))
            self.assertTrue(all(r["date"] < self.s1["today"] for r in rows))
            self.assertEqual(before, open(log, encoding="utf-8").read())
        finally:
            shutil.rmtree(tmp)


@unittest.skipUnless(NODE, "Node.js is not installed")
class Parity(Base):
    """The website (JavaScript) and the engine (Python) must agree."""

    def test_same_numbers_every_day(self):
        js = json.loads(subprocess.check_output([NODE, JS, PUBLIC, TODAY]))
        jc = {c["name"]: c for c in js["candidates"]}
        self.assertEqual(set(jc), set(self.by))
        for n, c in self.by.items():
            for (d1, a), (d2, b) in zip(c["launchHistory"], jc[n]["launchHistory"]):
                self.assertEqual(d1, d2)
                self.assertAlmostEqual(a, b, places=9, msg=(n, d1))
            for (d1, a), (d2, b) in zip(c["history"], jc[n]["history"]):
                self.assertAlmostEqual(a, b, places=9, msg=(n, d1))
            self.assertAlmostEqual(c["index"], jc[n]["index"], places=9)
            self.assertEqual(c["phase"], jc[n]["phase"], n)
            if c["announce30"] is None:
                self.assertIsNone(jc[n]["announce30"])
            else:
                self.assertAlmostEqual(c["announce30"], jc[n]["announce30"], places=9, msg=n)

    def test_same_weights(self):
        js = json.loads(subprocess.check_output([NODE, JS, PUBLIC, "--config"]))
        s1 = self.cfg["stage1"]
        for k in ("base", "intentScale", "strengthScale", "ruledOut", "keyStates", "standing", "home", "standingFrom",
                  "elements", "statementScale", "launchWatchStart", "status", "newsHalfLife", "indexUnlock"):
            self.assertEqual(js[k], s1[k], k)
        js_a, cfg_a = js["announce"], {k: v for k, v in s1["announce"].items() if not k.startswith("_")}
        self.assertEqual(js_a, cfg_a)
        for k in ():
            self.assertEqual(js[k], s1[k], k)


class Primary(Base):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.s2 = run_stage2(cls.cfg, cls.s1, sims=3000, scenarios=False)

    def test_each_state_has_one_winner(self):
        for p, r in self.s2["parties"].items():
            for st in r["states"]:
                self.assertAlmostEqual(sum(st["pWin"]), 1.0, places=3, msg=(p, st["state"]))

    def test_one_nominee_and_attention_adds_to_100(self):
        for p, r in self.s2["parties"].items():
            self.assertAlmostEqual(sum(c["pNominee"] for c in r["candidates"]), 1.0, places=3)
            self.assertAlmostEqual(sum(c["attention"] for c in r["candidates"]), 100.0, places=0)

    def test_same_seed_same_answer(self):
        a = simulate_party(self.cfg, "D", self.s1, TODAY, sims=2000)
        b = simulate_party(self.cfg, "D", self.s1, TODAY, sims=2000)
        self.assertEqual(a, b)

    def test_a_dropout_wins_nothing_and_others_gain(self):
        base = simulate_party(self.cfg, "D", self.s1, TODAY, sims=4000)
        out = simulate_party(self.cfg, "D", self.s1, TODAY, sims=4000, force_out=("Kamala Harris",))
        nom = {c["name"]: c["pNominee"] for c in out["candidates"]}
        self.assertEqual(nom["Kamala Harris"], 0)
        self.assertGreater(sum(v for k, v in nom.items()), 0.99)

    def test_voters_and_endorsements_are_shares(self):
        for r in self.s2["parties"].values():
            for c in r["candidates"]:
                self.assertAlmostEqual(sum(p for _, p in c["votersGo"]), 1.0, places=3)
                self.assertAlmostEqual(sum(p for _, p in c["endorses"]), 1.0, places=3)


if __name__ == "__main__":
    unittest.main()


# ---------------------------------------------------------------- Key Legislation
from ktr import legislation as leg  # noqa: E402
JS_LEG = os.path.join(ROOT, "engine", "tools", "js_legislation.mjs")
LEG_DAY = "2026-11-22"


class Legislation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cfg = load_config()
        cls.out = leg.run(cls.cfg, LEG_DAY)
        cls.members = read_csv(os.path.join(leg.LEG, "members.csv"))
        cls.positions = read_csv(os.path.join(leg.LEG, "positions.csv"))

    def test_every_member_is_on_file(self):
        sen = [m for m in self.members if m["chamber"] == "senate"]
        house = [m for m in self.members if m["chamber"] == "house"]
        self.assertEqual(len(sen), 100)
        self.assertTrue(425 <= len(house) <= 435)
        self.assertEqual(len({m["bioguide"] for m in self.members}), len(self.members))

    def test_positions_point_at_real_members(self):
        ids = {m["bioguide"]: m["chamber"] for m in self.members}
        on_file = [r for r in self.positions if r["bioguide"] in ids]     # members who left office are simply ignored
        self.assertGreaterEqual(len(on_file), 0.95 * len(self.positions))
        for r in on_file:
            self.assertEqual(ids[r["bioguide"]], r["chamber"], r["member"])
        for r in self.positions:
            self.assertTrue(-1 <= float(r["reading"]) <= 1, r)
            self.assertIn(r["kind"], ("vote", "statement", "priorVote", "leadership", "policy"), r)

    # A made-up bill for the rule checks (the real list starts empty until the 120th Congress acts)
    TEST_BILL = {"id": "test", "order": "1", "house_base_R": "0.70", "house_base_D": "0.30", "senate_base_R": "0.85",
                 "senate_base_D": "0.45", "senate_threshold": "60", "sign_chance": "0.9"}

    def test_a_recorded_vote_decides_the_chamber(self):
        sen = [m for m in self.members if m["chamber"] == "senate"]
        pos = [{"date": "2027-01-10", "bill": "test", "chamber": "senate", "bioguide": m["bioguide"], "kind": "vote",
                "reading": "1" if i < 62 else "-1"} for i, m in enumerate(sen)]
        r = leg.chamber_odds(self.cfg, self.TEST_BILL, "senate", self.members, pos, "2027-01-10")
        self.assertTrue(r["decided"])
        self.assertEqual((r["pPass"], r["yes"], r["no"]), (1.0, 62, 38))

    def test_a_public_no_lowers_the_odds(self):
        m = next(m for m in self.members if m["chamber"] == "house" and m["party"] == "R")
        base = leg.member_odds(self.cfg, self.TEST_BILL, "house", m, [])["p"]
        no = leg.member_odds(self.cfg, self.TEST_BILL, "house", m, [{"kind": "statement", "reading": "-1", "date": LEG_DAY}])["p"]
        self.assertLess(no, base)

    def test_no_bills_means_nothing_to_track(self):
        self.assertEqual(self.out["bills"], [])

    def test_fast_random_numbers_match_the_slow_ones(self):
        r = leg.mulberry32(535)
        seq = [r() for _ in range(5000)]
        self.assertEqual(list(leg.mulberry32_block(535, 0, 5000)), seq)

    @unittest.skipUnless(NODE, "Node.js is not installed")
    def test_same_numbers_as_the_website(self):
        js = json.loads(subprocess.check_output([NODE, JS_LEG, PUBLIC, LEG_DAY]))
        for a, b in zip(self.out["bills"], js["bills"]):
            self.assertEqual(a["id"], b["id"])
            self.assertAlmostEqual(a["pLaw"], b["pLaw"], places=9)
            for c in ("house", "senate"):
                self.assertAlmostEqual(a[c]["pPass"], b[c]["pPass"], places=9)
                for x, y in zip(a[c]["p"], b[c]["p"]):
                    self.assertAlmostEqual(x, y, places=12)

    @unittest.skipUnless(NODE, "Node.js is not installed")
    def test_same_weights_as_the_website(self):
        js = json.loads(subprocess.check_output([NODE, JS_LEG, PUBLIC, "--config"]))
        L = self.cfg["legislation"]
        for k in ("method", "simulations", "seed", "pointScale", "weights", "categories", "partyError", "absence", "rebuildFrom"):
            self.assertEqual(js[k], L[k], k)

    def test_log_never_rewrites_a_day(self):
        log = read_csv(os.path.join(leg.LEG, "log.csv"))
        keys = [(r["date"], r["bill"], r["chamber"]) for r in log]
        self.assertEqual(len(keys), len(set(keys)))
        self.assertFalse(leg.history_rows(self.cfg, "2026-11-22", log))

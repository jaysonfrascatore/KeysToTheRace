"""Stage 1: will they run?

    news or a quote  ->  Decision Maze  ->  chance they declare  ->  Monte Carlo (11,111 seeded runs)

A port of the Presidential Probability code in public/assets/market.js. The test suite runs the
site's JavaScript in Node and checks that this file gives the same numbers, day by day.
"""
import math

import calendar

from .data import add_days, date_range, days_between, utc_today
from .polls import average_as_of, build_polls, is_named, latest_for


def logit(p):
    return math.log(p / (1 - p))


def seed_of(s):
    """FNV-1a hash of the name, the same seed the site uses."""
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def mulberry32(a):
    """The site's seeded random numbers (mulberry32), bit for bit."""
    M = 0xFFFFFFFF

    def imul(x, y):
        return (x * y) & M

    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & M
        t = a
        t = imul(t ^ (t >> 15), t | 1)
        t = (t ^ ((t + imul(t ^ (t >> 7), t | 61)) & M)) & M
        return ((t ^ (t >> 14)) & M) / 4294967296
    return nxt


def simulate_declare(name, p, runs=11111):
    """Each run draws a number; they declare when it lands under p."""
    r = mulberry32(seed_of(name))
    yes = sum(1 for _ in range(runs) if r() < p)
    return {"yes": yes, "no": runs - yes, "runs": runs, "odds": yes / runs}


def logistic(x):
    return 1 / (1 + math.exp(-x))


def sign(x):
    return (x > 0) - (x < 0)


def statement_reading(said, scale):
    """Turn a list of dated statements into one reading.

    * Same direction: the strongest counts in full, the next half, then a quarter...
    * The other direction wipes the slate (earlier statements stop counting).
    * 0 (no comment) is logged but moves nothing.
    * "reaffirm" repeats the latest position.
    """
    counted, direction, last_r = [], 0, 0
    for s in said:
        r = last_r if s["kind"] == "reaffirm" else scale[s["kind"]]
        item = dict(s, r=r, share=0.0, wiped=False)
        counted.append(item)
        if not r:
            continue
        last_r = r
        d = sign(r)
        if d != direction:
            for c in counted:
                if c is not item:
                    c["share"] = 0.0
                    c["wiped"] = c["wiped"] or sign(c["r"]) == -d
            direction = d
    live = [c for c in counted if c["r"] and sign(c["r"]) == direction and not c["wiped"]]
    for k, c in enumerate(sorted(live, key=lambda c: -abs(c["r"]))):
        c["share"] = 0.5 ** k
    return sum(c["r"] * c["share"] for c in live), counted


class Stage1:
    """Builds every candidate's Launch Watch and Index from the data files, as of `today`."""

    def __init__(self, cfg, polls_rows, grades_rows, news_rows, today=None):
        self.cfg, s1 = cfg, cfg["stage1"]
        self.s1 = s1
        self.grades = {g["pollster"]: g["grade"] for g in grades_rows}
        self.polls = build_polls(polls_rows, cfg)
        news = [dict(n, impact=float(n.get("impact") or 0)) for n in news_rows if n.get("date") and n.get("headline")]
        news.sort(key=lambda n: n["date"])
        self.news = news
        races = cfg["polls"]["races"]
        firsts = []
        for race in races:
            if latest_for(self.polls, race):
                ends = sorted(p["end"] for p in self.polls if race in p["races"] and p["end"] >= cfg["polls"]["trackingStarts"])
                if ends:
                    firsts.append(ends[0])
        self.start = min(firsts) if firsts else None
        last_data = max([p["end"] for p in self.polls] + [n["date"] for n in news])
        self.today = max(today or utc_today(), last_data)
        self.days = date_range(self.start, self.today) if self.start else []
        self.lw_days = date_range(s1["launchWatchStart"], self.today)
        self.scale = s1["statementScale"]

    # ---------- pieces ----------
    def status_on(self, name, d):
        s = "undeclared"
        for n in self.news:
            if n["candidate"] == name and n.get("status") in self.s1["status"] and n["date"] <= d:
                s = n["status"]
        return s

    def maze_on(self, name, pct_now, d, extra=None):
        s1, el = self.s1, self.s1["elements"]
        rows = []

        def add(i, reading, note="", day=None):
            rows.append({"id": i, "reading": reading, "pts": el[i]["w"] * reading, "kind": el[i]["kind"], "note": note, "date": day})

        if self.days and d >= self.days[0]:
            add("polling", max(-1, min(1, (pct_now - 10) / 10)), "%.1f%% primary average" % pct_now)
        for i, r in s1["standing"].get(name, {}).items():
            frm = s1["standingFrom"].get(i)
            if not frm or d >= frm:
                add(i, r)
        said = [{"date": n["date"], "kind": n["signal"], "text": n["headline"], "source": n.get("source", ""), "url": n.get("source_url", "")}
                for n in self.news if n["candidate"] == name and n["date"] <= d and n.get("signal") in self.scale]
        if extra:
            said.append(extra)
        reading, words = statement_reading(said, self.scale)
        if said:
            rows.append({"id": "statement", "reading": reading, "pts": el["statement"]["w"] * reading, "kind": "intent",
                         "note": "%d statement%s on the record" % (len(said), "" if len(said) == 1 else "s"), "words": words})
        seen = set()
        for n in self.news:
            if n["candidate"] != name or not n.get("signal") or n["date"] > d:
                continue
            m = s1["signals"].get(n["signal"])
            if not m:
                continue
            if m[0] == "travel":
                st = (n.get("state") or "").upper()
                if st not in s1["keyStates"] or st == s1["home"].get(name) or st in seen:
                    continue
                seen.add(st)
            add(m[0], m[1], n["headline"], n["date"])
        intent = sum(r["pts"] for r in rows if r["kind"] == "intent")
        strength = sum(r["pts"] for r in rows if r["kind"] == "strength")
        x = logit(s1["base"]) + s1["intentScale"] * intent + s1["strengthScale"] * strength
        return {"rows": rows, "intent": intent, "strength": strength, "x": x}

    def launch_on(self, name, pct_now, d, extra=None):
        st = self.status_on(name, d)
        if st == "declared":
            return 1.0
        if st == "dropped":
            return 0.0
        if st == "ruled_out":
            return self.s1["ruledOut"]
        return logistic(self.maze_on(name, pct_now, d, extra)["x"])

    def announce_share(self, today, recent_pts):
        """Share of the remaining announcement calendar that lands in the next 30 days, sped up by recent intent."""
        A = self.s1["announce"]
        rem = win = 0.0
        for ym, w in A["calendar"].items():
            y, m = map(int, ym.split("-"))
            dim = calendar.monthrange(y, m)[1]
            for d in range(1, dim + 1):
                iso = "%s-%02d" % (ym, d)
                if iso < today:
                    continue
                rem += w / dim
                if days_between(today, iso) < A["window"]:
                    win += w / dim
        base = win / rem if rem > 0 else 1.0
        return 1 - (1 - base) ** math.exp(A["boost"] * recent_pts)

    def recent_intent(self, name, today):
        since = add_days(today, -self.s1["announce"]["window"])
        el, tot = self.s1["elements"], 0.0
        for n in self.news:
            if n["candidate"] != name or not (since < n["date"] <= today) or not n.get("signal"):
                continue
            if n["signal"] in self.scale:
                r = self.scale[n["signal"]]
                if r is None:
                    continue
                tot += el["statement"]["w"] * r
            elif n["signal"] in self.s1["signals"]:
                i, r = self.s1["signals"][n["signal"]]
                if el[i]["kind"] == "intent":
                    tot += el[i]["w"] * r
        return tot

    def boost_on(self, name, d):
        hl = self.s1["newsHalfLife"]
        return sum(n["impact"] * 0.5 ** (days_between(n["date"], d) / hl)
                   for n in self.news if n["candidate"] == name and n["impact"] and n["date"] <= d)

    # ---------- the whole run ----------
    def run(self):
        out = {"today": self.today, "days": self.days, "lwDays": self.lw_days, "candidates": []}
        unlock = self.s1["contenderAt"]
        for race, party in self.cfg["polls"]["races"].items():
            as_of = latest_for(self.polls, race)
            if not as_of:
                continue
            named = [c for c in average_as_of(self.polls, race, as_of, self.grades, self.cfg)["list"] if is_named(c["name"])]
            names = [c["name"] for c in named]
            pct_of = {c["name"]: c["pct"] for c in named}
            for c in named:
                n = c["name"]
                launch_hist = [[d, self.launch_on(n, c["pct"], d) * 100] for d in self.lw_days]
                maze = self.maze_on(n, c["pct"], self.today)
                status = self.status_on(n, self.today)
                launch = self.launch_on(n, c["pct"], self.today)
                announce30 = None if status == "declared" else launch * self.announce_share(self.today, self.recent_intent(n, self.today))
                phase = "candidate" if status == "declared" else "out" if status in ("ruled_out", "dropped") else "contender" if launch > unlock else "watching"
                out["candidates"].append({
                    "name": n, "party": party, "pct": c["pct"], "status": status, "launch": launch,
                    "sim": simulate_declare(n, launch, self.s1["simulations"]), "phase": phase, "announce30": announce30,
                    "launchHistory": launch_hist,
                    "maze": [[r["id"], r["reading"], r["pts"]] for r in maze["rows"]],
                    "statements": [{k: w[k] for k in ("date", "kind", "r", "share", "wiped", "text", "source", "url")}
                                   for w in next((r["words"] for r in maze["rows"] if r["id"] == "statement"), [])],
                    "boost30": self.boost_on(n, self.today),
                })
        return out

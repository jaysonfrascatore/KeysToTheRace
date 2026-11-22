"""Key Legislation: a whip count for every big bill, like The 29th Vote, for all 535 members.

    signals (votes, statements, past votes)  ->  each member's chance of voting yes
    ->  11,111 simulated roll calls  ->  the chance the bill passes each chamber, then becomes law

A line-for-line twin of public/assets/legislation.js. The random numbers come from the same
generator in the same order, so both give the same answers (the tests check).
"""
import csv
import math
import os

import numpy as np

from .data import PUBLIC, date_range, read_csv

LEG = os.path.join(PUBLIC, "data", "legislation")
CHAMBERS = ("house", "senate")


def mulberry32(seed):
    a = seed & 0xFFFFFFFF

    def imul(x, y):
        return ((x & 0xFFFFFFFF) * (y & 0xFFFFFFFF)) & 0xFFFFFFFF

    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = imul(a ^ (a >> 15), 1 | a)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & 0xFFFFFFFF) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return rnd


def mulberry32_block(seed, start, count):
    """The same numbers mulberry32(seed) gives for calls start .. start+count-1, all at once.
    Its state only ever adds 0x6D2B79F5, so step k's state is seed + (k+1) * 0x6D2B79F5."""
    M = np.uint64(0xFFFFFFFF)
    k = np.arange(start + 1, start + count + 1, dtype=np.uint64)
    a = (np.uint64(seed & 0xFFFFFFFF) + k * np.uint64(0x6D2B79F5)) & M

    def imul(x, y):
        return (x * y) & M      # both under 2**32, so the product fits in 64 bits

    t = imul(a ^ (a >> np.uint64(15)), np.uint64(1) | a)
    t = ((t + imul(t ^ (t >> np.uint64(7)), np.uint64(61) | t)) & M) ^ t
    return ((t ^ (t >> np.uint64(14))) & M).astype(np.float64) / 4294967296


def logistic(x):
    return 1 / (1 + math.exp(-x))


def logit(p):
    return math.log(p / (1 - p))


def caucus(m):
    """Independents count with the party they caucus with (King and Sanders with Democrats;
    Kiley, elected as a Republican, with Republicans)."""
    if m["party"] in ("D", "R"):
        return m["party"]
    return "D" if m["chamber"] == "senate" else "R"


def category(p, cats):
    return "yes" if p >= cats["yes"] else "leanYes" if p >= cats["leanYes"] else "undecided" if p > cats["leanNo"] else "leanNo" if p > cats["no"] else "no"


def member_odds(cfg, bill, chamber, m, rows):
    """One member's chance of voting yes, and why."""
    L = cfg["legislation"]
    votes = [r for r in rows if r["kind"] == "vote"]
    if votes:
        v = float(votes[-1]["reading"])
        return {"p": 1.0 if v > 0 else 0.0, "locked": "yes" if v > 0 else "no" if v < 0 else "absent", "pts": 0.0, "why": votes[-1]}
    base = float(bill["%s_base_%s" % (chamber, caucus(m))])
    pts, why = 0.0, None
    st = [r for r in rows if r["kind"] == "statement"]
    if st:
        pts += L["weights"]["statement"] * float(st[-1]["reading"])
        why = st[-1]
    for k in ("priorVote", "leadership", "policy"):
        rs = [r for r in rows if r["kind"] == k]
        if rs:
            pts += L["weights"][k] * sum(float(r["reading"]) for r in rs) / len(rs)
            why = why or rs[-1]
    return {"p": logistic(logit(base) + L["pointScale"] * pts), "locked": None, "pts": pts, "why": why}


def chamber_odds(cfg, bill, chamber, members, positions, day):
    """Everyone's odds and 11,111 simulated roll calls for one bill in one chamber, as of `day`."""
    L = cfg["legislation"]
    ms = [m for m in members if m["chamber"] == chamber]
    by = {}
    for r in positions:
        if r["bill"] == bill["id"] and r["chamber"] == chamber and r["date"] <= day:
            by.setdefault(r["bioguide"], []).append(r)
    odds = [member_odds(cfg, bill, chamber, m, by.get(m["bioguide"], [])) for m in ms]
    locked = [o for o in odds if o["locked"]]
    decided = len(locked) > len(ms) / 2          # a recorded passage vote: the chamber has acted
    threshold = int(bill["senate_threshold"] or 60) if chamber == "senate" else 0
    if decided:
        yes = sum(1 for o in odds if o["locked"] == "yes")
        no = sum(1 for o in odds if o["locked"] == "no")
        passed = yes > no
        return {"odds": odds, "decided": True, "pPass": 1.0 if passed else 0.0, "yes": yes, "no": no, "expectedYes": yes, "hist": {}, "threshold": threshold}
    seed = L["seed"] + (0 if chamber == "house" else 1) + 7 * int(bill["order"])
    free = [i for i, o in enumerate(odds) if o["locked"] is None]
    x = np.array([logit(odds[i]["p"]) for i in free])
    cs = np.array([caucus(ms[i]) == "R" for i in free])
    fixed_yes = sum(1 for o in odds if o["locked"] == "yes")
    fixed_no = sum(1 for o in odds if o["locked"] == "no")
    absent, sd, n = L["absence"][chamber], L["partyError"], L["simulations"]
    U = len(free)
    # Each simulation uses 4 numbers for the two party swings, then 2 per member (absent? yes?)
    r = mulberry32_block(seed, 0, n * (4 + 2 * U)).reshape(n, 4 + 2 * U)
    u1 = np.where(r[:, [0, 2]] == 0, 1e-12, r[:, [0, 2]])
    shocks = sd * np.sqrt(-2 * np.log(u1)) * np.cos(2 * math.pi * r[:, [1, 3]])     # column 0 = D, 1 = R
    shock = np.where(cs[None, :], shocks[:, 1:2], shocks[:, 0:1])
    here = r[:, 4::2] >= absent
    yes_v = r[:, 5::2] < 1 / (1 + np.exp(-(x[None, :] + shock)))
    yes = fixed_yes + (here & yes_v).sum(1)
    no = fixed_no + (here & ~yes_v).sum(1)
    vp_yes = float(bill["senate_base_R"]) >= 0.5      # the Vice President (a Republican) breaks Senate ties
    if chamber == "house":
        ok = yes > no
    elif threshold >= 60:
        ok = yes >= threshold
    else:
        ok = (yes > no) | ((yes == no) & vp_yes)
    vals, cnt = np.unique(yes, return_counts=True)
    hist = {int(v): int(c) for v, c in zip(vals, cnt)}
    wins, tot = int(ok.sum()), int(yes.sum())
    return {"odds": odds, "decided": False, "pPass": wins / n, "expectedYes": tot / n, "hist": hist, "threshold": threshold}


def run(cfg, today, members=None, bills=None, positions=None, days=None):
    members = members if members is not None else read_csv(os.path.join(LEG, "members.csv"))
    bills = bills if bills is not None else sorted(read_csv(os.path.join(LEG, "bills.csv")), key=lambda b: int(b["order"]))
    positions = positions if positions is not None else read_csv(os.path.join(LEG, "positions.csv"))
    out = {"today": today, "bills": []}
    for b in bills:
        ch = {c: chamber_odds(cfg, b, c, members, positions, today) for c in CHAMBERS}
        law = ch["house"]["pPass"] * ch["senate"]["pPass"] * float(b["sign_chance"])
        out["bills"].append({"id": b["id"], "pLaw": law, **{c: {"pPass": ch[c]["pPass"], "expectedYes": ch[c]["expectedYes"], "decided": ch[c]["decided"],
                             "p": [o["p"] for o in ch[c]["odds"]]} for c in CHAMBERS}})
    return out


def history_rows(cfg, today, log_rows, members=None, bills=None, positions=None):
    """Daily rows for finished days that aren't logged yet (rebuilt back to `rebuildFrom` the first time)."""
    L = cfg["legislation"]
    members = members if members is not None else read_csv(os.path.join(LEG, "members.csv"))
    bills = bills if bills is not None else read_csv(os.path.join(LEG, "bills.csv"))
    positions = positions if positions is not None else read_csv(os.path.join(LEG, "positions.csv"))
    have = {(r["date"], r["bill"], r["chamber"]) for r in log_rows}
    rows = []
    for d in date_range(L["rebuildFrom"], today):
        if d >= today:
            break
        for b in bills:
            for c in CHAMBERS:
                if (d, b["id"], c) in have:
                    continue
                r = chamber_odds(cfg, b, c, members, positions, d)
                rows.append({"date": d, "bill": b["id"], "chamber": c, "pPass": round(r["pPass"], 6), "expectedYes": round(r["expectedYes"], 3), "method": L["method"]})
    return rows


def append_log(rows, path=os.path.join(LEG, "log.csv")):
    new = not os.path.exists(path)
    with open(path, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["date", "bill", "chamber", "pPass", "expectedYes", "method"], lineterminator="\n")
        if new:
            w.writeheader()
        w.writerows(rows)

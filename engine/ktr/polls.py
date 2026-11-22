"""Grade-weighted primary polling averages. A line-for-line port of assets/polls-core.js."""
import re

from .data import add_days


def build_polls(rows, cfg):
    start = cfg["polls"]["trackingStarts"]
    polls = {}
    for r in rows:
        if r["start_date"] < start:
            continue
        p = polls.get(r["poll_id"])
        if p is None:
            p = polls[r["poll_id"]] = {"id": r["poll_id"], "pollster": r["pollster"], "start": r["start_date"],
                                       "end": r["end_date"], "races": {}}
        key = "general:" + r["matchup"] if r["race"] == "general" else r["race"]
        p["races"].setdefault(key, []).append({"name": r["candidate"], "party": r["party"], "pct": float(r["pct"] or 0)})
    out = list(polls.values())
    out.sort(key=lambda p: p["end"], reverse=True)   # stable, like Array.sort
    return out


def grade_weight(pollster, grades, cfg):
    letter = (grades.get(pollster, "")[:1] or "").upper()
    return cfg["polls"]["gradeWeights"].get(letter, cfg["polls"]["noGradeWeight"])


def average_as_of(polls, race, as_of, grades, cfg):
    """Latest poll per pollster inside the window, weighted by grade."""
    cutoff = add_days(as_of, -cfg["polls"]["windowDays"])
    latest = {}
    for p in polls:
        if race not in p["races"] or p["end"] > as_of or p["end"] < cutoff:
            continue
        cur = latest.get(p["pollster"])
        if cur is None or p["end"] > cur["end"]:
            latest[p["pollster"]] = p
    used = list(latest.values())
    sums, wts = {}, {}
    for p in used:
        w = grade_weight(p["pollster"], grades, cfg)
        for c in p["races"][race]:
            sums[c["name"]] = sums.get(c["name"], 0) + w * c["pct"]
            wts[c["name"]] = wts.get(c["name"], 0) + w
    return {"used": used, "list": [{"name": n, "pct": s / wts[n]} for n, s in sums.items()]}


def latest_for(polls, race):
    ends = [p["end"] for p in polls if race in p["races"]]
    return max(ends) if ends else None


_NOT_NAMED = re.compile(r"^undecided|^other|^someone", re.I)


def is_named(name):
    return not _NOT_NAMED.search(name)

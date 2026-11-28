"""Stage 2: once they're in, can they win?

    announcement  ->  chances in each early state and past Super Tuesday  ->  Attention Index

Each simulation:
  1. Draws who runs. Declared candidates always run; everyone else runs at their Launch Watch chance.
     Anyone who doesn't run (or has dropped out) hands their poll support to the candidates closest
     to them on the lane map.
  2. Adds polling error. The farther away the first contest, the bigger the error.
  3. Plays the early states in date order. Each state has its own electorate (home state, region,
     and how the state's primary voters line up with each candidate's coalition).
     Winners get a bounce; candidates who keep finishing low drop out, and their voters move.
  4. Plays Super Tuesday (all states on one day), then the dropouts that follow it.
  5. Plays the rest of the calendar as one national contest. Most delegates = the nominee.
"""
import math

import numpy as np

from .data import days_between


def _lanes(cfg_party, names):
    dims = cfg_party["dims"]
    return np.array([cfg_party["lanes"].get(n, [0.0] * len(dims)) for n in names], dtype=float), dims


def _readings(s2, c, lanes_row, center, standing, overrides):
    """Each Stage 2 factor, read from -1 to +1 for one candidate."""
    st = standing.get(c["name"], {})
    dist = float(np.linalg.norm(lanes_row - center) / math.sqrt(len(center)))
    r = {
        "fundraising": 0.0,
        "sentiment": max(-1.0, min(1.0, c.get("boost30", 0) * 5)),
        "policy": max(-1.0, min(1.0, 1 - 2.5 * dist)),
        "rank": max(st.get("govCurrent", 0), st.get("govFormer", 0)),
        "favorability": 0.0,
        "nameRecognition": 1.0 if st.get("national") else 0.25 if st.get("congress") else 0.0,
    }
    r.update(overrides.get(c["name"], {}))
    return r


def _similarity(lanes, sigma):
    d2 = ((lanes[:, None, :] - lanes[None, :, :]) ** 2).sum(-1)
    return np.exp(-d2 / (2 * sigma ** 2))


def simulate_party(cfg, party, stage1, today, sims=None, seed=None, force_out=()):
    s1, s2 = cfg["stage1"], cfg["stage2"]
    cp = s2["parties"][party]
    cands = [c for c in stage1["candidates"] if c["party"] == party]
    names = [c["name"] for c in cands]
    C = len(names)
    N = sims or s2["simulations"]
    rng = np.random.default_rng((seed if seed is not None else s2["seed"]) + (0 if party == "D" else 1))

    lanes, dims = _lanes(cp, names)
    pct = np.array([max(c["pct"], 0.5) for c in cands])
    center = (lanes * pct[:, None]).sum(0) / pct.sum()
    overrides = s2.get("readings", {})
    readings = [_readings(s2, c, lanes[i], center, s1["standing"], overrides) for i, c in enumerate(cands)]
    points = np.array([sum(s2["factors"][k]["w"] * r[k] for k in s2["factors"]) for r in readings])
    log_s = np.log(pct) + s2["strengthScale"] * points

    # Chance each one is in the race
    p_run = np.array([0.0 if (c["status"] == "dropped" or c["name"] in force_out) else 1.0 if c["status"] == "declared" else c["launch"] for c in cands])

    # Where voters go when someone leaves (row i -> column j)
    base_s = np.exp(log_s)
    W = _similarity(lanes, s2["transfers"]["sigma"]) * (base_s[None, :] ** s2["transfers"]["strengthPower"])
    np.fill_diagonal(W, 0)
    E = _similarity(lanes, s2["endorsements"]["sigma"]) * (base_s[None, :] ** s2["endorsements"]["strengthPower"])
    np.fill_diagonal(E, 0)

    # Contests in order: early states, then Super Tuesday
    early = cp["calendar"]
    st_states = list(cp["superTuesday"]["states"].items())
    contests = [e["state"] for e in early] + [s for s, _ in st_states]
    dels = np.array([e["delegates"] for e in early] + [d for _, d in st_states], dtype=float)
    regions = {st: r for r, sts in s2["regions"].items() for st in sts}
    home = s1["home"]
    A = np.zeros((C, len(contests)))
    for i, n in enumerate(names):
        for k, st in enumerate(contests):
            if home.get(n) == st:
                A[i, k] += s2["homeStateBoost"]
            elif regions.get(home.get(n)) and regions.get(home.get(n)) == regions.get(st):
                A[i, k] += s2["homeRegionBoost"]
            fit = cp["stateFit"].get(st, {})
            A[i, k] += s2["fitScale"] * sum(lanes[i, dims.index(dm)] * v for dm, v in fit.items())

    days_out = max(0, days_between(today, early[0]["date"]))
    sd_nat = s2["nationalErrorFloor"] + s2["nationalErrorPerYear"] * math.sqrt(days_out / 365)

    # ---- 1. who runs ----
    runs = rng.random((N, C)) < p_run[None, :]
    none = ~runs.any(1)
    if none.any():                                   # someone always runs: the likeliest
        runs[none, int(np.argmax(p_run))] = True
    S = np.exp(log_s[None, :] + rng.normal(0, sd_nat, (N, C)))
    active = runs.copy()
    S_all = S.copy()

    mix = s2["transfers"]["laneShare"]

    def split(i, who):
        """How candidate i's voters divide among `who` (rows of True/False): part by lane, part by size."""
        a = W[i][None, :] * who
        b = base_s[None, :] * who
        a = np.divide(a, a.sum(1, keepdims=True), out=np.zeros_like(a), where=a.sum(1, keepdims=True) > 0)
        b = np.divide(b, b.sum(1, keepdims=True), out=np.zeros_like(b), where=b.sum(1, keepdims=True) > 0)
        return mix * a + (1 - mix) * b

    def hand_off(mask, i):
        """Candidate i leaves the race in the sims in `mask`; their support moves to whoever is left."""
        if not mask.any():
            return
        idx = np.where(mask)[0]
        active[idx, i] = False
        S[idx] += S[idx, i][:, None] * split(i, active[idx])
        S[idx, i] = 0

    for i in range(C):                               # non-runners' poll support moves first
        out = ~runs[:, i]
        active[out, i] = False
        S[out, i] = 0
    for i in range(C):
        out = ~runs[:, i]
        if out.any():
            S[np.where(out)[0]] += S_all[out, i][:, None] * split(i, runs[out])

    K = len(contests)
    win = np.zeros((K, C))
    in_race = np.zeros((K, C))
    share_sum = np.zeros((K, C))
    delegates = np.zeros((N, C))
    low_count = np.zeros((N, C), dtype=int)
    early_win = np.zeros((N, C), dtype=bool)
    d = s2["dropout"]

    def play(k):
        shock = rng.normal(0, s2["stateError"], (N, C))
        v = S * np.exp(A[:, k][None, :] + shock) * active
        tot = v.sum(1, keepdims=True)
        sh = np.divide(v, tot, out=np.zeros_like(v), where=tot > 0)
        w = np.argmax(np.where(active, sh, -1), 1)
        win[k] += np.bincount(w, minlength=C)
        in_race[k] += active.sum(0)
        share_sum[k] += sh.sum(0)
        delegates[:] += dels[k] * sh
        return sh, w

    # ---- 3. early states ----
    for k in range(len(early)):
        sh, w = play(k)
        early_win[np.arange(N), w] = True
        S[np.arange(N), w] *= math.exp(s2["winnerBounce"])
        S[(sh < 0.10) & active] *= math.exp(-s2["laggardPenalty"])
        low = (sh < d["lowShare"]) & active
        low_count = np.where(low, low_count + 1, 0)
        want = active & ((low_count >= 2) | ((k >= 2) & (sh < d["veryLowShare"]))) & (rng.random((N, C)) < d["earlyChance"])
        for i in np.argsort(-want.sum(0)):
            m = want[:, i] & (active.sum(1) > 1)
            hand_off(m, i)

    # ---- 4. Super Tuesday ----
    st_idx = list(range(len(early), K))
    st_win = np.zeros((N, C), dtype=bool)
    st_share = np.zeros((N, C))
    st_tot = dels[st_idx].sum()
    for k in st_idx:
        sh, w = play(k)
        st_win[np.arange(N), w] = True
        st_share += dels[k] * sh / st_tot
    want = active & ~st_win & (st_share < d["superTuesdayShare"]) & (rng.random((N, C)) < d["superTuesdayChance"])
    for i in np.argsort(-want.sum(0)):
        hand_off(want[:, i] & (active.sum(1) > 1), i)
    past_st = active.copy()

    # ---- 5. the rest of the calendar ----
    so_far = dels.sum()
    rest = so_far * s2["restOfCalendarWeight"] / (1 - s2["restOfCalendarWeight"])
    v = S * np.exp(rng.normal(0, s2["stateError"], (N, C))) * active
    tot = v.sum(1, keepdims=True)
    delegates += rest * np.divide(v, tot, out=np.zeros_like(v), where=tot > 0)
    nominee = np.argmax(np.where(active, delegates, -1), 1)
    nom = np.bincount(nominee, minlength=C) / N

    ran = runs.sum(0)
    safe = np.maximum(ran, 1)
    p_nom_if = np.bincount(nominee, minlength=C) / safe
    p_st_if = (past_st & runs).sum(0) / safe
    p_early_if = (early_win & runs).sum(0) / safe
    a = s2["attention"]
    attn_raw = (ran / N) * (a["nominee"] * p_nom_if + a["pastSuperTuesday"] * p_st_if + a["earlyWin"] * p_early_if)
    attention = attn_raw / (attn_raw.sum() or 1) * 100

    def row(v):
        return [round(float(x), 4) for x in v]

    states = []
    for k, st in enumerate(contests):
        meta = early[k] if k < len(early) else {"state": st, "date": cp["superTuesday"]["date"], "confirmed": False,
                                                 "delegates": int(dels[k]), "note": "Super Tuesday (expected, based on 2024 state laws)"}
        states.append({**meta, "superTuesday": k >= len(early), "pWin": row(win[k] / N),
                       "pWinIfRuns": row(win[k] / safe), "pInRace": row(in_race[k] / N), "avgShare": row(share_sum[k] / np.maximum(in_race[k], 1))})

    def bars(M, i, extra_none=None):
        w = M[i].copy()
        if extra_none is None:                      # voters: the same lane/size mix the simulation uses
            others = np.ones(C); others[i] = 0
            w = split(i, others[None, :].astype(bool))[0]
        tot = w.sum() or 1
        out = sorted(((names[j], float(w[j] / tot)) for j in range(C) if j != i), key=lambda t: -t[1])
        if extra_none is not None:
            out = [(n, p * (1 - extra_none)) for n, p in out] + [("No endorsement", extra_none)]
            out.sort(key=lambda t: -t[1])
        return [[n, round(p, 4)] for n, p in out]

    return {
        "party": party, "simulations": N, "daysToFirstContest": days_out, "nationalError": round(sd_nat, 3),
        "candidates": [{
            "name": n, "pRun": round(float(p_run[i]), 4), "pRunSimulated": round(float(ran[i] / N), 4),
            "points": round(float(points[i]), 3), "readings": {k: round(v, 3) for k, v in readings[i].items()},
            "pNominee": round(float(nom[i]), 4), "pNomineeIfRuns": round(float(p_nom_if[i]), 4),
            "pPastSuperTuesdayIfRuns": round(float(p_st_if[i]), 4), "pEarlyWinIfRuns": round(float(p_early_if[i]), 4),
            "attention": round(float(attention[i]), 2),
            "votersGo": bars(W, i), "endorses": bars(E, i, s2["endorsements"]["none"]),
        } for i, n in enumerate(names)],
        "states": states,
        "expectedField": round(float(runs.sum(1).mean()), 2),
    }


def run_stage2(cfg, stage1, today=None, sims=None, scenarios=True):
    today = today or stage1["today"]
    s2 = cfg["stage2"]
    out = {"asOf": today, "version": cfg["version"], "parties": {}}
    for party in s2["parties"]:
        base = simulate_party(cfg, party, stage1, today, sims=sims)
        if scenarios:
            # "If they dropped out today": rerun without each of the top six, same seed
            top = sorted(base["candidates"], key=lambda c: -c["attention"])[:6]
            base["scenarios"] = {}
            for c in top:
                alt = simulate_party(cfg, party, stage1, today, sims=s2["scenarioSimulations"] if sims is None else max(500, sims // 3),
                                     force_out=(c["name"],))
                base["scenarios"][c["name"]] = {
                    "pNominee": {x["name"]: x["pNominee"] for x in alt["candidates"]},
                    "states": {st["state"]: st["pWin"] for st in alt["states"]},
                }
        out["parties"][party] = base
    return out

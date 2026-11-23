"""Build public/data/polls.csv from every poll file in public/data/polling/.

One file per poll. Name it by the last field date and the pollster, like 2026-11-16_Emerson.csv,
with the same columns as the template in public/data/polling/README.md. Then run:
    python tools/merge_polls.py
(The GitHub workflow runs it for you whenever a file in public/data/polling/ changes.)

Every file is checked first. A file with a problem is reported by name and nothing is written.
"""
import csv, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
FOLDER = ROOT / "public" / "data" / "polling"
OUT = ROOT / "public" / "data" / "polls.csv"
COLUMNS = ["poll_id", "pollster", "start_date", "end_date", "release_date", "race", "matchup", "population", "total_sample",
           "sample_type", "moe", "candidate", "party", "pct", "rounded", "source_url"]
REQUIRED = ["poll_id", "pollster", "start_date", "end_date", "race", "candidate", "pct"]
NOT_A_CANDIDATE = {"undecided", "unsure", "not sure", "someone else", "other", "others", "none"}
RACES = {"dem_primary", "rep_primary", "general", "senate", "house", "governor"}


def is_date(s):
    return len(s) == 10 and s[4] == "-" and s[7] == "-" and s.replace("-", "").isdigit()


def check(path, rows, seen):
    problems = []
    for i, r in enumerate(rows, start=2):
        where = f"{path.name} line {i}"
        for col in REQUIRED:
            if not r.get(col, "").strip():
                problems.append(f"{where}: {col} is empty")
        for col in ("start_date", "end_date", "release_date"):
            if r.get(col) and not is_date(r[col]):
                problems.append(f"{where}: {col} should look like 2026-11-16, not {r[col]!r}")
        if r.get("start_date") and r.get("end_date") and r["start_date"] > r["end_date"]:
            problems.append(f"{where}: start_date is after end_date")
        try:
            v = float(r.get("pct", ""))
            if not 0 <= v <= 100:
                problems.append(f"{where}: pct {v} is outside 0 to 100")
        except ValueError:
            problems.append(f"{where}: pct should be a number, not {r.get('pct')!r}")
        if r.get("race") and r["race"].split(":")[0] not in RACES:
            problems.append(f"{where}: race {r['race']!r} isn't one of {', '.join(sorted(RACES))}")
        if r.get("race") == "general" and not r.get("matchup"):
            problems.append(f"{where}: general election rows need a matchup, like vance-ocasio-cortez")
        if not r.get("party") and r.get("candidate", "").strip().lower() not in NOT_A_CANDIDATE:
            problems.append(f"{where}: party is empty (only Undecided or Someone else rows can leave it blank)")
        if r.get("party") and r["party"] not in ("D", "R", "I", "L", "G", "O"):
            problems.append(f"{where}: party should be D, R, I, L, G or O")
        key = (r.get("poll_id"), r.get("race"), r.get("matchup"), r.get("candidate"))
        if key in seen and seen[key] != path.name:
            problems.append(f"{where}: {r.get('candidate')} in {r.get('poll_id')} is already in {seen[key]}")
        elif key in seen:
            problems.append(f"{where}: {r.get('candidate')} is listed twice for the same question")
        seen[key] = path.name
    return problems


def merge(verbose=True):
    files = sorted(p for p in FOLDER.glob("*.csv"))
    rows, problems, seen = [], [], {}
    for path in files:
        with path.open(newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            head = [h.strip() for h in (reader.fieldnames or [])]
            missing = [c for c in COLUMNS if c not in head]
            if missing:
                problems.append(f"{path.name}: missing columns {', '.join(missing)}")
                continue
            got = [{c: (r.get(c) or "").strip() for c in COLUMNS} for r in reader if any((v or "").strip() for v in r.values())]
        problems += check(path, got, seen)
        rows += got
    if problems:
        print("Polls not merged. Fix these first:", *problems, sep="\n  ", file=sys.stderr)
        return False
    rows.sort(key=lambda r: (r["end_date"], r["poll_id"]), reverse=True)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)
    if verbose:
        print(f"Merged {len(files)} poll files ({len({r['poll_id'] for r in rows})} polls, {len(rows)} rows) into public/data/polls.csv")
    return True


if __name__ == "__main__":
    sys.exit(0 if merge() else 1)

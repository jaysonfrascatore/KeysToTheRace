"""Command line for the Unlock The Count model.

  python -m ktr run --env staging     test run: writes to build/staging/, touches nothing live
  python -m ktr promote               publish the last staging run to public/data/
  python -m ktr run --env live        run and publish in one step (what the schedule does)
  python -m ktr report                print the last staging report
  python -m ktr site                  build a full staging copy of the website in build/site-staging/
  python -m ktr members               refresh the list of all 535 members from GitHub
  python -m ktr legislation           run only Key Legislation (also part of every run)

Options: --date YYYY-MM-DD (score as of that day), --sims N (number of simulations), --no-scenarios
"""
import argparse
import csv
import json
import os
import shutil
import subprocess
import sys

from . import legislation as leg
from .data import PUBLIC, ROOT, load_config, read_csv, write_json
from .stage1 import Stage1
from .stage2 import run_stage2

STAGING = os.path.join(ROOT, "build", "staging")


def data_path(name):
    return os.path.join(PUBLIC, "data", name)


def merge_polls():
    """Rebuild data/polls.csv from the one-file-per-poll folder, data/polling/."""
    tool = os.path.join(ROOT, "tools", "merge_polls.py")
    if os.path.exists(tool):
        subprocess.run([sys.executable, tool], check=True, stdout=subprocess.DEVNULL)


def compute(args):
    merge_polls()
    cfg = load_config()
    s1 = Stage1(cfg, read_csv(data_path("polls.csv")), read_csv(data_path("pollsters.csv")),
                read_csv(data_path("news.csv")), today=args.date).run()
    s2 = run_stage2(cfg, s1, sims=args.sims, scenarios=not args.no_scenarios)
    s2["stage1"] = [{"name": c["name"], "party": c["party"], "launch": round(c["launch"], 6), "simulations": c["sim"]["runs"],
                     "declares": c["sim"]["yes"], "status": c["status"]} for c in s1["candidates"]]
    return cfg, s1, s2


def new_log_rows(s1, log_rows, method="v3"):
    """Rows for complete days (before today) that aren't in the log yet. Logged days are never rewritten."""
    have = {(r["candidate"], r["date"]) for r in log_rows}
    rows = []
    for c in s1["candidates"]:
        for d, v in c["launchHistory"]:
            if d < s1["today"] and (c["name"], d) not in have:
                rows.append({"date": d, "candidate": c["name"], "yes": round(v, 4), "method": method})
    rows.sort(key=lambda r: (r["date"], r["candidate"]))
    return rows


def report(s1, s2, log_rows, new_rows):
    last = {}
    for r in log_rows:
        if r["date"] < s1["today"] and (r["candidate"] not in last or r["date"] > last[r["candidate"]][0]):
            last[r["candidate"]] = (r["date"], float(r["yes"]))
    lines = ["# Model run, %s" % s1["today"], "", "## Part 1: Presidential Probability", "",
             "| Candidate | Today | Last logged | Change | Simulations |", "|---|---|---|---|---|"]
    for c in sorted(s1["candidates"], key=lambda c: -c["launch"]):
        prev = last.get(c["name"])
        ch = c["launch"] * 100 - prev[1] if prev else 0
        ch = 0.0 if abs(ch) < 0.005 else ch
        idx = "%s of %s" % (format(c["sim"]["yes"], ","), format(c["sim"]["runs"], ","))
        lines.append("| %s | %.2f%% | %s | %+.2f | %s |" % (c["name"], c["launch"] * 100, "%.2f%% (%s)" % (prev[1], prev[0]) if prev else "none", ch, idx))
    lines += ["", "## Stage 2: the primaries", ""]
    for p, r in s2["parties"].items():
        lines += ["### %s (%d simulations, %d days to the first contest)" % ("Democrats" if p == "D" else "Republicans", r["simulations"], r["daysToFirstContest"]), "",
                  "| Candidate | Runs | Nominee | Nominee if runs | Past Super Tuesday if runs | Attention Index |", "|---|---|---|---|---|---|"]
        for c in sorted(r["candidates"], key=lambda c: -c["attention"]):
            lines.append("| %s | %.0f%% | %.1f%% | %.1f%% | %.0f%% | %.1f |" % (c["name"], c["pRun"] * 100, c["pNominee"] * 100,
                                                                         c["pNomineeIfRuns"] * 100, c["pPastSuperTuesdayIfRuns"] * 100, c["attention"]))
        lines.append("")
    lines += ["%d new Launch Watch rows would be added to the log." % len(new_rows), ""]
    return "\n".join(lines)


def write_staging(s1, s2, rows, text):
    os.makedirs(STAGING, exist_ok=True)
    write_json(os.path.join(STAGING, "primary.json"), s2)
    write_json(os.path.join(STAGING, "stage1.json"), s1)
    with open(os.path.join(STAGING, "launch-log-new.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["date", "candidate", "yes", "method"], lineterminator="\n")
        w.writeheader()
        w.writerows(rows)
    with open(os.path.join(STAGING, "report.md"), "w", encoding="utf-8") as f:
        f.write(text)


LEG_FIELDS = ["date", "bill", "chamber", "pPass", "expectedYes", "method"]
LEG_NEW = os.path.join(STAGING, "legislation-log-new.csv")


def legislation_step(cfg, today):
    """Key Legislation: today's odds plus the finished days the log doesn't have yet."""
    rows = leg.history_rows(cfg, today, read_csv(os.path.join(leg.LEG, "log.csv")))
    now = leg.run(cfg, today)
    bills = {b["id"]: b for b in read_csv(os.path.join(leg.LEG, "bills.csv"))}
    os.makedirs(STAGING, exist_ok=True)
    with open(LEG_NEW, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=LEG_FIELDS, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)
    lines = ["## Key Legislation", "", "| Bill | House | Senate | Becomes law |", "|---|---|---|---|"]
    for b in now["bills"]:
        f = lambda c: ("%s (done)" if b[c]["decided"] else "%s") % ("%.1f%%" % (b[c]["pPass"] * 100))
        lines.append("| %s | %s | %s | %.1f%% |" % (bills[b["id"]]["short"], f("house"), f("senate"), b["pLaw"] * 100))
    lines += ["", "%d new Key Legislation log rows would be added." % len(rows), ""]
    return "\n".join(lines)


def publish_legislation(path=LEG_NEW):
    log = os.path.join(leg.LEG, "log.csv")
    have = {(r["date"], r["bill"], r["chamber"]) for r in read_csv(log)}
    add = [r for r in read_csv(path) if (r["date"], r["bill"], r["chamber"]) not in have]
    if add:
        leg.append_log(add, log)
    return len(add)


def publish(primary_path, new_rows_path):
    shutil.copyfile(primary_path, data_path("primary.json"))
    log = data_path("launch-log.csv")
    have = {(r["candidate"], r["date"]) for r in read_csv(log)}
    add = [r for r in read_csv(new_rows_path) if (r["candidate"], r["date"]) not in have]
    if add:
        with open(log, "a", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["date", "candidate", "yes", "method"], lineterminator="\n")
            w.writerows(add)
    sync = os.path.join(ROOT, "tools", "sync_fallback.py")
    if os.path.exists(sync):
        subprocess.run([sys.executable, sync], check=True, stdout=subprocess.DEVNULL)
    return len(add)


def main(argv=None):
    ap = argparse.ArgumentParser(prog="ktr", description="Unlock The Count model")
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run")
    r.add_argument("--env", choices=["staging", "live"], default="staging")
    r.add_argument("--date")
    r.add_argument("--sims", type=int)
    r.add_argument("--no-scenarios", action="store_true")
    sub.add_parser("promote")
    sub.add_parser("report")
    sub.add_parser("site")
    sub.add_parser("members")
    lg = sub.add_parser("legislation")
    lg.add_argument("--env", choices=["staging", "live"], default="staging")
    lg.add_argument("--date")
    args = ap.parse_args(argv)

    if args.cmd == "members":
        from .members import refresh
        rows = refresh()
        print("Saved %d members (%d senators, %d House)." % (len(rows), sum(r["chamber"] == "senate" for r in rows), sum(r["chamber"] == "house" for r in rows)))
        return 0
    if args.cmd == "legislation":
        from .data import utc_today
        text = legislation_step(load_config(), args.date or utc_today())
        if args.env == "live":
            n = publish_legislation()
            subprocess.run([sys.executable, os.path.join(ROOT, "tools", "sync_fallback.py")], check=True, stdout=subprocess.DEVNULL)
            print("Live: added %d Key Legislation log rows." % n)
        print(text)
        return 0

    if args.cmd == "report":
        print(open(os.path.join(STAGING, "report.md"), encoding="utf-8").read())
        return 0
    if args.cmd == "site":
        p = os.path.join(STAGING, "primary.json")
        if not os.path.exists(p):
            print("No staging run yet. Run: python -m ktr run --env staging")
            return 1
        site = os.path.join(ROOT, "build", "site-staging")
        shutil.rmtree(site, ignore_errors=True)
        shutil.copytree(PUBLIC, site)
        shutil.copyfile(p, os.path.join(site, "data", "primary.json"))
        log = os.path.join(site, "data", "launch-log.csv")
        have = {(r["candidate"], r["date"]) for r in read_csv(log)}
        add = [r for r in read_csv(os.path.join(STAGING, "launch-log-new.csv")) if (r["candidate"], r["date"]) not in have]
        with open(log, "a", newline="", encoding="utf-8") as f:
            csv.DictWriter(f, fieldnames=["date", "candidate", "yes", "method"], lineterminator="\n").writerows(add)
        if os.path.exists(LEG_NEW):
            llog = os.path.join(site, "data", "legislation", "log.csv")
            have = {(r["date"], r["bill"], r["chamber"]) for r in read_csv(llog)}
            leg.append_log([r for r in read_csv(LEG_NEW) if (r["date"], r["bill"], r["chamber"]) not in have], llog)
        print("Staging site ready in build/site-staging/ (deploy with: npx wrangler deploy --env staging)")
        return 0
    if args.cmd == "promote":
        p = os.path.join(STAGING, "primary.json")
        if not os.path.exists(p):
            print("No staging run yet. Run: python -m ktr run --env staging")
            return 1
        k = publish_legislation() if os.path.exists(LEG_NEW) else 0
        n = publish(p, os.path.join(STAGING, "launch-log-new.csv"))
        print("Published staging to public/data/ (%d new Launch Watch rows, %d new Key Legislation rows)." % (n, k))
        return 0

    cfg, s1, s2 = compute(args)
    log_rows = read_csv(data_path("launch-log.csv"))
    rows = new_log_rows(s1, log_rows, cfg["stage1"]["method"])
    text = report(s1, s2, log_rows, rows) + "\n" + legislation_step(cfg, s1["today"])
    write_staging(s1, s2, rows, text)
    if args.env == "live":
        publish_legislation()
        n = publish(os.path.join(STAGING, "primary.json"), os.path.join(STAGING, "launch-log-new.csv"))
        print("Live: wrote public/data/primary.json and added %d log rows." % n)
    else:
        print("Staging run saved to build/staging/ (nothing live changed).")
    print(text)
    return 0

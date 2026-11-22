"""The member list: all 100 senators and every House member, from the public
congress-legislators project on GitHub (unitedstates/congress-legislators).

    python -m ktr members      # refresh public/data/legislation/members.csv
"""
import csv
import os
import unicodedata
import urllib.request

from .data import PUBLIC

SOURCE = "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml"
OUT = os.path.join(PUBLIC, "data", "legislation", "members.csv")
FIELDS = ["bioguide", "chamber", "name", "last", "party", "state", "district", "start"]
PARTY = {"Democrat": "D", "Republican": "R", "Independent": "I"}
DELEGATES = {"DC", "PR", "GU", "VI", "AS", "MP"}      # can't vote on passage, left out


def plain(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def rows_from_yaml(text):
    import yaml
    out = []
    for m in yaml.safe_load(text):
        t = m["terms"][-1]
        if t["state"] in DELEGATES:
            continue
        n = m["name"]
        full = n.get("official_full") or " ".join(x for x in (n.get("first"), n.get("last")) if x)
        out.append({"bioguide": m["id"]["bioguide"], "chamber": "senate" if t["type"] == "sen" else "house",
                    "name": full, "last": n["last"], "party": PARTY.get(t["party"], "I"), "state": t["state"],
                    "district": "" if t["type"] == "sen" else str(t.get("district", 0)), "start": t["start"]})
    out.sort(key=lambda r: (r["chamber"], r["state"], int(r["district"] or 0), r["last"]))
    return out


def refresh(path=OUT, source=SOURCE):
    with urllib.request.urlopen(source, timeout=60) as r:
        rows = rows_from_yaml(r.read().decode("utf-8"))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)
    return rows

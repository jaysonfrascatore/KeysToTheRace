"""Reading and writing the site's data files (CSV in, JSON out)."""
import csv
import json
import os
from datetime import date, datetime, timedelta, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CONFIG = os.path.join(ROOT, "config", "model.json")
PUBLIC = os.path.join(ROOT, "public")


def load_config(path=CONFIG):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def read_csv(path):
    """Same rules as the site's parseCSV: trimmed headers and cells, blank rows dropped."""
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8", newline="") as f:
        rows = list(csv.reader(f))
    if not rows:
        return []
    head = [h.strip() for h in rows[0]]
    out = []
    for r in rows[1:]:
        if len(r) <= 1:
            continue
        out.append({h: (r[i].strip() if i < len(r) else "") for i, h in enumerate(head)})
    return out


def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")


# ---------- dates (ISO strings, like the site) ----------
def to_date(s):
    return datetime.strptime(s, "%Y-%m-%d").date()


def add_days(s, n):
    return (to_date(s) + timedelta(days=n)).isoformat()


def days_between(a, b):
    return (to_date(b) - to_date(a)).days


def date_range(a, b):
    d, out = to_date(a), []
    end = to_date(b)
    while d <= end:
        out.append(d.isoformat())
        d += timedelta(days=1)
    return out


def utc_today():
    return datetime.now(timezone.utc).date().isoformat()

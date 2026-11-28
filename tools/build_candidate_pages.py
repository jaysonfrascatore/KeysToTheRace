"""Give every candidate their own links:
    candidates/<id>/          the profile (View Profile)
    candidates/<id>/market/   the Viability Market

Each page is a small shell that loads the shared data and draws that candidate.
The candidate list comes from config/model.json (stage1.standing). Run it after
adding a candidate:
    python tools/build_candidate_pages.py
"""
import json, pathlib, re, shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
cfg = json.loads((ROOT / "config" / "model.json").read_text(encoding="utf-8"))
names = sorted(cfg["stage1"]["standing"])
slug = lambda n: re.sub(r"^-|-$", "", re.sub(r"[^a-z]+", "-", n.lower()))

PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>html,body{{background:#0b0a08;margin:0}}html[data-theme="light"],html[data-theme="light"] body{{background:#f8faf9}}</style>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{root}assets/site.css">
<meta name="theme-color" content="#0b0a08">
<script>
// Opened from a computer (no server), this page can't load the data: use the candidates page instead
if (location.protocol === "file:") location.replace("{root}candidates/index.html#{hash}");
(function () {{
  let t = "dark";
  try {{ t = localStorage.getItem("ktr-theme") || "dark"; }} catch (e) {{}}
  const h = document.documentElement; h.dataset.theme = t; h.classList.toggle("dark", t === "dark");
}})();
</script>
</head>
<body>
<header class="nav" data-nav data-root="{root}" data-active="candidates"></header>
<main class="wrap pdp-full" id="page"><p class="note" style="padding:60px 0">Loading {name}…</p></main>
<footer data-footer data-root="{root}"></footer>
<script>window.PAGE_ROOT = "{root}"; window.DATA_ROOT = "{root}data/"; window.CAND_PAGE = true;</script>
<script src="{root}assets/nav.js"></script>
<script src="{root}assets/common.js"></script>
<script src="{root}assets/polls-core.js"></script>
<script src="{root}assets/market.js"></script>
<script src="{root}assets/count.js"></script>
<script>
loadMarket().then(M => {{
  window.MARKET = M;
  const c = M.all.find(x => x.id === "{id}"), page = document.getElementById("page");
  if (!c) {{ page.innerHTML = '<p class="note" style="padding:60px 0">This candidate isn\\'t tracked right now. <a href="{root}candidates/">See every candidate</a></p>'; return; }}
  page.innerHTML = {render}(c, M);
  page.querySelectorAll("[data-close]").forEach(a => {{ a.removeAttribute("data-close"); a.href = "{root}candidates/"; }});
  wireOverlay(page);
  PDP.route();
}});
</script>
</body>
</html>
"""

made = 0
keep = set()
for n in names:
    s = slug(n)
    keep.add(s)
    for sub, render, hash_, title, desc in [
        ("", "profileHTML", "c-" + s, f"{n}: Presidential Probability", f"{n}'s chance to declare a 2028 presidential candidacy, simulated 11,111 times, with every input and weight."),
        ("market/", "marketHTML", "m-" + s, f"{n}: Viability Market", f"{n}'s Viability Market: the polling forecast if {n} runs, and the path to the nomination."),
    ]:
        root = "../../" if not sub else "../../../"
        d = PUB / "candidates" / s / sub
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(PAGE.format(root=root, id=s, name=n, render=render, hash=hash_, title=title, desc=desc), encoding="utf-8")
        made += 1
# Remove pages for anyone no longer tracked
for d in (PUB / "candidates").iterdir():
    if d.is_dir() and d.name not in keep:
        shutil.rmtree(d)
print(f"built {made} candidate pages")

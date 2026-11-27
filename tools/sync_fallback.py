"""Copy the data CSVs into the offline fallbacks inside every page that reads them.

Only matters for opening pages straight from your computer. Run it after
editing the CSVs (or add it as a step in your update job):
    python tools/sync_fallback.py
"""
import pathlib, re, sys

# Build polls.csv from the poll files in public/data/polling/ first
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from merge_polls import merge
if not merge(verbose=False):
    sys.exit(1)

root = pathlib.Path(__file__).resolve().parent.parent / "public"
csvs = {block: (root / "data" / name).read_text(encoding="utf-8").strip()
        for name, block in [("polls.csv", "polls-fallback"), ("pollsters.csv", "pollsters-fallback"), ("news.csv", "news-fallback"),
                            ("launch-log.csv", "launch-log-fallback"), ("primary.json", "primary-fallback"),
                            ("press.csv", "press-fallback")]
        if (root / "data" / name).exists()}

for page in sorted(root.glob("*/index.html")) + [root / "index.html"]:
    html = page.read_text(encoding="utf-8")
    changed = False
    for block, csv in csvs.items():
        pattern = rf'(<script type="text/plain" id="{block}">)(.*?)(</script>)'
        if re.search(pattern, html, flags=re.S):
            html = re.sub(pattern, lambda m: m.group(1) + "\n" + csv + "\n" + m.group(3), html, count=1, flags=re.S)
            changed = True
    if changed:
        page.write_text(html, encoding="utf-8")
        print("synced", page.relative_to(root))

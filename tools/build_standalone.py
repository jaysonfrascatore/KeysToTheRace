"""Build single-file copies of the main pages (CSS, scripts and data inlined).

These open on their own, from email, a phone or a chat, with no server:
    python tools/build_standalone.py
Writes to standalone/. The real site still deploys from public/.
"""
import pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
pub, out = root / "public", root / "standalone"
out.mkdir(exist_ok=True)
PAGES = {"index.html": "unlockthecount-home.html",
         "candidates/index.html": "unlockthecount-candidates.html",
         "matchups/index.html": "unlockthecount-forecast.html"}
LINKS = {"": "unlockthecount-home.html", "candidates/": "unlockthecount-candidates.html", "matchups/": "unlockthecount-forecast.html"}

import base64
MIME = {".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}
photos = {}
for ext in (".jpg", ".jpeg", ".webp", ".png"):          # PNG wins when a name has more than one type
    for f in (pub / "photos").glob("*" + ext):
        photos[f.stem] = f"data:{MIME[ext]};base64," + base64.b64encode(f.read_bytes()).decode()
photo_js = "window.INLINE_PHOTOS = {" + ",".join(f'"{k}":"{v}"' for k, v in photos.items()) + "};"

for src, dst in PAGES.items():
    html = (pub / src).read_text(encoding="utf-8")
    css = (pub / "assets/site.css").read_text(encoding="utf-8")
    html = re.sub(r'<link rel="stylesheet" href="(?:\.\./)?assets/site\.css">', lambda m: "<style>\n" + css + "\n</style>", html)
    def inline(m):
        js = (pub / "assets" / m.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script")
        return "<script>\n" + js + "\n</script>"
    links = "{" + ",".join(f'"{k}":"{v}"' for k, v in LINKS.items()) + "}"
    html = html.replace('<script src="', f'<script>window.FORCE_FALLBACK = true; window.STANDALONE_LINKS = {links}; {photo_js}</script>\n<script src="', 1)
    html = re.sub(r'<script src="(?:\.\./)?assets/([\w.-]+\.js)"></script>', inline, html)
    (out / dst).write_text(html, encoding="utf-8")
    print("built", dst, f"{len(html)//1024} KB")


# ---------- One file with everything: unlockthecount.html ----------
# Each page sits in its own frame inside one file, and the tabs switch between them.
import json
ALL = [("index.html", "landing", ""), ("unlock/index.html", "unlock", "unlock/"), ("candidates/index.html", "candidates", "candidates/"), ("polls/index.html", "polls", "polls/"),
       ("races/index.html", "races", "races/"), ("matchups/index.html", "matchups", "matchups/"), ("tools/index.html", "tools", "tools/"), ("trackers/index.html", "trackers", "trackers/"), ("methodology/index.html", "methodology", "methodology/"), ("contact/index.html", "contact", "contact/"), ("press/index.html", "press", "press/"),
       ("dates/index.html", "dates", "dates/"), ("florida/index.html", "florida", "florida/"), ("collection/index.html", "collection", "collection/")]
ALL_LINKS = {href: "ktr:" + view for _, view, href in ALL}
BRIDGE = """<script>
window.FORCE_FALLBACK = true; window.STANDALONE_LINKS = %s; window.STANDALONE_OTHER = "ktr:other"; %s
// Tabs and links between pages ask the outer file to switch pages
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest("a[href^='ktr:']"); if (!a) return;
  e.preventDefault();
  const [view, hash] = a.getAttribute("href").slice(4).split("#");
  window.parent.postMessage({ ktr: "go", view, hash: hash ? "#" + hash : "" }, "*");
}, true);
window.addEventListener("message", e => {
  const d = e.data || {};
  if (d.ktr === "hash" && d.hash) { try { location.hash = d.hash; } catch (x) {} window.dispatchEvent(new HashChangeEvent("hashchange")); }
  if (d.ktr === "theme" && window.setTheme) window.setTheme(d.t, true);
});
</script>
""" % (json.dumps(ALL_LINKS), photo_js)
pages = {}
for src, view, _ in ALL:
    html = (pub / src).read_text(encoding="utf-8")
    css = (pub / "assets/site.css").read_text(encoding="utf-8")
    html = re.sub(r'<link rel="stylesheet" href="(?:\.\./)?assets/site\.css">', lambda m: "<style>\n" + css + "\n</style>", html)
    html = html.replace('<script src="', BRIDGE + '<script src="', 1)
    def inline(m):
        js = (pub / "assets" / m.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script")
        return "<script>\n" + js + "\n</script>"
    html = re.sub(r'<script src="(?:\.\./)?assets/([\w.-]+\.js)"></script>', inline, html)
    # Images that sit next to a page (like a tracker thumbnail) go in as data
    def inline_img(m):
        f = (pub / src).parent / m.group(1)
        if not f.exists():
            return m.group(0)
        mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}[f.suffix[1:].lower()]
        return 'src="data:%s;base64,%s"' % (mime, base64.b64encode(f.read_bytes()).decode())
    html = re.sub(r'src="([\w.-]+\.(?:png|jpe?g|webp))"', inline_img, html)
    pages[view] = html
pages_json = json.dumps(pages).replace("</", "<\\/")
outer = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Unlock The Count</title>
<style>
  html,body{margin:0;height:100%;overflow:hidden;background:#0b0a08}
  iframe{position:fixed;inset:0;width:100%;height:100%;border:0;display:none;background:#0b0a08}
  iframe.on{display:block}
  .toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,20px);opacity:0;z-index:9;
    font:600 13px/1.4 Manrope,system-ui,sans-serif;color:#f3eee3;background:#16130e;border:1px solid rgba(214,178,94,.4);
    padding:12px 18px;border-radius:999px;box-shadow:0 20px 40px -14px rgba(0,0,0,.7);transition:all .4s ease;pointer-events:none}
  .toast.show{opacity:1;transform:translate(-50%,0)}
</style>
</head>
<body>
<div class="toast" id="toast">That page isn't built yet.</div>
<script>
/* Unlock The Count: every page in one file. */
const PAGES = __PAGES__;
const frames = {};
const TITLES = { landing: "Home", unlock: "Unlock The Data", candidates: "Candidates", polls: "Polls", races: "Races", matchups: "Matchups", tools: "Tools", trackers: "Trackers", methodology: "Methodology", contact: "Contact", press: "In the News", dates: "Dates", florida: "Florida", collection: "Collection" };
let toastT;
function send(f, msg){ try { f.contentWindow.postMessage(msg, "*"); } catch (e) {} }
function show(view, hash){
  if (!PAGES[view]) { const t = document.getElementById("toast"); t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200); return; }
  let f = frames[view];
  if (!f) {
    f = frames[view] = document.createElement("iframe");
    f.title = TITLES[view] || "Unlock The Count";
    f.srcdoc = PAGES[view];
    document.body.appendChild(f);
    if (hash) f.addEventListener("load", () => setTimeout(() => send(f, { ktr: "hash", hash }), 250), { once: true });
  } else if (hash) send(f, { ktr: "hash", hash });
  Object.values(frames).forEach(x => x.classList.toggle("on", x === f));
  try { history.replaceState(null, "", "#" + view); } catch (e) {}
  document.title = "Unlock The Count · " + f.title;
}
window.addEventListener("message", e => {
  const d = e.data || {};
  if (d.ktr === "go") show(d.view, d.hash);
  if (d.ktr === "theme") Object.values(frames).forEach(f => { if (f.contentWindow !== e.source) send(f, { ktr: "theme", t: d.t }); });
});
show(PAGES[location.hash.slice(1)] ? location.hash.slice(1) : "landing");
</script>
</body>
</html>
""".replace("__PAGES__", pages_json)
(out / "unlockthecount.html").write_text(outer, encoding="utf-8")
print("built unlockthecount.html", f"{len(outer)//1024} KB")

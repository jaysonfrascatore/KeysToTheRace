// Checks every page of the site in a real browser, in day mode, night mode or both:
//   node tools/check_pages.mjs            (both)
//   node tools/check_pages.mjs light      (day mode only)
// Needs Node.js and Playwright (npm i -D playwright && npx playwright install chromium).
// It serves public/ itself, so no server is needed. For each page, on a computer and a phone:
//   1. no script errors
//   2. no sideways scrolling
//   3. the theme's own colors (day: background #e7ecef, accent #5a189a)
//   4. none of the old day colors left (emerald green, or plain white panels)
//   5. text is readable: contrast of at least 4.5 to 1 (3 to 1 for large text), the WCAG AA rule
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const PUB = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../public");
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".csv": "text/csv", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0].split("#")[0]);
  let f = path.join(PUB, p); if (!f.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
}).listen(0);
const BASE = `http://localhost:${server.address().port}`;

const PAGES = ["/", "/unlock/", "/candidates/", "/candidates/#market", "/candidates/#c-kamala-harris", "/candidates/#m-jd-vance",
  "/candidates/kamala-harris/", "/candidates/kamala-harris/market/", "/tools/", "/tools/#path", "/tools/#dis", "/methodology/",
  "/polls/", "/races/", "/matchups/", "/dates/", "/florida/", "/trackers/", "/collection/", "/contact/", "/press/"];
const THEMES = { light: { bg: [231, 236, 239], accent: [90, 24, 154] }, dark: { bg: [11, 10, 8], accent: [201, 162, 74] } };
const want = process.argv[2] ? [process.argv[2]] : ["light", "dark"];

const audit = () => {
  const rgb = s => { const m = (s || "").match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const lum = c => { const f = x => (x /= 255) <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  // The background actually behind an element: stack every see-through layer down to the page
  const bgOf = el => {
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== "none" && /gradient\((?!.*transparent)/.test(cs.backgroundImage) && n !== document.body) return null;   // a solid gradient behind it: skip
      const c = rgb(cs.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    let base = rgb(getComputedStyle(document.documentElement).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }; if (base.a < 1) base = { ...base, a: 1 };
    return layers.reverse().reduce((u, t) => over(t, u), base);
  };
  // The old green accent family. Green that means "yes" or "up" (--up, the yes squares) is meant to be green.
  const UP = (() => { const d = document.createElement("i"); d.style.color = "var(--up)"; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; })();
  const emerald = (c, raw) => raw !== UP && c && c.a > 0.2 && c.g > c.r + 30 && c.g > c.b + 10 && c.g < 200;
  const out = { lowContrast: [], oldColors: [], whitePanels: [] };
  const seen = new Set();
  document.querySelectorAll("body *").forEach(el => {
    if (el.closest("[hidden],.intro,[aria-hidden='true'],.pdp:not(.open),svg defs,script,style")) return;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0 || !r.width || !r.height) return;
    const name = el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : "");
    for (const prop of ["color", "backgroundColor", "borderTopColor", "fill", "stroke"]) if (emerald(rgb(cs[prop]), cs[prop]) && !el.closest(".p-bar,.pt-track,.trend,.sq,svg")) out.oldColors.push(`${name} ${prop} ${cs[prop]}`);
    const bgc = rgb(cs.backgroundColor);
    if (bgc && bgc.a === 1 && bgc.r === 255 && bgc.g === 255 && bgc.b === 255 && r.width > 200 && r.height > 80) out.whitePanels.push(name);
    // Text: only elements that hold their own text
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own || el.closest("svg")) return;
    // Faded side cards are decorative copies of the center card; the center card is checked
    let op = 1; for (let n = el; n; n = n.parentElement) op *= +getComputedStyle(n).opacity; if (op < 0.95) return;
    const fg = rgb(cs.color), bg = bgOf(el); if (!fg || !bg || cs.webkitTextFillColor === "rgba(0, 0, 0, 0)" || /transparent/.test(cs.webkitTextFillColor)) return;
    const col = fg.a < 1 ? over(fg, bg) : fg, k = ratio(col, bg), px = parseFloat(cs.fontSize), large = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
    const need = large ? 3 : 4.5;
    if (k < need) { const key = name + k.toFixed(2); if (!seen.has(key)) { seen.add(key); out.lowContrast.push(`${name} "${el.textContent.trim().slice(0, 30)}" ${k.toFixed(2)}:1 (needs ${need})`); } }
  });
  const root = getComputedStyle(document.documentElement);
  out.bg = getComputedStyle(document.body).backgroundColor; out.accent = root.getPropertyValue("--gold").trim();
  out.overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  return out;
};

const hex = s => s.startsWith("#") ? [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)) : (s.match(/\d+/g) || []).slice(0, 3).map(Number);
const b = await chromium.launch();
let fails = 0, checks = 0;
for (const theme of want) {
  for (const [label, vp] of [["computer", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp });
    await ctx.addInitScript(t => { try { localStorage.setItem("ktr-theme", t); sessionStorage.setItem("ktr-intro-seen", "1"); } catch (e) {} }, theme);
    const p = await ctx.newPage();
    const errs = []; p.on("pageerror", e => errs.push(e.message));
    for (const u of PAGES) {
      errs.length = 0;
      await p.goto(BASE + u, { waitUntil: "networkidle" }); await p.waitForTimeout(2200);
      const r = await p.evaluate(audit);
      const problems = [];
      if (errs.length) problems.push("script errors: " + errs.join(" | "));
      if (r.overflow > 0) problems.push(`scrolls sideways by ${r.overflow}px`);
      if (hex(r.bg).join() !== THEMES[theme].bg.join()) problems.push(`background is ${r.bg}`);
      if (hex(r.accent).join() !== THEMES[theme].accent.join()) problems.push(`accent is ${r.accent}`);
      if (theme === "light" && r.oldColors.length) problems.push("old green left: " + [...new Set(r.oldColors)].slice(0, 5).join("; "));
      if (theme === "light" && r.whitePanels.length) problems.push("plain white panels: " + [...new Set(r.whitePanels)].slice(0, 5).join("; "));
      if (r.lowContrast.length) problems.push(`${r.lowContrast.length} hard-to-read text: ` + r.lowContrast.slice(0, 6).join("; "));
      checks++;
      if (problems.length) { fails++; console.log(`✗ ${theme} ${label} ${u}\n    ` + problems.join("\n    ")); }
      else console.log(`✓ ${theme} ${label} ${u}`);
    }
    await ctx.close();
  }
}
await b.close(); server.close();
console.log(`\n${checks - fails} of ${checks} page checks passed`);
process.exit(fails ? 1 : 0);

/* =========================================================
   UNLOCK THE COUNT: what people see
   Part 1, Presidential Probability: the cards, the trend lines,
   the profile and the Decision Maze.
   Part 2, Viability Market: the forecast before a candidate
   declares, and the market once they do.

   Needs common.js, polls-core.js and market.js first.
   Profiles open at #c-<id>, Viability Markets at #m-<id>.
   ========================================================= */

const TREND_DAYS = 60;                       // the trend lines show the last 60 days
const NUM = n => n.toLocaleString("en-US");
const P1 = v => v.toFixed(1) + "%";
const MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const medDate = d => { const x = new Date(d + "T12:00:00Z"); return `${MON3[x.getUTCMonth()]} ${x.getUTCDate()}, ${x.getUTCFullYear()}`; };
const longDate = d => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const PARTY_ONE = { D: "Democrat", R: "Republican" };
const roleLine = c => c.meta.role + (c.meta.from && !c.meta.role.includes(c.meta.from) ? " · " + c.meta.from : "");
const pronoun = c => ({ "Kamala Harris": "she", "Alexandria Ocasio-Cortez": "she", "Gretchen Whitmer": "she" })[c.name] || "he";
const theirs = c => pronoun(c) === "she" ? "her" : "his";
const colorOf = c => window.candColor ? window.candColor(c.name) : "#8c949e";
const trendOf = c => c.launchHistory.slice(-TREND_DAYS);
const changeOf = c => { const t = trendOf(c); return t.at(-1).v - t[0].v; };
// On a candidate's own page (candidates/<id>/ and candidates/<id>/market/) links go page to page;
// everywhere else they open over the page as #c-<id> and #m-<id>
const profileHref = c => window.CAND_PAGE ? (window.PAGE_ROOT || "../") + "candidates/" + c.id + "/" : "#c-" + c.id;
const marketHref = c => window.CAND_PAGE ? (window.PAGE_ROOT || "../") + "candidates/" + c.id + "/market/" : "#m-" + c.id;
const isOpen = c => c.status === "declared";

function changeHTML(c){
  const d = changeOf(c), t = trendOf(c), cls = d >= 0.05 ? "up" : d <= -0.05 ? "down" : "";
  return `<span class="chg ${cls}">${cls === "up" ? "▲" : cls === "down" ? "▼" : "■"} ${Math.abs(d).toFixed(1)} since ${fd(t[0].d)}</span>`;
}
function phasePillHTML(c){
  const ph = phaseOf(c);
  return `<span class="pill-ph ${ph}">${PHASES[ph].label}</span>`;
}
function photoHTML(c, cls = ""){
  const src = photoSrc(c.id);
  return `<div class="ph-ring ${cls}">${src ? `<img src="${src}" alt="${c.name}" loading="lazy">` : `<span class="ini">${c.mono}</span>`}</div>`;
}
// A trend line on a fixed 0 to 100 scale (never stretched to fit)
function trendSVG(c, o = {}){
  const W = o.w || 300, H = o.h || 84, pts = o.points || trendOf(c), n = pts.length;
  const x = i => n > 1 ? i / (n - 1) * W : W, y = v => H - Math.max(0, Math.min(100, v)) / 100 * H;
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const fs = o.fs || 10, lx = -8;
  let dots = "";
  (o.marks || []).forEach(m => {
    const i = pts.findIndex(p => p.d === m.d); if (i < 0) return;
    dots += `<circle cx="${x(i).toFixed(1)}" cy="${y(pts[i].v).toFixed(1)}" r="${o.dot || 5}" class="t-dot"/><text x="${x(i).toFixed(1)}" y="${(y(pts[i].v) + (m.up ? -11 : 19)).toFixed(1)}" text-anchor="middle" class="t-num">${m.n}</text>`;
  });
  const data = pts.map(p => p.d + "," + p.v.toFixed(2)).join(";");
  return `<svg class="trend" data-pts="${data}" data-w="${W}" data-h="${H}" viewBox="${o.left ? -o.left : -36} -10 ${W + (o.left || 36)} ${H + 20}" role="img" aria-label="${c.name}: Presidential Probability from ${P1(pts[0].v)} on ${fd(pts[0].d)} to ${P1(pts.at(-1).v)} today, on a 0 to 100 percent scale">
    <g class="t-ax" font-size="${fs}" text-anchor="end"><text x="${lx}" y="${fs * 0.35}">100%</text><text x="${lx}" y="${H / 2 + fs * 0.35}">50%</text><text x="${lx}" y="${H + fs * 0.35}">0%</text></g>
    <line x1="0" x2="${W}" y1="0" y2="0" class="t-top"/><line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" class="t-mid"/><line x1="0" x2="${W}" y1="${H}" y2="${H}" class="t-base"/>
    <polyline class="t-case" points="${line}" style="stroke-width:${o.sw ? o.sw + 2 : 4.5}"/>
    <polyline class="t-line" points="${line}" style="stroke:${colorOf(c)};stroke-width:${o.sw || 2.5}"/>${dots}
  </svg>`;
}
function barHTML(c, v = c.odds){
  return `<div class="p-bar"><i style="width:${Math.max(0, Math.min(100, v)).toFixed(1)}%;background:${colorOf(c)}"></i></div>`;
}

/* ---------- Part 1: the card (one template, every size) ---------- */
function probCard(c, M){
  const t = trendOf(c);
  return `<article class="cd" data-id="${c.id}" aria-label="${c.name}">
    <div class="cd-top"><span class="lbl">No. ${c.rank} · ${PARTY_ONE[c.party]}</span>${phasePillHTML(c)}</div>
    ${photoHTML(c, "cd-ph")}
    <h3 class="cd-name">${c.name}</h3>
    <p class="cd-role">${roleLine(c)}</p>
    <div class="cd-prob">
      <div class="cd-row"><span class="lbl">Presidential Probability</span>${changeHTML(c)}</div>
      <div class="cd-sub">Chance to declare a candidacy</div>
      <div class="cd-num"><b class="num">${P1(c.odds)}</b><span>${NUM(c.sim.yes)} of ${NUM(c.sim.runs)} simulations</span></div>
      ${barHTML(c)}
      <div class="cd-yn"><span>Declares <b>${P1(c.odds)}</b></span><span>Doesn't <b>${P1(100 - c.odds)}</b></span></div>
    </div>
    <div class="cd-trend"><span class="lbl">Trend</span>${trendSVG(c)}<div class="cd-axis"><span>${fd(t[0].d)}</span><span>Today</span></div></div>
    <div class="cd-meta"><div><div class="lbl">Primary average</div><b>${pct(c.pct, c.rounded)}</b></div><div><div class="lbl">Last updated</div><b>${medDate(M.today)}</b></div></div>
    <div class="cd-btns"><a class="btn-gold" href="${profileHref(c)}">View Profile</a><a class="btn-line" href="${marketHref(c)}">Viability Market</a></div>
    <p class="cd-note">${isOpen(c) ? "The Viability Market is open." : "The market opens at declaration. Until then it shows a polling forecast."}</p>
  </article>`;
}

/* The cards. The center one is full size; the rest step down and fade toward the edges,
   and the row always reaches both sides of the screen. They fade in when the page opens,
   then move on their own: one candidate every 15 seconds. Hovering over or clicking the
   center card holds it; 5 seconds after you leave or click elsewhere, it moves again. */
const CYCLE_MS = 15000, RESUME_MS = 5000;
function renderCarousel(sel, list, M, opts = {}){
  const host = document.querySelector(sel); if (!host || !list.length) return;
  if (host._stop) host._stop();
  const n = list.length, reps = Math.max(1, Math.ceil(15 / n)), ring = Array.from({ length: n * reps }, (_, i) => list[i % n]), m = ring.length;
  let cur = Math.max(0, list.findIndex(c => c.id === opts.focus));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  host.innerHTML = `<div class="cd-stage" tabindex="0" role="region" aria-roledescription="carousel" aria-label="${opts.label || "Candidates"}">
      <div class="cd-track">${ring.map((c, i) => `<div class="cd-slot" data-i="${i}">${probCard(c, M)}</div>`).join("")}</div></div>
    <div class="cd-ctl">
      <button type="button" class="cd-arrow" data-d="-1" aria-label="Previous candidate">←</button>
      <div class="cd-mid"><span class="cd-count" aria-live="polite"></span><span class="cd-prog" aria-hidden="true"><i></i></span><span class="cd-state"></span></div>
      <button type="button" class="cd-play" aria-label="Pause the cards"></button>
      <button type="button" class="cd-arrow" data-d="1" aria-label="Next candidate">→</button>
    </div>`;
  const stage = host.querySelector(".cd-stage"), slots = [...host.querySelectorAll(".cd-slot")];
  const bar = host.querySelector(".cd-prog i"), stateEl = host.querySelector(".cd-state"), playBtn = host.querySelector(".cd-play");
  const PAUSE_IC = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>`;
  const PLAY_IC = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;

  const place = (first) => {
    const phone = matchMedia("(max-width: 640px)").matches, half = stage.clientWidth / 2;
    const cw = slots[0].firstElementChild.offsetWidth, gap = phone ? 8 : 18;
    const S = k => k === 0 ? 1 : phone ? .88 : k === 1 ? .9 : .8;
    const O = k => [1, phone ? .5 : .45, phone ? .22 : .24, .12, .07, .04][Math.min(k, 5)];
    const dx = [0]; let maxK = 0;
    // Add cards outward until one sits fully past the edge, so the row never ends on screen
    while (dx[maxK] - cw * S(maxK) / 2 < half && maxK < Math.floor((m - 1) / 2)) { dx.push(dx[maxK] + cw * (S(maxK) + S(maxK + 1)) / 2 + gap); maxK++; }
    slots.forEach((el, i) => {
      let o = ((i - cur) % m + m) % m; if (o > m / 2) o -= m;
      const a = Math.abs(o), show = a <= maxK;
      // A card that wraps from one end to the other jumps without sliding across
      const jump = el._o != null && Math.abs(o - el._o) > 1;
      el._o = o;
      el.style.transition = first || jump ? "none" : "";
      el.style.transform = `translateX(${(Math.sign(o) * (show ? dx[a] : dx[maxK] + cw)).toFixed(1)}px) scale(${S(Math.min(a, 2))})`;
      el.style.setProperty("--op", show ? O(a) : 0);
      el.style.setProperty("--d", (a * 0.14).toFixed(2) + "s");
      el.style.zIndex = 20 - a;
      el.style.visibility = show ? "" : "hidden";
      el.classList.toggle("on", o === 0);
      el.setAttribute("aria-hidden", o !== 0);
      el.inert = o !== 0;
    });
    host.querySelector(".cd-count").textContent = `${(cur % n) + 1} of ${n}`;
  };

  // Autoplay
  let elapsed = 0, last = performance.now(), raf = 0, hold = new Set(), user = reduce, resumeAt = 0, wasHeld = false;
  const paint = () => {
    const held = hold.size > 0 || user;
    stage.classList.toggle("held", held);
    playBtn.innerHTML = user ? PLAY_IC : PAUSE_IC;
    playBtn.setAttribute("aria-label", user ? "Play the cards" : "Pause the cards");
    stateEl.textContent = user ? "Paused" : hold.size ? "Paused while you look" : resumeAt ? "Moving again in a moment" : "";
  };
  const go = (d, byHand) => { cur = (cur + d + m) % m; elapsed = 0; place(); if (byHand) resumeAt = 0; };
  const release = why => { if (!hold.delete(why)) return; if (!hold.size) { elapsed = Math.max(elapsed, CYCLE_MS - RESUME_MS); resumeAt = 1; } paint(); };
  const tick = now => {
    const dt = Math.min(100, now - last); last = now;
    const held = hold.size > 0 || user || document.hidden || document.body.classList.contains("pdp-lock");
    if (!held) { elapsed += dt; if (elapsed >= CYCLE_MS) { go(1); resumeAt = 0; paint(); } }
    if (held !== wasHeld) { wasHeld = held; }
    bar.style.transform = `scaleX(${Math.min(1, elapsed / CYCLE_MS).toFixed(4)})`;
    raf = requestAnimationFrame(tick);
  };
  const center = () => slots.find(el => el.classList.contains("on"));
  slots.forEach(el => {
    el.addEventListener("pointerenter", e => { if (e.pointerType === "mouse" && el.classList.contains("on")) { hold.add("hover"); paint(); } });
    el.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") release("hover"); });
  });
  stage.addEventListener("click", e => {
    const sl = e.target.closest(".cd-slot"); if (!sl) return;
    if (!sl.classList.contains("on")) { e.preventDefault(); e.stopPropagation(); cur = +sl.dataset.i; elapsed = 0; place(); return; }
    hold.add("click"); paint();
  }, true);
  const outside = e => { const c = center(); if (hold.has("click") && c && !c.contains(e.target)) release("click"); };
  document.addEventListener("click", outside);
  playBtn.addEventListener("click", () => { user = !user; if (!user) { elapsed = 0; resumeAt = 0; } paint(); });
  host.querySelectorAll(".cd-arrow").forEach(b => b.addEventListener("click", () => go(+b.dataset.d, true)));
  stage.addEventListener("keydown", e => { if (e.key === "ArrowLeft") go(-1, true); if (e.key === "ArrowRight") go(1, true); });
  stage.addEventListener("focusin", () => { hold.add("focus"); paint(); });
  stage.addEventListener("focusout", e => { if (!stage.contains(e.relatedTarget)) release("focus"); });
  let x0 = null;
  stage.addEventListener("pointerdown", e => { x0 = e.clientX; });
  stage.addEventListener("pointerup", e => { if (x0 == null) return; const d = e.clientX - x0; x0 = null; if (Math.abs(d) > 40) go(d < 0 ? 1 : -1, true); });
  let rt; const onResize = () => { clearTimeout(rt); rt = setTimeout(() => place(), 120); };
  addEventListener("resize", onResize);

  // The first view: everything in place, then the cards fade up softly from the center out
  place(true);
  void stage.offsetWidth;
  requestAnimationFrame(() => requestAnimationFrame(() => { stage.classList.add("in"); slots.forEach(el => el.style.transition = ""); setTimeout(() => stage.classList.add("settled"), 1800); }));
  paint(); raf = requestAnimationFrame(tick);
  host._stop = () => { cancelAnimationFrame(raf); removeEventListener("resize", onResize); document.removeEventListener("click", outside); };
  return { go, focus: id => { const i = list.findIndex(c => c.id === id); if (i >= 0) { cur = i; place(); } } };
}

/* A small tooltip on every single-candidate trend: the day and the number under the pointer */
(function () {
  let tip, dot;
  const hide = () => { if (tip) tip.hidden = true; if (dot) dot.remove(); };
  document.addEventListener("pointermove", e => {
    const svg = e.target.closest && e.target.closest("svg.trend[data-pts]");
    if (!svg) { hide(); return; }
    if (!tip) { tip = document.createElement("div"); tip.className = "ttip"; tip.setAttribute("role", "tooltip"); document.body.appendChild(tip); }
    const pts = svg.dataset.pts.split(";").map(x => x.split(",")), W = +svg.dataset.w, H = +svg.dataset.h;
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    const sx = (e.clientX - r.left) / r.width * vb.width + vb.x;
    const i = Math.max(0, Math.min(pts.length - 1, Math.round(sx / W * (pts.length - 1))));
    const [d, v] = pts[i], x = pts.length > 1 ? i / (pts.length - 1) * W : W, y = H - (+v) / 100 * H;
    if (!dot || !svg.contains(dot)) { if (dot) dot.remove(); dot = document.createElementNS("http://www.w3.org/2000/svg", "circle"); dot.setAttribute("class", "t-hdot"); dot.setAttribute("r", 4.5); svg.appendChild(dot); }
    dot.setAttribute("cx", x); dot.setAttribute("cy", y);
    tip.innerHTML = `<b>${(+v).toFixed(1)}%</b><span>${medDate(d)}</span>`;
    tip.hidden = false;
    const px = r.left + (x - vb.x) / vb.width * r.width, py = r.top + (y - vb.y) / vb.height * r.height;
    tip.style.left = Math.max(6, Math.min(innerWidth - tip.offsetWidth - 6, px - tip.offsetWidth / 2)) + "px";
    tip.style.top = Math.max(6, py - tip.offsetHeight - 12) + "px";
  }, { passive: true });
  addEventListener("scroll", hide, { passive: true });
})();

/* ---------- Part 1: every candidate in a party over time ---------- */
function renderTrendPanel(sel, list, M){
  const host = document.querySelector(sel); if (!host || !list.length) return;
  const W = 520, H = 260, pts = trendOf(list[0]), n = pts.length;
  const x = i => n > 1 ? i / (n - 1) * W : W, y = v => H - v / 100 * H;
  const ord = [...list].sort((a, b) => b.launch - a.launch);
  // Labels on the right, spaced so they never overlap
  const lab = ord.map(c => ({ c, y: y(c.launchHistory.at(-1).v) + 4 }));
  const G = 15;
  for (let i = 1; i < lab.length; i++) if (lab[i].y - lab[i - 1].y < G) lab[i].y = lab[i - 1].y + G;
  const over = lab.length ? lab.at(-1).y - (H + 8) : 0; if (over > 0) lab.forEach(l => l.y -= over);
  for (let i = lab.length - 2; i >= 0; i--) if (lab[i + 1].y - lab[i].y < G) lab[i].y = lab[i + 1].y - G;
  const line = c => trendOf(c).map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  host.innerHTML = `<svg class="trend wide" viewBox="-40 -14 ${W + 190} ${H + 40}" role="img" aria-label="${PARTY_NAME[list[0].party]} Presidential Probability over time on a fixed 0 to 100 percent scale">
    <g class="t-ax" text-anchor="end">${[100, 75, 50, 25, 0].map(v => `<text x="-8" y="${y(v) + 4}">${v}%</text>`).join("")}</g>
    <g class="t-grid">${[100, 75, 25].map(v => `<line x1="0" x2="${W}" y1="${y(v)}" y2="${y(v)}"/>`).join("")}</g>
    <line x1="0" x2="${W}" y1="${y(50)}" y2="${y(50)}" class="t-mid"/><line x1="0" x2="${W}" y1="${H}" y2="${H}" class="t-base"/>
    <g class="t-ax"><text x="0" y="${H + 22}">${fd(pts[0].d)}</text><text x="${W}" y="${H + 22}" text-anchor="end">Today</text></g>
    ${ord.map(c => `<g class="t-series" data-id="${c.id}"><polyline class="t-case" points="${line(c)}" style="stroke-width:4.4"/><polyline class="t-line" points="${line(c)}" style="stroke:${colorOf(c)};stroke-width:2.4"/></g>`).join("")}
    <g class="t-lab" font-size="12.5">${lab.map(l => `<text x="${W + 10}" y="${l.y.toFixed(1)}" data-id="${l.c.id}"><tspan fill="${colorOf(l.c)}">●</tspan> ${last(l.c.name)} ${P1(l.c.launchHistory.at(-1).v)}</text>`).join("")}</g>
    <line class="t-hover" x1="0" x2="0" y1="0" y2="${H}" style="display:none"/>
  </svg><div class="t-tip" hidden></div>`;
  const svg = host.querySelector("svg"), tip = host.querySelector(".t-tip"), hv = host.querySelector(".t-hover");
  const move = e => {
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    const sx = (e.clientX - r.left) / r.width * vb.width + vb.x;
    if (sx < 0 || sx > W) { hide(); return; }
    const i = Math.round(sx / W * (n - 1)), d = pts[i].d;
    hv.style.display = ""; hv.setAttribute("x1", x(i)); hv.setAttribute("x2", x(i));
    tip.hidden = false;
    tip.innerHTML = `<b>${longDate(d)}</b>${ord.map(c => `<span><i style="background:${colorOf(c)}"></i>${c.name}<em>${P1(trendOf(c)[i].v)}</em></span>`).join("")}`;
    const px = (x(i) - vb.x) / vb.width * r.width;
    tip.style.left = Math.min(r.width - tip.offsetWidth - 4, Math.max(4, px + 14)) + "px";
  };
  const hide = () => { tip.hidden = true; hv.style.display = "none"; };
  svg.addEventListener("pointermove", move); svg.addEventListener("pointerleave", hide);
}

/* ---------- Home: the top of each party as bars ---------- */
function renderProbBars(sel, list, top = 4){
  const host = document.querySelector(sel); if (!host) return;
  host.innerHTML = [...list].sort((a, b) => b.odds - a.odds).slice(0, top).map(c => `<a class="pbar" href="${profileHref(c)}">
    <span class="pbar-n" title="${c.name}">${c.name.length > 18 ? c.name[0] + ". " + c.name.split(" ").slice(1).join(" ") : c.name}</span>${barHTML(c)}<b class="num">${P1(c.odds)}</b></a>`).join("");
}

/* ---------- Part 2: who has declared, and who dropped out ---------- */
function renderDeclared(sel, M){
  const host = document.querySelector(sel); if (!host) return;
  const dateOf = (c, st) => (M.news.filter(n => n.candidate === c.name && n.status === st).at(-1) || {}).date;
  const rows = M.all.filter(c => c.status === "declared" || c.status === "dropped").map(c => ({ c, on: dateOf(c, "declared"), off: dateOf(c, "dropped") }))
    .sort((a, b) => (a.on || "").localeCompare(b.on || ""));
  host.innerHTML = `<table class="tbl-d"><thead><tr><th>Candidate</th><th>Party</th><th>Declared</th><th>Dropped out</th><th>Viability Market</th></tr></thead><tbody>
    ${rows.length ? rows.map(r => `<tr><td><b>${r.c.name}</b></td><td>${PARTY_ONE[r.c.party]}</td><td>${r.on ? medDate(r.on) : "—"}</td><td>${r.off ? medDate(r.off) : "—"}</td><td><a href="${marketHref(r.c)}">${r.off ? "Closed" : "Open"} →</a></td></tr>`).join("")
    : ""}
  </tbody></table>${rows.length ? "" : `<div class="tbl-empty"><b>No one has declared yet.</b><p>None of the candidates in Presidential Probability has declared a 2028 candidacy. The first one appears here the day they do.</p><a href="#probability" data-part="1">See Presidential Probability →</a></div>`}`;
}

/* ---------- The profile: #c-<id> ---------- */
const OFFICE_NAME = { 1: "Vice President", 0.85: "Cabinet", 0.75: "Senator", 0.7: "Governor", 0.45: "House", 0.3: "Mayor" };
const STATE_NAME = { GA: "Georgia", NY: "New York", MI: "Michigan", CA: "California", AZ: "Arizona", KY: "Kentucky", PA: "Pennsylvania", IL: "Illinois", NJ: "New Jersey",
  FL: "Florida", OH: "Ohio", DC: "Washington, D.C.", TX: "Texas", VA: "Virginia", MO: "Missouri", IA: "Iowa", NH: "New Hampshire", SC: "South Carolina", NV: "Nevada" };
const LAST_TEXT = { 1: "Won by 10 or more", 0.5: "Won by less than 10", "-0.5": "Lost by less than 10", "-1": "Lost by 10 or more" };
const MID_TEXT = { 1: "Won their own race", 0.5: "Campaigned for the party", "-1": "Lost their race" };
const signedR = v => !v ? "0" : (v > 0 ? "+" : "−") + (Math.abs(v) % 1 ? String(+Math.abs(v).toFixed(2)) : Math.abs(v));

function inputRows(c){
  const by = {}; c.maze.rows.forEach(r => { const b = by[r.id] = by[r.id] || { reading: 0, rows: [] }; b.reading += r.reading; b.rows.push(r); });
  const st = MAZE.standing[c.name] || {}, home = MAZE.home[c.name];
  const note = (e, b) => {
    if (e.id === "statement") { const w = c.statements.filter(s => s.r && !s.wiped && s.share).at(-1) || c.statements.at(-1); return w ? w.text : ""; }
    if (e.id === "midterms") return b ? MID_TEXT[b.reading] || "" : "";
    if (e.id === "homeState") return home ? STATE_NAME[home] || home : "";
    if (e.id === "govCurrent") return b ? OFFICE_NAME[b.reading] || "" : c.meta.role.match(/Commentator|Businessman|Activist/) ? "Never elected" : "None";
    if (e.id === "govFormer") return b ? OFFICE_NAME[b.reading] || "" : "";
    if (e.id === "polling") return `${pct(c.pct, c.rounded)} primary average`;
    if (e.id === "travel") return b ? b.rows.map(r => STATE_NAME[(c.news.find(n => n.date === r.date && n.signal === "travel") || {}).state] || "").filter(Boolean).join(", ") : "";
    if (e.id === "lastElection") return b ? LAST_TEXT[b.reading] || "" : st.midterms != null ? "On the 2026 ballot, counted in the midterms" : "";
    if (e.id === "national" || e.id === "congress" || e.id === "book") return b ? "Yes" : "";
    return b && b.rows[0].note ? b.rows[0].note : "";
  };
  return [...MAZE.elements].sort((a, b) => b.w - a.w || a.label.localeCompare(b.label)).map(e => {
    const b = by[e.id];
    return { e, reading: b ? b.reading : 0, has: !!b && Math.abs(b.reading) > 1e-9, note: note(e, b), each: e.id === "travel" || e.id === "ads" || e.id === "noise" };
  });
}
function movesFor(c, M){
  const t = trendOf(c), from = t[0].d;
  return timelineFor(c, M).filter(m => m.d > from && Math.abs(m.after - m.before) >= 0.5).slice(0, 8).reverse().map((m, i) => {
    const top = [...m.why].sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
    const what = m.items.length ? m.items.map(n => n.headline).join(" · ")
      : m.stand.length ? m.stand.map(k => k === "midterms" ? MID_TEXT[MAZE.standing[c.name][k]] || "The midterms counted" : MAZE_BY_ID[k].label + " counted").join(" · ")
      : m.poll ? "The first 2028 primary polls" : "";
    return { ...m, n: i + 1, label: top ? top.e.label : "Polling", what };
  });
}
function profileHTML(c, M){
  const moves = movesFor(c, M), t = trendOf(c), yes = Math.round(c.odds);
  const marks = moves.map((m, i) => ({ d: m.d, n: m.n, up: i % 2 === 0 }));
  const rows = inputRows(c);
  const seen = new Set(), news = c.news.filter(n => n.source_url && !seen.has(n.source_url) && seen.add(n.source_url)).sort((a, b) => a.date < b.date ? 1 : -1);
  const tools = pageLink(window.PAGE_ROOT || "../", "tools/");
  return `<div class="pf">
    <a class="pf-back" href="#" data-close>← All candidates</a>
    <section class="pf-head">
      ${photoHTML(c, "pf-ph")}
      <div class="pf-id"><div class="pf-tags"><span class="lbl">${PARTY_ONE[c.party]}${c.meta.from ? " · " + c.meta.from : ""}</span>${phasePillHTML(c)}</div>
        <h1>${c.name}</h1><p>${c.meta.role}</p></div>
      <div class="pf-num"><div class="lbl">Presidential Probability</div><b class="num">${P1(c.odds)}</b>
        <div class="pf-sub">Chance to declare a candidacy</div>
        <div class="pf-sub">${NUM(c.sim.yes)} of ${NUM(c.sim.runs)} simulations · Updated ${medDate(M.today)}</div>
        <a class="btn-line sm" href="${marketHref(c)}">Viability Market</a></div>
    </section>
    <div class="pf-cols">
      <div class="pf-main">
        <section class="panel"><div class="pf-row"><div class="eyebrow">Trend</div>${changeHTML(c)}</div>
          ${trendSVG(c, { w: 640, h: 200, left: 44, fs: 11, sw: 3, marks, dot: 5 })}
          <div class="pf-axis"><span>${fd(t[0].d)}</span><span>${fd(t.at(-1).d)}</span></div></section>
        <section class="panel"><div class="eyebrow">Moves</div>
          ${moves.length ? `<ol class="moves">${moves.slice().reverse().map(m => `<li><b class="mv-n">${m.n}</b><span class="mv-d">${fd(m.d)}</span><span class="mv-w"><b>${m.label}</b>${m.what ? " · " + m.what : ""}</span><span class="mv-v">${m.before.toFixed(1)} → ${P1(m.after)}</span></li>`).join("")}</ol>`
            : `<p class="note">Nothing has moved ${last(c.name)}'s chance by half a point or more since ${fd(t[0].d)}.</p>`}</section>
        <section class="panel"><div class="pf-row"><div class="eyebrow">Simulations</div><span class="note" style="margin:0">Each square is about ${NUM(Math.round(c.sim.runs / 100))} of ${NUM(c.sim.runs)} runs</span></div>
          <div class="sq-grid" role="img" aria-label="${yes} of 100 squares green">${Array.from({ length: 100 }, (_, i) => `<span class="sq ${i < yes ? "yes" : "no"}"></span>`).join("")}</div>
          <div class="sq-key"><span><b class="up">Yes</b> · <b>${NUM(c.sim.yes)}</b> runs ${pronoun(c)} declares</span><span><b class="down">No</b> · <b>${NUM(c.sim.no)}</b> runs ${pronoun(c)} doesn't</span></div></section>
      </div>
      <aside class="pf-side">
        <section class="panel"><div class="eyebrow">Inputs</div>
          <p class="note">Every input, its weight and ${theirs(c)} reading. Listed one by one, never totaled into a score.</p>
          <div class="tbl-wrap"><table class="tbl-in"><thead><tr><th>Input</th><th class="n">Weight</th><th class="n">Reading</th></tr></thead><tbody>
          ${rows.map(r => `<tr><td><b>${r.e.label}</b>${r.note ? `<div class="sub">${r.note}</div>` : ""}</td><td class="n w">${r.e.w.toFixed(2)}${r.each ? " each" : ""}</td><td class="n ${r.has ? "" : "zero"}">${r.e.id === "travel" ? r.reading : signedR(r.reading)}</td></tr>`).join("")}
          </tbody></table></div>
          <p class="stated">These odds reflect the site's stated weights. They are not observed base rates.</p></section>
        <section class="panel"><div class="eyebrow">Sources</div><ul class="pf-src">
          ${news.slice(0, 8).map(n => `<li>${fd(n.date)}: <a href="${n.source_url}" target="_blank" rel="noopener">${n.source}</a> · ${n.headline}</li>`).join("")}
          <li>Primary average: ${c.polls.length} national poll${c.polls.length === 1 ? "" : "s"}, graded by pollster</li>
          ${c.polls.slice(0, 6).map(p => `<li>${p.pollster} · ${range(p.start, p.end)} · ${pct(p.pct, p.rounded)}${p.sources[0] ? ` · <a href="${p.sources[0]}" target="_blank" rel="noopener">Source</a>` : ""}</li>`).join("")}
          <li>Weights: <a href="${tools}#maze">the Decision Maze</a></li></ul></section>
      </aside>
    </div>
    <section class="panel pf-bio"><div class="eyebrow">Profile</div><p>${c.meta.bio}</p></section>
  </div>`;
}

/* ---------- The Viability Market: #m-<id> ----------
   Before a candidate declares, it shows where they are forecast to poll if they run.
   Seven inputs, each read from 0 to 1, are weighted into a forecast strength S, and the
   forecast share is 45 × S². It's averaged over 14 days, and a new range has to hold
   for 7 days before it shows, so it can't jump in a week. */
const FORECAST = {
  inputs: [
    { id: "name",       w: 1.50, label: "Name recognition",    how: c => `How many voters know who ${pronoun(c)} is` },
    { id: "polling",    w: 1.50, label: "Primary polling",     how: c => `${theirs(c)[0].toUpperCase() + theirs(c).slice(1)} current primary average` },
    { id: "rank",       w: 1.25, label: "Government Ranking",  how: () => "Highest office held" },
    { id: "coalition",  w: 1.25, label: "Coalition backing",   how: c => `The groups and leaders behind ${pronoun(c) === "she" ? "her" : "him"}` },
    { id: "nomination", w: 1.00, label: "Previous nomination", how: c => `Has ${pronoun(c)} won or sought a nomination` },
    { id: "standing",   w: 1.00, label: "Standing Point",      how: () => "Where they stand within the party" },
    { id: "last",       w: 0.50, label: "Last election",       how: c => `${theirs(c)[0].toUpperCase() + theirs(c).slice(1)} most recent general election` }
  ],
  // Readings from 0 to 1 (primary polling, Government Ranking and the last election come from the maze)
  readings: {
    "Kamala Harris":            { name: 1,    coalition: 1,    nomination: 1,   standing: 1 },
    "Pete Buttigieg":           { name: 0.75, coalition: 0.66, nomination: 0.5, standing: 0.75 },
    "Alexandria Ocasio-Cortez": { name: 0.75, coalition: 0.66, nomination: 0,   standing: 0.5 },
    "Gavin Newsom":             { name: 0.75, coalition: 0.66, nomination: 0,   standing: 0.75 },
    "Mark Kelly":               { name: 0.5,  coalition: 0.33, nomination: 0,   standing: 0.75 },
    "Andy Beshear":             { name: 0.25, coalition: 0.33, nomination: 0,   standing: 0.75 },
    "Jon Ossoff":               { name: 0.5,  coalition: 0.33, nomination: 0,   standing: 0.75 },
    "Josh Shapiro":             { name: 0.5,  coalition: 0.66, nomination: 0,   standing: 0.75 },
    "JB Pritzker":              { name: 0.5,  coalition: 0.33, nomination: 0,   standing: 0.75 },
    "Cory Booker":              { name: 0.5,  coalition: 0.33, nomination: 0.5, standing: 0.75 },
    "Gretchen Whitmer":         { name: 0.5,  coalition: 0.33, nomination: 0,   standing: 1 },
    "JD Vance":                 { name: 1,    coalition: 1,    nomination: 0,   standing: 1 },
    "Marco Rubio":              { name: 0.75, coalition: 0.66, nomination: 0.5, standing: 0.75 },
    "Ron DeSantis":             { name: 0.75, coalition: 0.33, nomination: 0.5, standing: 0.75 },
    "Ted Cruz":                 { name: 0.75, coalition: 0.33, nomination: 0.5, standing: 0.5 },
    "Josh Hawley":              { name: 0.5,  coalition: 0.33, nomination: 0,   standing: 0.5 },
    "Glenn Youngkin":           { name: 0.25, coalition: 0.33, nomination: 0,   standing: 0.75 },
    "Tucker Carlson":           { name: 0.75, coalition: 0.33, nomination: 0,   standing: 0.5 },
    "Donald Trump Jr.":         { name: 1,    coalition: 0.66, nomination: 0,   standing: 0.75 }
  },
  text: {
    name: { 1: "Known nationwide", 0.75: "Widely known", 0.5: "Known in the party", 0.25: "Known in their state", 0: "Little known" },
    coalition: { 1: "Strong", 0.66: "Solid", 0.33: "Some", 0: "Little" },
    nomination: { 1: "Was the nominee", 0.5: "Ran before", 0: "Never ran" },
    standing: { 1: "Party center", 0.75: "Near the center", 0.5: "One wing of the party", 0.25: "The edge of the party" }
  },
  scale: 45, average: 14, hold: 7, pollFull: 40
};
const BANDS = [
  { id: "clear",  label: "Clear frontrunner",     range: "Leads by 20 or more", say: "the clear frontrunner", as: true },
  { id: "front",  label: "Potential frontrunner", range: "Leads or within 5",   say: "a potential frontrunner", as: true },
  { id: "top",    label: "Top tier",              range: "20% or more",         say: "in the top tier" },
  { id: "mid",    label: "Mid-range",             range: "10% to 19%",          say: "in the mid-range (10% to 19%)" },
  { id: "single", label: "Mid single digits",     range: "3% to 9%",            say: "in the mid single digits (3% to 9%)" },
  { id: "low",    label: "Less than 3%",          range: "Under 3%",            say: "at less than 3%" },
  { id: "zero",   label: "0%",                    range: "Not registering",     say: "at 0%" }
];
function forecastReadings(c, pctNow){
  const st = MAZE.standing[c.name] || {}, r = FORECAST.readings[c.name] || { name: 0, coalition: 0, nomination: 0, standing: 0.5 };
  const le = st.lastElection != null ? st.lastElection : st.midterms != null ? st.midterms : null;
  return { ...r, polling: Math.min(1, pctNow / FORECAST.pollFull), rank: Math.max(st.govCurrent || 0, st.govFormer || 0), last: le == null ? 0.5 : (le + 1) / 2, _le: le };
}
const forecastShare = (c, pctNow) => { const r = forecastReadings(c, pctNow), W = FORECAST.inputs.reduce((t, i) => t + i.w, 0);
  const S = FORECAST.inputs.reduce((t, i) => t + i.w * r[i.id], 0) / W; return FORECAST.scale * S * S; };
function bandOf(p, field){
  const others = field.filter(x => x !== p), top = Math.max(...others, 0);
  if (p < 0.5) return "zero";
  if (p > top && p - top >= 20) return "clear";
  if (p >= 20 && (p >= top || top - p <= 5)) return "front";
  if (p >= 20) return "top";
  if (p >= 10) return "mid";
  if (p >= 3) return "single";
  return "low";
}
// Every candidate's forecast range in a party, averaged over 14 days and held for 7
function forecastParty(M, party){
  const list = M[party]; if (!list || !list.length) return {};
  const days = M.days, A = FORECAST.average, H = FORECAST.hold;
  const raw = list.map(c => c.pctHistory.map(h => h.v == null ? null : forecastShare(c, h.v)));
  const avg = raw.map(s => s.map((_, i) => { const w = s.slice(Math.max(0, i - A + 1), i + 1).filter(v => v != null); return w.length ? w.reduce((t, v) => t + v, 0) / w.length : null; }));
  const out = {};
  list.forEach((c, k) => {
    let shown = null, cand = null, run = 0;
    days.forEach((d, i) => {
      if (avg[k][i] == null) return;
      const b = bandOf(avg[k][i], avg.map(s => s[i]).filter(v => v != null));
      if (shown == null) { shown = b; return; }
      if (b === shown) { cand = null; run = 0; return; }
      if (b === cand) run++; else { cand = b; run = 1; }
      if (run >= H) { shown = b; cand = null; run = 0; }
    });
    out[c.id] = { band: shown || "zero", share: avg[k].at(-1) };
  });
  return out;
}
function marketHTML(c, M){
  const fc = (M._fc = M._fc || {})[c.party] || (M._fc[c.party] = forecastParty(M, c.party));
  const band = BANDS.find(b => b.id === (fc[c.id] || {}).band) || BANDS.at(-1), r = forecastReadings(c, c.pct), st = MAZE.standing[c.name] || {};
  const shareUrl = location.protocol === "file:" || window.STANDALONE_LINKS ? location.href.split("#")[0] + marketHref(c) : new URL((window.PAGE_ROOT || "../") + "candidates/" + c.id + "/market/", location.href).href;
  const rd = {
    name: FORECAST.text.name[r.name] || "", polling: pct(c.pct, c.rounded), rank: OFFICE_NAME[r.rank] || (c.meta.role.match(/Commentator|Businessman/) ? "Never elected" : "None"),
    coalition: FORECAST.text.coalition[r.coalition] || "", nomination: FORECAST.text.nomination[r.nomination] || "", standing: FORECAST.text.standing[r.standing] || "",
    last: r._le == null ? "Never on a ballot" : st.lastElection != null ? LAST_TEXT[st.lastElection] : "2026: " + (MID_TEXT[st.midterms] || "").toLowerCase()
  };
  const s2 = c.stage2, open = isOpen(c), she = pronoun(c), She = she[0].toUpperCase() + she.slice(1);
  return `<div class="pf mv">
    <div class="mv-top"><a class="pf-back" href="#" data-close>← All candidates</a>
      <div class="mv-link"><span>${shareUrl.replace(/^https?:\/\/[^/]+/, "")}</span><button type="button" data-copy="${shareUrl}">Copy link</button></div></div>
    <section class="pf-head">
      ${photoHTML(c, "pf-ph sm")}
      <div class="pf-id"><div class="eyebrow">Viability Market</div><h1>${c.name}</h1><p class="mv-tag">Unlocking the path to the nomination.</p></div>
      <div class="pf-num mv-state">
        <span class="mv-badge ${open ? "open" : ""}">${open ? "Market open" : "Market not open"}</span>
        <span class="pf-sub">${open ? `Declared. ${She} is in the race.` : `Opens when ${she} declares. Presidential Probability today: <b>${P1(c.odds)}</b>`}</span>
        <a class="mv-go" href="${profileHref(c)}">View Profile →</a></div>
    </section>
    <section class="panel mv-fc"><div class="eyebrow">Forecast</div>
      <p class="mv-say">If ${c.name} announces a presidential run, ${last(c.name)} is forecasted to poll ${band.as ? "as " : ""}<span>${band.say}</span> in the primary, based on weighted inputs and models.</p>
      <p class="note">${theirs(c)[0].toUpperCase() + theirs(c).slice(1)} current primary average is ${pct(c.pct, c.rounded)} across ${c.polls.length} national poll${c.polls.length === 1 ? "" : "s"}. This site tracks ${M[c.party].length} ${PARTY_ONE[c.party]}s.</p></section>
    <div class="pf-cols">
      <section class="panel mv-range"><div class="eyebrow">Range</div>
        <ol class="ladder">${BANDS.map(b => `<li class="${b.id === band.id ? "on" : ""}"><span>${b.label}</span><span>${b.range}</span></li>`).join("")}</ol>
        <p class="note">Averaged over ${FORECAST.average} days. A new range has to hold for ${FORECAST.hold} days before it shows.</p></section>
      <section class="panel mv-in"><div class="eyebrow">Inputs</div>
        <p class="note">What the forecast weighs, each with its weight and ${theirs(c)} reading.</p>
        <div class="tbl-wrap"><table class="tbl-in"><thead><tr><th>Input</th><th class="n">Weight</th><th class="n">Reading</th></tr></thead><tbody>
        ${FORECAST.inputs.map(i => `<tr><td><b>${i.label}</b><div class="sub">${i.how(c)}</div></td><td class="n w">${i.w.toFixed(2)}</td><td class="n">${rd[i.id]}</td></tr>`).join("")}
        </tbody></table></div></section>
    </div>
    <section class="mv-decl"><div class="eyebrow">At declaration</div>
      <p class="note">${open ? "Open now." : `These open the day ${she} declares.`}</p>
      <div class="locks">
        <div class="lock ${open ? "open" : ""}"><b>Early states</b><span>${open && s2 ? `${(s2.pEarlyWinIfRuns * 100).toFixed(0)}% to win an early state` : `${theirs(c)[0].toUpperCase() + theirs(c).slice(1)} odds in each of the first states to vote.`}</span></div>
        <div class="lock ${open ? "open" : ""}"><b>Super Tuesday</b><span>${open && s2 ? `${(s2.pPastSuperTuesdayIfRuns * 100).toFixed(0)}% to get past Super Tuesday` : `The chance ${she} makes it past Super Tuesday.`}</span></div>
        <div class="lock ${open ? "open" : ""}"><b>Delegates</b><span>${theirs(c)[0].toUpperCase() + theirs(c).slice(1)} share of delegates in every simulation.</span></div>
        <div class="lock ${open ? "open" : ""}"><b>Nomination</b><span>${open && s2 ? `${(s2.pNomineeIfRuns * 100).toFixed(1)}% to win the nomination` : `${theirs(c)[0].toUpperCase() + theirs(c).slice(1)} chance to win the nomination.`}</span></div>
      </div></section>
    <p class="stated">These odds reflect the site's stated weights. They are not observed base rates.</p>
  </div>`;
}
function wireOverlay(o){
  o.querySelectorAll("[data-close]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); PDP.close(); }));
  o.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Copied"; } catch (e) { b.textContent = "Select the link above"; }
    setTimeout(() => b.textContent = "Copy link", 1800);
  }));
}
PDP.register("c", id => { const M = window.MARKET, c = M && M.all.find(x => x.id === id); return c && { full: profileHTML(c, M), after: wireOverlay }; });
PDP.register("m", id => { const M = window.MARKET, c = M && M.all.find(x => x.id === id); return c && { full: marketHTML(c, M), after: wireOverlay }; });

/* ---------- The Decision Maze: every candidate inside the circle ---------- */
function renderMazeTokens(sel, previewSel, M){
  const host = document.querySelector(sel), pv = document.querySelector(previewSel); if (!host) return;
  const R = 192, C = 220, rOf = p => Math.sqrt(Math.max(0, p) / 100) * R;   // area scale: rings are labeled in percent
  // Each party gets half the circle. Radius is fixed by the odds; tokens slide along their ring until they don't overlap.
  const place = (list, from, to) => {
    const s = [...list].sort((a, b) => b.odds - a.odds), order = [];
    s.forEach((c, i) => order[i % 2 ? s.length - 1 - (i >> 1) : i >> 1] = c);   // alternate ends so close odds sit apart
    const t = order.map((c, i) => ({ c, r: rOf(c.odds), ang: from + (to - from) * (order.length > 1 ? i / (order.length - 1) : 0.5) }));
    const D = 40, xy = q => [q.r * Math.cos(q.ang * Math.PI / 180), q.r * Math.sin(q.ang * Math.PI / 180)];
    for (let it = 0; it < 300; it++) {
      let moved = false;
      for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) {
        const [x1, y1] = xy(t[i]), [x2, y2] = xy(t[j]), d = Math.hypot(x1 - x2, y1 - y2);
        if (d >= D) continue;
        const push = (D - d) / 2 / Math.max(20, (t[i].r + t[j].r) / 2) * 180 / Math.PI * 0.6, sg = t[i].ang <= t[j].ang ? -1 : 1;
        t[i].ang = Math.min(to, Math.max(from, t[i].ang + sg * push)); t[j].ang = Math.min(to, Math.max(from, t[j].ang - sg * push)); moved = true;
      }
      if (!moved) break;
    }
    return t;
  };
  const toks = [...place(M.D, 106, 254), ...place(M.R, -74, 74)];
  let picked = (M.D.slice().sort((a, b) => b.odds - a.odds)[0] || M.all[0]).id;
  host.innerHTML = `<div class="mz-box">
    <svg viewBox="0 0 440 440" aria-hidden="true">
      <g class="mz-rings">${[10, 25, 50, 75].map(v => `<circle cx="${C}" cy="${C}" r="${rOf(v).toFixed(1)}"/>`).join("")}</g>
      <circle cx="${C}" cy="${C}" r="${R}" class="mz-exit"/>
      <line x1="${C}" y1="18" x2="${C}" y2="422" class="mz-split"/>
      <g class="mz-lab">${[10, 25, 50, 75].map(v => `<text x="${C}" y="${(C - rOf(v) + 11).toFixed(1)}">${v}%</text>`).join("")}<text x="${C}" y="${C - R - 8}" class="ex">EXIT · DECLARES</text></g>
    </svg>
    ${toks.map(t => { const r = t.r, a = t.ang * Math.PI / 180;
      const x = (C + r * Math.cos(a)) / 440 * 100, y = (C + r * Math.sin(a)) / 440 * 100, src = photoSrc(t.c.id);
      return `<button type="button" class="mz-tok ${t.c.party}" data-id="${t.c.id}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%" aria-label="${t.c.name}, ${P1(t.c.odds)}">${src ? `<img src="${src}" alt="">` : `<span>${t.c.mono}</span>`}</button>`; }).join("")}
  </div>`;
  const show = () => {
    host.querySelectorAll(".mz-tok").forEach(b => { const on = b.dataset.id === picked; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    const c = M.all.find(x => x.id === picked); if (!pv || !c) return;
    const t = trendOf(c);
    pv.innerHTML = `<div class="eyebrow">Preview</div>
      <div class="pv-top"><span class="lbl">${PARTY_ONE[c.party]}</span>${phasePillHTML(c)}</div>
      <h2 class="pv-name">${c.name}</h2><p class="pv-role">${roleLine(c)}</p>
      <div class="pv-prob"><span class="lbl">Presidential Probability</span><div class="cd-sub">Chance to declare a candidacy</div>
        <div class="cd-num"><b class="num">${P1(c.odds)}</b><span>${NUM(c.sim.yes)} of ${NUM(c.sim.runs)} simulations</span></div>${barHTML(c)}</div>
      <div class="pv-trend"><span class="lbl">Trend</span>${trendSVG(c, { w: 520, h: 220, left: 46, fs: 13, sw: 4 })}<div class="cd-axis"><span>${fd(t[0].d)}</span><span>Today</span></div></div>
      <div class="cd-btns"><a class="btn-gold" href="${profileHref(c)}">View Profile</a><a class="btn-line" href="${marketHref(c)}">Viability Market</a></div>
      <p class="cd-note">${isOpen(c) ? "The Viability Market is open." : "The market opens at declaration. Until then it shows a polling forecast."}</p>`;
  };
  host.addEventListener("click", e => { const b = e.target.closest(".mz-tok"); if (!b) return; picked = b.dataset.id; show();
    if (pv && matchMedia("(max-width: 860px)").matches) pv.scrollIntoView({ behavior: "smooth", block: "start" }); });
  show();
}
function renderRings(sel){
  const host = document.querySelector(sel); if (!host) return;
  const by = {}; MAZE.elements.forEach(e => (by[e.ring] = by[e.ring] || []).push(e));
  const each = id => id === "travel" || id === "ads" || id === "noise" ? " each" : "";
  const ring = k => `<div class="ring-r"><b>${k}</b><span>${(by[k] || []).sort((a, b) => a.label.localeCompare(b.label)).map(e => `<b>${e.label}</b> ${e.w.toFixed(2)}${each(e.id)}`).join(" · ")}</span></div>`;
  host.innerHTML = `<div class="rings-2"><div>${[7, 6, 5, 4].map(ring).join("")}</div><div>${[3, 2, 1].map(ring).join("")}</div></div>`;
}
function renderStatementScale(sel){
  const host = document.querySelector(sel); if (!host) return;
  const w = MAZE_BY_ID.statement.w;
  host.innerHTML = `<div class="tbl-wrap"><table class="tbl-in"><thead><tr><th>What they say</th><th class="n">Reading</th><th class="n">Points</th></tr></thead><tbody>
    ${STATEMENT_SCALE.map(s => `<tr><td><b>${s.label}</b><div class="sub">${s.eg}</div></td><td class="n">${s.r == null ? "Last" : signedR(s.r)}</td><td class="n">${s.r == null ? "Last" : signedR(+(s.r * w).toFixed(2))}</td></tr>`).join("")}
  </tbody></table></div>
  <p class="note">The strongest statement counts in full, the next half, then a quarter. A change of heart wipes the earlier ones.</p>`;
}

/* ---------- Unlock The Data: the top three in each party ---------- */
function renderPollTile(sel, M){
  const host = document.querySelector(sel); if (!host) return;
  const side = p => `<div class="pt-side"><span class="pt-h ${p}">${PARTY_NAME[p] === "Democratic" ? "Democrats" : "Republicans"}</span>
    ${[...M[p]].sort((a, b) => b.pct - a.pct).slice(0, 3).map(c => `<div class="pt-bar"><span>${c.name}</span><span class="pt-track"><i style="width:${Math.min(100, c.pct / 40 * 100).toFixed(1)}%;background:${colorOf(c)}"></i></span><b class="num">${pct(c.pct, c.rounded)}</b></div>`).join("")}</div>`;
  host.innerHTML = side("D") + side("R");
}

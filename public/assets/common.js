/* =========================================================
   KEYS TO THE RACE: shared helpers, calendar and tool list
   ========================================================= */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const pColor = p => p === "D" ? "var(--dem)" : "var(--rep)";
const pHex   = p => p === "D" ? "#2F6FD0" : "#D64545";
const fmt = n => (n >= 0 ? "+" : "") + n.toFixed(1);
const chip = s => `<span class="chip ${s}">${s === "soon" ? "Coming soon" : s}</span>`;

/* Calendar: feeds the countdown's "next up" line and the Key Dates page.
   2028 primary dates aren't final; add them as states set them. */
const CALENDAR = [
  { date: "2027-01-31", label: "FEC year-end reports due",   kind: "Money" },
  { date: "2027-04-15", label: "FEC first-quarter reports due", kind: "Money" },
  { date: "2027-07-15", label: "FEC second-quarter reports due", kind: "Money" },
  { date: "2027-10-15", label: "FEC third-quarter reports due", kind: "Money" },
  { date: "2028-11-07", label: "Election Day",               kind: "Election" }
];

/* Every tool on the site. key = which section it lives in, page = where it links.
   status: "live" | "beta" | "soon" */
const TOOLS = [
  { key: "Key Races",      name: "2028 Forecast",       page: "races/",                desc: "Who's likely to win the nomination and the White House.", status: "soon" },
  { key: "Key Races",      name: "Senate 2028",         page: "races/#senate",         desc: "Probability tracker and path to the majority.", status: "soon" },
  { key: "Key Matchups",   name: "Electoral Analysis",  page: "matchups/#forecast",    desc: "The 2028 forecast, simulations and a build-your-own map.", status: "beta" },
  { key: "Key Matchups",   name: "Primary Map",         page: "matchups/#primary",     desc: "Pick a winner in every state for each party's primary.", status: "beta" },
  { key: "Key Polls",      name: "Polling Averages",    page: "polls/",                desc: "Primary and general polls, weighted by pollster grade.", status: "beta" },
  { key: "Key Candidates", name: "Endorsement Tracker", page: "candidates/#endorsements", desc: "Every governor, senator and House endorsement, logged.", status: "soon" },
  { key: "Key Candidates", name: "Dropout Wall",        page: "candidates/#dropouts",  desc: "Every campaign that ended, and when.", status: "beta" },
  { key: "Key Tools",      name: "The Chain",           page: "tools/#chain",          desc: "Follow one quote through the maze, the odds and the Index.", status: "beta" },
  { key: "Key Tools",      name: "Launch Watch",        page: "tools/#launch",         desc: "The chance every hopeful runs, and why.", status: "beta" },
  { key: "Key Tools",      name: "Decision Maze",       page: "tools/#maze",           desc: "Every weight behind Launch Watch.", status: "beta" },
  { key: "Key Tools",      name: "Primary Path",        page: "tools/#path",           desc: "Early states, Super Tuesday and where dropouts' voters go.", status: "beta" },
  { key: "Key Legislation", name: "Whip Counts",        page: "legislation/",          desc: "Every big bill: all 535 members, where they stand and the chance it passes.", status: "beta" },
  { key: "Key Dates",      name: "Debates",             page: "dates/#debates",        desc: "Qualifying thresholds, stages and who made the cut.", status: "soon" },
  { key: "Key Dates",      name: "Campaign Trail",      page: "dates/#trail",          desc: "Map of every stop, rally and early-state trip.", status: "soon" }
];

const FLORIDA_TOOLS = [
  { name: "Florida Vote Tracker 2026 (archive)",      page: "florida/#tracker-2026", desc: "County turnout and D vs R vs NPA margins from 2026. Moving here from the current tracker site.", status: "live" },
  { name: "Build Your Own Forecast",                  page: "florida/#forecast",     desc: "Set each county's starting point and a statewide environment. Moving here with the tracker.", status: "live" },
  { name: "Florida Vote Tracker 2028",                page: "florida/#tracker-2028", desc: "Live turnout for the 2028 primary and general.", status: "soon" },
  { name: "Florida Legislature: 120 House, 40 Senate", page: "florida/#legislature", desc: "Every seat, every member, every special election.", status: "soon" }
];

function toolCards(list, root){
  return list.map(t => `
    <a class="tool" href="${pageLink(root, t.page.split("#")[0])}${t.page.includes("#") ? "#" + t.page.split("#")[1] : ""}">
      <div>${t.key ? `<div class="eyebrow">${t.key}</div>` : ""}<h4>${t.name}</h4><p>${t.desc}</p></div>${chip(t.status)}
    </a>`).join("");
}

/* Countdown to Election Day 2028 */
function startCountdown(){
  if (!$("#cdD")) return;
  const target = new Date("2028-11-07T07:00:00-05:00");
  const tick = () => {
    let d = Math.max(0, target - new Date());
    const D = Math.floor(d/864e5); d -= D*864e5;
    const H = Math.floor(d/36e5);  d -= H*36e5;
    const M = Math.floor(d/6e4);   d -= M*6e4;
    const S = Math.floor(d/1e3);
    $("#cdD").textContent = D; $("#cdH").textContent = String(H).padStart(2,"0");
    $("#cdM").textContent = String(M).padStart(2,"0"); $("#cdS").textContent = String(S).padStart(2,"0");
  };
  tick(); setInterval(tick, 1000);
  const now = new Date();
  const n = CALENDAR.find(e => new Date(e.date + "T23:59:59") >= now);
  if (n && $("#nextEvent")) $("#nextEvent").textContent = `${n.label} · ${Math.ceil((new Date(n.date) - now) / 864e5)}d`;
}

/* =========================================================
   SHOWROOM OVERLAY: the full "product page" that fades up over
   the site. Candidates use #c-<id>, projects use #p-<id>, so a
   product page has its own link you can share.
   PDP.register("c", id => ({ accent, iconHTML, eyebrow, title, tag, bodyHTML, boxHTML }))
   ========================================================= */
const PDP = (() => {
  const makers = {};
  let el, last = null;
  const X = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  function ensure(){
    if (el) return el;
    document.body.insertAdjacentHTML("beforeend", `<div class="pdp" id="pdp" role="dialog" aria-modal="true" aria-hidden="true" data-noshot><button class="pdp-close" type="button" aria-label="Close">${X}</button><div class="pdp-inner"></div></div>`);
    el = document.getElementById("pdp");
    el.querySelector(".pdp-close").addEventListener("click", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && el.classList.contains("open")) close(); });
    return el;
  }
  function show(prefix, id){
    const d = makers[prefix] && makers[prefix](id);
    if (!d) return false;
    const o = ensure();
    o.style.setProperty("--ac", d.accent || "#8a6a26");
    o.querySelector(".pdp-inner").innerHTML = `
      <div class="pdp-hero"><div class="icon">${d.iconHTML || ""}</div>
        <div class="wrap"><div class="eyebrow">${d.eyebrow || ""}</div><h2>${d.title}</h2>${d.tag ? `<p class="tag">${d.tag}</p>` : ""}</div></div>
      <div class="wrap pdp-body"><div class="pdp-main">${d.bodyHTML || ""}</div><aside class="buybox">${d.boxHTML || ""}</aside></div>`;
    o.classList.remove("open"); void o.offsetWidth;   // restart the fade
    o.scrollTop = 0; o.classList.add("open"); o.setAttribute("aria-hidden", "false");
    document.body.classList.add("pdp-lock");
    o.querySelector(".pdp-close").focus({ preventScroll: true });
    if (d.after) d.after(o);
    return true;
  }
  function hide(){
    if (!el) return;
    el.classList.remove("open"); el.setAttribute("aria-hidden", "true");
    document.body.classList.remove("pdp-lock");
    if (last && last.isConnected) last.focus({ preventScroll: true });
  }
  function route(){
    const m = location.hash.match(/^#([a-z])-([\w-]+)$/);
    if (m && makers[m[1]]) show(m[1], m[2]); else hide();
  }
  function open(prefix, id){
    last = document.activeElement;
    try { history.pushState(null, "", "#" + prefix + "-" + id); } catch (e) {}
    show(prefix, id);
  }
  function close(){
    if (/^#[a-z]-/.test(location.hash)) {
      try { history.pushState(null, "", location.pathname + location.search); } catch (e) {}
    }
    hide();
  }
  window.addEventListener("popstate", route);
  window.addEventListener("hashchange", route);
  return { register(prefix, fn){ makers[prefix] = fn; }, open, close, route };
})();

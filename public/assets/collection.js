/* =========================================================
   KEYS TO THE RACE: THE COLLECTION
   Every project, shown like a storefront. Each capsule opens a
   full product page that fades up over the site (#p-<id>).
   To add a project, add an entry here; status is
   "live", "beta" or "soon".
   ========================================================= */
const ICONS = {
  florida: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M8 14h22l2 3h10l3 4 3 8 4 7 2 9-2 7-4 2-3-4-4-3-2-6-5-6-3-7-4-4-6 1-6-2-7-1z"/><circle cx="46" cy="53" r="1.6" fill="currentColor"/><circle cx="41" cy="55" r="1.2" fill="currentColor"/><circle cx="36" cy="56.5" r="1" fill="currentColor"/></svg>`,
  dial: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 44a22 22 0 1 1 44 0"/><path d="M32 44l11-13"/><circle cx="32" cy="44" r="3" fill="currentColor"/><path d="M14 44h4M46 44h4M32 22v4M19 29l3 3M45 29l-3 3"/></svg>`,
  bars: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 52h44"/><rect x="14" y="30" width="7" height="22" rx="1.5"/><rect x="28.5" y="18" width="7" height="34" rx="1.5"/><rect x="43" y="36" width="7" height="16" rx="1.5"/><path d="M12 22l14-8 10 6 16-10"/></svg>`,
  map: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M8 16l14-5 20 6 14-5v37l-14 5-20-6-14 5z"/><path d="M22 11v37M42 17v37"/></svg>`,
  star: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M32 8l6.5 15.5L55 25l-12.5 11L46 53 32 44.5 18 53l3.5-17L9 25l16.5-1.5z"/></svg>`,
  dome: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 30a18 18 0 0 1 36 0"/><path d="M32 8v4M29 12h6"/><path d="M10 30h44M14 30v18M22 30v18M32 30v18M42 30v18M50 30v18M8 52h48M10 48h44"/></svg>`,
  seats: `<svg viewBox="0 0 64 64" fill="currentColor"><g opacity=".9">${[...Array(5)].map((_, r) => [...Array(7 + r * 2)].map((_, i, a) => { const ang = Math.PI * (i / (a.length - 1)); const R = 10 + r * 5; return `<circle cx="${(32 - Math.cos(ang) * R).toFixed(1)}" cy="${(48 - Math.sin(ang) * R).toFixed(1)}" r="1.6"/>`; }).join("")).join("")}</g></svg>`,
  grid: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 10h44v44H10z"/><path d="M10 25h18v-15M28 25l12 8v21M40 33h14M28 25v12H10M22 37v17M40 44H22"/><circle cx="34" cy="40" r="3" fill="currentColor"/></svg>`,
  whip: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="10" width="40" height="46" rx="4"/><path d="M22 10V6h20v4"/><path d="M20 24l3 3 6-6M20 36l3 3 6-6M20 48h8M34 25h10M34 37h10M34 48h10"/></svg>`,
  vote: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 34h44v20H10z"/><path d="M22 34l-4-8h28l-4 8"/><path d="M24 22l8-14 10 6-6 10"/><path d="M26 44h12"/></svg>`,
  clock: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="32" cy="34" r="22"/><circle cx="32" cy="34" r="17" opacity=".5"/><path d="M32 22v12l8 5"/><path d="M26 8h12M32 8v4"/></svg>`
};

const COLLECTION = [
  { id: "fvt-2026", name: "Florida Vote Tracker 2026", created: "July 2026", ended: "November 2026", edition: "Archive Edition", icon: "florida", accent: "#1f8f84", status: "live", page: "florida/#tracker-2026", line: "The Florida Keys",
    tag: "Every county's 2026 turnout, preserved.",
    desc: "The 2026 Florida Vote Tracker, moving here from its current site and kept as a permanent archive: county turnout and the D vs R vs NPA margins from 2026.",
    features: ["Turnout for all 67 counties", "D vs R vs NPA margins", "Kept as a permanent record of 2026"] },
  { id: "forecast-builder", name: "Build Your Own Forecast", edition: "Florida Edition", icon: "dial", accent: "#8a6a26", status: "live", page: "florida/#forecast", line: "The Florida Keys",
    tag: "Set the environment. Watch the state move.",
    desc: "Pick a starting point for each county and a statewide environment, and see how Florida comes out. Built for the 2026 tracker and moving here with it.",
    features: ["Set a starting point for every county", "Dial a statewide environment and watch the total move", "Moving here with the 2026 tracker"] },
  { id: "key-polls", name: "Key Polls", edition: "2028 Edition", icon: "bars", accent: "#2f6f5a", status: "beta", page: "polls/", line: "National",
    tag: "Every 2028 poll, weighted by pollster grade.",
    desc: "Primary and general election polling averages. Each pollster's latest poll in the last 30 days counts once, weighted by its grade: A polls count fully, D polls a quarter.",
    features: ["Democratic and Republican primary averages", "General election matchups, head to head", "Pollster grade on every poll (A 1.00, B 0.85, C 0.65, D 0.25)", "Full poll log with sources"] },
  { id: "key-matchups", name: "Key Matchups", edition: "Electoral Analysis", icon: "map", accent: "#4b3d8f", status: "beta", page: "matchups/", line: "National",
    tag: "Build the map. Pick the primaries.",
    desc: "A clickable general election map that starts from 2024, plus a primary map for both parties and the 2028 Senate matchups.",
    features: ["Click a state to cycle its rating", "Maine and Nebraska districts included", "Primary map colored by the poll leaders", "2028 Senate race matchups"] },
  { id: "market", name: "The Candidate Market", edition: "Founding Edition", icon: "star", accent: "#8a6a26", status: "beta", page: "candidates/", line: "National",
    tag: "Every 2028 hopeful, scored and tracked daily.",
    desc: "The Candidate Index gives each 2028 hopeful a score for where they stand and how viable they are: their share of their party's support, adjusted for how likely they are to run and for the news. Endorsements, money and the Launch Watch score join as each tracker opens.",
    features: ["An Index score for every candidate", "Polling tiers in plain words", "A product page for every candidate", "Launch Watch: who's likely to run (coming)"] },
  { id: "forecast-2028", name: "2028 Forecast", edition: "Presidential", icon: "dome", accent: "#7a2f2b", status: "soon", page: "races/", line: "National",
    tag: "Who wins the nomination, and the White House.",
    desc: "A full forecast model for both primaries and the general election, built on the Candidate Index and the polling averages. Odds for every candidate and every state.",
    features: ["Nomination odds for each party", "State-by-state general election odds", "Thousands of simulated elections", "Daily updates once primaries are close"] },
  { id: "senate-2028", name: "Senate 2028", edition: "Path to the Majority", icon: "seats", accent: "#2f4f8f", status: "soon", page: "races/#senate", line: "National",
    tag: "Every seat. Every path to 51.",
    desc: "A probability tracker for every 2028 Senate race and the paths each party has to the majority.",
    features: ["Odds for every seat up in 2028", "Paths to the majority, ranked", "Candidate matchups and primary polling"] },
  { id: "fl-legislature", name: "Florida Legislature", edition: "120 House · 40 Senate", icon: "seats", accent: "#1f6f84", status: "soon", page: "florida/#legislature", line: "The Florida Keys",
    tag: "All 160 seats in Tallahassee.",
    desc: "Every seat in the Florida House and Senate: who holds it, how it voted last time, and every special election.",
    features: ["All 120 House and 40 Senate seats", "Member profiles and margins", "Special election results", "Leadership and party control"] },
  { id: "key-tools", name: "Key Tools", edition: "Models & Methods", icon: "grid", accent: "#6a2f5a", status: "beta", page: "tools/", line: "National",
    tag: "Will they run, and why.",
    desc: "The chain reaction from a quote to the Index, Launch Watch for every hopeful, the Decision Maze behind it, and the Primary Path after the announcements.",
    features: ["The chain: news or a quote, the maze, the odds, the Index", "Launch Watch and the Statement Scale", "Early states, Super Tuesday and dropout transfers"] },
  { id: "countdown", name: "Key Dates", edition: "The Calendar", icon: "clock", accent: "#7a5a1e", status: "beta", page: "dates/", line: "National",
    tag: "Every date that matters, counting down.",
    desc: "The countdown to the 2028 election and every filing deadline, debate and primary along the way.",
    features: ["Countdown to Election Day 2028", "Primary and caucus calendar", "Debate dates and qualifying rules"] },
  { id: "the-29th-vote", name: "The 29th Vote", edition: "Companion Site", icon: "vote", accent: "#2e5f8f", status: "live", url: "https://jaysonfrascatore.github.io/The29thVote/", line: "Companion",
    tag: "The sister project.",
    desc: "The 29th Vote, a separate site by the same creator. Its clean design is where Keys to the Race's look started.",
    features: ["Opens in a new tab", "Same creator, same standards"] }
];

const SHELF_STATUS = { live: ["Available now", "live"], beta: ["Early access", "beta"], soon: ["Coming soon", "soon"] };
const linkFor = (p, root) => p.url || (pageLink(root, p.page.split("#")[0]) + (p.page.includes("#") ? "#" + p.page.split("#")[1] : ""));

function capsule(p){
  const [label, cls] = SHELF_STATUS[p.status];
  return `<button class="capsule" type="button" data-p="${p.id}" style="--ac:${p.accent}" aria-label="${p.name}: ${label}">
    <div class="art"><span class="badge ${cls}">${label}</span>${ICONS[p.icon]}<span class="tt">${p.name}</span></div>
    <div class="cap-body"><p>${p.tag}</p><div class="cap-meta"><span>${p.created ? (p.ended ? `${p.created} – ${p.ended}` : `Since ${p.created}`) : p.line}</span><b>${p.status === "soon" ? "Coming soon" : "Open"}</b></div></div>
  </button>`;
}

function renderCollection(sel, filter){
  const host = document.querySelector(sel);
  const list = filter ? COLLECTION.filter(filter) : COLLECTION;
  host.innerHTML = list.map(capsule).join("");
  host.addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (b) PDP.open("p", b.dataset.p); });
}

PDP.register("p", id => {
  const p = COLLECTION.find(x => x.id === id); if (!p) return null;
  const root = window.PAGE_ROOT || "../";
  const [label] = SHELF_STATUS[p.status];
  const href = linkFor(p, root);
  const ext = !!p.url;
  return {
    accent: p.accent, iconHTML: ICONS[p.icon],
    eyebrow: p.line, title: p.name, tag: p.tag,
    bodyHTML: `<h3>About</h3><p>${p.desc}</p><h3 style="margin-top:28px">What's inside</h3><ul>${p.features.map(f => `<li>${f}</li>`).join("")}</ul>`,
    boxHTML: `
      <div class="eyebrow">Status</div><div class="status">${label}</div>
      ${p.created ? `<dl><dt>Created</dt><dd>${p.created}</dd>${p.ended ? `<dt>Ended</dt><dd>${p.ended}</dd>` : ""}</dl>` : `<div style="height:14px"></div>`}
      ${p.status === "soon"
        ? `<a class="btn-gold" href="${href}">Preview the page</a><p class="fine">In the workshop now.</p>`
        : `<a class="btn-gold" href="${href}" ${ext ? 'target="_blank" rel="noopener"' : ""}>${ext ? "Visit site" : "Open"}</a>`}`,
    after: o => o.querySelectorAll(".buybox a:not([target])").forEach(a => a.addEventListener("click", () => PDP.close()))
  };
});

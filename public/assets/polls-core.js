/* =========================================================
   UNLOCK THE COUNT: shared polling engine
   Used by Polls, Races and Matchups.
   Reads data/polls.csv + data/pollsters.csv, weights by pollster grade,
   and averages each pollster's latest poll in the window.
   ========================================================= */
/* =========================================================
   CONFIG
   ========================================================= */
const DATA_ROOT = window.DATA_ROOT || "../data/";
const DATA_URL = DATA_ROOT + "polls.csv";
const GRADES_URL = DATA_ROOT + "pollsters.csv";
/* Weight by pollster grade (letter only: A+ and A- count as A) */
const GRADE_WEIGHTS = { A: 1.00, B: 0.85, C: 0.65, D: 0.25 };
const NO_GRADE_WEIGHT = 0.25;
const TRACKING_STARTS = "2026-10-28";   // first field date that counts
const WINDOW_DAYS = 30;                 // average window
const TREND_TOP = 6;                    // lines drawn per party
const RACES = {
  dem_primary: { label: "Democratic primary", party: "D", color: "var(--dem)", hex: "#2F6FD0" },
  rep_primary: { label: "Republican primary", party: "R", color: "var(--rep)", hex: "#D64545" }
};
const TREND_COLORS = ["#16191d", "#12A6CC", "#8E5BC8", "#b7791f", "#2e9e5b", "#e76f51"];

/* =========================================================
   CSV
   ========================================================= */
function parseCSV(text){
  const rows = []; let row = [], cell = "", q = false;
  text = text.trim();
  for (let i = 0; i < text.length; i++){
    const ch = text[i];
    if (q){
      if (ch === '"' && text[i+1] === '"'){ cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ","){ row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r"){
      if (ch === "\r" && text[i+1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  row.push(cell); rows.push(row);
  const head = rows.shift().map(h => h.trim());
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h,i) => [h, (r[i] ?? "").trim()])));
}

async function loadCSV(url, fallbackId){
  try {
    if (window.FORCE_FALLBACK) throw new Error("standalone file");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    return parseCSV(await res.text());
  } catch (e) {
    return parseCSV(document.getElementById(fallbackId).textContent);
  }
}

let GRADES = {};
const gradeOf = pollster => GRADES[pollster] || "";
const letterOf = pollster => (gradeOf(pollster)[0] || "").toUpperCase();
const weightOf = pollster => GRADE_WEIGHTS[letterOf(pollster)] ?? NO_GRADE_WEIGHT;
const gradeBadge = pollster => {
  const g = gradeOf(pollster), L = letterOf(pollster);
  return `<span class="grade g${GRADE_WEIGHTS[L] != null ? L : "N"}" title="Weight ${weightOf(pollster).toFixed(2)}">${g || "—"}</span>`;
};

/* =========================================================
   DATA SHAPING
   ========================================================= */
const day = s => new Date(s + "T12:00:00");
const MS_DAY = 864e5;

function buildPolls(rows){
  const polls = {};
  rows.filter(r => r.start_date >= TRACKING_STARTS).forEach(r => {
    const p = polls[r.poll_id] ??= {
      id: r.poll_id, pollster: r.pollster, start: r.start_date, end: r.end_date,
      released: r.release_date, sample: +r.total_sample, sampleType: r.sample_type, moe: r.moe === "" ? NaN : +r.moe,
      population: {}, races: {}, sources: new Set()
    };
    const key = r.race === "general" ? `general:${r.matchup}` : r.race;
    p.population[key] = r.population;
    (p.races[key] ??= []).push({ name: r.candidate, party: r.party, pct: +r.pct, rounded: r.rounded === "1" });
    if (r.source_url) p.sources.add(r.source_url);
  });
  return Object.values(polls).sort((a,b) => b.end.localeCompare(a.end));
}

/* Average for one race as of a date: latest poll per pollster in window */
function averageAsOf(polls, race, asOf){
  const cutoff = day(asOf) - WINDOW_DAYS * MS_DAY;
  const latestByPollster = {};
  polls.forEach(p => {
    if (!p.races[race] || p.end > asOf || day(p.end) < cutoff) return;
    const cur = latestByPollster[p.pollster];
    if (!cur || p.end > cur.end) latestByPollster[p.pollster] = p;
  });
  const used = Object.values(latestByPollster);
  // Weighted by pollster grade. A candidate's average only uses the polls that asked about them.
  const sums = {}, wts = {}, meta = {};
  used.forEach(p => { const w = weightOf(p.pollster); p.races[race].forEach(c => {
    sums[c.name] = (sums[c.name] || 0) + w * c.pct;
    wts[c.name] = (wts[c.name] || 0) + w;
    meta[c.name] = { party: c.party, rounded: (meta[c.name]?.rounded || false) || c.rounded };
  }); });
  const list = Object.entries(sums).map(([name, s]) => ({ name, pct: s / wts[name], ...meta[name] }));
  const weight = used.reduce((t, p) => t + weightOf(p.pollster), 0);
  const moes = used.map(p => p.moe).filter(m => !isNaN(m));
  return { n: used.length, weight, list, used, moe: moes.length ? Math.max(...moes) : 3 };
}
const latestFor = (polls, race) => polls.filter(p => p.races[race]).map(p => p.end).sort().at(-1);
const confidence = w => w >= 2 ? ["high", "High confidence"] : w >= 1 ? ["med", "Medium confidence"] : ["low", "Low confidence"];

/* =========================================================
   FORMAT
   ========================================================= */
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fd = s => { const d = day(s); return `${MON[d.getMonth()]} ${d.getDate()}`; };
const range = (a,b) => {
  const A = day(a), B = day(b);
  return A.getMonth() === B.getMonth() ? `${fd(a)}–${B.getDate()}, ${B.getFullYear()}` : `${fd(a)} – ${fd(b)}, ${B.getFullYear()}`;
};
const pct = (v, r) => (Number.isInteger(v) || r ? v.toFixed(0) : v.toFixed(1)) + "%" + (r ? "*" : "");
const SOURCE_NAMES = { "pollcheck.co.uk": "PollCheck", "realclearpolling.com": "RealClearPolling", "yahoo.com": "USA Today", "atlasintel.org": "AtlasIntel", "data.ddhq.io": "DDHQ" };
const sourceName = u => { try { const h = new URL(u).hostname.replace("www.",""); return SOURCE_NAMES[h] || h; } catch { return "Source"; } };
const SHORT = { "Alexandria Ocasio-Cortez": "AOC" };  // short names for tight table cells
const last = s => s.split(" ").slice(-1)[0].replace(/\.$/, "") === "Jr" ? s.split(" ").slice(-2).join(" ") : s.split(" ").slice(-1)[0];


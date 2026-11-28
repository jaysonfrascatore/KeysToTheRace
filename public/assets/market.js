/* =========================================================
   UNLOCK THE COUNT: PRESIDENTIAL PROBABILITY (the data side)
   Builds every candidate from the poll and news files: their
   primary average, the Decision Maze readings, the chance they
   declare a candidacy (Presidential Probability), its daily
   history and the 11,111-run Monte Carlo behind the number.
   Nothing here is totaled into a score. The cards and pages
   that show it live in count.js.

   Needs: common.js, polls-core.js, and on the page
   <script type="text/plain" id="polls-fallback"> + id="pollsters-fallback".
   ========================================================= */

/* Polling tiers come from the candidate's primary polling average, in plain words.
   Change the cut-offs here. */
const TIERS = [
  { id: "serious", min: 20, label: "Front of the pack",   range: "20%+",   c: "var(--t4)", desc: "Polling at one in five or better. A real path to the nomination." },
  { id: "mid",     min: 10, label: "In the mix",          range: "10–19%", c: "var(--t3)", desc: "A solid base and a lane of their own, but not yet a front-runner." },
  { id: "single",  min: 1,  label: "Single digits",       range: "1–9%",   c: "var(--t2)", desc: "On the board and known, but needs a breakout moment to move up." },
  { id: "under",   min: -1, label: "Under 1%",            range: "<1%",    c: "var(--t1)", desc: "Named in the polls but barely registering yet, and quick to move." }
];
const tierOf = pct => TIERS.find(t => pct >= t.min);

/* Who they are, as of November 2026. Keep these short and factual. */
const PROFILES = {
  "Jon Ossoff":               { role: "U.S. Senator, Georgia",            from: "Georgia",        bio: "Georgia's senior senator, first elected in 2021 at age 33. A former investigative documentary producer before running for office." },
  "Alexandria Ocasio-Cortez": { role: "U.S. Representative, New York",    from: "New York",       bio: "Represents New York's 14th District in the House, first elected in 2018. One of the best-known progressives in Congress and a top fundraiser." },
  "Pete Buttigieg":           { role: "Former Transportation Secretary",  from: "Michigan",       bio: "Served as Secretary of Transportation from 2021 to 2025, after two terms as mayor of South Bend, Indiana. Ran for president in 2020 and won the most delegates in Iowa." },
  "Kamala Harris":            { role: "Former Vice President",            from: "California",     bio: "The 49th vice president (2021–2025) and the Democratic nominee in 2024. Before that, a U.S. senator and attorney general of California." },
  "Mark Kelly":               { role: "U.S. Senator, Arizona",            from: "Arizona",        bio: "Arizona senator since 2020. A retired Navy combat pilot and NASA astronaut who flew four Space Shuttle missions." },
  "Gavin Newsom":             { role: "Governor of California",           from: "California",     bio: "Governor of California since 2019, term-limited in January 2027. Previously lieutenant governor and mayor of San Francisco." },
  "Andy Beshear":             { role: "Governor of Kentucky",             from: "Kentucky",       bio: "Governor of Kentucky since 2019, reelected in 2023 in a state Trump won easily. His term ends in December 2027." },
  "Josh Shapiro":             { role: "Governor of Pennsylvania",         from: "Pennsylvania",   bio: "Governor of Pennsylvania since 2023 and reelected in November 2026. Previously the state's attorney general." },
  "JB Pritzker":              { role: "Governor of Illinois",             from: "Illinois",       bio: "Governor of Illinois since 2019. A businessman and philanthropist before taking office." },
  "Cory Booker":              { role: "U.S. Senator, New Jersey",         from: "New Jersey",     bio: "New Jersey senator since 2013 and a 2020 presidential candidate. Previously mayor of Newark." },
  "Gretchen Whitmer":         { role: "Governor of Michigan",             from: "Michigan",       bio: "Governor of Michigan since 2019, term-limited in January 2027. Previously the Democratic leader of the Michigan Senate." },
  "Marco Rubio":              { role: "Secretary of State",               from: "Florida",        bio: "Secretary of State since January 2025, after 14 years as a U.S. senator from Florida. Ran for president in 2016." },
  "JD Vance":                 { role: "Vice President",                   from: "Ohio",           bio: "The 50th vice president, in office since January 2025. Previously a U.S. senator from Ohio and author of Hillbilly Elegy." },
  "Ron DeSantis":             { role: "Governor of Florida",              from: "Florida",        bio: "Governor of Florida since 2019, term-limited in January 2027. Ran for president in 2024 and finished second in Iowa." },
  "Tucker Carlson":           { role: "Commentator",                      from: "Washington, D.C.", bio: "Host of The Tucker Carlson Show and a longtime cable news anchor. Has never run for office." },
  "Donald Trump Jr.":         { role: "Businessman",                      from: "New York",       bio: "Executive vice president of the Trump Organization and the president's eldest son. Has never run for office." },
  "Ted Cruz":                 { role: "U.S. Senator, Texas",              from: "Texas",          bio: "Texas senator since 2013 and runner-up for the 2016 Republican nomination. Previously Texas solicitor general." },
  "Glenn Youngkin":           { role: "Former Governor of Virginia",      from: "Virginia",       bio: "Governor of Virginia from 2022 to 2026. A former private-equity executive at the Carlyle Group." },
  "Josh Hawley":              { role: "U.S. Senator, Missouri",           from: "Missouri",       bio: "Missouri senator since 2019. Previously the state's attorney general." }
};
const slug = n => n.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
const initials = n => n.replace(/\bJr\.?/, "").split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 3).replace(/^(\w)\w?(\w)$/, "$1$2");
const MONO = { "Alexandria Ocasio-Cortez": "AOC", "JB Pritzker": "JBP", "JD Vance": "JDV", "Donald Trump Jr.": "DTJ" };
/* Headshots: see the note on photos just below.
   A candidate with no photo shows their initials instead. */
/* Candidate photos live in public/photos/, named by last name: Ossoff.png, Rubio.png, Vance.png.
   Two-word last names use an underscore (Van_Hollen.png); hyphens stay (Ocasio-Cortez.png);
   "Jr." becomes _Jr (Trump_Jr.png). PNG, WEBP or JPG all work. Drop a file in and it shows up
   on the next load; anyone without a photo gets their initials instead. */
const PHOTO_DIR = "photos/";
const PHOTO_TYPES = ["png", "webp", "jpg"];
const photoFile = name => name.split(" ").slice(1).join(" ").replace(/\./g, "").trim().replace(/\s+/g, "_");
const PHOTO_FOUND = {};
const photoSrc = id => PHOTO_FOUND[id] || null;
// Look for each candidate's photo once, before anything is drawn
async function findPhotos(list){
  const root = window.PAGE_ROOT || "../", inline = window.INLINE_PHOTOS || {};
  const probe = src => new Promise(ok => { const im = new Image(); const t = setTimeout(() => ok(false), 4000);
    im.onload = () => { clearTimeout(t); ok(true); }; im.onerror = () => { clearTimeout(t); ok(false); }; im.src = src; });
  await Promise.all(list.map(async c => {
    const file = photoFile(c.name);
    if (inline[file]) { PHOTO_FOUND[c.id] = inline[file]; return; }
    if (typeof Image === "undefined") return;
    for (const ext of PHOTO_TYPES) { const src = `${root}${PHOTO_DIR}${file}.${ext}`; if (await probe(src)) { PHOTO_FOUND[c.id] = src; return; } }
  }));
}
const medalInner = (c, size) => { const src = photoSrc(c.id); return src ? `<span class="ph"><img src="${src}" alt="${c.name}" loading="lazy"></span>` : `<b${size ? ` style="font-size:${size}"` : ""}>${c.mono}</b>`; };
const PARTY_HEX = { D: "#3d6fc4", R: "#b8443f" };
const PARTY_NAME = { D: "Democratic", R: "Republican" };

/* ---------- How status and news move the score ----------
   Each candidate's strength on a day =
     poll share  ×  status weight  ×  (1 + news boost)
   then every party is put back to 100.
   • Status: declaring lifts a candidate's weight from 0.80 to 1.00,
     which is the jump on announcement day. Ruling out a run drops it.
   • News: each item in data/news.csv can carry an impact (0.06 = +6%
     strength). It fades by half every NEWS_HALF_LIFE days. */
const STATUS = {
  undeclared: { label: "Not declared", w: 0.80 },
  exploring:  { label: "Exploring a run", w: 0.90 },
  declared:   { label: "Declared", w: 1.00 },
  ruled_out:  { label: "Ruled out a run", w: 0.15 },
  dropped:    { label: "Dropped out", w: 0.00 }
};
const NEWS_HALF_LIFE = 10;

/* =========================================================
   LAUNCH WATCH: THE DECISION MAZE
   Will they declare a candidacy? Every element sits on a ring of the maze,
   from the center (small, local signals) to the exit (big, national ones).
   The farther out the ring, the more it weighs.

   Each element has a WEIGHT (Jayson's scale) and a reading from −1 to +1
   for each candidate (or a count, for trips). Points = weight × reading.
   Points come in two kinds:
     INTENT   — are they getting ready to run? (trips, ads, books, money, words)
     STRENGTH — could they win if they ran?   (polls, favorability, home state…)
   Intent is the direct evidence, so it counts more toward the odds:
     P(run) = logistic( logit(25%) + 0.50 × intent points + 0.20 × strength points )
   The exit is the announcement: declaring = 100% yes. Ruling out a run sets it
   to 3% until they reverse. (Scandals and debates belong to later stages.)
   ========================================================= */
const MAZE = {
  base: 0.25,               // before any evidence: about 1 in 4 names this early ends up running
  intentScale: 0.50,        // log-odds per intent point
  strengthScale: 0.20,      // log-odds per strength point
  ruledOut: 0.03,
  keyStates: ["IA", "NH", "SC", "NV", "OH", "TX", "MI", "PA"],
  // ring: 1 = center (smallest) … 7 = the last ring before the exit (biggest)
  elements: [
    { id: "noise",       ring: 1, w: 0.25, kind: "intent",   label: "Noise",                         level: "Local",    how: "Chatter, rumors and minor mentions. Each item ±1." },
    { id: "book",        ring: 2, w: 0.50, kind: "intent",   label: "Book",                          level: "Personal", how: "A book or national book tour. 1 if yes." },
    { id: "statement",   ring: 7, w: 2.00, kind: "intent",   label: "Statement",                     level: "Personal", how: "What they say on the record about running, read on the Statement Scale from +1 (preparing to run) to −1 (a binding pledge not to). Their strongest statement counts in full, the next half, then a quarter. A statement the other way wipes the slate." },
    { id: "favorability",ring: 2, w: 0.50, kind: "strength", label: "Favorability",                  level: "Personal", how: "Net favorability among their own party: +20 or better = +1, even = 0, −20 or worse = −1." },
    { id: "congress",    ring: 2, w: 0.50, kind: "strength", label: "Congress role",                 level: "Personal", how: "Sitting member of Congress with a national platform. 1 if yes." , suggest: 0.5, why: "About right. A big platform helps, but Senate votes also keep them in Washington and off the trail." },
    { id: "national",    ring: 2, w: 0.50, kind: "strength", label: "National figure",                level: "National", how: "Has run nationally, held national office, or is a household name. 1 if yes." , suggest: 1.0, why: "It's a national-level element, so it belongs on an outer ring. Name recognition is most of what early primary polls measure." },
    { id: "govFormer",   ring: 2, w: 0.50, kind: "strength", label: "Former office",                 level: "National", how: "Government Ranking of the highest job they held before. It counts only when it ranks above their current job." },
    { id: "lastElection",ring: 3, w: 0.75, kind: "strength", label: "Last election",                 level: "State",    how: "Their last general election before 2026: won by 10+ = +1, won by less = +0.5, lost by less than 10 = −0.5, lost by 10+ = −1. Anyone on the 2026 ballot is scored by the midterms instead." },
    { id: "ads",         ring: 3, w: 0.75, kind: "intent",   label: "Out of state ads",              level: "State",    how: "Paying for ads outside their home state to build name recognition. Each state +1." },
    { id: "fundraising", ring: 3, w: 0.75, kind: "intent",   label: "Fundraising",                   level: "National", how: "Money raised compared with the field: top of the field = +1, middle = 0, bottom = −1." , suggest: 1.25, why: "Money is the best early sign of a real campaign: you can't hire staff or buy ads without it." },
    { id: "polling",     ring: 4, w: 1.00, kind: "strength", label: "Midterm polling",               level: "National", how: "Primary average since the midterms: 20% or more = +1, 10% = 0, 0% = −1." },
    { id: "travel",      ring: 4, w: 1.00, kind: "intent",   label: "Early state trips",              level: "State",    how: "Each of IA, NH, OH, SC, NV, TX, MI and PA visited (outside their home state) = 1." , suggest: 1.0, why: "Suggested: 1.00 for Iowa, New Hampshire, South Carolina and Nevada (the early states), but 0.50 for Ohio and Texas, which are fundraising stops more than proving grounds." },
    { id: "govCurrent",  ring: 4, w: 1.00, kind: "strength", label: "Current office",                level: "National", how: "Government Ranking of the job they hold now: Vice President 1.00, Cabinet 0.85, Senator 0.75, Governor 0.70, House 0.45, Mayor 0.30, never elected 0." },
    { id: "homeState",   ring: 5, w: 1.25, kind: "strength", label: "Home state",                    level: "State",    how: "A battleground (+0.5) and a big state with 15+ electoral votes (+0.5)." },
    { id: "midterms",    ring: 6, w: 1.50, kind: "strength", label: "2026 midterms",                  level: "National", how: "Won their own race = +1. Campaigned for the party across states = +0.5. Lost = −1." , suggest: 1.5, why: "Keep it big, but score the person's own midterm (their race and who they campaigned for). The party-wide environment belongs in the general election forecast." },

  ],
  // Standing facts for each candidate (readings from −1 to +1). Anything not listed is 0.
  standing: {
    "Jon Ossoff":               { congress: 1, homeState: 1, midterms: 1, govCurrent: 0.75 },
    "Alexandria Ocasio-Cortez": { congress: 1, national: 1, homeState: 0.5, midterms: 0.5, govCurrent: 0.45 },
    "Pete Buttigieg":           { national: 1, homeState: 1, midterms: 0.5, govFormer: 0.85, lastElection: 1 },
    "Kamala Harris":            { national: 1, homeState: 0.5, midterms: 0.5, govFormer: 1.0, lastElection: -0.5 },
    "Mark Kelly":               { congress: 1, homeState: 0.5, midterms: 0.5, govCurrent: 0.75, lastElection: 0.5 },
    "Gavin Newsom":             { national: 1, homeState: 0.5, midterms: 0.5, govCurrent: 0.7, lastElection: 1 },
    "Andy Beshear":             { govCurrent: 0.7, lastElection: 0.5 },
    "Josh Shapiro":             { homeState: 1, midterms: 1, govCurrent: 0.7 },
    "JB Pritzker":              { homeState: 0.5, govCurrent: 0.7 },
    "Cory Booker":              { congress: 1, national: 1, govCurrent: 0.75 },
    "Gretchen Whitmer":         { homeState: 1, govCurrent: 0.7, lastElection: 1 },
    "Marco Rubio":              { national: 1, homeState: 0.5, govCurrent: 0.85, lastElection: 1 },
    "JD Vance":                 { national: 1, homeState: 0.5, govCurrent: 1.0, lastElection: 0.5 },
    "Ron DeSantis":             { national: 1, homeState: 0.5, govCurrent: 0.7, lastElection: 1 },
    "Tucker Carlson":           { national: 1 },
    "Donald Trump Jr.":         { national: 1, homeState: 0.5 },
    "Ted Cruz":                 { congress: 1, national: 1, homeState: 0.5, govCurrent: 0.75, lastElection: 0.5 },
    "Glenn Youngkin":           { govFormer: 0.7, lastElection: 0.5 },
    "Josh Hawley":              { congress: 1, govCurrent: 0.75, lastElection: 1 }
  },
  home: { "Jon Ossoff": "GA", "Alexandria Ocasio-Cortez": "NY", "Pete Buttigieg": "MI", "Kamala Harris": "CA", "Mark Kelly": "AZ", "Gavin Newsom": "CA",
    "Andy Beshear": "KY", "Josh Shapiro": "PA", "JB Pritzker": "IL", "Cory Booker": "NJ", "Gretchen Whitmer": "MI", "Marco Rubio": "FL", "JD Vance": "OH",
    "Ron DeSantis": "FL", "Tucker Carlson": "DC", "Donald Trump Jr.": "FL", "Ted Cruz": "TX", "Glenn Youngkin": "VA", "Josh Hawley": "MO" },
  // Facts that need a source before they count. Each sits in the PDP until it's sourced.
  notes: {
    "Marco Rubio": "Said in 2025 he would back Vance if Vance runs. Add it as a sourced statement (−1) to count it.",
    "Gavin Newsom": "Said in September 2026 he would not run if Harris launches a campaign."
  }
};
// Standing facts that only start counting on a date (the midterms count from Election Day)
MAZE.standingFrom = { midterms: "2026-11-03" };
const MAZE_BY_ID = Object.fromEntries(MAZE.elements.map(e => [e.id, e]));

/* ---------- The Statement Scale: what a candidate says about running ----------
   Same idea as The 29th Vote: a public statement is the heaviest signal (weight 2.00),
   and every statement is logged with its date, its words and its reading.
     • Each statement gets one reading from the scale below.
     • Same direction: the strongest counts in full, the next strongest half, then a quarter,
       and so on. Saying it again still moves the number, but less each time.
     • The other direction: a "yes" after a string of "no"s wipes the slate, and the
       earlier statements stop counting (and the reverse).
     • A reading of 0 (no comment) is logged but changes nothing.
     • "Reaffirms" ("my thinking has not changed") repeats their latest position. */
const STATEMENT_SCALE = [
  { id: "preparing",   r:  1.00, label: "Preparing to run",          eg: "“I'm putting a team together.”" },
  { id: "seriously",   r:  0.75, label: "Seriously considering",     eg: "“I'm more inclined than not.”" },
  { id: "considering", r:  0.50, label: "Considering it",            eg: "“I go back and forth.”" },
  { id: "timeline",    r:  0.25, label: "Sets a decision date",      eg: "“I'll decide at the beginning of the year.”" },
  { id: "deflect",     r:  0.00, label: "No comment",                eg: "“People don't want to hear about the next election.”" },
  { id: "focused",     r: -0.25, label: "Focused on the current job", eg: "“My focus is the job I have.”" },
  { id: "no_plans",    r: -0.50, label: "No plans to run",           eg: "“I have no plans to run.”" },
  { id: "backs_rival", r: -0.50, label: "Backs a rival",             eg: "“If they run, I'll support them.”" },
  { id: "not_running", r: -0.75, label: "Not running",               eg: "“I have zero interest in running.”" },
  { id: "pledge",      r: -1.00, label: "Binding pledge",            eg: "Pledges to serve a full term, or “I will not run.”" },
  { id: "reaffirm",    r: null,  label: "Reaffirms",                 eg: "“My thinking has not changed.” Repeats their latest position." }
];
const STATEMENT_BY_ID = Object.fromEntries(STATEMENT_SCALE.map(s => [s.id, s]));
// Turn a list of dated statements into one reading (see the rules above)
function statementReading(list){
  const counted = []; let dir = 0, lastR = 0;
  list.forEach(s => {
    const r = s.kind === "reaffirm" ? lastR : STATEMENT_BY_ID[s.kind].r;
    const item = { ...s, r, share: 0 };
    counted.push(item);
    if (!r) return;                                  // no comment: logged, nothing moves
    lastR = r;
    const d = Math.sign(r);
    if (d !== dir) { counted.forEach(c => { if (c !== item) c.share = 0, c.wiped = c.wiped || Math.sign(c.r) === -d; }); dir = d; }
  });
  const live = counted.filter(c => c.r && Math.sign(c.r) === dir && !c.wiped);
  live.slice().sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).forEach((c, k) => c.share = Math.pow(0.5, k));
  return { reading: live.reduce((t, c) => t + c.r * c.share, 0), list: counted };
}
// news.csv "signal" column → maze element and reading (statements use the scale above)
const SIGNAL_MAP = { travel: ["travel", 1], ads: ["ads", 1], book: ["book", 1], noise: ["noise", 1], noise_neg: ["noise", -1] };
STATEMENT_SCALE.forEach(s => SIGNAL_MAP[s.id] = ["statement", s.r]);
const LW_START = "2026-06-01";   // Presidential Probability is scored from here (the Statement Scale's first dated entries)
/* Presidential Probability: the chance each person declares a candidacy.
   Each candidate's maze gives a chance P. A seeded Monte Carlo then runs 11,111 times:
   each run draws a number and they declare when it lands under P. The share of runs where
   they declare is the figure on the card. Must match config/model.json (the tests check). */
const SIMULATIONS = 11111;
const CONTENDER_AT = 0.649;   // a label only: "Contender" once the chance is above 64.9%
const seedOf = s => { let h = 2166136261; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
function mulberry32(a){ return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function simulateDeclare(name, p, runs = SIMULATIONS){
  const r = mulberry32(seedOf(name)); let yes = 0, grid = [];
  for (let i = 0; i < runs; i++){ const y = r() < p; if (y) yes++; if (i < 100) grid.push(y); }
  return { yes, no: runs - yes, runs, odds: yes / runs, grid };
}
const PHASES = {
  watching:  { label: "Watching" },
  contender: { label: "Contender" },
  candidate: { label: "Candidate" },
  out:       { label: "Not running" }
};
const phaseOf = c => c.status === "declared" ? "candidate" : (c.status === "ruled_out" || c.status === "dropped") ? "out" : c.launch > CONTENDER_AT ? "contender" : "watching";

/* Announcement odds: the chance they announce in the next 30 days.
   = chance they run x the share of announcements that land in the next 30 days.
   The calendar is the usual timing of announcements in open-seat cycles (2008, 2016, 2020):
   most come January to April of the year before the election. Recent intent signals
   (trips, ads, statements in the last 30 days) speed it up. Must match config/model.json. */
const ANNOUNCE = {
  window: 30, boost: 0.35,
  calendar: { "2026-11": 1, "2026-12": 3, "2027-01": 12, "2027-02": 14, "2027-03": 14, "2027-04": 13, "2027-05": 10,
              "2027-06": 9, "2027-07": 8, "2027-08": 5, "2027-09": 4, "2027-10": 3, "2027-11": 2, "2027-12": 2 }
};
function announceShare(today, recentPts){
  let rem = 0, win = 0;
  for (const [ym, w] of Object.entries(ANNOUNCE.calendar)) {
    const [y, m] = ym.split("-").map(Number), dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (let d = 1; d <= dim; d++) {
      const iso = `${ym}-${String(d).padStart(2, "0")}`;
      if (iso < today) continue;
      rem += w / dim;
      if (daysBetween(today, iso) < ANNOUNCE.window) win += w / dim;
    }
  }
  const base = rem > 0 ? win / rem : 1;
  return 1 - Math.pow(1 - base, Math.exp(ANNOUNCE.boost * recentPts));
}
const logit = p => Math.log(p / (1 - p)), logistic = x => 1 / (1 + Math.exp(-x));
const pct2 = p => (p * 100).toFixed(2) + "%";
const SHARE_TEXT = sh => sh >= 1 ? "Full" : sh === 0.5 ? "Half" : sh === 0.25 ? "¼" : sh === 0.125 ? "⅛" : sh > 0 ? "1/" + Math.round(1 / sh) : "—";
const NEWS_URL = (window.DATA_ROOT || "../data/") + "news.csv";
// Append-only record of each day's Presidential Probability reading. Past days are read from here and never
// recomputed, so changing a weight later can't rewrite history (the same rule as The 29th Vote).
const LAUNCH_LOG_URL = (window.DATA_ROOT || "../data/") + "launch-log.csv";
// Stage 2 (the primaries) comes from the Python engine: python -m ktr run --env live
const PRIMARY_URL = (window.DATA_ROOT || "../data/") + "primary.json";
async function loadJSON(url, fallbackId){
  try {
    if (window.FORCE_FALLBACK) throw new Error("standalone file");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    const el = typeof document !== "undefined" && document.getElementById(fallbackId);
    const t = el && el.textContent.trim();
    return t ? JSON.parse(t) : null;
  }
}
const NEWS_TYPES = { poll: "Poll", election: "Election", announcement: "Announcement", endorsement: "Endorsement", economy: "Economy", news: "News", status: "Status" };
const iso = d => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 864e5);
const isNamed = c => !/^undecided|^other|^someone/i.test(c.name);

/* ---------- Build the market from the poll and news files ---------- */
async function loadMarket(){
  const [rows, graded, newsRows, logRows, primary] = await Promise.all([
    loadCSV(DATA_URL, "polls-fallback"), loadCSV(GRADES_URL, "pollsters-fallback"),
    loadCSV(NEWS_URL, "news-fallback").catch(() => []), loadCSV(LAUNCH_LOG_URL, "launch-log-fallback").catch(() => []),
    loadJSON(PRIMARY_URL, "primary-fallback").catch(() => null)]);
  const LOG = {}; logRows.forEach(r => { (LOG[r.candidate] = LOG[r.candidate] || {})[r.date] = +r.yes; });
  GRADES = Object.fromEntries(graded.map(g => [g.pollster, g.grade]));
  const polls = buildPolls(rows);
  const news = newsRows.filter(n => n.date && n.headline).map(n => ({ ...n, id: n.candidate ? slug(n.candidate) : "", impact: +n.impact || 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const M = { D: [], R: [], all: [], asOf: null, polls, news, days: [], primary };

  // Days run from the first poll to today
  const firsts = Object.keys(RACES).map(r => latestFor(polls, r) && polls.filter(p => p.races[r] && p.end >= TRACKING_STARTS).map(p => p.end).sort()[0]).filter(Boolean);
  const start = firsts.sort()[0];
  if (!start) return M;
  const lastData = [...polls.map(p => p.end), ...news.map(n => n.date)].sort().at(-1);
  const today = [iso(new Date()), lastData].sort().at(-1);
  for (let d = start; d <= today; d = addDays(d, 1)) M.days.push(d);
  M.today = today;
  // Presidential Probability runs on a longer calendar: from its first dated statements to today
  M.lwDays = []; for (let d = LW_START; d <= today; d = addDays(d, 1)) M.lwDays.push(d);
  M.whatIf = {};

  for (const [race, cfg] of Object.entries(RACES)) {
    const asOf = latestFor(polls, race); if (!asOf) continue;
    M.asOf = !M.asOf || asOf > M.asOf ? asOf : M.asOf;
    const avg = averageAsOf(polls, race, asOf);
    const named = avg.list.filter(isNamed);
    const total = named.reduce((t, c) => t + c.pct, 0) || 1;
    const names = named.map(c => c.name);
    // Poll share by day
    const shareByDay = {};
    let lastAvg = null;
    M.days.forEach(d => {
      const a = averageAsOf(polls, race, d);
      if (a && a.list.length) lastAvg = a;
      shareByDay[d] = lastAvg ? Object.fromEntries(lastAvg.list.filter(isNamed).map(c => [c.name, c.pct])) : null;
    });
    const statusOn = (name, d) => {
      let s = "undeclared";
      news.forEach(n => { if (n.candidate === name && n.status && STATUS[n.status] && n.date <= d) s = n.status; });
      return s;
    };
    // Presidential Probability: chance they declare, on day d
    // The maze, scored on day d
    const mazeOn = (name, pctNow, d, extra) => {
      const st = MAZE.standing[name] || {}, rows = [];
      const add = (id, reading, note, date) => { const e = MAZE_BY_ID[id]; rows.push({ id, e, reading, pts: e.w * reading, note, date }); };
      // Polling counts from the first 2028 primary poll on
      if (M.days[0] && d >= M.days[0]) add("polling", Math.max(-1, Math.min(1, (pctNow - 10) / 10)), `${pctNow.toFixed(1)}% primary average`);
      Object.entries(st).forEach(([id, r]) => { if (!MAZE.standingFrom[id] || d >= MAZE.standingFrom[id]) add(id, r, ""); });
      // Their own words: every dated statement, read together on the Statement Scale
      const said = news.filter(n => n.candidate === name && n.date <= d && STATEMENT_BY_ID[n.signal])
        .map(n => ({ date: n.date, kind: n.signal, text: n.headline, source: n.source, url: n.source_url }));
      if (extra) said.push(extra);
      const words = statementReading(said);
      if (said.length) rows.push({ id: "statement", e: MAZE_BY_ID.statement, reading: words.reading, pts: MAZE_BY_ID.statement.w * words.reading,
        note: `${said.length} statement${said.length === 1 ? "" : "s"} on the record`, words: words.list });
      const seenStates = new Set();
      news.forEach(n => {
        if (n.candidate !== name || !n.signal || n.date > d) return;
        const m = SIGNAL_MAP[n.signal]; if (!m || m[0] === "statement") return;
        if (m[0] === "travel") {
          const stt = (n.state || "").toUpperCase();
          if (!MAZE.keyStates.includes(stt) || stt === MAZE.home[name] || seenStates.has(stt)) return;
          seenStates.add(stt);
        }
        add(m[0], m[1], n.headline, n.date);
      });
      const intent = rows.filter(r => r.e.kind === "intent").reduce((t, r) => t + r.pts, 0);
      const strength = rows.filter(r => r.e.kind === "strength").reduce((t, r) => t + r.pts, 0);
      return { rows, intent, strength, x: logit(MAZE.base) + MAZE.intentScale * intent + MAZE.strengthScale * strength };
    };
    const launchOn = (name, pctNow, d, extra) => {
      const st = statusOn(name, d);
      if (st === "declared") return 1;
      if (st === "dropped") return 0;
      if (st === "ruled_out") return MAZE.ruledOut;
      return logistic(mazeOn(name, pctNow, d, extra).x);
    };
    // "What if they said this today?" Used by the Statement Scale tool
    named.forEach(c => { M.whatIf[c.name] = kind => launchOn(c.name, c.pct, today, { date: today, kind, text: "Hypothetical" }); });
    const pctOf = Object.fromEntries(named.map(c => [c.name, c.pct]));
    const boostOn = (name, d) => news.reduce((t, n) => n.candidate === name && n.impact && n.date <= d ? t + n.impact * Math.pow(0.5, daysBetween(n.date, d) / NEWS_HALF_LIFE) : t, 0);
    const list = named.map(c => {
      const logged = LOG[c.name] || {};
      const useLog = !window.IGNORE_LAUNCH_LOG;
      const launchHistory = M.lwDays.map(d => { const lg = useLog && d < today && logged[d] != null;
        return { d, v: lg ? logged[d] : launchOn(c.name, c.pct, d) * 100, logged: lg, rebuilt: d < (M.days[0] || today) }; });
      const maze = mazeOn(c.name, c.pct, today);
      const wordsRow = maze.rows.find(r => r.id === "statement");
      // Each statement, with how much the chance moved on the day it was made
      const statements = (wordsRow ? wordsRow.words : []).map(s => {
        const i = launchHistory.findIndex(h => h.d === s.date);
        return { ...s, label: STATEMENT_BY_ID[s.kind].label, move: i > 0 ? launchHistory[i].v - launchHistory[i - 1].v : null };
      });
      const ago = launchHistory[Math.max(0, launchHistory.length - 31)];
      const status = statusOn(c.name, today);
      // Intent signals from the last 30 days speed up the announcement clock
      const since = addDays(today, -ANNOUNCE.window);
      const recentPts = news.filter(n => n.candidate === c.name && n.date > since && n.date <= today && n.signal && SIGNAL_MAP[n.signal])
        .reduce((t, n) => { const [id, r] = SIGNAL_MAP[n.signal]; const e = MAZE_BY_ID[id]; return t + (e.kind === "intent" ? e.w * r : 0); }, 0);
      const launchNow = launchOn(c.name, c.pct, today);
      const announce30 = status === "declared" ? null : launchNow * announceShare(today, recentPts);
      const sim = simulateDeclare(c.name, launchNow);
      const pollRows = avg.used.filter(p => p.races[race].some(x => x.name === c.name)).map(p => ({
        pollster: p.pollster, end: p.end, start: p.start, n: p.sample, pop: p.population[race],
        pct: p.races[race].find(x => x.name === c.name).pct, rounded: p.races[race].find(x => x.name === c.name).rounded,
        sources: [...(p.sources || [])]
      }));
      return {
        id: slug(c.name), name: c.name, party: cfg.party, pct: c.pct, rounded: c.rounded,
        lead: Math.max(...named.map(x => x.pct)), total, fieldSize: named.length,
        pctHistory: M.days.map(d => ({ d, v: shareByDay[d] ? (shareByDay[d][c.name] || 0) : null })),
        sim, odds: sim.odds * 100, start: launchHistory[0].v,
        change: launchHistory.at(-1).v - launchHistory[0].v,
        status, statusLabel: STATUS[status].label, boost: boostOn(c.name, today),
        launch: launchNow, announce30, recentPts, launchHistory, maze, mazeNote: MAZE.notes[c.name] || "",
        launchChange: launchHistory.length > 1 ? launchHistory.at(-1).v - ago.v : 0, launchSince: ago && ago.d, statements,
        tier: tierOf(c.pct), meta: PROFILES[c.name] || { role: "", from: "", bio: "" }, mono: MONO[c.name] || initials(c.name),
        polls: pollRows, generals: [], news: news.filter(n => n.candidate === c.name),
        // The maze on any day (and with a hypothetical statement), for the chain reaction
        mazeAt: (d, extra) => mazeOn(c.name, c.pct, d, extra), launchAt: (d, extra) => launchOn(c.name, c.pct, d, extra),
        stage2: primary && primary.parties && primary.parties[cfg.party] ? primary.parties[cfg.party].candidates.find(x => x.name === c.name) || null : null
      };
    }).sort((a, b) => b.launch - a.launch || a.name.localeCompare(b.name));
    list.forEach((c, i) => c.rank = i + 1);
    M[cfg.party] = list;
  }
  M.all = [...M.D, ...M.R];
  await findPhotos(M.all);
  polls.forEach(p => Object.entries(p.races).forEach(([race, cs]) => {
    if (!race.startsWith("general:")) return;
    cs.forEach(me => {
      const c = M.all.find(x => x.name === me.name); if (!c) return;
      const opp = cs.find(o => o.name !== me.name);
      if (opp) c.generals.push({ opp: opp.name, oppParty: opp.party, me: me.pct, them: opp.pct, pollster: p.pollster, end: p.end });
    });
  }));
  return M;
}

/* ---------- Small helpers shared by the pages ---------- */
const price = v => v.toFixed(1);
function centerInRow(el){
  const row = el && el.parentElement; if (!row) return;
  const er = el.getBoundingClientRect(), rr = row.getBoundingClientRect();
  row.scrollLeft += (er.left + er.width / 2) - (rr.left + rr.width / 2);
}
/* Every day a candidate's chance moved, newest first, with what moved it */
function timelineFor(c, M){
  const h = c.launchHistory, out = [];
  const sum = m => m.rows.reduce((o, r) => (o[r.id] = (o[r.id] || 0) + r.pts, o), {});
  for (let i = 1; i < h.length; i++) {
    const d = h[i].d, mv = h[i].v - h[i - 1].v;
    const items = M.news.filter(n => n.candidate === c.name && n.date === d);
    const poll = d === M.days[0];
    const stand = Object.keys(MAZE.standing[c.name] || {}).filter(k => MAZE.standingFrom[k] === d);
    if (Math.abs(mv) < 0.005 && !items.length) continue;
    const A = sum(c.mazeAt(h[i - 1].d)), B = sum(c.mazeAt(d));
    const why = [...new Set([...Object.keys(A), ...Object.keys(B)])].map(id => ({ e: MAZE_BY_ID[id], d: (B[id] || 0) - (A[id] || 0) })).filter(x => Math.abs(x.d) > 1e-9);
    out.push({ d, before: h[i - 1].v, after: h[i].v, items, poll, stand, why, rebuilt: h[i].rebuilt });
  }
  return out.reverse();
}
function sourcesHTML(c){
  const seen = new Set(), news = c.news.filter(n => n.source_url && !seen.has(n.source_url) && seen.add(n.source_url)).sort((a, b) => a.date < b.date ? 1 : -1);
  const tools = pageLink(window.PAGE_ROOT || "../", "tools/");
  return `<div class="srcs">
    <div><h4>Polls</h4><ul>${c.polls.map(p => `<li><b>${p.pollster}</b> ${gradeBadge(p.pollster)} · ${range(p.start, p.end)} · ${pct(p.pct, p.rounded)}${p.sources.length ? " · " + p.sources.map((u, i) => `<a href="${u}" target="_blank" rel="noopener">${p.sources.length > 1 ? "Source " + (i + 1) : "Source"}</a>`).join(", ") : ""}</li>`).join("") || "<li>No polls yet</li>"}</ul></div>
    <div><h4>News and statements</h4><ul>${news.map(n => `<li><b>${fd(n.date)}</b> · <a href="${n.source_url}" target="_blank" rel="noopener">${n.source}</a>: ${n.headline}</li>`).join("") || "<li>Nothing on file yet</li>"}</ul></div>
    <div><h4>Method</h4><ul>
      <li>Weights: <a href="${tools}#maze">the Decision Maze in Tools</a></li>
      <li>Pollster grades: each grade and who gave it are listed in data/pollsters.csv (A 1.00, B 0.85, C 0.65, D 0.25)</li>
      <li>Data files: data/polls.csv, data/news.csv, data/launch-log.csv (append-only)</li>
    </ul></div></div>`;
}

/* =========================================================
   KEYS TO THE RACE: THE CANDIDATE MARKET
   Every candidate is shown like a fine product: an Index score,
   a profile, a tier and a Launch Watch reading. The score is not
   something anyone buys. It measures where a candidate stands and
   how viable they are.

   The base of the score is a candidate's grade-weighted
   primary average as a share of everyone named in that party's
   polls, so each party's scores add to 100. Status (how likely they
   are to run) and news adjust it daily. Endorsements, money and
   Launch Watch join the score as each tracker goes live
   (weights live in the methodology doc).

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
const medalInner = (c, size) => { const src = photoSrc(c.id); return src ? `<img src="${src}" alt="${c.name}" loading="lazy">` : `<b${size ? ` style="font-size:${size}"` : ""}>${c.mono}</b>`; };
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
   Will they run for president? Every element sits on a ring of the maze,
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
  // ring: 1 = center (smallest) … 6 = the exit (biggest). added: true = suggested, not in the original list
  elements: [
    { id: "noise",       ring: 1, w: 0.25, kind: "intent",   label: "Noise",                         level: "Local",    how: "Chatter, rumors and minor mentions. Each item ±1." },
    { id: "book",        ring: 2, w: 0.50, kind: "intent",   label: "Selling a book",                level: "Personal", how: "A book or national book tour. 1 if yes." },
    { id: "statement",   ring: 7, w: 2.00, kind: "intent",   label: "Their own words",               level: "Personal", how: "What they say on the record about running, read on the Statement Scale from +1 (preparing to run) to −1 (a binding pledge not to). Their strongest statement counts in full, the next half, then a quarter. A statement the other way wipes the slate." },
    { id: "favorability",ring: 2, w: 0.50, kind: "strength", label: "Favorability",                  level: "Personal", how: "Net favorability among their own party: +20 or better = +1, even = 0, −20 or worse = −1." },
    { id: "congress",    ring: 2, w: 0.50, kind: "strength", label: "Prominent role in Congress",    level: "Personal", how: "Sitting member of Congress with a national platform. 1 if yes." , suggest: 0.5, why: "About right. A big platform helps, but Senate votes also keep them in Washington and off the trail." },
    { id: "national",    ring: 2, w: 0.50, kind: "strength", label: "National figure",                level: "National", how: "Has run nationally, held national office, or is a household name. 1 if yes." , suggest: 1.0, why: "It's a national-level element, so it belongs on an outer ring. Name recognition is most of what early primary polls measure." },
    { id: "ads",         ring: 3, w: 0.75, kind: "intent",   label: "Ads in other states",           level: "State",    how: "Paying for ads outside their home state to build name recognition. Each state +1." },
    { id: "fundraising", ring: 3, w: 0.75, kind: "intent",   label: "Fundraising",                   level: "National", how: "Money raised compared with the field: top of the field = +1, middle = 0, bottom = −1." , suggest: 1.25, why: "Money is the best early sign of a real campaign: you can't hire staff or buy ads without it." },
    { id: "polling",     ring: 4, w: 1.00, kind: "strength", label: "Polling since the midterms",    level: "National", how: "Primary average: 20% or more = +1, 10% = 0, 0% = −1." },
    { id: "travel",      ring: 4, w: 1.00, kind: "intent",   label: "Trips to key states",           level: "State",    how: "Each of IA, NH, OH, SC, NV, TX, MI and PA visited (outside their home state) = 1." , suggest: 1.0, why: "Suggested: 1.00 for Iowa, New Hampshire, South Carolina and Nevada (the early states), but 0.50 for Ohio and Texas, which are fundraising stops more than proving grounds." },
    { id: "nextInLine",  ring: 4, w: 1.00, kind: "strength", label: "Next in line",                  level: "National", how: "Sitting vice president or the party's last nominee. 1 if yes.", added: true },
    { id: "homeState",   ring: 5, w: 1.25, kind: "strength", label: "Home state",                    level: "State",    how: "A battleground (+0.5) and a big state with 15+ electoral votes (+0.5)." },
    { id: "midterms",    ring: 6, w: 1.50, kind: "strength", label: "The 2026 midterms",             level: "National", how: "Won their own race = +1. Campaigned for the party across states = +0.5. Lost = −1." , suggest: 1.5, why: "Keep it big, but score the person's own midterm (their race and who they campaigned for). The party-wide environment belongs in the general election forecast." },

  ],
  // Standing facts for each candidate (readings from −1 to +1). Anything not listed is 0.
  standing: {
    "Jon Ossoff":               { congress: 1, homeState: 1, midterms: 1 },
    "Alexandria Ocasio-Cortez": { congress: 1, national: 1, homeState: 0.5, midterms: 0.5 },
    "Pete Buttigieg":           { national: 1, homeState: 1, midterms: 0.5 },
    "Kamala Harris":            { national: 1, nextInLine: 1, homeState: 0.5, midterms: 0.5 },
    "Mark Kelly":               { congress: 1, homeState: 0.5, midterms: 0.5 },
    "Gavin Newsom":             { national: 1, homeState: 0.5, midterms: 0.5 },
    "Andy Beshear":             {},
    "Josh Shapiro":             { homeState: 1, midterms: 1 },
    "JB Pritzker":              { homeState: 0.5 },
    "Cory Booker":              { congress: 1, national: 1 },
    "Gretchen Whitmer":         { homeState: 1 },
    "Marco Rubio":              { national: 1, homeState: 0.5 },
    "JD Vance":                 { national: 1, nextInLine: 1, homeState: 0.5 },
    "Ron DeSantis":             { national: 1, homeState: 0.5 },
    "Tucker Carlson":           { national: 1 },
    "Donald Trump Jr.":         { national: 1, homeState: 0.5 },
    "Ted Cruz":                 { congress: 1, national: 1, homeState: 0.5 },
    "Glenn Youngkin":           {},
    "Josh Hawley":              { congress: 1 }
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
const LW_START = "2026-06-01";   // Launch Watch is scored from here (the Statement Scale's first dated entries)
// The chain: news or a quote -> maze -> chance they run -> Index. The Index only unlocks once the
// chance they run is above 64.9% (or they declare). Must match config/model.json (the tests check).
const INDEX_UNLOCK = 0.649;
const indexUnlocked = c => c.status === "declared" || c.launch > INDEX_UNLOCK;
/* The Index unlocks in two stages:
     Watching   under 65% to run          Index locked
     Contender  above 64.9% to run        Contender Index (provisional)
     Candidate  formally declared         Candidate Index (official)
   Ruled out or dropped out: "Not running", Index locked. */
const PHASES = {
  watching:  { label: "Watching",    idx: "Index score",     next: "Contender at 65%" },
  contender: { label: "Contender",   idx: "Contender Index", next: "Candidate at declaration" },
  candidate: { label: "Candidate",   idx: "Candidate Index", next: "Fully unlocked" },
  out:       { label: "Not running", idx: "Index score",     next: "Closed" }
};
const phaseOf = c => c.status === "declared" ? "candidate" : (c.status === "ruled_out" || c.status === "dropped") ? "out" : c.launch > INDEX_UNLOCK ? "contender" : "watching";
const phasePill = c => { const ph = phaseOf(c); return `<span class="phase ${ph}">${PHASES[ph].label}</span>`; };

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
const LOCK = `<svg class="lock-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>`;
const UNLOCK = `<svg class="lock-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.8"/></svg>`;
// The Index cell: the number once unlocked, a lock and the distance to 65% before that
const idxText = c => indexUnlocked(c) ? price(c.index) : `<span class="locked-txt">${LOCK}Locked</span>`;
const toUnlock = c => Math.max(0, (INDEX_UNLOCK - c.launch) * 100 + 0.01);
const logit = p => Math.log(p / (1 - p)), logistic = x => 1 / (1 + Math.exp(-x));
const pct2 = p => (p * 100).toFixed(2) + "%";
const SHARE_TEXT = sh => sh >= 1 ? "Full" : sh === 0.5 ? "Half" : sh === 0.25 ? "¼" : sh === 0.125 ? "⅛" : sh > 0 ? "1/" + Math.round(1 / sh) : "—";
const NEWS_URL = (window.DATA_ROOT || "../data/") + "news.csv";
// Append-only record of each day's Launch Watch reading. Past days are read from here and never
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
  // Launch Watch runs on a longer calendar: from its first dated statements to today
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
    // Launch Watch: chance they run, on day d
    // Launch Watch: the maze, scored on day d
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
    const indexOn = (d, override = {}) => {
      const sh = shareByDay[d]; if (!sh) return null;
      // Until someone declares, their weight rises with their chance of running (0.60 at 0%, 1.00 at 100%)
      const weightOf = n => { const s = override[n] || statusOn(n, d); return s === "undeclared" || s === "exploring" ? 0.6 + 0.4 * launchOn(n, pctOf[n], d) : STATUS[s].w; };
      const st = Object.fromEntries(names.map(n => [n, (sh[n] || 0) * weightOf(n) * (1 + boostOn(n, d))]));
      const tt = Object.values(st).reduce((t, v) => t + v, 0) || 1;
      return Object.fromEntries(names.map(n => [n, st[n] / tt * 100]));
    };
    const byDay = M.days.map(d => ({ d, map: indexOn(d) }));
    const now = byDay.at(-1).map;
    const list = named.map(c => {
      const history = byDay.filter(x => x.map).map(x => ({ d: x.d, v: x.map[c.name] }));
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
      const ifDeclared = status === "declared" ? null : indexOn(today, { [c.name]: "declared" })[c.name];
      const pollRows = avg.used.filter(p => p.races[race].some(x => x.name === c.name)).map(p => ({
        pollster: p.pollster, end: p.end, start: p.start, n: p.sample, pop: p.population[race],
        pct: p.races[race].find(x => x.name === c.name).pct, rounded: p.races[race].find(x => x.name === c.name).rounded,
        sources: [...(p.sources || [])]
      }));
      return {
        id: slug(c.name), name: c.name, party: cfg.party, pct: c.pct, rounded: c.rounded,
        index: now[c.name], pollIndex: c.pct / total * 100, total, fieldSize: named.length,
        history, series: history.map(h => h.v), listed: history[0] && history[0].d,
        change: history.length > 1 ? history.at(-1).v - history[0].v : null,
        dayChange: history.length > 1 ? history.at(-1).v - history.at(-2).v : null,
        status, statusLabel: STATUS[status].label, ifDeclared, boost: boostOn(c.name, today),
        launch: launchNow, announce30, recentPts, launchHistory, maze, mazeNote: MAZE.notes[c.name] || "",
        launchChange: launchHistory.length > 1 ? launchHistory.at(-1).v - ago.v : 0, launchSince: ago && ago.d, statements,
        tier: tierOf(c.pct), meta: PROFILES[c.name] || { role: "", from: "", bio: "" }, mono: MONO[c.name] || initials(c.name),
        polls: pollRows, generals: [], news: news.filter(n => n.candidate === c.name),
        // The maze on any day (and with a hypothetical statement), for the chain reaction
        mazeAt: (d, extra) => mazeOn(c.name, c.pct, d, extra), launchAt: (d, extra) => launchOn(c.name, c.pct, d, extra),
        stage2: primary && primary.parties && primary.parties[cfg.party] ? primary.parties[cfg.party].candidates.find(x => x.name === c.name) || null : null
      };
    }).sort((a, b) => b.index - a.index);
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

/* ---------- Pieces ---------- */
const price = v => v.toFixed(1);
const bigNum = v => { const [a, b] = v.toFixed(1).split("."); return `${a}<span class="dec">.${b}</span>`; };
const signed = v => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1);
let _cid = 0;
/* A small stock chart for a card: gold area, line, blinking dot today */
function miniChart(c, h = 74){
  const w = 320, pt = 8, pb = 18, s = c.series;
  if (!s.length) return "";
  const lo = Math.min(...s), hi = Math.max(...s), pad = Math.max(0.6, (hi - lo) * 0.25);
  const y = v => pt + (1 - (v - (lo - pad)) / ((hi + pad) - (lo - pad))) * (h - pt - pb);
  const x = i => s.length === 1 ? w - 10 : 4 + i * (w - 14) / (s.length - 1);
  const pts = s.map((v, i) => [x(i), y(v)]);
  if (s.length === 1) pts.unshift([4, pts[0][1]]);
  const id = "mg" + (++_cid);
  const line = pts.map(p => p.map(n => n.toFixed(1)).join(",")).join(" ");
  const [ex, ey] = pts.at(-1);
  return `<svg class="mini" viewBox="0 0 ${w} ${h}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--gold)" stop-opacity=".35"/><stop offset="1" stop-color="var(--gold)" stop-opacity="0"/></linearGradient></defs>
    <line x1="0" x2="${w}" y1="${h - pb}" y2="${h - pb}" stroke="var(--line)"/>
    <polygon fill="url(#${id})" points="${pts[0][0]},${h - pb} ${line} ${ex},${h - pb}"/>
    <polyline fill="none" stroke="var(--gold)" stroke-width="2" stroke-linejoin="round" points="${line}"/>
    <circle class="halo" cx="${ex}" cy="${ey}" r="4" fill="none" stroke="var(--gold)" stroke-width="1.5"/><circle class="blink" cx="${ex}" cy="${ey}" r="4" fill="var(--gold)"/>
    <text x="2" y="${h - 4}">${fd(c.listed)}</text><text x="${w}" y="${h - 4}" text-anchor="end">Today</text></svg>`;
}
const sparkSVG = (series) => "";
/* The tracking chart on each card. Before the Index opens it tracks the chance they run,
   with the 65% Contender line drawn in. After, it tracks the Index out of 100.
   Hover (or touch) any day for the exact numbers. */
function trackChart(c, h = 92){
  const open = indexUnlocked(c), ph = phaseOf(c);
  const pts0 = open ? c.history : c.launchHistory.slice(-60);
  if (!pts0.length) return "";
  const s = pts0.map(p => p.v), gate = INDEX_UNLOCK * 100;
  const w = 320, pt = 10, pb = 18;
  let lo = Math.min(...s), hi = Math.max(...s);
  if (open) { const pad = Math.max(1, (hi - lo) * 0.3); lo = Math.max(0, lo - pad); hi = Math.min(100, hi + pad); }
  else { lo = Math.max(0, Math.min(lo, gate) - 6); hi = Math.min(100, Math.max(hi, gate) + 5); }
  const y = v => pt + (1 - (v - lo) / ((hi - lo) || 1)) * (h - pt - pb);
  const x = i => s.length === 1 ? w - 10 : 4 + i * (w - 14) / (s.length - 1);
  const pts = s.map((v, i) => [x(i), y(v)]);
  if (s.length === 1) pts.unshift([4, pts[0][1]]);
  const id = "mg" + (++_cid), line = pts.map(p => p.map(n => n.toFixed(1)).join(",")).join(" "), [ex, ey] = pts.at(-1);
  const now = s.at(-1);
  const title = open ? `${PHASES[ph].idx} by day` : "Chance they run, by day";
  // The head shows how far it has moved over the chart, since today's number sits right above it
  const mv = now - s[0], unit = open ? "" : " pts";
  const today = open ? `<small>Low</small> ${price(Math.min(...s))} <small>· High</small> ${price(Math.max(...s))}`
    : Math.abs(mv) < 0.005 ? `<small>Even since ${fd(pts0[0].d)}</small>`
    : `<span class="${mv > 0 ? "up" : "down"}">${mv > 0 ? "▲" : "▼"} ${Math.abs(mv).toFixed(open ? 1 : 2)}${unit}</span> <small>since ${fd(pts0[0].d)}</small>`;
  const data = pts0.map(p => [p.d, +p.v.toFixed(2)]);
  return `<div class="trk" data-mode="${open ? "index" : "launch"}" data-party="${c.party}" data-label="${open ? PHASES[ph].idx : "Chance they run"}" data-pts='${JSON.stringify(data)}'>
    <div class="trk-head"><span>${title}</span><b>${today}</b></div>
    <svg class="mini" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--gold)" stop-opacity=".35"/><stop offset="1" stop-color="var(--gold)" stop-opacity="0"/></linearGradient></defs>
    <line x1="0" x2="${w}" y1="${h - pb}" y2="${h - pb}" stroke="var(--line)"/>
    ${open ? "" : `<line x1="0" x2="${w}" y1="${y(gate).toFixed(1)}" y2="${y(gate).toFixed(1)}" stroke="var(--gold)" stroke-dasharray="4 4" opacity=".7"/><text x="${w}" y="${(y(gate) - 4).toFixed(1)}" text-anchor="end" class="gate-t">Contender ${gate.toFixed(0)}%</text>`}
    <polygon fill="url(#${id})" points="${pts[0][0]},${h - pb} ${line} ${ex},${h - pb}"/>
    <polyline fill="none" stroke="var(--gold)" stroke-width="2" stroke-linejoin="round" points="${line}"/>
    <line class="trk-x" x1="0" x2="0" y1="${pt}" y2="${h - pb}" stroke="var(--ink-3)" stroke-dasharray="3 3" opacity="0"/>
    <circle class="trk-dot" cx="0" cy="0" r="4" fill="var(--gold)" opacity="0"/>
    <circle class="halo" cx="${ex}" cy="${ey}" r="4" fill="none" stroke="var(--gold)" stroke-width="1.5"/><circle class="blink" cx="${ex}" cy="${ey}" r="4" fill="var(--gold)"/>
    <text x="2" y="${h - 4}">${fd(pts0[0].d)}</text><text x="${w}" y="${h - 4}" text-anchor="end">Today</text></svg>
    <div class="trk-tip" hidden></div>
  </div>`;
}
// One listener runs every tracking chart on the page, including ones drawn later
(function () {
  if (window._trkWired) return; window._trkWired = true;
  const move = e => {
    const el = e.target.closest && e.target.closest(".trk"); if (!el) return;
    const svg = el.querySelector("svg"), tip = el.querySelector(".trk-tip"), d = JSON.parse(el.dataset.pts);
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, px = (e.clientX - r.left) / r.width * vb.width;
    const n = d.length, i = n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round((px - 4) / ((vb.width - 14) / (n - 1)))));
    const poly = svg.querySelector("polyline").points, p = poly.getItem(n === 1 ? poly.numberOfItems - 1 : i);
    const xl = svg.querySelector(".trk-x"), dot = svg.querySelector(".trk-dot");
    xl.setAttribute("x1", p.x); xl.setAttribute("x2", p.x); xl.setAttribute("opacity", .7);
    dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y); dot.setAttribute("opacity", 1);
    const [day, v] = d[i], prev = i > 0 ? d[i - 1][1] : null, gate = INDEX_UNLOCK * 100;
    const ch = prev == null ? "" : Math.abs(v - prev) < 0.005 ? `<div>Change<span>No change</span></div>`
      : `<div>Change<span class="${v > prev ? "up" : "down"}">${v > prev ? "+" : "−"}${Math.abs(v - prev).toFixed(2)}</span></div>`;
    tip.innerHTML = el.dataset.mode === "index"
      ? `<b>${fd(day)}</b><div>${el.dataset.label}<span>${v.toFixed(1)} / 100</span></div>${ch}<p>100 is the most possible. All the ${el.dataset.party === "D" ? "Democrats" : "Republicans"} named add up to 100.</p>`
      : `<b>${fd(day)}</b><div>Chance they run<span>${v.toFixed(2)}%</span></div><div>Needed for Contender<span>${gate.toFixed(0)}%</span></div>${ch}`
        + (v > gate ? `<p>Above the line. The Index is open.</p>` : `<div>Still to go<span>${(gate - v + 0.01).toFixed(2)} pts</span></div><p>The Index stays locked until this passes 64.9%.</p>`);
    tip.hidden = false;
    const tw = tip.offsetWidth, left = p.x / vb.width * r.width;
    tip.style.left = Math.max(0, Math.min(r.width - tw, left - tw / 2)) + "px";
  };
  const leave = e => {
    const el = e.target.closest && e.target.closest(".trk"); if (!el || el.contains(e.relatedTarget)) return;
    el.querySelector(".trk-tip").hidden = true;
    el.querySelector(".trk-x").setAttribute("opacity", 0); el.querySelector(".trk-dot").setAttribute("opacity", 0);
  };
  document.addEventListener("pointermove", move, { passive: true });
  document.addEventListener("pointerdown", move, { passive: true });
  document.addEventListener("pointerout", leave, { passive: true });
})();
/* Launch Watch chart, 0 to 100%: "Yes" and "No" lines, a 50% line, today's dot blinking.
   Past points come from the append-only log (data/launch-log.csv) once it has them. */
function launchChart(host, c){
  const W = Math.max(320, host.clientWidth || 700), narrow = W < 560, H = narrow ? 260 : 320;
  const L = 42, R = narrow ? 92 : 120, T = 16, B = 34;
  const h = c.launchHistory, n = h.length;
  const x = i => L + (n === 1 ? (W - L - R) : i * (W - L - R) / (n - 1)), y = v => T + (1 - v / 100) * (H - T - B);
  let g = "";
  [0, 25, 50, 75, 100].forEach(v => g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 50 ? "var(--ink-3)" : "var(--line)"}" ${v === 50 ? 'stroke-dasharray="5 5"' : ""}/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`);
  g += `<text x="${W - R}" y="${y(50) - 6}" text-anchor="end" style="font-size:10.5px;font-weight:700;letter-spacing:.08em">50% · TOSS-UP</text>`;
  // The Index unlocks above 64.9%
  g += `<line x1="${L}" x2="${W - R}" y1="${y(INDEX_UNLOCK * 100)}" y2="${y(INDEX_UNLOCK * 100)}" stroke="var(--gold)" stroke-dasharray="2 4" opacity=".8"/><text x="${L + 8}" y="${y(INDEX_UNLOCK * 100) - 6}" style="font-size:10.5px;font-weight:800;letter-spacing:.08em;fill:var(--gold)">65% · INDEX UNLOCKS</text>`;
  const step = Math.max(1, Math.ceil(n / (narrow ? 4 : 7)));
  h.forEach((p, i) => { if ((i % step === 0 && n - 1 - i >= step * 0.6) || i === n - 1) g += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">${i === n - 1 ? "Today" : fd(p.d)}</text>`; });
  const line = (vals, col, w) => `<polyline fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" points="${vals.map((v, i) => x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ")}"/>`;
  const yes = h.map(p => p.v), no = h.map(p => 100 - p.v);
  // shaded gap between the lines
  g += `<polygon fill="var(--up)" opacity=".08" points="${yes.map((v, i) => x(i) + "," + y(v)).join(" ")} ${no.map((v, i) => x(i) + "," + y(v)).reverse().join(" ")}"/>`;
  // Days before the first 2028 poll are rebuilt from dated statements and news
  const rb = h.filter(p => p.rebuilt).length;
  if (rb > 1) g += `<rect x="${L}" y="${T}" width="${x(rb - 1) - L}" height="${H - T - B}" fill="var(--ink-3)" opacity=".05"/><text x="${L + 8}" y="${T + 14}" style="font-size:10px;font-weight:700;letter-spacing:.08em">REBUILT FROM DATED STATEMENTS</text>`;
  g += line(no, "var(--down)", 2.4) + line(yes, "var(--up)", 3);
  // A marker on the Yes line for every statement: green = toward running, red = away, gray = no comment
  const said = c.statements || [];
  said.forEach(st => { const k = h.findIndex(p => p.d === st.date); if (k < 0) return;
    const col = !st.r ? "var(--ink-3)" : st.r > 0 ? "var(--up)" : "var(--down)";
    g += `<line x1="${x(k)}" x2="${x(k)}" y1="${y(yes[k])}" y2="${H - B}" stroke="${col}" stroke-dasharray="2 3" opacity=".5"/><circle cx="${x(k)}" cy="${y(yes[k])}" r="7.5" fill="var(--panel)" stroke="${col}" stroke-width="2.4"/><text x="${x(k)}" y="${y(yes[k]) + 4}" text-anchor="middle" style="font-size:10.5px;font-weight:800;fill:${col}">${!st.r ? "·" : st.r > 0 ? "+" : "−"}</text>`; });
  const ey = y(yes.at(-1)), en = y(no.at(-1)), ex = x(n - 1);
  const sep = Math.abs(ey - en) < 26 ? (ey < en ? [-13, 13] : [13, -13]) : [0, 0];
  g += `<circle class="halo" cx="${ex}" cy="${ey}" r="5" fill="none" stroke="var(--up)" stroke-width="2"/><circle class="blink" cx="${ex}" cy="${ey}" r="5.5" fill="var(--up)"/>`;
  g += `<circle class="blink" cx="${ex}" cy="${en}" r="4.5" fill="var(--down)"/>`;
  g += `<text x="${ex + 12}" y="${ey + 4 + sep[0]}" style="fill:var(--up);font-weight:800;font-size:13px">Yes ${yes.at(-1).toFixed(2)}%</text>`;
  g += `<text x="${ex + 12}" y="${en + 4 + sep[1]}" style="fill:var(--down);font-weight:800;font-size:13px">No ${no.at(-1).toFixed(2)}%</text>`;
  g += `<line class="xh" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--ink-3)" stroke-dasharray="3 3" opacity="0"/>`;
  host.innerHTML = `<div class="chart-wrap"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Chance ${c.name} runs, by day">${g}</svg><div class="tip" hidden></div></div>`;
  const svg = host.querySelector("svg"), tip = host.querySelector(".tip"), xh = svg.querySelector(".xh");
  svg.addEventListener("pointermove", e => {
    const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W;
    const i = Math.max(0, Math.min(n - 1, Math.round((px - L) / ((W - L - R) / Math.max(1, n - 1)))));
    xh.setAttribute("x1", x(i)); xh.setAttribute("x2", x(i)); xh.setAttribute("opacity", .6);
    const st = said.filter(z => z.date === h[i].d);
    tip.innerHTML = `<b>${fd(h[i].d)}${h[i].rebuilt ? " · rebuilt" : ""}</b><div><i style="background:var(--up)"></i>Yes<span>${h[i].v.toFixed(2)}%</span></div><div><i style="background:var(--down)"></i>No<span>${(100 - h[i].v).toFixed(2)}%</span></div>`
      + st.map(z => `<p class="tip-q"><b>${z.label}</b>${z.text}${z.move != null ? `<em class="${z.move > 0 ? "up" : z.move < 0 ? "down" : ""}">${z.move >= 0 ? "+" : "−"}${Math.abs(z.move).toFixed(2)} pts that day</em>` : ""}</p>`).join("");
    tip.hidden = false; tip.style.left = Math.min(r.width - (st.length ? 250 : 160), Math.max(0, x(i) / W * r.width + 12)) + "px";
  });
  svg.addEventListener("pointerleave", () => { tip.hidden = true; xh.setAttribute("opacity", 0); });
}
function launchMini(c){
  const w = 520, h = 90, pt = 8, pb = 18, s = c.launchHistory.map(x => x.v);
  const lo = Math.max(0, Math.min(...s) - 8), hi = Math.min(100, Math.max(...s) + 8);
  const y = v => pt + (1 - (v - lo) / ((hi - lo) || 1)) * (h - pt - pb), x = i => s.length === 1 ? w - 8 : 4 + i * (w - 12) / (s.length - 1);
  const pts = s.map((v, i) => [x(i), y(v)]); const [ex, ey] = pts.at(-1);
  return `<svg class="mini" viewBox="0 0 ${w} ${h}" aria-hidden="true"><line x1="0" x2="${w}" y1="${y(50)}" y2="${y(50)}" stroke="var(--line-2)" stroke-dasharray="3 4"/><text x="${w}" y="${y(50) - 4}" text-anchor="end">50%</text>
    <polyline fill="none" stroke="var(--up)" stroke-width="2" points="${pts.map(p => p.map(n => n.toFixed(1)).join(",")).join(" ")}"/>
    <circle class="halo" cx="${ex}" cy="${ey}" r="4" fill="none" stroke="var(--up)" stroke-width="1.5"/><circle class="blink" cx="${ex}" cy="${ey}" r="4" fill="var(--up)"/>
    <text x="2" y="${h - 4}">${fd(c.launchHistory[0].d)}</text><text x="${w}" y="${h - 4}" text-anchor="end">Today</text></svg>`;
}   // kept for older pages
const changeText = c => c.change == null
  ? `<span style="color:var(--ink-3)">Listed ${fd(c.listed)}</span>`
  : Math.abs(c.change) < 0.05 ? `<span style="color:var(--ink-3)">Even since ${fd(c.listed)}</span>`
  : `<span class="${c.change >= 0 ? "up" : "down"}">${c.change >= 0 ? "▲" : "▼"} ${Math.abs(c.change).toFixed(1)}</span> <span style="color:var(--faint);font-weight:600">since ${fd(c.listed)}</span>`;
const tierPill = t => `<span class="tier" style="--tc:${t.c}">${t.label}</span>`;
// Launch Watch status in plain words: their latest word on running, or what the maze shows
const launchStatus = c => {
  if (c.status === "declared") return "Running";
  if (c.status === "ruled_out") return "Ruled it out";
  if (c.status === "dropped") return "Dropped out";
  const st = (c.statements || []).filter(s => s.r != null).at(-1);
  return st ? `${st.label} <span class="dd-sub">${fd(st.date)}</span>` : "No word yet";
};
// The Index field: locked, Contender Index, or Candidate Index
function indexField(c, big){
  const ph = phaseOf(c), P = PHASES[ph];
  if (ph === "contender" || ph === "candidate")
    return `<div><div class="lbl">${UNLOCK} ${P.idx}</div><b class="idx-num">${bigNum(c.index)}<span class="idx-max">/ 100</span></b></div>
      <div class="chg"><div class="lbl">${ph === "contender" ? "Provisional" : "Official"}</div>${changeText(c)}</div>`;
  if (ph === "out")
    return `<div><div class="lbl">Index score</div><b class="idx-num locked">${LOCK}<span>Closed</span></b></div><div class="chg"><div class="lbl">Not running</div><span class="gate-left">—</span></div>`;
  return `<div><div class="lbl">Index score</div><b class="idx-num locked">${LOCK}<span>Locked</span></b></div>
    <div class="chg"><div class="lbl">Chance they run</div><span class="gate-num">${pct2(c.launch)} <small>/ 65%</small></span><span class="gate-left">${toUnlock(c).toFixed(2)} pts to go</span></div>`;
}

function productCard(c){
  return `
  <article class="prod" data-id="${c.id}" style="--pc:${PARTY_HEX[c.party]}" tabindex="-1">
    <div class="prod-top"><span class="lot">No. ${String(c.rank).padStart(2, "0")} · ${c.party === "D" ? "Dem" : "GOP"}</span>${phasePill(c)}</div>
    <div class="medal ${photoSrc(c.id) ? "has-photo" : ""}">${medalInner(c)}</div>
    <h3>${c.name}</h3>
    <div class="role">${c.meta.role}${c.meta.from && !c.meta.role.includes(c.meta.from) ? " · " + c.meta.from : ""}</div>
    <div class="price">${indexField(c)}</div>
    ${trackChart(c)}
    <dl class="specs">
      <div><dt>Launch Watch</dt><dd>${launchStatus(c)}</dd></div>
      <div><dt>Primary average</dt><dd>${pct(c.pct, c.rounded)}</dd></div>
      <div><dt>Announce in 30 days</dt><dd>${c.announce30 == null ? "Announced" : pct2(c.announce30)}</dd></div>
      <div><dt>Next unlock</dt><dd>${PHASES[phaseOf(c)].next}</dd></div>
    </dl>
    ${launchBar(c)}
    <div class="cta-row">
      <button class="btn-gold" type="button" data-open="${c.id}">Timeline &amp; sources</button>
      <a class="btn-line" href="${marketLink(c.id)}">Stock chart</a>
    </div>
  </article>`;
}
/* Launch Watch bar: "x.xx% yes · x.xx% no" */
function launchBar(c, big){
  const y = c.launch, ch = c.launchChange;
  return `<div class="launch ${big ? "big" : ""}">
    <div class="lw-top"><span class="lbl">Launch Watch · will they run?</span>${Math.abs(ch) >= 0.005 ? `<span class="${ch > 0 ? "up" : "down"}">${ch > 0 ? "▲" : "▼"} ${Math.abs(ch).toFixed(2)} pts <small style="color:var(--faint);font-weight:600">in 30 days</small></span>` : ""}</div>
    <div class="lw-nums"><b class="yes">${pct2(y)} <small>yes</small></b><b class="no">${pct2(1 - y)} <small>no</small></b></div>
    <div class="lw-track"><div class="lw-bar"><i style="width:${(y * 100).toFixed(2)}%"></i></div><span class="lw-gate" style="left:${(INDEX_UNLOCK * 100).toFixed(1)}%"><em>65%</em></span></div>
  </div>`;
}
const marketLink = id => window.ON_MARKET_PAGE ? "#m-" + id : pageLink(window.PAGE_ROOT || "../", "candidates/") + "#m-" + id;

/* ---------- The showcase: cards glide past on their own ---------- */
const PLAY = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;
const PAUSE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>`;
function renderShowcase(sel, list, opts = {}){
  // A continuous loop: the lineup is laid out three times and the view always
  // sits in the middle copy, so the last candidate sits right before the first.
  const host = document.querySelector(sel), n = list.length;
  const copy = k => list.map(c => productCard(c).replace('<article class="prod"', `<article class="prod" data-copy="${k}"${k === 1 ? "" : ' aria-hidden="true"'}`)).join("");
  host.innerHTML = `
    <div class="show-track loop" role="region" aria-label="${opts.label || "Candidates"}">${copy(0)}${copy(1)}${copy(2)}</div>
    <div class="show-nav"><button type="button" class="prev" aria-label="Previous candidate">${ARROW_L}</button><span class="show-count"></span><button type="button" class="next" aria-label="Next candidate">${ARROW_R}</button><button type="button" class="playpause" aria-label="Pause the slideshow"></button></div>`;
  const track = host.querySelector(".show-track"), cards = [...track.children], count = host.querySelector(".show-count"), pp = host.querySelector(".playpause");
  let idx = n, timer = null, resumeT = null, settleT = null, hovering = false;
  let playing = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const leftFor = i => cards[i].offsetLeft - (track.clientWidth - cards[i].offsetWidth) / 2;
  const center = (i, instant) => {
    if (!cards[i]) return;
    if (instant) { track.style.scrollBehavior = "auto"; track.scrollLeft = leftFor(i); track.style.scrollBehavior = ""; }
    else track.scrollTo({ left: leftFor(i), behavior: "smooth" });
  };
  const mark = () => {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0, bd = Infinity;
    cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
    idx = best;
    cards.forEach((c, i) => c.classList.toggle("active", i === best));
    count.textContent = `${String(best % n + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
  };
  // Once the glide settles in an outer copy, jump to the same card in the middle copy
  const settle = () => {
    if (idx >= n && idx < 2 * n) return;
    const j = n + (idx % n);
    track.classList.add("no-anim");
    const offset = track.scrollLeft - leftFor(idx);
    track.style.scrollBehavior = "auto"; track.scrollLeft = leftFor(j) + offset; track.style.scrollBehavior = "";
    mark();
    requestAnimationFrame(() => requestAnimationFrame(() => track.classList.remove("no-anim")));
  };
  let raf; track.addEventListener("scroll", () => {
    cancelAnimationFrame(raf); raf = requestAnimationFrame(mark);
    clearTimeout(settleT); settleT = setTimeout(settle, 160);
  }, { passive: true });
  const go = d => center(idx + d);
  const paintPP = () => { pp.innerHTML = playing ? PAUSE : PLAY; pp.setAttribute("aria-label", playing ? "Pause the slideshow" : "Play the slideshow"); };
  function tick(){ if (playing && !hovering && !document.hidden) go(1); }
  function start(){ clearInterval(timer); timer = setInterval(tick, opts.every || 4800); }
  // After someone swipes or clicks, wait a moment, then keep gliding
  function nudge(){ clearInterval(timer); clearTimeout(resumeT); resumeT = setTimeout(start, 7000); }
  host.querySelector(".prev").addEventListener("click", () => { nudge(); go(-1); });
  host.querySelector(".next").addEventListener("click", () => { nudge(); go(1); });
  pp.addEventListener("click", () => { playing = !playing; paintPP(); if (playing) { go(1); start(); } });
  track.addEventListener("click", e => {
    const b = e.target.closest("[data-open]"); if (b) { nudge(); PDP.open("c", b.dataset.open); return; }
    if (e.target.closest("a")) return;
    const card = e.target.closest(".prod"); if (!card) return;
    nudge();
    const i = cards.indexOf(card);
    if (i !== idx) center(i);
    PDP.open("c", card.dataset.id);
  });
  track.addEventListener("keydown", e => { if (e.key === "ArrowRight") { nudge(); go(1); } if (e.key === "ArrowLeft") { nudge(); go(-1); }
    if (e.key === "Enter" && e.target.classList.contains("prod")) PDP.open("c", e.target.dataset.id); });
  ["pointerdown", "wheel", "touchstart"].forEach(ev => track.addEventListener(ev, nudge, { passive: true }));
  host.addEventListener("mouseenter", () => hovering = true);
  host.addEventListener("mouseleave", () => hovering = false);
  host.addEventListener("focusin", () => hovering = true);
  host.addEventListener("focusout", () => hovering = false);
  paintPP();
  requestAnimationFrame(() => { track.classList.add("no-anim"); center(n, true); mark(); requestAnimationFrame(() => track.classList.remove("no-anim")); start(); });
  window.addEventListener("resize", () => { center(n + (idx % n), true); mark(); });
  return { to: id => { const i = cards.findIndex((c, k) => k >= n && c.dataset.id === id); if (i >= 0) center(i); }, toIndex: i => { center(n + i, true); mark(); } };
}

/* ---------- The full market: every candidate's stock, day by day ---------- */
const LINE_DARK = ["#e9c46a", "#5b8ad6", "#e07a5f", "#6fbf8f", "#b8a1ff", "#f4a261", "#4cc9f0", "#d68fb0", "#a3c96a", "#c9b38a", "#8e9aaf"];
const LINE_LIGHT = ["#0b7a55", "#2f5ea8", "#c0563c", "#2e8a55", "#7a5cc7", "#c8752a", "#1b8fb3", "#b0527f", "#6a8f2c", "#8a7650", "#5d6778"];
let LINE_COLORS = LINE_DARK;
function renderMarketChart(sel, M, party, opts = {}){
  const host = document.querySelector(sel);
  const all = M[party], days = opts.metric === "launch" ? M.lwDays : M.days, hi = opts.highlight;
  // The Index view only shows candidates whose Index has unlocked (chance they run above 64.9%)
  const list = opts.metric === "launch" ? all : all.filter(indexUnlocked);
  LINE_COLORS = document.documentElement.dataset.theme === "light" ? LINE_LIGHT : LINE_DARK;
  host._redraw = () => renderMarketChart(sel, M, party, opts);
  if (!host._themed) { host._themed = true; document.addEventListener("themechange", () => host._redraw && host._redraw()); }
  if (!list.length || !days.length) {
    const near = [...all].sort((a, b) => b.launch - a.launch)[0];
    host.innerHTML = all.length ? `<div class="gate-empty">${LOCK}<b>No ${PARTY_NAME[party]} Index has unlocked yet</b><p>An Index opens once the chance a candidate runs passes 64.9%. Closest: ${near.name} at ${pct2(near.launch)}, ${toUnlock(near).toFixed(2)} points short.</p></div>` : `<p class="note">No scores yet.</p>`;
    return;
  }
  // Draw at the real width so text stays readable on phones
  const W = Math.max(330, Math.min(1100, host.clientWidth || 960)), narrow = W < 640;
  const isL = opts.metric === "launch";
  const hist = c => isL ? c.launchHistory : c.history, now = c => isL ? c.launch * 100 : c.index;
  const fmtV = v => isL ? v.toFixed(2) + "%" : price(v);
  const H = narrow ? 340 : 380, L = 34, R = narrow ? 96 : 150, T = 18, B = 54;
  const max = isL ? 100 : Math.ceil(Math.max(...list.flatMap(c => c.series)) / 5) * 5 + 2;
  const x = i => L + (days.length === 1 ? (W - L - R) : i * (W - L - R) / (days.length - 1));
  const y = v => T + (1 - v / max) * (H - T - B);
  const col = (c, i) => hi ? (c.id === hi ? "var(--gold)" : "var(--faint)") : LINE_COLORS[i % LINE_COLORS.length];
  let g = "";
  for (let v = 0; v <= max; v += isL ? 25 : max > 40 ? 10 : 5) g += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}${isL ? "%" : ""}</text>`;
  const step = Math.max(1, Math.ceil(days.length / (narrow ? 4 : 8)));
  days.forEach((d, i) => { if ((i % step === 0 && days.length - 1 - i >= step * 0.6) || i === days.length - 1) g += `<text x="${x(i)}" y="${H - B + 18}" text-anchor="middle">${i === days.length - 1 ? "Today" : fd(d)}</text>`; });
  // News markers along the bottom
  const newsDays = [...new Set(M.news.map(n => n.date))].filter(d => days.includes(d));
  newsDays.forEach(d => { const i = days.indexOf(d); const mine = M.news.some(n => n.date === d && (!n.party || n.party === party));
    if (mine) g += `<g class="nm" data-day="${d}" style="cursor:pointer"><rect x="${x(i) - 7}" y="${H - B + 26}" width="14" height="14" fill="transparent"/><path d="M${x(i)} ${H - B + 27}l6 6-6 6-6-6z" fill="var(--gold)"><title>News on ${fd(d)}</title></path></g>`; });
  g += `<text x="${L}" y="${H - 6}" style="font-size:10.5px">◆ News. ${narrow ? "Tap" : "Click"} a marker to read that day.</text>`;
  // Lines (highlighted one drawn last)
  const order = list.map((c, i) => [c, i]).sort((a, b) => (a[0].id === hi) - (b[0].id === hi));
  const ends = [];
  order.forEach(([c, i]) => {
    const offset = days.length - hist(c).length;
    const pts = hist(c).map((h, k) => [x(k + offset), y(h.v)]);
    if (pts.length === 1) pts.unshift([L, pts[0][1]]);
    const strong = !hi || c.id === hi;
    g += `<polyline data-id="${c.id}" fill="none" stroke="${col(c, i)}" stroke-width="${c.id === hi ? 3.2 : 2}" stroke-opacity="${strong ? 1 : .35}" stroke-linejoin="round" points="${pts.map(p => p.map(n => n.toFixed(1)).join(",")).join(" ")}"/>`;
    const [ex, ey] = pts.at(-1);
    g += `${strong ? `<circle class="halo" cx="${ex}" cy="${ey}" r="4" fill="none" stroke="${col(c, i)}" stroke-width="1.5"/>` : ""}<circle class="${strong ? "blink" : ""}" cx="${ex}" cy="${ey}" r="${c.id === hi ? 5.5 : 4}" fill="${col(c, i)}" opacity="${strong ? 1 : .4}"/>`;
    if (isL && c.id === hi) (c.statements || []).forEach(st => { const k = days.indexOf(st.date); if (k < 0) return;
      const sy = y(hist(c)[k].v), up = st.r > 0, zero = !st.r;
      g += `<g class="stm"><circle cx="${x(k)}" cy="${sy}" r="6.5" fill="var(--panel)" stroke="${zero ? "var(--ink-3)" : up ? "var(--up)" : "var(--down)"}" stroke-width="2.2"/><text x="${x(k)}" y="${sy + 3.6}" text-anchor="middle" style="font-size:9px;font-weight:800;fill:${zero ? "var(--ink-3)" : up ? "var(--up)" : "var(--down)"}">${zero ? "·" : up ? "+" : "−"}</text><title>${fd(st.date)} · ${st.label}: ${st.text.replace(/"/g, "&quot;")}</title></g>`; });
    ends.push({ c, i, y: ey, strong });
  });
  // End labels, pushed apart so they don't overlap
  ends.sort((a, b) => a.y - b.y);
  let lastY = -99;
  ends.forEach(e => { e.ly = Math.max(e.y, lastY + 13); lastY = e.ly; });
  ends.forEach(e => { if (!e.strong && hi) return;
    g += `<text x="${W - R + 10}" y="${e.ly + 4}" style="fill:${col(e.c, e.i)};font-weight:800;font-size:${narrow ? 10.5 : 11.5}px">${last(e.c.name)} ${fmtV(now(e.c))}</text>`; });
  g += `<line class="xh" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--ink-3)" stroke-dasharray="3 3" opacity="0"/>`;
  host.innerHTML = `<div class="chart-wrap"><svg class="chart mk" viewBox="0 0 ${W} ${H}" role="img" aria-label="${PARTY_NAME[party]} Candidate Index by day">${g}</svg><div class="tip" hidden></div></div>
    <div class="legend">${list.map((c, i) => `<button type="button" data-id="${c.id}" class="${hi === c.id ? "on" : ""}"><i style="background:${LINE_COLORS[i % LINE_COLORS.length]}"></i>${c.name}</button>`).join("")}${hi ? `<button type="button" data-id="" class="clear">Show all</button>` : ""}</div>`;
  const svg = host.querySelector("svg"), tip = host.querySelector(".tip"), xh = svg.querySelector(".xh");
  svg.addEventListener("pointermove", e => {
    const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W;
    if (px < L - 10 || px > W - R + 10) { tip.hidden = true; xh.setAttribute("opacity", 0); return; }
    const i = Math.max(0, Math.min(days.length - 1, Math.round((px - L) / ((W - L - R) / Math.max(1, days.length - 1)))));
    const d = days[i];
    xh.setAttribute("x1", x(i)); xh.setAttribute("x2", x(i)); xh.setAttribute("opacity", .6);
    const rows = list.map((c, k) => { const h = hist(c).find(z => z.d === d); return h ? [c, k, h.v] : null; }).filter(Boolean).sort((a, b) => b[2] - a[2]);
    const said = isL ? list.flatMap(c => (c.statements || []).filter(st => st.date === d && (!hi || c.id === hi)).map(st => ({ c, st }))) : [];
    tip.innerHTML = `<b>${fd(d)}</b>` + rows.map(([c, k, v]) => `<div><i style="background:${LINE_COLORS[k % LINE_COLORS.length]}"></i>${last(c.name)}<span>${fmtV(v)}</span></div>`).join("")
      + said.map(({ c, st }) => `<p class="tip-q"><b>${last(c.name)} · ${st.label}</b>${st.text}${st.move != null ? `<em class="${st.move > 0 ? "up" : st.move < 0 ? "down" : ""}">${st.move >= 0 ? "+" : "−"}${Math.abs(st.move).toFixed(2)} pts that day</em>` : ""}</p>`).join("");
    tip.hidden = false;
    const left = (x(i) / W) * r.width;
    tip.style.left = Math.min(r.width - 170, Math.max(0, left + 12)) + "px";
  });
  svg.addEventListener("pointerleave", () => { tip.hidden = true; xh.setAttribute("opacity", 0); });
  clearTimeout(host._rz); window.removeEventListener("resize", host._onrz || (() => {}));
  host._onrz = () => { clearTimeout(host._rz); host._rz = setTimeout(() => { if (Math.abs((host.clientWidth || 0) - W) > 40) renderMarketChart(sel, M, party, opts); }, 200); };
  window.addEventListener("resize", host._onrz);
  svg.querySelectorAll(".nm").forEach(n => n.addEventListener("click", () => opts.onDay && opts.onDay(n.dataset.day)));
  host.querySelectorAll(".legend button").forEach(b => b.addEventListener("click", () => opts.onPick && opts.onPick(b.dataset.id || null)));
}

/* ---------- News by day ---------- */
function renderNews(sel, M, day){
  const host = document.querySelector(sel);
  const counts = {}; M.news.forEach(n => counts[n.date] = (counts[n.date] || 0) + 1);
  const days = [...new Set([...M.days, ...M.news.map(n => n.date)])].sort().reverse();
  if (!day) day = days.find(d => counts[d]) || days[0];
  const wd = d => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const items = M.news.filter(n => n.date === day);
  host.innerHTML = `
    <div class="days" role="tablist" aria-label="Pick a day">${days.map(d => `<button type="button" role="tab" data-day="${d}" class="${d === day ? "on" : ""} ${counts[d] ? "has" : ""}" aria-selected="${d === day}"><span>${wd(d)}</span><b>${+d.slice(8)}</b><small>${new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}</small>${counts[d] ? `<i>${counts[d]}</i>` : ""}</button>`).join("")}</div>
    <div class="day-head"><h3>${new Date(day + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}</h3><span>${items.length ? items.length + " item" + (items.length === 1 ? "" : "s") : "No news logged"}</span></div>
    <div class="news-list">${items.length ? items.map(n => {
      const c = n.candidate && M.all.find(x => x.name === n.candidate);
      return `<article class="news-item">
        <div class="nt"><span class="ntype t-${n.type}">${NEWS_TYPES[n.type] || "News"}</span>${c ? `<a class="ncand" href="#c-${c.id}" data-open="${c.id}" style="--pc:${PARTY_HEX[c.party]}">${c.name}</a>` : ""}</div>
        <p>${n.headline}</p>
        <div class="nmeta">${n.source ? (n.source_url ? `<a href="${n.source_url}" target="_blank" rel="noopener">${n.source} ↗</a>` : n.source) : ""}${n.impact ? `<span class="${n.impact > 0 ? "up" : "down"}">${n.impact > 0 ? "+" : "−"}${Math.round(Math.abs(n.impact) * 100)}% strength, fading by half every ${NEWS_HALF_LIFE} days</span>` : ""}${n.status && STATUS[n.status] ? `<span class="up">Status: ${STATUS[n.status].label}</span>` : ""}${n.signal && STATEMENT_BY_ID[n.signal] ? (() => { const sc = STATEMENT_BY_ID[n.signal], c = M.all.find(x => x.name === n.candidate), st = c && c.statements.find(z => z.date === n.date && z.text === n.headline);
          return `<span class="${!sc.r && !(st && st.r) ? "" : (st ? st.r : sc.r) > 0 ? "up" : "down"}">Their own words: ${sc.label}${st && st.r ? ` (${st.r > 0 ? "+" : "−"}${Math.abs(st.r).toFixed(2)})` : ""}${st && st.move != null ? ` · Launch Watch ${st.move >= 0 ? "+" : "−"}${Math.abs(st.move).toFixed(2)} pts that day` : ""}</span>`; })() : ""}${n.signal && SIGNAL_MAP[n.signal] && !STATEMENT_BY_ID[n.signal] ? (() => { const [id, r] = SIGNAL_MAP[n.signal], e = MAZE_BY_ID[id], pts = e.w * r; return `<span class="${pts > 0 ? "up" : "down"}">Launch Watch: ${e.label}${n.state ? " (" + n.state + ")" : ""} ${pts > 0 ? "+" : "−"}${Math.abs(pts).toFixed(2)} pts</span>`; })() : ""}</div>
      </article>`; }).join("") : `<p class="note">Nothing logged for this day yet. Pick a day with a gold number.</p>`}</div>`;
  host.querySelectorAll(".days button").forEach(b => b.addEventListener("click", () => renderNews(sel, M, b.dataset.day)));
  host.querySelectorAll("[data-open]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); PDP.open("c", a.dataset.open); }));
  centerInRow(host.querySelector(".days .on"));
}

// Slide a chip to the middle of its own row without moving the page up or down
function centerInRow(el){
  const row = el && el.parentElement; if (!row) return;
  const er = el.getBoundingClientRect(), rr = row.getBoundingClientRect();
  row.scrollLeft += (er.left + er.width / 2) - (rr.left + rr.width / 2);
}

const ARROW_L = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>`;
const ARROW_R = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>`;

/* ---------- Tier guide ---------- */
function renderTiers(sel, M){
  document.querySelector(sel).innerHTML = TIERS.map(t => {
    const who = M.all.filter(c => c.tier.id === t.id);
    return `<div class="tier-card" style="--tc:${t.c}">
      <div class="eyebrow" style="color:${t.c}">${t.range}</div>
      <div class="rng">${t.range}</div><h4>${t.label}</h4><p>${t.desc}</p>
      <div class="who">${who.length ? who.map(c => `<a href="#c-${c.id}" data-open="${c.id}">${c.name.split(" ").slice(-1)[0].replace("Jr.", "Trump Jr.")}</a>`).join(", ") : "No one yet"}</div>
    </div>`;
  }).join("");
  document.querySelector(sel).addEventListener("click", e => { const a = e.target.closest("[data-open]"); if (a) { e.preventDefault(); PDP.open("c", a.dataset.open); } });
}

/* ---------- Market board ---------- */
function renderBoard(sel, M, party){
  // Unlocked candidates first (by Index), then everyone still locked (by chance they run)
  const list = (party === "all" ? [...M.all] : [...M[party]]).sort((a, b) => (indexUnlocked(b) - indexUnlocked(a)) || (indexUnlocked(a) ? b.index - a.index : b.launch - a.launch));
  document.querySelector(sel).innerHTML = `
    <table class="board"><thead><tr><th>#</th><th>Candidate</th><th>Party</th><th>Index</th><th>Change</th><th>Primary avg.</th><th>Tier</th><th>Launch Watch</th><th>If they announce</th></tr></thead>
    <tbody>${list.map((c, i) => `<tr data-open="${c.id}" tabindex="0">
      <td class="mono" style="color:var(--faint)">${i + 1}</td>
      <td><div class="nm"><span class="mini ${photoSrc(c.id) ? "has-photo" : ""}" style="--pc:${PARTY_HEX[c.party]}">${photoSrc(c.id) ? `<img src="${photoSrc(c.id)}" alt="">` : c.mono.slice(0, 2)}</span><div>${c.name}<div style="font-size:12px;font-weight:500;color:var(--ink-3)">${c.meta.role}</div></div></div></td>
      <td class="party" style="color:${c.party === "D" ? "var(--dem)" : "var(--rep)"}">${c.party === "D" ? "DEM" : "GOP"}</td>
      <td class="px">${idxText(c)}</td>
      <td style="font-size:12.5px;font-weight:700">${indexUnlocked(c) ? changeText(c) : `<span class="gate-left">${toUnlock(c).toFixed(2)} pts to 65%</span>`}</td>
      <td class="mono">${pct(c.pct, c.rounded)}</td>
      <td style="color:${c.tier.c};font-weight:700;white-space:nowrap">${c.tier.label}</td>
      <td style="font-size:13px;white-space:nowrap"><b>${pct2(c.launch)}</b> <span style="color:var(--faint)">yes</span></td>
      <td style="font-size:13px;white-space:nowrap">${c.ifDeclared != null ? (indexUnlocked(c) ? `${price(c.ifDeclared)} <span class="up">${signed(c.ifDeclared - c.index)}</span>` : `Unlocks at ${price(c.ifDeclared)}`) : "—"}</td>
    </tr>`).join("")}</tbody></table>`;
  const tb = document.querySelector(sel + " tbody");
  tb.addEventListener("click", e => { const r = e.target.closest("[data-open]"); if (r) PDP.open("c", r.dataset.open); });
  tb.addEventListener("keydown", e => { if (e.key === "Enter") { const r = e.target.closest("[data-open]"); if (r) PDP.open("c", r.dataset.open); } });
}

/* ---------- Ticker ---------- */
function renderMarketTicker(sel, M){
  const el = document.querySelector(sel); if (!el) return;
  const items = [...M.all].sort((a, b) => (indexUnlocked(b) - indexUnlocked(a)) || b.launch - a.launch).map(c =>
    `<span class="tk"><b>${c.name.split(" ").slice(-1)[0].replace("Jr.", "Trump Jr.")}</b> <span class="${c.party === "D" ? "d" : "r"}">${c.party}</span> ${indexUnlocked(c) ? `<span class="px">${price(c.index)}</span> <span style="opacity:.7">${PHASES[phaseOf(c)].label}</span>` : `<span class="px lk">${LOCK}${(c.launch * 100).toFixed(1)}%</span> <span style="opacity:.7">to run</span>`}</span>`).join("");
  el.innerHTML = items + items;
}

/* ---------- Candidate product page ---------- */
/* ---------- The expanded view: timeline, why scores moved, data sources ---------- */
function timelineFor(c, M){
  const h = c.launchHistory, out = [];
  const sum = m => m.rows.reduce((o, r) => (o[r.id] = (o[r.id] || 0) + r.pts, o), {});
  const idxOn = d => { const x = c.history.find(z => z.d === d); return x ? x.v : null; };
  for (let i = 1; i < h.length; i++) {
    const d = h[i].d, mv = h[i].v - h[i - 1].v;
    const items = M.news.filter(n => n.candidate === c.name && n.date === d);
    const poll = d === M.days[0];
    const stand = Object.keys(MAZE.standing[c.name] || {}).filter(k => MAZE.standingFrom[k] === d);
    const i0 = idxOn(h[i - 1].d), i1 = idxOn(d), imv = i0 != null && i1 != null ? i1 - i0 : null;
    const idxMoved = indexUnlocked(c) && imv != null && Math.abs(imv) >= 0.05;
    if (Math.abs(mv) < 0.005 && !items.length && !idxMoved) continue;
    const A = sum(c.mazeAt(h[i - 1].d)), B = sum(c.mazeAt(d));
    const why = [...new Set([...Object.keys(A), ...Object.keys(B)])].map(id => ({ e: MAZE_BY_ID[id], d: (B[id] || 0) - (A[id] || 0) })).filter(x => Math.abs(x.d) > 1e-9);
    const crossed = (h[i - 1].v / 100 > INDEX_UNLOCK) !== (h[i].v / 100 > INDEX_UNLOCK) ? (h[i].v / 100 > INDEX_UNLOCK ? "up" : "down") : null;
    out.push({ d, before: h[i - 1].v, after: h[i].v, items, poll, stand, why, crossed, imv, rebuilt: h[i].rebuilt });
  }
  return out.reverse();
}
const STAND_TEXT = { midterms: { "1": "Won their own race in the midterms", "0.5": "Campaigned for the party in the midterms", "-1": "Lost their midterm race" } };
function timelineHTML(c, M){
  const tl = timelineFor(c, M);
  if (!tl.length) return `<p class="note">Nothing has moved ${last(c.name)}'s numbers yet.</p>`;
  const sg = v => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2);
  return `<ol class="tl">${tl.map(t => {
    const mv = t.after - t.before, cls = mv > 0.005 ? "up" : mv < -0.005 ? "down" : "";
    const what = t.items.map(n => `<div class="tl-what">${n.headline}${n.source_url ? ` <a href="${n.source_url}" target="_blank" rel="noopener">${n.source}</a>` : n.source ? ` <span class="src">${n.source}</span>` : ""}</div>`).join("")
      + (t.poll ? `<div class="tl-what">The first 2028 primary polls: ${pct(c.pct, c.rounded)} in the ${PARTY_NAME[c.party]} average</div>` : "")
      + t.stand.map(k => `<div class="tl-what">${(STAND_TEXT[k] || {})[String(MAZE.standing[c.name][k])] || MAZE_BY_ID[k].label + " now counts"}</div>`).join("");
    return `<li class="tl-i ${cls}"><div class="tl-d">${fd(t.d)}<span>${t.d.slice(0, 4)}</span></div><div class="tl-b">
      ${what || (Math.abs(mv) < 0.005 ? `<div class="tl-what">The Index moved with the rest of the field (news about other candidates)</div>` : `<div class="tl-what">A scheduled change in the maze</div>`)}
      <div class="tl-move">${Math.abs(mv) < 0.005 ? `<span>Chance they run held at ${t.after.toFixed(2)}%</span>` : `<span>Chance they run</span> ${t.before.toFixed(2)}% → <b class="${cls}">${t.after.toFixed(2)}%</b> <i class="${cls}">${sg(mv)} pts</i>`}${t.imv != null && Math.abs(t.imv) >= 0.05 && indexUnlocked(c) ? ` <span class="sep">·</span> <span>Index</span> <i class="${t.imv > 0 ? "up" : "down"}">${t.imv > 0 ? "+" : "−"}${Math.abs(t.imv).toFixed(1)}</i>` : ""}</div>
      ${t.why.length ? `<div class="tl-why"><span>Why</span>${t.why.map(x => `<em class="${x.d > 0 ? "up" : "down"}">${x.e.label} ${sg(x.d)} pts</em>`).join("")}</div>` : ""}
      ${t.crossed ? `<div class="tl-flag">${t.crossed === "up" ? `${UNLOCK} Passed 65%: the Contender Index unlocked` : `${LOCK} Fell under 65%: the Index locked again`}</div>` : ""}
      ${t.rebuilt ? `<div class="tl-note">Rebuilt from dated statements (before daily tracking began)</div>` : ""}
    </div></li>`; }).join("")}</ol>`;
}
function sourcesHTML(c){
  const seen = new Set(), news = c.news.filter(n => n.source_url && !seen.has(n.source_url) && seen.add(n.source_url)).sort((a, b) => a.date < b.date ? 1 : -1);
  const tools = pageLink(window.PAGE_ROOT || "../", "tools/");
  return `<div class="srcs">
    <div><h4>Polls</h4><ul>${c.polls.map(p => `<li><b>${p.pollster}</b> ${gradeBadge(p.pollster)} · ${range(p.start, p.end)} · ${pct(p.pct, p.rounded)}${p.sources.length ? " · " + p.sources.map((u, i) => `<a href="${u}" target="_blank" rel="noopener">${p.sources.length > 1 ? "Source " + (i + 1) : "Source"}</a>`).join(", ") : ""}</li>`).join("") || "<li>No polls yet</li>"}</ul></div>
    <div><h4>News and statements</h4><ul>${news.map(n => `<li><b>${fd(n.date)}</b> · <a href="${n.source_url}" target="_blank" rel="noopener">${n.source}</a>: ${n.headline}</li>`).join("") || "<li>Nothing on file yet</li>"}</ul></div>
    <div><h4>Method</h4><ul>
      <li>Weights: <a href="${tools}#maze">the Decision Maze in Key Tools</a></li>
      <li>Pollster grades: each grade and who gave it are listed in data/pollsters.csv (A 1.00, B 0.85, C 0.65, D 0.25)</li>
      <li>Data files: data/polls.csv, data/news.csv, data/launch-log.csv (append-only)</li>
    </ul></div></div>`;
}
const phaseSteps = c => { const ph = phaseOf(c), k = { watching: 0, contender: 1, candidate: 2, out: -1 }[ph];
  return `<ol class="ph-steps">${[["Watching", "Under 65% to run"], ["Contender", "Above 64.9%"], ["Candidate", "Formally declared"]].map(([a, b], i) => `<li class="${i < k ? "done" : i === k ? "on" : ""}"><b>${a}</b><span>${b}</span></li>`).join("")}</ol>`; };

PDP.register("c", id => {
  const M = window.MARKET; if (!M) return null;
  const c = M.all.find(x => x.id === id); if (!c) return null;
  const pollRows = c.polls.map(p => `<li><span><b>${p.pollster}</b> ${gradeBadge(p.pollster)} · ${range(p.start, p.end)} · ${pct(p.pct, p.rounded)} of ${PARTY_NAME[c.party]} primary voters${p.n ? ` (n=${Number(p.n).toLocaleString()})` : ""}</span></li>`).join("");
  const gen = c.generals.map(g => `<li><span>vs. <b>${g.opp}</b> (${g.oppParty}): ${c.name.split(" ").slice(-1)[0]} ${g.me}%, ${g.opp.split(" ").slice(-1)[0]} ${g.them}% · ${g.pollster} ${gradeBadge(g.pollster)}, ${fd(g.end)}</span></li>`).join("");
  return {
    accent: PARTY_HEX[c.party],
    iconHTML: `<div class="medal ${photoSrc(c.id) ? "has-photo" : ""}" style="--pc:${PARTY_HEX[c.party]};width:100%;height:auto;aspect-ratio:1;margin:0">${medalInner(c, "clamp(50px,9vw,110px)")}</div>`,
    eyebrow: `No. ${String(c.rank).padStart(2, "0")} in the ${PARTY_NAME[c.party]} field · ${PHASES[phaseOf(c)].label}`,
    title: c.name,
    tag: c.meta.role + (c.meta.from && !c.meta.role.includes(c.meta.from) ? " · " + c.meta.from : ""),
    bodyHTML: `
      <h3>Profile</h3><p>${c.meta.bio}</p>
      <h3 style="margin-top:28px">Timeline</h3>
      <p class="note" style="margin-top:-4px">Every day something moved ${last(c.name)}'s numbers, newest first, with what moved it and the source.</p>
      ${timelineHTML(c, M)}
      ${indexUnlocked(c) ? "" : `<h3 style="margin-top:28px">The Index is locked</h3>
      <p>The Index opens in two stages. Above 64.9% on Launch Watch, a candidate becomes a <b>Contender</b> and gets a provisional Contender Index. A formal declaration makes them a <b>Candidate</b>, and it becomes the official Candidate Index. ${last(c.name)} is at <b>${pct2(c.launch)}</b>, ${toUnlock(c).toFixed(2)} points short of Contender. Every statement and news item still moves the maze and the chance they run every day.</p>
      <div class="chain-mini"><span>News or a quote</span><i>→</i><span>Decision Maze</span><i>→</i><span>${pct2(c.launch)} to run</span><i>→</i><span class="lk">${LOCK} Contender at 65%</span><i>→</i><span class="lk">${LOCK} Candidate at declaration</span></div>`}
      ${indexUnlocked(c) ? `<h3 style="margin-top:28px">How the ${PHASES[phaseOf(c)].idx} of ${price(c.index)} is built</h3>
      <p>${phaseOf(c) === "contender" ? `${last(c.name)} passed 65% to run, so the Index is open as a provisional Contender Index. A formal declaration makes it the official Candidate Index.` : `${last(c.name)} has formally declared, so this is the official Candidate Index.`}</p>
      <p>${c.name.split(" ").slice(-1)[0]} is at ${pct(c.pct, c.rounded)} in the grade-weighted ${PARTY_NAME[c.party]} primary average, ranked ${c.rank} of ${c.fieldSize} named candidates. Everyone named adds up to ${c.total.toFixed(1)}%, so the Index is ${c.pct.toFixed(1)} ÷ ${c.total.toFixed(1)} × 100 = <b>${price(c.index)}</b>.${c.rounded ? " The pollster published this number rounded to a whole percent." : ""}</p>
      <p>Then two things move it day to day. <b>Status</b>: until they declare, a candidate's weight rises with their Launch Watch chance, from 0.60 at 0% to 1.00 at 100%. Declaring lifts it to 1.00. ${c.ifDeclared != null ? `If ${last(c.name)} announced today, the Index would go from ${price(c.index)} to <b>${price(c.ifDeclared)}</b> (${signed(c.ifDeclared - c.index)}).` : `${last(c.name)} has declared.`} <b>News</b>: a big moment adds strength that fades by half every ${NEWS_HALF_LIFE} days.${c.boost > 0.001 ? ` Right now news adds ${(c.boost * 100).toFixed(1)}% to ${last(c.name)}'s strength.` : ""}</p>
      <p>Endorsements and fundraising join as each tracker opens.</p>` : ""}
      <h3 style="margin-top:28px">Launch Watch: will ${last(c.name)} run?</h3>
      ${launchBar(c, true)}
      <div class="lw-big" id="lwBig"></div>
      <h4 class="lw-h4">How the Decision Maze scores ${last(c.name)}</h4>
      <div class="tbl-wrap"><table class="maze-tbl"><thead><tr><th>Element</th><th>Ring</th><th class="n">Weight</th><th class="n">Reading</th><th class="n">Points</th></tr></thead><tbody>
      ${c.maze.rows.filter(r => r.reading).map(r => `<tr><td><b>${r.e.label}</b>${r.note ? `<div class="sub">${r.date ? fd(r.date) + ": " : ""}${r.note}</div>` : ""}</td><td style="white-space:nowrap">${"Ring " + r.e.ring} · ${r.e.kind}</td><td class="n">${r.e.w.toFixed(2)}</td><td class="n">${r.reading > 0 ? "+" : ""}${+r.reading.toFixed(3)}</td><td class="n ${r.pts > 0 ? "up" : "down"}">${r.pts > 0 ? "+" : ""}${r.pts.toFixed(2)}</td></tr>`).join("")}
      </tbody><tfoot><tr><td colspan="4">Intent points × ${MAZE.intentScale}</td><td class="n">${c.maze.intent.toFixed(2)}</td></tr><tr><td colspan="4">Strength points × ${MAZE.strengthScale}</td><td class="n">${c.maze.strength.toFixed(2)}</td></tr>
      <tr><td colspan="4">Chance they run: logistic(logit(25%) + ${MAZE.intentScale} × ${c.maze.intent.toFixed(2)} + ${MAZE.strengthScale} × ${c.maze.strength.toFixed(2)})</td><td class="n">${pct2(c.launch)}</td></tr></tfoot></table></div>
      ${c.statements.length ? `<h4 class="lw-h4">In ${last(c.name)}'s own words</h4>
      <div class="tbl-wrap"><table class="maze-tbl words"><thead><tr><th>Date</th><th>What they said</th><th class="n">Reading</th><th class="n">Counts</th><th class="n">That day</th></tr></thead><tbody>
      ${c.statements.slice().reverse().map(st => `<tr><td style="white-space:nowrap">${fd(st.date)}</td><td><b>${st.label}</b><div class="sub">${st.text}${st.url ? ` · <a href="${st.url}" target="_blank" rel="noopener" style="color:var(--gold)">${st.source}</a>` : ""}</div></td>
        <td class="n ${st.r > 0 ? "up" : st.r < 0 ? "down" : ""}">${st.r ? (st.r > 0 ? "+" : "−") + Math.abs(st.r).toFixed(2) : "0"}</td>
        <td class="n">${!st.r ? "—" : st.wiped ? "Wiped" : SHARE_TEXT(st.share)}</td>
        <td class="n ${st.move > 0.005 ? "up" : st.move < -0.005 ? "down" : ""}">${st.move == null ? "Before tracking" : (st.move >= 0 ? "+" : "−") + Math.abs(st.move).toFixed(2) + " pts"}</td></tr>`).join("")}
      </tbody></table></div>
      <p class="note">Strongest statement counts in full, the next half, then a quarter. Words reading: ${(c.maze.rows.find(r => r.id === "statement") || { reading: 0 }).reading.toFixed(3)} × weight ${MAZE_BY_ID.statement.w.toFixed(2)} = ${(c.maze.rows.find(r => r.id === "statement") || { pts: 0 }).pts.toFixed(2)} points.</p>` : ""}
      ${c.mazeNote ? `<p class="note">Not counted yet: ${c.mazeNote}</p>` : ""}
      <p class="note">Fundraising and favorability count once the first numbers are in.</p>
      ${c.stage2 ? `<h3 style="margin-top:28px">Stage 2: if ${last(c.name)} runs</h3>
      <div class="s2-mini">
        <div><b>${(c.stage2.pEarlyWinIfRuns * 100).toFixed(0)}%</b><span>Wins an early state</span></div>
        <div><b>${(c.stage2.pPastSuperTuesdayIfRuns * 100).toFixed(0)}%</b><span>Gets past Super Tuesday</span></div>
        <div><b>${(c.stage2.pNomineeIfRuns * 100).toFixed(1)}%</b><span>Wins the nomination</span></div>
        <div><b>${c.stage2.attention.toFixed(1)}</b><span>Attention Index</span></div>
      </div>
      <p class="note">From ${M.primary.parties[c.party].simulations.toLocaleString()} simulated primaries. Once ${last(c.name)} announces, these become their Stage 2 odds. See the Primary Path in Key Tools.</p>` : ""}
      <h3 style="margin-top:28px">Sources</h3>
      ${sourcesHTML(c)}
      ${gen ? `<h3 style="margin-top:28px">General election matchups</h3><ul>${gen}</ul><p class="note">Head-to-heads don't feed the primary Index. They're shown for context.</p>` : ""}`,
    boxHTML: `
      <div class="eyebrow">${PHASES[phaseOf(c)].label}</div>
      ${phaseSteps(c)}
      <div class="price box-price">${indexField(c)}</div>
      ${trackChart(c, 96)}
      <dl>
        <dt>Launch Watch</dt><dd>${launchStatus(c)}</dd>
        <dt>Chance they run</dt><dd>${pct2(c.launch)} yes · ${pct2(1 - c.launch)} no</dd>
        <dt>Announce in 30 days</dt><dd>${c.announce30 == null ? "Announced" : pct2(c.announce30)}</dd>
        <dt>Primary avg.</dt><dd>${pct(c.pct, c.rounded)}</dd>
        <dt>Rank</dt><dd>${c.rank} of ${c.fieldSize}</dd>
        <dt>Polling tier</dt><dd style="color:${c.tier.c}">${c.tier.label}</dd>
        <dt>Polls counted</dt><dd>${c.polls.length}</dd>
        <dt>If they announce</dt><dd>${c.ifDeclared != null ? (indexUnlocked(c) ? `${price(c.ifDeclared)} (${signed(c.ifDeclared - c.index)})` : `Unlocks at ${price(c.ifDeclared)}`) : "Declared"}</dd>
        ${c.stage2 ? `<dt>Attention Index</dt><dd>${c.stage2.attention.toFixed(1)}${c.status === "declared" ? "" : " <span style=\"color:var(--faint)\">if they run</span>"}</dd>` : ""}
      </dl>
      <div style="height:16px"></div>
      <a class="btn-gold" href="${marketLink(c.id)}" data-market="${c.id}">See the full market</a>
      <a class="btn-line" data-page="polls/" href="#">See the polls</a>
      <p class="fine">Scores as of ${fd(M.today)}.</p>`,
    after: o => {
      o.querySelectorAll("a[data-page]").forEach(a => { a.href = pageLink(window.PAGE_ROOT || "../", a.dataset.page); a.addEventListener("click", () => PDP.close()); });
      const big = o.querySelector("#lwBig");
      if (big) { const draw = () => launchChart(big, c); draw(); clearTimeout(big._t); window.addEventListener("resize", () => { clearTimeout(big._t); big._t = setTimeout(draw, 150); }); }
      const mk = o.querySelector("[data-market]");
      if (mk && window.ON_MARKET_PAGE) mk.addEventListener("click", e => { e.preventDefault(); PDP.close(); setTimeout(() => window.showMarket && window.showMarket(mk.dataset.market), 60); });
    }
  };
});

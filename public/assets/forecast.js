/* =========================================================
   KEYS TO THE RACE: THE 2028 FORECAST
   Electoral Vote Probability (EVPC) + 11,111 simulations.

   How a state's forecast is built:
     1. NATIONAL ENVIRONMENT. The national margin from each recent
        cycle (2018 to 2026), weighted by how recent it is.
     2. FACTORS. Each factor moves the environment by some points,
        times a weight from 0.25 (a hunch) to 1 (hard data).
     3. POLLING. General election polls are blended in, by grade.
     4. TWO YEARS OUT. The result is pulled part of the way back
        toward a tie, since environments drift back to close races.
     5. STATE LEAN. Each state's lean (its margin minus the
        national margin) from 2020 and 2024, weighted the same way.
   State margin = state lean + national environment.
   Win chance comes from that margin and the uncertainty below.

   Every number here is a setting: change it and the map,
   odds and simulations all follow. Margins are D minus R.
   ========================================================= */

const FC = {
  sims: 11111,
  seed: 2028,
  nationalError: 5.0,   // points: how far the national environment can miss, two years out
  stateError: 3.0,      // points: how far one state can miss on its own
  pullToTie: 0.6,       // keep 60% of the environment's gap from a tie
  // Ratings by the Democratic nominee's chance to win the state
  ratingCuts: [ [0.95, "safeD"], [0.80, "likelyD"], [0.60, "leanD"], [0.40, "toss"], [0.20, "leanR"], [0.05, "likelyR"], [0, "safeR"] ]
};

/* Step 1: recent cycles.
   RECENCY RULE: weight = 1 − 0.25 × (cycles before the newest), never below 0.25.
   2026 = 1, 2024 = 0.75, 2022 = 0.5, 2020 and older = 0.25.
   MIDTERM RULE: a midterm House vote is moved toward the president's party by
   MIDTERM_RECOVERY points, the average amount the president's party has
   recovered from each midterm to the next presidential election (table below). */
const MIDTERM_HISTORY = [   // D minus R: House vote at the midterm → presidential popular vote two years later
  { mid: 1998, party: "D", midterm: -1.1, next:  0.5 },
  { mid: 2002, party: "R", midterm: -4.8, next: -2.4 },
  { mid: 2006, party: "R", midterm:  8.0, next:  7.3 },
  { mid: 2010, party: "D", midterm: -6.8, next:  3.9 },
  { mid: 2014, party: "D", midterm: -5.7, next:  2.1 },
  { mid: 2018, party: "R", midterm:  8.6, next:  4.5 },
  { mid: 2022, party: "D", midterm: -2.7, next: -1.5 }
].map(h => ({ ...h, recovery: (h.party === "D" ? 1 : -1) * (h.next - h.midterm) }));
// How far the president's party came back, on average (about 3.4 points)
const MIDTERM_RECOVERY = Math.round(MIDTERM_HISTORY.reduce((t, h) => t + h.recovery, 0) / MIDTERM_HISTORY.length * 10) / 10;
const recencyWeight = (year, newest = 2026) => Math.max(0.25, 1 - 0.25 * ((newest - year) / 2));
const CYCLES = [
  { year: 2018, kind: "Midterm",  label: "House popular vote",      margin:  8.6, inParty: "R", note: "Democrats won the House vote by 8.6 in Trump's first midterm." },
  { year: 2020, kind: "President", label: "Presidential popular vote", margin:  4.5, note: "Biden won the popular vote by 4.5." },
  { year: 2022, kind: "Midterm",  label: "House popular vote",      margin: -2.7, inParty: "D", note: "Republicans won the House vote by 2.7 in Biden's midterm." },
  { year: 2024, kind: "President", label: "Presidential popular vote", margin: -1.5, note: "Trump won the popular vote by 1.5." },
  { year: 2026, kind: "Midterm",  label: "House popular vote",      margin: 13.0, inParty: "R", note: "Projected near D+13 on Nov. 4, with votes still being counted. Update this once results are certified.", projected: true }
].map(c => ({ ...c, weight: recencyWeight(c.year),
  adjusted: c.inParty ? c.margin + (c.inParty === "D" ? MIDTERM_RECOVERY : -MIDTERM_RECOVERY) : c.margin }));

/* Step 2: factors. pts = points toward Democrats (negative = toward Republicans).
   CONFIDENCE SCALE for every weight in the model:
     1.00  certified results, measured directly
     0.75  measured, and the pattern has held in most past elections
     0.50  measured today, but likely to change before Election Day
     0.25  early or thin signal, or a slot waiting for data */
const CONFIDENCE = [
  [1.00, "Certified results, measured directly."],
  [0.75, "Measured, and the pattern has held in most past elections."],
  [0.50, "Measured today, but likely to change before Election Day."],
  [0.25, "An early or thin signal, or a slot waiting for data."]
];
const FACTORS = [
  { name: "Trump isn't on the ballot",     pts:  1.0, weight: 0.5,  why: "Trump brought out irregular voters for Republicans in 2016, 2020 and 2024. No one has shown they can repeat that, though his absence also lowers Democratic turnout driven by opposition to him. Small, and half weight because it's untested." },
  { name: "Two new nominees",              pts:  0.5, weight: 0.5,  why: "Neither party has an incumbent running. Incumbent presidents usually carry an edge of a couple of points; an open race removes it from the party in power. Half weight until the nominees are known." },
  { name: "Presidential approval",         pts:  3.0, weight: 0.5,  why: "Reuters/Ipsos had Trump at 32% approval on Nov. 6–9, 2026. When the president was under 40% at election time (1952, 1980, 1992, 2008, 2024), his party lost the popular vote by 7 points on average. The 2026 result already captures part of that, so we count less than half (3 points), at half weight because approval can recover in two years." },
  { name: "The economy",                   pts:  1.0, weight: 0.5,  why: "Mixed. October added 165,000 jobs and unemployment dipped to 4.1%, which is normal, but only 21% approve of how cost of living is being handled. Price anger cost the party in power in 2022 and 2024. A small edge to the out-party, at half weight because the 2028 economy is unknown." },
  { name: "Policy and new laws",           pts:  0.0, weight: 0.25, why: "Not scored yet. Laws passed by the new Congress in 2027 and their reception get scored here." },
  { name: "Candidate announcements",       pts:  0.0, weight: 0.25, why: "No major candidate has declared. Each launch and how it lands gets scored here." },
  { name: "Endorsements",                  pts:  0.0, weight: 0.25, why: "Not scored until candidates declare and endorsements start." }
];
const POLL_WEIGHT = 0.25;   // Step 3: polling's weight before grade (two years out, polls predict little)

/* Electoral votes (2020 apportionment, in force through 2028) and
   margins (D minus R, rounded). ME and NE: 2 statewide + districts. */
const STATES = {
  AL:[9,-25.5,-30.5], AK:[3,-10.1,-13.1], AZ:[11,0.3,-5.5], AR:[6,-27.6,-30.6], CA:[54,29.2,20.2], CO:[10,13.5,11.0],
  CT:[7,20.1,14.5], DE:[3,19.0,14.7], DC:[3,86.8,83.8], FL:[30,-3.4,-13.1], GA:[16,0.2,-2.2], HI:[4,29.5,23.1],
  ID:[4,-30.8,-36.5], IL:[19,17.0,10.9], IN:[11,-16.1,-19.0], IA:[6,-8.2,-13.2], KS:[6,-14.6,-16.1], KY:[8,-25.9,-30.5],
  LA:[8,-18.6,-22.0], ME:[2,9.1,6.9], MD:[10,33.2,28.5], MA:[11,33.5,25.2], MI:[15,2.8,-1.4], MN:[10,7.1,4.2],
  MS:[6,-16.5,-22.9], MO:[10,-15.4,-18.4], MT:[4,-16.4,-19.9], NE:[2,-19.1,-20.5], NV:[6,2.4,-3.1], NH:[4,7.4,2.8],
  NJ:[14,15.9,5.9], NM:[5,10.8,6.0], NY:[28,23.1,12.6], NC:[16,-1.3,-3.2], ND:[3,-33.4,-36.5], OH:[17,-8.0,-11.2],
  OK:[7,-33.1,-34.3], OR:[8,16.1,14.3], PA:[19,1.2,-1.7], RI:[4,20.8,13.8], SC:[9,-11.7,-17.8], SD:[3,-26.2,-29.2],
  TN:[11,-23.2,-29.7], TX:[40,-5.6,-13.7], UT:[6,-20.5,-21.6], VT:[3,35.4,31.5], VA:[13,10.1,5.8], WA:[12,19.2,18.2],
  WV:[4,-38.9,-41.9], WI:[10,0.6,-0.9], WY:[3,-43.4,-45.8],
  "ME-1":[1,23.1,23.4], "ME-2":[1,-7.4,-9.1], "NE-1":[1,-15.1,-12.6], "NE-2":[1,6.5,4.6], "NE-3":[1,-53.2,-51.6]
};
const NATIONAL = { 2020: 4.5, 2024: -1.5 };
const LEAN_WEIGHTS = { 2020: 0.25, 2024: 0.75 };
const STATE_NAMES = {AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine (statewide)",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska (statewide)",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming","ME-1":"Maine 1st District","ME-2":"Maine 2nd District","NE-1":"Nebraska 1st District","NE-2":"Nebraska 2nd District","NE-3":"Nebraska 3rd District"};

/* ---------- math helpers ---------- */
function normCdf(x){ // Abramowitz-Stegun
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}
function rng(seed){ let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gauss(r){ let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const ratingFor = p => FC.ratingCuts.find(([cut]) => p >= cut)[1];
const fmtM = m => m === 0 ? "Even" : (m > 0 ? "D+" : "R+") + Math.abs(m).toFixed(1);

/* ---------- Step 1–4: the national environment ---------- */
function nationalEnvironment(opts = {}){
  const throughYear = opts.throughYear || 9999;
  const cycles = CYCLES.filter(c => c.year <= throughYear);
  const wsum = cycles.reduce((t, c) => t + c.weight, 0);
  const base = cycles.reduce((t, c) => t + c.adjusted * c.weight, 0) / wsum;
  const factors = opts.factors === false ? [] : FACTORS.map(f => ({ ...f, effect: f.pts * f.weight }));
  const afterFactors = base + factors.reduce((t, f) => t + f.effect, 0);
  let poll = null, afterPolls = afterFactors;
  if (opts.polls && opts.polls.length) {
    // average margin across matchups, weighted by each matchup's grade weight
    const w = opts.polls.reduce((t, p) => t + p.weight, 0);
    const margin = opts.polls.reduce((t, p) => t + p.margin * p.weight, 0) / w;
    const gradeW = Math.min(1, w / opts.polls.length);
    const weight = POLL_WEIGHT * gradeW;
    afterPolls = afterFactors * (1 - weight) + margin * weight;
    poll = { margin, weight, gradeW, n: opts.polls.length, effect: afterPolls - afterFactors };
  }
  const env = afterPolls * FC.pullToTie;
  return { cycles, base, factors, afterFactors, poll, afterPolls, env };
}

/* ---------- Step 5: states ---------- */
function stateForecasts(env){
  const sd = Math.sqrt(FC.nationalError ** 2 + FC.stateError ** 2);
  return Object.entries(STATES).map(([st, [ev, m20, m24]]) => {
    const lean = ((m20 - NATIONAL[2020]) * LEAN_WEIGHTS[2020] + (m24 - NATIONAL[2024]) * LEAN_WEIGHTS[2024]) / (LEAN_WEIGHTS[2020] + LEAN_WEIGHTS[2024]);
    const margin = lean + env;
    const pD = normCdf(margin / sd);
    return { st, name: STATE_NAMES[st], ev, m20, m24, lean, margin, pD, rating: ratingFor(pD) };
  });
}

/* ---------- 11,111 simulations (correlated through the national error) ---------- */
function simulate(states, n = FC.sims, seed = FC.seed){
  const r = rng(seed);
  const hist = new Array(539).fill(0);
  let dWins = 0, rWins = 0, ties = 0;
  const tip = {}, stWins = Object.fromEntries(states.map(s => [s.st, 0]));
  const order = [...states];
  for (let i = 0; i < n; i++) {
    const nat = gauss(r) * FC.nationalError;
    let d = 0; const res = [];
    for (const s of states) {
      const m = s.margin + nat + gauss(r) * FC.stateError;
      if (m > 0) { d += s.ev; stWins[s.st]++; }
      res.push([s, m]);
    }
    hist[d]++;
    if (d >= 270) dWins++; else if (d <= 268) rWins++; else ties++;
    // tipping point: sort by margin toward the winner, find the state that crosses 270
    const win = d >= 270 ? 1 : d <= 268 ? -1 : 0;
    if (win) {
      res.sort((a, b) => win * (b[1] - a[1]));
      let acc = 0; for (const [s] of res) { acc += s.ev; if (acc >= 270) { tip[s.st] = (tip[s.st] || 0) + 1; break; } }
    }
  }
  let acc = 0, median = 0; for (let e = 0; e <= 538; e++) { acc += hist[e]; if (acc >= n / 2) { median = e; break; } }
  const mean = hist.reduce((t, c, e) => t + c * e, 0) / n;
  return { n, hist, pD: dWins / n, pR: rWins / n, pTie: ties / n, median, mean,
    tipping: Object.entries(tip).map(([st, c]) => ({ st, share: c / n })).sort((a, b) => b.share - a.share),
    stWins: Object.fromEntries(Object.entries(stWins).map(([k, v]) => [k, v / n])) };
}

/* ---------- EVPC: every combination of the states in play ----------
   In play = toss-ups and leans. Every other state goes to the side it's rated for. */
const IN_PLAY = ["leanR", "toss", "leanD"];
function evpc(states){
  const toss = states.filter(s => IN_PLAY.includes(s.rating)).sort((a, b) => b.ev - a.ev);
  const baseD = states.filter(s => !IN_PLAY.includes(s.rating) && s.pD >= 0.5).reduce((t, s) => t + s.ev, 0);
  const baseR = states.filter(s => !IN_PLAY.includes(s.rating) && s.pD < 0.5).reduce((t, s) => t + s.ev, 0);
  const n = toss.length, total = 2 ** n;
  let dCombos = 0, rCombos = 0, tieCombos = 0, pD = 0, pR = 0, pT = 0;
  const top = [];
  for (let mask = 0; mask < total; mask++) {
    let d = baseD, p = 1;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) { d += toss[i].ev; p *= toss[i].pD; } else p *= 1 - toss[i].pD;
    }
    if (d >= 270) { dCombos++; pD += p; } else if (d === 269) { tieCombos++; pT += p; } else { rCombos++; pR += p; }
    top.push({ mask, d, p });
  }
  top.sort((a, b) => b.p - a.p);
  return { toss, baseD, baseR, total, dCombos, rCombos, tieCombos, pD, pR, pT,
    likely: top.slice(0, 6).map(c => ({ ...c, dStates: toss.filter((_, i) => c.mask & (1 << i)).map(s => s.st), rStates: toss.filter((_, i) => !(c.mask & (1 << i))).map(s => s.st) })) };
}

/* ---------- Run everything ---------- */
function pollInputs(POLLS){
  if (!POLLS) return [];
  const keys = [...new Set(POLLS.flatMap(p => Object.keys(p.races)).filter(k => k.startsWith("general:")))];
  return keys.map(k => {
    const end = latestFor(POLLS, k); const avg = averageAsOf(POLLS, k, end);
    const D = avg.list.find(c => c.party === "D"), R = avg.list.find(c => c.party === "R");
    return D && R ? { key: k, margin: D.pct - R.pct, weight: avg.weight / Math.max(1, avg.n), label: `${D.name} vs. ${R.name}` } : null;
  }).filter(Boolean);
}
function runForecast(POLLS){
  const polls = pollInputs(POLLS);
  const nat = nationalEnvironment({ polls });
  const states = stateForecasts(nat.env);
  const sim = simulate(states);
  const ev = evpc(states);
  // How the forecast looked with data through each cycle (factors and polls only in "Today")
  const trend = CYCLES.map(c => {
    const e = nationalEnvironment({ throughYear: c.year, factors: false });
    const s = simulate(stateForecasts(e.env), 3000, FC.seed + c.year);
    return { label: String(c.year), date: c.year + "-11-15", env: e.env, pD: s.pD, pR: s.pR, mean: s.mean };
  });
  trend.push({ label: "Today", date: null, env: nat.env, pD: sim.pD, pR: sim.pR, mean: sim.mean, today: true });
  return { nat, states, sim, ev, trend, polls };
}

// Runs the website's own JavaScript engine (polls-core.js + market.js) in Node,
// with no browser, and prints its Stage 1 numbers as JSON. The Python tests use
// this to prove both engines give the same answers (the "parity" test).
//   node engine/tools/js_engine.mjs [public folder] [YYYY-MM-DD]
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm";
const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
const pub = path.resolve(args[0] || "public"), today = args[1];
const noop = () => {}, stub = new Proxy(function () {}, { get: () => stub, apply: () => stub });
const ctx = { console, Math, Date: today ? class extends Date { constructor(...a) { a.length ? super(...a) : super(today + "T12:00:00Z"); } static now() { return new Date(today + "T12:00:00Z").getTime(); } } : Date,
  Promise, Set, Map, Object, JSON, Number, String, Array, RegExp, Error, encodeURIComponent, setTimeout, clearTimeout,
  PDP: stub, document: { getElementById: () => ({ textContent: "" }), querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, documentElement: { dataset: {} } },
  addEventListener: noop, IGNORE_LAUNCH_LOG: true, DATA_ROOT: pub + "/data/",
  fetch: async url => ({ ok: true, text: async () => fs.readFileSync(url, "utf8") }) };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ["assets/polls-core.js", "assets/market.js"]) vm.runInContext(fs.readFileSync(path.join(pub, f), "utf8"), ctx, { filename: f });
if (process.argv.includes("--config")) {
  // The Stage 1 weights as the website has them, for the config test
  process.stdout.write(vm.runInContext(`JSON.stringify({ base: MAZE.base, intentScale: MAZE.intentScale, strengthScale: MAZE.strengthScale,
    ruledOut: MAZE.ruledOut, keyStates: MAZE.keyStates, standing: MAZE.standing, home: MAZE.home, standingFrom: MAZE.standingFrom,
    elements: Object.fromEntries(MAZE.elements.map(e => [e.id, { ring: e.ring, w: e.w, kind: e.kind }])),
    statementScale: Object.fromEntries(STATEMENT_SCALE.map(s => [s.id, s.r])), launchWatchStart: LW_START,
    status: Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v.w])), newsHalfLife: NEWS_HALF_LIFE,
    indexUnlock: typeof INDEX_UNLOCK === "undefined" ? null : INDEX_UNLOCK,
    announce: typeof ANNOUNCE === "undefined" ? null : ANNOUNCE })`, ctx));
  process.exit(0);
}
const M = await vm.runInContext("loadMarket()", ctx);
const out = { today: M.today, days: M.days, lwDays: M.lwDays, candidates: M.all.map(c => ({
  name: c.name, party: c.party, pct: c.pct, index: c.index, launch: c.launch, status: c.status, announce30: c.announce30,
  phase: vm.runInContext("phaseOf", ctx)(c),
  launchHistory: c.launchHistory.map(h => [h.d, h.v]), history: c.history.map(h => [h.d, h.v]),
  maze: c.maze.rows.map(r => [r.id, r.reading, r.pts]) })) };
process.stdout.write(JSON.stringify(out));

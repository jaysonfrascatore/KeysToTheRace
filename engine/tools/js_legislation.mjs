// Runs the website's Key Legislation engine (assets/legislation.js) in Node and prints
// each bill's odds as JSON, so the Python tests can check both engines agree.
//   node engine/tools/js_legislation.mjs [public folder] [YYYY-MM-DD] [--config]
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm";
const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
const pub = path.resolve(args[0] || "public"), day = args[1] || new Date().toISOString().slice(0, 10);
const ctx = { console, Math, JSON, Number, String, Array, Object, Date }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ["assets/polls-core.js", "assets/legislation.js"]) vm.runInContext(fs.readFileSync(path.join(pub, f), "utf8"), ctx, { filename: f });
if (process.argv.includes("--config")) { process.stdout.write(vm.runInContext("JSON.stringify(LEG_CFG)", ctx)); process.exit(0); }
const read = n => vm.runInContext(`parseCSV(${JSON.stringify(fs.readFileSync(path.join(pub, "data/legislation", n), "utf8"))})`, ctx);
ctx.__data = { members: read("members.csv"), bills: read("bills.csv"), positions: read("positions.csv") };
const out = vm.runInContext(`legRun(__data, ${JSON.stringify(day)}).map(r => ({ id: r.bill.id, pLaw: r.pLaw,
  house: { pPass: r.house.pPass, expectedYes: r.house.expectedYes, decided: r.house.decided, p: r.house.odds.map(o => o.p) },
  senate: { pPass: r.senate.pPass, expectedYes: r.senate.expectedYes, decided: r.senate.decided, p: r.senate.odds.map(o => o.p) } }))`, ctx);
process.stdout.write(JSON.stringify({ day, bills: out }));

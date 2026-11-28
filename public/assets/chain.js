/* =========================================================
   UNLOCK THE COUNT: THE PRIMARY PATH

   Stage 2, the Primary Path: after an announcement. The numbers come
   from the Python engine (data/primary.json): python -m ktr run --env live

   Needs market.js (loadMarket, MAZE) and us-map.js.
   ========================================================= */
(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const pc = (p, d = 1) => (p * 100).toFixed(d) + "%";
  const sgn = (v, d = 2) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(d);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STATE_NAMES = { AL: "Alabama", AR: "Arkansas", CA: "California", CO: "Colorado", IA: "Iowa", MA: "Massachusetts", ME: "Maine", MI: "Michigan", MN: "Minnesota",
    NC: "North Carolina", NH: "New Hampshire", NM: "New Mexico", NV: "Nevada", OK: "Oklahoma", SC: "South Carolina", TN: "Tennessee", TX: "Texas", UT: "Utah", VA: "Virginia", VT: "Vermont" };
  const ORD = n => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
  const token = (c, cls = "") => `<span class="tok ${cls} ${photoSrc(c.id) ? "has-photo" : ""}" style="--pc:${PARTY_HEX[c.party]}">${photoSrc(c.id) ? `<span class="ph"><img src="${photoSrc(c.id)}" alt=""></span>` : `<b>${c.mono.slice(0, 3)}</b>`}</span>`;
  const STANDING_TEXT = { midterms: { 1: "Won their own race", 0.5: "Campaigned for the party across states", "-1": "Lost their race" } };

  /* =========================================================
     STAGE 2: THE PRIMARY PATH
     ========================================================= */
  window.renderPath = function (M) {
    if (!$("#path")) return;
    const P = M.primary;
    if (!P || !P.parties) { $("#pathNote").textContent = "Stage 2 fills in after the model runs: python -m ktr run --env live"; return; }
    let party = "D", sel = null, mode = "pWin", drop = null;
    const palette = () => document.documentElement.dataset.theme === "light" ? LINE_LIGHT : LINE_DARK;

    function draw() {
      const pp = P.parties[party], names = pp.candidates.map(c => c.name);
      const ranked = pp.candidates.slice().sort((a, b) => b.attention - a.attention);
      const color = {}; ranked.forEach(c => color[c.name] = candColor(c.name));
      const byName = n => M.all.find(c => c.name === n);
      const early = pp.states.filter(s => !s.superTuesday), st = pp.states.filter(s => s.superTuesday);
      if (!sel || !pp.states.find(s => s.state === sel)) sel = early[0].state;
      const lead = s => { const k = s.pWin.indexOf(Math.max(...s.pWin)); return { name: names[k], p: s.pWin[k] }; };
      const declared = M[party].filter(c => c.status === "declared").length;
      $("#pathSims").textContent = pp.simulations.toLocaleString();
      $("#pathNote").innerHTML = `${declared ? `${declared} declared.` : "No one has declared yet, so the Primary Path runs on the likely field:"} every simulation draws who runs from Presidential Probability (about ${pp.expectedField.toFixed(1)} ${party === "D" ? "Democrats" : "Republicans"} per simulation). ${pp.daysToFirstContest} days to the first contest. Model run ${fd(P.asOf)}, ${pp.simulations.toLocaleString()} simulations.`;

      // Calendar, in date order
      const stLead = (() => { const t = names.map((_, k) => st.reduce((a, s) => a + s.pWin[k] * s.delegates, 0)); const k = t.indexOf(Math.max(...t)); return { name: names[k], p: t[k] / st.reduce((a, s) => a + s.delegates, 0) }; })();
      $("#pathCal").innerHTML = early.map((s, i) => { const l = lead(s); return `<button type="button" role="listitem" class="pc ${s.state === sel ? "on" : ""}" data-st="${s.state}">
          <span class="pc-n">${i + 1}</span><span class="pc-st">${s.state}</span><span class="pc-d">${s.confirmed ? fd(s.date) : (party === "D" ? "Feb" : "Exp.") + "<sup>*</sup>"}</span>
          <span class="pc-l"><i style="background:${color[l.name]}"></i>${last(l.name)} ${pc(l.p, 0)}</span></button>`; }).join("")
        + `<button type="button" role="listitem" class="pc st ${st.some(s => s.state === sel) ? "on" : ""}" data-st="${st.slice().sort((a, b) => b.delegates - a.delegates)[0].state}">
          <span class="pc-n">ST</span><span class="pc-st">Super Tuesday</span><span class="pc-d">${fd(st[0].date)} · ${st.length} states</span>
          <span class="pc-l"><i style="background:${color[stLead.name]}"></i>${last(stLead.name)} ${pc(stLead.p, 0)}</span></button>`;

      // Map: each calendar state in its leader's color, stronger when the lead is safer
      const order = Object.fromEntries(early.map((s, i) => [s.state, i + 1]));
      const info = Object.fromEntries(pp.states.map(s => [s.state, s]));
      let g = Object.entries(US_MAP.paths).map(([ab, d]) => {
        const s = info[ab]; if (!s) return `<path d="${d}" class="pm-off"/>`;
        const l = lead(s), op = Math.min(1, 0.35 + l.p * 1.1);
        return `<path d="${d}" class="pm-on ${ab === sel ? "sel" : ""} ${s.superTuesday ? "stt" : ""}" data-st="${ab}" style="fill:${color[l.name]};fill-opacity:${op.toFixed(2)}"><title>${STATE_NAMES[ab] || ab}: ${l.name} ${pc(l.p)}</title></path>`;
      }).join("");
      g += Object.entries(US_MAP.centers || {}).filter(([ab]) => info[ab]).map(([ab, [x, y]]) => order[ab]
        ? `<g class="pm-badge" data-st="${ab}"><circle cx="${x}" cy="${y}" r="13"/><text x="${x}" y="${y + 4.5}" text-anchor="middle">${order[ab]}</text></g>`
        : `<text class="pm-st" x="${x}" y="${y + 4}" text-anchor="middle" data-st="${ab}">${ab}</text>`).join("");
      $("#pathMap").innerHTML = `<svg viewBox="0 0 ${US_MAP.width} ${US_MAP.height}" role="img" aria-label="Primary calendar map">${g}</svg>`;
      $("#pathLegend").innerHTML = ranked.filter(c => pp.states.some(s => lead(s).name === c.name)).map(c => `<span><i style="background:${color[c.name]}"></i>${c.name}</span>`).join("")
        + `<span class="nt"><b class="b">1</b> Early-state order · <b>ST</b> Super Tuesday · darker = safer lead</span>`;

      // The selected state
      const s = info[sel], k = early.findIndex(x => x.state === sel);
      const vals = names.map((n, i) => ({ n, v: s[mode][i], c: byName(n) })).sort((a, b) => b.v - a.v).slice(0, 8);
      const mx = Math.max(...vals.map(v => v.v), 0.01);
      $("#pathState").innerHTML = `<div class="ps-head"><div><div class="eyebrow">${s.superTuesday ? "Super Tuesday" : ORD(k + 1) + " contest"}</div>
          <h3>${STATE_NAMES[sel] || sel}</h3><p>${s.confirmed ? fd(s.date) + ", " + s.date.slice(0, 4) : (s.note || "Date not set")} · ${s.delegates} delegates${s.confirmed ? "" : ` · <span class="ph">*placeholder date ${fd(s.date)} used for the model</span>`}</p></div>
          <div class="seg sm" id="psMode"><button type="button" data-m="pWin" class="${mode === "pWin" ? "on" : ""}">Chance to win</button><button type="button" data-m="pWinIfRuns" class="${mode === "pWinIfRuns" ? "on" : ""}">If they run</button></div></div>
        <div class="ps-bars">${vals.map(v => `<div class="pb" data-open="${v.c ? v.c.id : ""}"><div class="pb-n">${v.c ? token(v.c, "sm") : ""}<span>${v.n}</span></div>
          <div class="pb-t"><i style="width:${(v.v / mx * 100).toFixed(1)}%;background:${color[v.n]}"></i></div><b>${pc(v.v)}</b></div>`).join("")}</div>
        <p class="note">${mode === "pWin" ? "Chance to win counts the simulations where they didn't run as losses, so each state adds to 100%." : "If they run: the chance to win counting only the simulations where they entered the race."}</p>`;
      $$("#psMode button").forEach(b => b.addEventListener("click", () => { mode = b.dataset.m; draw(); }));

      // Every candidate
      const mxA = Math.max(...ranked.map(c => c.attention));
      $("#pathTable").innerHTML = `<table class="why-tbl path-tbl"><thead><tr><th>Candidate</th><th class="n">Runs</th><th class="n">Wins an early state</th><th class="n">Past Super Tuesday</th><th class="n">Nominee if they run</th><th class="n">Nominee</th><th>Attention Index</th></tr></thead><tbody>
        ${ranked.map(c => { const m = byName(c.name); return `<tr data-open="${m ? m.id : ""}" tabindex="0"><td><div class="nm">${m ? `<span class="mini ${photoSrc(m.id) ? "has-photo" : ""}" style="--pc:${PARTY_HEX[m.party]}">${photoSrc(m.id) ? `<span class="ph"><img src="${photoSrc(m.id)}" alt=""></span>` : m.mono.slice(0, 2)}</span>` : ""}<div>${c.name}${m && m.status === "declared" ? ' <span class="chip live">Declared</span>' : ""}</div></div></td>
          <td class="n">${pc(c.pRun, 0)}</td><td class="n">${pc(c.pEarlyWinIfRuns, 0)}</td><td class="n">${pc(c.pPastSuperTuesdayIfRuns, 0)}</td><td class="n">${pc(c.pNomineeIfRuns)}</td><td class="n"><b>${pc(c.pNominee)}</b></td>
          <td><div class="att"><div class="att-t"><i style="width:${(c.attention / mxA * 100).toFixed(1)}%;background:${color[c.name]}"></i></div><b>${c.attention.toFixed(1)}</b></div></td></tr>`; }).join("")}</tbody></table>`;

      // Dropouts
      const dropList = ranked.slice(0, 8).map(c => c.name);
      const real = M[party].filter(c => c.status === "dropped").map(c => c.name);
      if (!drop || !pp.candidates.find(c => c.name === drop)) drop = real[0] || dropList[0];
      $("#dropChips").innerHTML = [...new Set([...real, ...dropList])].map(n => { const m = byName(n); return `<button type="button" class="dc ${n === drop ? "on" : ""} ${real.includes(n) ? "real" : ""}" data-n="${n}">${m ? token(m, "sm") : ""}${last(n)}${real.includes(n) ? " · out" : ""}</button>`; }).join("");
      const dc = pp.candidates.find(c => c.name === drop), sc = pp.scenarios && pp.scenarios[drop];
      const barList = (arr, top, other) => { const head = arr.slice(0, top), rest = arr.slice(top).reduce((t, x) => t + x[1], 0); const rows = other && rest > 0.001 ? [...head, [other, rest]] : head; const mx2 = Math.max(...rows.map(r => r[1]));
        return rows.map(([n, p]) => `<div class="pb"><div class="pb-n">${byName(n) ? token(byName(n), "sm") : ""}<span>${n}</span></div><div class="pb-t"><i style="width:${(p / mx2 * 100).toFixed(1)}%;background:${color[n] || "var(--ink-3)"}"></i></div><b>${pc(p)}</b></div>`).join(""); };
      let change = `<p class="note">Scenario runs cover the top six by Attention Index.</p>`;
      if (sc) {
        const rows = pp.candidates.filter(c => c.name !== drop).map(c => ({ n: c.name, a: c.pNominee, b: sc.pNominee[c.name] })).sort((x, y) => (y.b - y.a) - (x.b - x.a)).slice(0, 5);
        const flips = early.concat(st).map(s0 => { const before = lead(s0).name, arr = sc.states[s0.state]; const k2 = arr.indexOf(Math.max(...arr)); return { st: s0.state, before, after: names[k2], p: arr[k2] }; }).filter(f => f.before === drop || f.before !== f.after);
        change = `<div class="chg-rows">${rows.map(r => `<div><span>${r.n}</span><span>${pc(r.a)} → <b>${pc(r.b)}</b> <i class="${r.b >= r.a ? "up" : "down"}">${sgn((r.b - r.a) * 100, 1)}</i></span></div>`).join("")}</div>
          ${flips.length ? `<div class="flips"><b>States that change hands</b>${flips.slice(0, 8).map(f => `<span>${f.st}: ${last(f.before)} → <b>${last(f.after)}</b> ${pc(f.p, 0)}</span>`).join("")}</div>` : `<p class="note">No state changes leader.</p>`}`;
      }
      $("#dropBody").innerHTML = `<div><h4>Where ${last(drop)}'s voters go</h4>${barList(dc.votersGo, 6, "Everyone else")}<p class="note">60% follow the lane map (closest candidates), 40% split by size.</p></div>
        <div><h4>Who ${last(drop)} would likely endorse</h4>${barList(dc.endorses, 5, "Someone else")}</div>
        <div><h4>If ${last(drop)} dropped out today</h4><p class="sub">Chance to be the nominee</p>${change}</div>`;
    }
    $$("#pathSeg button").forEach(b => b.addEventListener("click", () => { party = b.dataset.p; sel = null; drop = null;
      $$("#pathSeg button").forEach(x => { x.classList.toggle("on", x.dataset.p === party); x.setAttribute("aria-selected", x.dataset.p === party); }); draw(); }));
    $("#pathCal").addEventListener("click", e => { const b = e.target.closest("[data-st]"); if (b) { sel = b.dataset.st; draw(); } });
    $("#pathMap").addEventListener("click", e => { const b = e.target.closest("[data-st]"); if (b) { sel = b.dataset.st; draw(); } });
    $("#dropChips").addEventListener("click", e => { const b = e.target.closest("[data-n]"); if (b) { drop = b.dataset.n; draw(); } });
    const openRow = e => { const r = e.target.closest("[data-open]"); if (r && r.dataset.open) PDP.open("c", r.dataset.open); };
    $("#pathTable").addEventListener("click", openRow); $("#pathState").addEventListener("click", openRow);
    document.addEventListener("themechange", draw);
    draw();
  };
})();

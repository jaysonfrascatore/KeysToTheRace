/* =========================================================
   KEYS TO THE RACE: THE CHAIN REACTION AND THE PRIMARY PATH

   Stage 1, the chain:  news or a quote -> Decision Maze -> chance they run -> Index
   Each event replays in that order. The candidate moves in the maze
   (center = 0%, outer wall = the announcement), the chance they run
   moves on the chart (green = yes, red = no), and the Index unlocks
   once that chance passes 64.9%.

   Stage 2, the Primary Path: after an announcement. The numbers come
   from the Python engine (data/primary.json): python -m ktr run --env live

   Needs market.js (loadMarket, MAZE, STATEMENT_BY_ID, INDEX_UNLOCK…) and us-map.js.
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
     STAGE 1: THE CHAIN REACTION
     ========================================================= */
  // Every day a candidate's chance moved, and what moved it
  function eventsFor(c, M) {
    const h = c.launchHistory, out = [];
    for (let i = 1; i < h.length; i++) {
      const d = h[i].d, mv = h[i].v - h[i - 1].v;
      const items = M.news.filter(n => n.candidate === c.name && n.date === d && (STATEMENT_BY_ID[n.signal] || SIGNAL_MAP[n.signal] || n.status));
      const poll = d === M.days[0];
      const stand = Object.keys(MAZE.standing[c.name] || {}).filter(k => MAZE.standingFrom[k] === d);
      if (Math.abs(mv) < 0.005 && !items.length) continue;
      out.push({ d, prev: h[i - 1].d, before: h[i - 1].v, after: h[i].v, items, poll, stand });
    }
    return out;
  }
  // What changed inside the maze between two readings
  function mazeDiff(a, b) {
    const pts = m => m.rows.reduce((o, r) => (o[r.id] = (o[r.id] || 0) + r.pts, o), {});
    const A = pts(a), B = pts(b), ids = [...new Set([...Object.keys(A), ...Object.keys(B)])];
    return ids.map(id => ({ id, e: MAZE_BY_ID[id], from: A[id] || 0, to: B[id] || 0 })).filter(x => Math.abs(x.to - x.from) > 1e-9);
  }
  function hypoEvent(c, M) {
    const said = c.statements.filter(s => s.r);
    const kind = said.length ? "reaffirm" : "seriously";
    const extra = { date: M.today, kind, text: kind === "reaffirm" ? "“My thinking has not changed.”" : "“I'm seriously looking at it.”" };
    return { d: M.today, prev: M.today, hypo: extra, before: c.launch * 100, after: c.launchAt(M.today, extra) * 100, items: [], poll: false, stand: [] };
  }

  function newsCard(c, ev, M) {
    const first = ev.items[0];
    let kind = "", text = "", chip = "", src = "";
    if (ev.hypo) {
      const sc = STATEMENT_BY_ID[ev.hypo.kind];
      kind = "What if they said this today?"; text = ev.hypo.text;
      chip = `<span class="rd ${ev.after < ev.before ? "down" : "up"}">${sc.label}${sc.r != null ? ` · ${sgn(sc.r)}` : ""}</span>`;
    } else if (first && STATEMENT_BY_ID[first.signal]) {
      const sc = STATEMENT_BY_ID[first.signal];
      kind = "Their own words"; text = first.headline; src = first.source;
      chip = `<span class="rd ${sc.r > 0 ? "up" : sc.r < 0 ? "down" : ""}">${sc.label} · ${sc.r ? sgn(sc.r) : "0"}</span>`;
    } else if (first && SIGNAL_MAP[first.signal]) {
      const e = MAZE_BY_ID[SIGNAL_MAP[first.signal][0]];
      kind = e.label; text = first.headline; src = first.source;
      chip = `<span class="rd ${SIGNAL_MAP[first.signal][1] > 0 ? "up" : "down"}">Ring ${e.ring} · ${e.w.toFixed(2)}</span>`;
    } else if (first && first.status) {
      kind = "Status"; text = first.headline; src = first.source;
      chip = `<span class="rd">${STATUS[first.status].label}</span>`;
    } else if (ev.stand.length) {
      const k = ev.stand[0], r = MAZE.standing[c.name][k];
      kind = MAZE_BY_ID[k].label; text = (STANDING_TEXT[k] && STANDING_TEXT[k][r]) || "Counts from today";
      chip = `<span class="rd ${r > 0 ? "up" : "down"}">Ring ${MAZE_BY_ID[k].ring} · ${MAZE_BY_ID[k].w.toFixed(2)}</span>`;
    } else if (ev.poll) {
      kind = "The first 2028 primary polls"; text = `${last(c.name)} is at ${c.pct.toFixed(1)}% in the ${PARTY_NAME[c.party]} primary average.`;
      chip = `<span class="rd ${c.pct >= 10 ? "up" : "down"}">Ring 4 · 1.00</span>`;
    }
    const extra = [ev.items.length > 1 ? `+${ev.items.length - 1} more that day` : "", ev.poll && first ? "Also: the first 2028 primary polls" : "",
      ev.stand.length && first ? "Also: " + MAZE_BY_ID[ev.stand[0]].label.toLowerCase() : ""].filter(Boolean);
    const more = extra.length ? `<div class="ch-more">${extra.join(" · ")}</div>` : "";
    return `<div class="ch-card">
      <div class="ch-who">${token(c)}<div><b>${c.name}</b><span>${ev.hypo ? "Hypothetical · today" : fd(ev.d) + ", " + ev.d.slice(0, 4)}</span></div></div>
      <div class="ch-kind">${kind}</div>
      <p class="ch-quote">${text}</p>
      <div class="ch-foot">${chip}${src ? `<span class="src">${src}</span>` : ""}</div>${more}
    </div>`;
  }

  // The maze: rings, the 65% gold ring, and every candidate placed by their chance of running
  const R0 = 24, R1 = 186;
  const rOf = p => R0 + Math.max(0, Math.min(1, p)) * (R1 - R0);
  function mazeSVG() {
    let g = "";
    const gaps = [-90, -30, -150, -45, -135, -60, -120, -75];
    for (let k = 1; k <= 8; k++) {
      const r = R0 + (k / 8) * (R1 - R0), a = gaps[k - 1] * Math.PI / 180, sweep = 0.34;
      const p1 = [200 + r * Math.cos(a + sweep / 2), 200 + r * Math.sin(a + sweep / 2)], p2 = [200 + r * Math.cos(a - sweep / 2 + 2 * Math.PI), 200 + r * Math.sin(a - sweep / 2 + 2 * Math.PI)];
      g += `<path d="M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A${r} ${r} 0 1 1 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}" class="mz-wall ${k === 8 ? "exit" : ""}"/>`;
    }
    const ru = rOf(INDEX_UNLOCK);
    g += `<circle cx="200" cy="200" r="${ru}" class="mz-unlock"/><text x="200" y="${200 - ru - 5}" text-anchor="middle" class="mz-ul">65% · INDEX UNLOCKS</text>`;
    g += `<circle cx="200" cy="200" r="${R0 - 4}" class="mz-core"/><text x="200" y="204" text-anchor="middle" class="mz-c">0%</text>`;
    g += `<text x="200" y="${200 + R1 + 13}" text-anchor="middle" class="mz-ex">ANNOUNCES · 100%</text>`;
    return `<svg viewBox="0 -4 400 418" aria-hidden="true">${g}</svg>`;
  }
  function place(el, p, ang) {
    const r = rOf(p), a = ang * Math.PI / 180;
    el.style.left = ((200 + r * Math.cos(a)) / 400 * 100) + "%";
    el.style.top = ((200 + r * Math.sin(a) + 4) / 418 * 100) + "%";
  }
  const valueOn = (c, d) => { const h = c.launchHistory.find(x => x.d === d); return h ? h.v / 100 : c.launch; };

  function drawChart(c, ev, phase) {
    const host = $("#chChart"), h = c.launchHistory;
    let i = ev.hypo ? h.length : h.findIndex(x => x.d === ev.d);
    if (i < 0) i = h.length - 1;
    const pts = ev.hypo ? [...h.map(x => x.v), ev.after] : h.slice(0, i + 1).map(x => x.v);
    const W = 360, H = 186, L = 40, Rr = 12, T = 16, B = 22, n = ev.hypo ? h.length + 1 : h.length;
    const x = k => L + k * (W - L - Rr) / Math.max(1, n - 1), y = v => T + (1 - v / 100) * (H - T - B);
    const path = (arr, f) => arr.map((v, k) => `${k ? "L" : "M"}${x(k).toFixed(1)} ${y(f(v)).toFixed(1)}`).join("");
    const before = pts.slice(0, -1), lastK = pts.length - 1;
    let g = "";
    [0, 50, 100].forEach(v => g += `<line x1="${L}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${L - 5}" y="${y(v) + 3.5}" text-anchor="end">${v}%</text>`);
    g += `<line x1="${L}" x2="${W - Rr}" y1="${y(INDEX_UNLOCK * 100)}" y2="${y(INDEX_UNLOCK * 100)}" class="ul"/>`;
    g += `<text x="${L}" y="${H - 6}">${fd(h[0].d)}</text><text x="${W - Rr}" y="${H - 6}" text-anchor="end">${ev.hypo ? "What if" : "Today"}</text>`;
    // Where this event sits on the calendar
    g += `<line x1="${x(lastK)}" x2="${x(lastK)}" y1="${T}" y2="${H - B}" class="evl"/><text x="${Math.min(W - Rr - 2, Math.max(L + 2, x(lastK)))}" y="${T - 4}" text-anchor="${x(lastK) > W - 60 ? "end" : x(lastK) < L + 40 ? "start" : "middle"}" class="evt">${ev.hypo ? "What if" : fd(ev.d)}</text>`;
    g += `<path d="${path(before, v => 100 - v)}" class="ln no"/><path d="${path(before, v => v)}" class="ln yes"/>`;
    const seg = (f, cls) => `<path d="M${x(lastK - 1).toFixed(1)} ${y(f(pts[lastK - 1])).toFixed(1)}L${x(lastK).toFixed(1)} ${y(f(pts[lastK])).toFixed(1)}" class="ln ${cls} seg ${phase ? "go" : ""}"/>`;
    g += seg(v => 100 - v, "no") + seg(v => v, "yes");
    const ey = phase ? pts[lastK] : pts[lastK - 1], ex = phase ? x(lastK) : x(lastK - 1);
    g += `<circle cx="${ex}" cy="${y(ey)}" r="4.5" class="dot yes ${phase ? "go" : ""}"/><circle cx="${ex}" cy="${y(100 - ey)}" r="4" class="dot no ${phase ? "go" : ""}"/>`;
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="ch-svg" role="img" aria-label="Chance ${c.name} runs, yes and no">${g}</svg>`;
  }
  function countTo(el, from, to, ms, fmt) {
    if (reduce) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const tick = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  function indexBox(c, ev, M, final) {
    const v = final ? ev.after : ev.before, open = c.status === "declared" || v / 100 > INDEX_UNLOCK;
    const crossed = final && (ev.before / 100 > INDEX_UNLOCK) !== (ev.after / 100 > INDEX_UNLOCK);
    const hist = c.history.find(x => x.d === ev.d);
    const idx = ev.hypo || ev.d === M.today ? c.index : hist && hist.v;
    if (open) return `<div class="ix open ${crossed ? "pop" : ""}">${UNLOCK}<div class="ix-state">Unlocked</div>
      <div class="ix-num">${idx != null ? price(idx) : "—"}</div><div class="ix-sub">${idx != null ? `Index score${ev.hypo ? " today" : " that day"}` : "The Index opens with the first 2028 polls"}</div>
      ${crossed ? `<div class="ix-flag">Crossed 65%: the Index unlocks</div>` : ""}</div>`;
    return `<div class="ix ${crossed ? "pop" : ""}">${LOCK}<div class="ix-state">Locked</div>
      <div class="ix-num sm">${Math.max(0, INDEX_UNLOCK * 100 - v + 0.01).toFixed(2)}<small> pts to go</small></div>
      <div class="gate-bar"><i style="width:${Math.min(100, v / (INDEX_UNLOCK * 100) * 100).toFixed(1)}%"></i></div>
      <div class="ix-sub">${crossed ? "Fell back under 65%: the Index locks again" : "Unlocks once the chance they run passes 64.9%"}</div></div>`;
  }

  window.renderChain = function (M) {
    if (!$("#chain")) return;
    let party = "D", who = null, evs = [], cur = -1, timers = [], playing = false;
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const later = (ms, f) => timers.push(setTimeout(f, reduce ? 0 : ms));
    const mazeHost = $("#chMaze");
    const pick = p => M[p].find(c => c.name === (p === "D" ? "Jon Ossoff" : "JD Vance")) || M[p][0];

    function setWho(c) {
      who = c; clear(); playing = false; paintPlay();
      evs = eventsFor(c, M); evs.push(hypoEvent(c, M));
      $("#chWho").value = c.id;
      $("#chEvents").innerHTML = evs.map((e, i) => `<button type="button" role="listitem" class="ch-ev ${e.hypo ? "hypo" : ""} ${e.after > e.before + 0.005 ? "up" : e.after < e.before - 0.005 ? "down" : ""}" data-i="${i}">
        <b>${e.hypo ? "What if" : fd(e.d)}</b><span>${e.hypo ? (STATEMENT_BY_ID[e.hypo.kind].label) : (Math.abs(e.after - e.before) < 0.005 ? "No change" : sgn(e.after - e.before) + " pts")}</span></button>`).join("");
      // Place everyone in this party's maze
      const field = M[party];
      mazeHost.innerHTML = mazeSVG() + field.map((x, i) => `<span class="mz-tok ${x.id === c.id ? "on" : ""}" data-id="${x.id}" title="${x.name}">${token(x)}<em>${last(x.name)}</em></span>`).join("");
      field.forEach((x, i) => { const el = mazeHost.querySelector(`[data-id="${x.id}"]`); el._ang = -90 + 360 * i / field.length + (x.id === c.id ? 0 : 0); place(el, x.launch, el._ang); });
      show(evs.length - 2 >= 0 ? evs.length - 2 : 0, false);
    }
    function show(i, animate = true) {
      cur = i; const ev = evs[i], c = who;
      $$("#chEvents .ch-ev").forEach(b => b.classList.toggle("on", +b.dataset.i === i));
      if (animate) centerInRow($("#chEvents .ch-ev.on"));
      clear();
      const steps = $$("#chain .ch-step"), arrows = $$("#chain .ch-arrow");
      steps.forEach(s => s.classList.remove("lit")); arrows.forEach(a => a.classList.remove("lit"));
      // Everyone else sits where they were that day
      M[party].forEach(x => { const el = mazeHost.querySelector(`[data-id="${x.id}"]`); if (el && x.id !== c.id) place(el, ev.hypo ? x.launch : valueOn(x, ev.d), el._ang); });
      const me = mazeHost.querySelector(`[data-id="${c.id}"]`);
      me.classList.add("no-anim"); place(me, ev.before / 100, me._ang); void me.offsetWidth; me.classList.remove("no-anim");
      const a = ev.hypo ? c.mazeAt(M.today) : c.mazeAt(ev.prev), b = ev.hypo ? c.mazeAt(M.today, ev.hypo) : c.mazeAt(ev.d);
      const diff = mazeDiff(a, b);
      $("#chNews").innerHTML = newsCard(c, ev, M);
      $("#chMazeDelta").innerHTML = "";
      $("#chProb").innerHTML = `<b class="y">${ev.before.toFixed(2)}%</b><span> yes</span> <b class="n">${(100 - ev.before).toFixed(2)}%</b><span> no</span>`;
      drawChart(c, ev, false);
      $("#chIndex").innerHTML = indexBox(c, ev, M, false);
      const go = animate ? 1 : 0;
      later(go * 60, () => steps[0].classList.add("lit"));
      later(go * 700, () => {
        arrows[0].classList.add("lit"); steps[1].classList.add("lit");
        place(me, ev.after / 100, me._ang);
        $("#chMazeDelta").innerHTML = diff.length ? diff.map(x => `<div><b>${x.e.label}</b><span>${sgn(x.from)} → <i class="${x.to > x.from ? "up" : "down"}">${sgn(x.to)}</i> pts</span></div>`).join("")
          + `<div class="tot"><b>Maze total</b><span>${sgn(a.x)} → <i class="${b.x > a.x ? "up" : "down"}">${sgn(b.x)}</i></span></div>` : `<div><span>Status change: the maze is set aside.</span></div>`;
      });
      later(go * 1900, () => {
        arrows[1].classList.add("lit"); steps[2].classList.add("lit");
        drawChart(c, ev, true);
        const y = $("#chProb .y"), n = $("#chProb .n");
        countTo(y, ev.before, ev.after, 1100, v => v.toFixed(2) + "%");
        countTo(n, 100 - ev.before, 100 - ev.after, 1100, v => v.toFixed(2) + "%");
        const mv = ev.after - ev.before;
        $("#chProb").insertAdjacentHTML("beforeend", `<span class="mv ${mv > 0.005 ? "up" : mv < -0.005 ? "down" : ""}">${Math.abs(mv) < 0.005 ? "No change" : sgn(mv) + " pts"}</span>`);
      });
      later(go * 3200, () => { arrows[2].classList.add("lit"); steps[3].classList.add("lit"); $("#chIndex").innerHTML = indexBox(c, ev, M, true); });
      if (playing) later(4800, () => { if (cur < evs.length - 1) show(cur + 1); else { playing = false; paintPlay(); } });
    }
    function paintPlay() { const b = $("#chPlay"); b.querySelector(".ic").textContent = playing ? "❚❚" : "▶"; b.querySelector(".tx").textContent = playing ? "Pause" : "Play their year"; }
    function setParty(p) {
      party = p;
      $$("#chSeg button").forEach(x => { x.classList.toggle("on", x.dataset.p === p); x.setAttribute("aria-selected", x.dataset.p === p); });
      $("#chWho").innerHTML = M[p].slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.id}">${c.name}</option>`).join("");
      setWho(pick(p));
    }
    $$("#chSeg button").forEach(b => b.addEventListener("click", () => setParty(b.dataset.p)));
    $("#chWho").addEventListener("change", e => setWho(M.all.find(c => c.id === e.target.value)));
    $("#chEvents").addEventListener("click", e => { const b = e.target.closest(".ch-ev"); if (b) { playing = false; paintPlay(); show(+b.dataset.i); } });
    $("#chPlay").addEventListener("click", () => { playing = !playing; paintPlay(); if (playing) show(cur >= evs.length - 1 ? 0 : cur + 1); else clear(); });
    setParty("D");
    // Plays once on its own the first time the section comes into view
    if ("IntersectionObserver" in window && !reduce) {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.disconnect(); playing = true; paintPlay(); show(0); } }), { threshold: 0.35 });
      io.observe($("#chain"));
    }
    window.chainShow = (name, i) => { const c = M.all.find(x => x.name === name); if (!c) return; if (c.party !== party) setParty(c.party); setWho(c); show(i == null ? 0 : i < 0 ? evs.length + i : i, false); };
  };

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
      $("#pathNote").innerHTML = `${declared ? `${declared} declared.` : "No one has declared yet, so Stage 2 runs on the likely field:"} every simulation draws who runs from Launch Watch (about ${pp.expectedField.toFixed(1)} ${party === "D" ? "Democrats" : "Republicans"} per simulation). ${pp.daysToFirstContest} days to the first contest. Model run ${fd(P.asOf)}, ${pp.simulations.toLocaleString()} simulations.`;

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

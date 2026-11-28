/* =========================================================
   UNLOCK THE COUNT: KEY LEGISLATION
   A whip count for every big bill, like The 29th Vote, for all 100
   senators and every House member.

     signals (votes, statements, past votes) -> each member's chance of voting yes
     -> 11,111 simulated roll calls -> the chance it passes each chamber -> becomes law

   HOW TO UPDATE (no code):
     data/legislation/positions.csv   one row per vote, statement or signal:
        date, bill, chamber (house/senate), bioguide (from members.csv), member,
        kind (vote, statement, priorVote, leadership, policy), reading (-1 to +1),
        note, source, source_url
        - kind "vote" is a recorded vote on this bill: it locks the member.
        - kind "statement": their latest public position stands (a switch replaces it).
     data/legislation/bills.csv       one row per bill (party starting points, Senate 60 or 51)
     data/legislation/members.csv     python -m ktr members  (refreshes all 535 from GitHub)
   The page recomputes on load. The Python engine (engine/ktr/legislation.py) is
   its twin and logs each day to data/legislation/log.csv; tests keep the two equal.
   ========================================================= */
// Must match "legislation" in config/model.json (the tests check)
const LEG_CFG = {
  method: "v1", simulations: 11111, seed: 535, pointScale: 1.5,
  weights: { statement: 2.00, priorVote: 1.00, leadership: 0.50, policy: 0.50 },
  categories: { yes: 0.85, leanYes: 0.60, leanNo: 0.40, no: 0.15 },
  partyError: 0.60, absence: { house: 0.025, senate: 0.02 }, rebuildFrom: "2026-10-01"
};
const LEG_TRACKING_STARTS = "2026-11-22";      // days before this were rebuilt from dated positions
const LEG_ROOT = (window.DATA_ROOT || "../data/") + "legislation/";

function legMulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const legLogistic = x => 1 / (1 + Math.exp(-x));
const legLogit = p => Math.log(p / (1 - p));
// Independents count with the party they caucus with (King and Sanders with Democrats; Kiley with Republicans)
const legCaucus = m => m.party === "D" || m.party === "R" ? m.party : (m.chamber === "senate" ? "D" : "R");
const legCategory = p => { const c = LEG_CFG.categories; return p >= c.yes ? "yes" : p >= c.leanYes ? "leanYes" : p > c.leanNo ? "undecided" : p > c.no ? "leanNo" : "no"; };

function legMemberOdds(bill, chamber, m, rows) {
  const votes = rows.filter(r => r.kind === "vote");
  if (votes.length) { const v = +votes.at(-1).reading; return { p: v > 0 ? 1 : 0, locked: v > 0 ? "yes" : v < 0 ? "no" : "absent", pts: 0, why: votes.at(-1) }; }
  const base = +bill[`${chamber}_base_${legCaucus(m)}`];
  let pts = 0, why = null;
  const st = rows.filter(r => r.kind === "statement");
  if (st.length) { pts += LEG_CFG.weights.statement * +st.at(-1).reading; why = st.at(-1); }
  for (const k of ["priorVote", "leadership", "policy"]) {
    const rs = rows.filter(r => r.kind === k);
    if (rs.length) { pts += LEG_CFG.weights[k] * rs.reduce((t, r) => t + +r.reading, 0) / rs.length; why = why || rs.at(-1); }
  }
  return { p: legLogistic(legLogit(base) + LEG_CFG.pointScale * pts), locked: null, pts, why };
}

function legChamber(bill, chamber, members, positions, day) {
  const ms = members.filter(m => m.chamber === chamber), by = {};
  positions.forEach(r => { if (r.bill === bill.id && r.chamber === chamber && r.date <= day) (by[r.bioguide] = by[r.bioguide] || []).push(r); });
  const odds = ms.map(m => legMemberOdds(bill, chamber, m, by[m.bioguide] || []));
  const threshold = chamber === "senate" ? (+bill.senate_threshold || 60) : 0;
  const locked = odds.filter(o => o.locked).length;
  if (locked > ms.length / 2) {                    // a recorded passage vote: the chamber has acted
    const yes = odds.filter(o => o.locked === "yes").length, no = odds.filter(o => o.locked === "no").length;
    return { ms, odds, decided: true, pPass: yes > no ? 1 : 0, yes, no, expectedYes: yes, hist: {}, threshold };
  }
  const rnd = legMulberry(LEG_CFG.seed + (chamber === "house" ? 0 : 1) + 7 * +bill.order);
  const free = [], xs = [], isR = [];
  let fixedYes = 0, fixedNo = 0;
  odds.forEach((o, i) => { if (o.locked === "yes") fixedYes++; else if (o.locked === "no") fixedNo++; else if (!o.locked) { free.push(i); xs.push(legLogit(o.p)); isR.push(legCaucus(ms[i]) === "R"); } });
  const absent = LEG_CFG.absence[chamber], sd = LEG_CFG.partyError, n = LEG_CFG.simulations;
  const vpYes = +bill.senate_base_R >= 0.5;        // the Vice President (a Republican) breaks Senate ties
  let wins = 0, tot = 0; const hist = {};
  for (let s = 0; s < n; s++) {
    const shock = {};
    for (const p of ["D", "R"]) { const u1 = rnd(), u2 = rnd(); shock[p] = sd * Math.sqrt(-2 * Math.log(u1 || 1e-12)) * Math.cos(2 * Math.PI * u2); }
    let yes = fixedYes, no = fixedNo;
    for (let k = 0; k < free.length; k++) {
      const u = rnd(), v = rnd();
      if (u < absent) continue;
      if (v < 1 / (1 + Math.exp(-(xs[k] + (isR[k] ? shock.R : shock.D))))) yes++; else no++;
    }
    const ok = chamber === "house" ? yes > no : threshold >= 60 ? yes >= threshold : (yes > no || (yes === no && vpYes));
    if (ok) wins++;
    tot += yes; hist[yes] = (hist[yes] || 0) + 1;
  }
  return { ms, odds, decided: false, pPass: wins / n, expectedYes: tot / n, hist, threshold };
}

function legRun(data, day) {
  const bills = [...data.bills].sort((a, b) => +a.order - +b.order);
  return bills.map(b => {
    const house = legChamber(b, "house", data.members, data.positions, day), senate = legChamber(b, "senate", data.members, data.positions, day);
    return { bill: b, house, senate, pLaw: house.pPass * senate.pPass * +b.sign_chance };
  });
}

/* =========================================================
   THE PAGE
   ========================================================= */
(function () {
  if (typeof document === "undefined" || !document.getElementById("legApp")) return;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const pc = (p, d = 1) => (p * 100).toFixed(d) + "%";
  const fdate = d => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const CAT = { votedYes: "Voted yes", yes: "Yes", leanYes: "Lean yes", undecided: "Undecided", leanNo: "Lean no", no: "No", votedNo: "Voted no", absent: "Didn't vote" };
  const ORDER = ["votedYes", "yes", "leanYes", "undecided", "leanNo", "no", "votedNo", "absent"];
  const KIND = { vote: "Recorded vote", statement: "Public statement", priorVote: "Past vote", leadership: "Leadership", policy: "Policy position" };
  const seatName = m => m.chamber === "senate" ? `${m.party}-${m.state}` : `${m.party}-${m.state}${+m.district ? "-" + m.district : "-AL"}`;
  const catOf = o => o.locked === "yes" ? "votedYes" : o.locked === "no" ? "votedNo" : o.locked === "absent" ? "absent" : legCategory(o.p);

  async function csv(name, id) {
    try {
      if (window.FORCE_FALLBACK) throw 0;
      const r = await fetch(LEG_ROOT + name, { cache: "no-store" }); if (!r.ok) throw 0;
      return parseCSV(await r.text());
    } catch (e) { const el = document.getElementById(id); return el ? parseCSV(el.textContent.trim()) : []; }
  }

  Promise.all([csv("members.csv", "leg-members-fallback"), csv("bills.csv", "leg-bills-fallback"), csv("positions.csv", "leg-positions-fallback"), csv("log.csv", "leg-log-fallback")])
    .then(([members, bills, positions, log]) => {
      const today = new Date().toISOString().slice(0, 10);
      const data = { members, bills, positions };
      $("#legMethod").innerHTML = `
        <div class="three">
          <div><span class="wpill">2.00</span><b>Public statement</b><p>Their latest stand on this bill, from “I'm a yes” (+1) to “I'm a no” (−1). A public switch replaces what came before.</p></div>
          <div><span class="wpill">1.00</span><b>Past vote</b><p>How they voted on the same idea before.</p></div>
          <div><span class="wpill">0.50</span><b>Leadership and policy</b><p>Party leaders' and committee chairs' asks, and stated policy positions.</p></div>
        </div>
        <p class="note" style="font-size:14px;color:var(--ink-2)">Every member starts at their party's starting point for the bill, set from how the party's leaders and members have lined up. Points move it: each point is worth 1.5 in log-odds, so one firm public “no” takes a 70% member to about 10%. A recorded vote on the bill itself locks them in. Then ${LEG_CFG.simulations.toLocaleString()} simulated roll calls let each party's members drift together (a party-wide swing) and allow for a few absences. The House needs a majority of those voting; the Senate needs 60 to end a filibuster, or a simple majority with the Vice President breaking ties.</p>
        <p class="note"><b>Updating:</b> add a row to <code>data/legislation/positions.csv</code> (date, bill, chamber, member ID, kind, reading from −1 to +1, a note and a source link). The page recomputes on load, and the daily run logs the day so the trend line never rewrites the past.</p>`;
      const runs = legRun(data, today);
      // No bills yet: show the note and keep the tracker out of sight
      if (!runs.length) { $("#legEmpty").hidden = false; $("#legTracker").hidden = true; $("#legBills").hidden = true; return; }
      let sel = runs[0].bill.id, chamber = null, filt = { q: "", party: "all", cat: "all" };
      const firstOpen = r => r.house.decided && !r.senate.decided ? "senate" : !r.house.decided ? "house" : "house";

      function billCards() {
        $("#legBills").innerHTML = runs.map(r => {
          const b = r.bill, st = c => r[c].decided ? (r[c].pPass ? `<b class="up">Passed</b>` : `<b class="down">Failed</b>`) : `<b>${pc(r[c].pPass)}</b>`;
          return `<button type="button" class="lb ${b.id === sel ? "on" : ""}" data-b="${b.id}">
            <span class="lb-num">${b.number}</span><span class="lb-name">${b.short}</span>
            <span class="lb-row"><span>House ${st("house")}</span><span>Senate ${st("senate")}</span></span>
            <span class="lb-law"><i style="width:${(r.pLaw * 100).toFixed(1)}%"></i></span>
            <span class="lb-foot">${pc(r.pLaw)} to become law · ${b.deadline_label}</span></button>`;
        }).join("");
      }

      function seats(r, c) {
        const R = r[c], ms = R.ms;
        const items = ms.map((m, i) => ({ m, o: R.odds[i], cat: catOf(R.odds[i]) }));
        // Democrats on the left, Republicans on the right; members voting yes sit toward the middle
        items.sort((a, b) => { const ca = legCaucus(a.m) === "D" ? 0 : 1, cb = legCaucus(b.m) === "D" ? 0 : 1; return ca - cb || (ca === 0 ? a.o.p - b.o.p : b.o.p - a.o.p); });
        const N = items.length, rows = c === "senate" ? 5 : 11, W = 640, H = 340, cx = W / 2, cy = H - 14, r0 = c === "senate" ? 120 : 92, r1 = 300;
        const radii = [...Array(rows)].map((_, k) => r0 + (r1 - r0) * k / (rows - 1)), sumR = radii.reduce((a, b) => a + b, 0);
        let pos = [];
        radii.forEach((rad, k) => { const cnt = Math.round(N * rad / sumR); for (let j = 0; j < cnt; j++) { const a = Math.PI * (1 - (cnt === 1 ? 0.5 : j / (cnt - 1))); pos.push({ a, x: cx + rad * Math.cos(a), y: cy - rad * Math.sin(a) }); } });
        while (pos.length > N) pos.pop(); while (pos.length < N) pos.push({ a: 0, x: cx + r1, y: cy });
        pos.sort((p, q) => q.a - p.a);
        const dot = c === "senate" ? 10.5 : 5.6;
        return `<svg viewBox="0 0 ${W} ${H}" class="leg-seats" role="img" aria-label="${c === "senate" ? "Senate" : "House"} seats by position">${items.map((it, i) =>
          `<circle cx="${pos[i].x.toFixed(1)}" cy="${pos[i].y.toFixed(1)}" r="${dot}" class="st ${it.cat}" style="--pty:${legCaucus(it.m) === "D" ? "var(--dem)" : "var(--rep)"}" data-i="${ms.indexOf(it.m)}"><title>${it.m.name} (${seatName(it.m)}): ${CAT[it.cat]}${it.o.locked ? "" : " · " + pc(it.o.p) + " yes"}</title></circle>`).join("")}
          <text x="${cx}" y="${cy - 26}" text-anchor="middle" class="st-big">${R.decided ? R.yes + "–" + R.no : Math.round(R.expectedYes)}</text>
          <text x="${cx}" y="${cy - 6}" text-anchor="middle" class="st-sm">${R.decided ? (R.pPass ? "PASSED" : "FAILED") : "EXPECTED YES"}</text></svg>`;
      }

      function trend(b, c, R) {
        const pts = log.filter(x => x.bill === b.id && x.chamber === c).map(x => ({ d: x.date, v: +x.pPass })).sort((a, z) => a.d < z.d ? -1 : 1);
        if (!pts.length || pts.at(-1).d < today) pts.push({ d: today, v: R.pPass, live: true });
        if (pts.length < 2) return `<p class="note">The trend starts with the first logged day.</p>`;
        const W = 600, H = 220, L = 40, Rr = 14, T = 14, B = 26, n = pts.length;
        const x = i => L + i * (W - L - Rr) / (n - 1), y = v => T + (1 - v) * (H - T - B);
        const rb = pts.filter(p => p.d < LEG_TRACKING_STARTS).length;
        let g = rb > 1 ? `<rect x="${L}" y="${T}" width="${x(rb - 1) - L}" height="${H - T - B}" class="rb"/><text x="${L + 6}" y="${T + 13}" class="rbt">REBUILT FROM DATED POSITIONS</text>` : "";
        [0, 0.5, 1].forEach(v => g += `<line x1="${L}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v * 100}%</text>`);
        g += `<path d="${pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(1 - p.v).toFixed(1)}`).join("")}" class="ln no"/>`;
        g += `<path d="${pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join("")}" class="ln yes"/>`;
        g += `<circle cx="${x(n - 1)}" cy="${y(pts.at(-1).v)}" r="5" class="blink dot-y"/><circle cx="${x(n - 1)}" cy="${y(1 - pts.at(-1).v)}" r="4.5" class="blink dot-n"/>`;
        g += `<text x="${L}" y="${H - 7}">${fdate(pts[0].d)}</text><text x="${W - Rr}" y="${H - 7}" text-anchor="end">Today</text>`;
        return `<svg viewBox="0 0 ${W} ${H}" class="leg-chart" role="img" aria-label="Chance it passes over time">${g}</svg>`;
      }

      function histo(R) {
        if (R.decided) return `<p class="note">Decided by a recorded vote: ${R.yes} yes, ${R.no} no.</p>`;
        const ks = Object.keys(R.hist).map(Number).sort((a, b) => a - b);
        const lo = ks[0], hi = ks.at(-1), mx = Math.max(...Object.values(R.hist));
        const W = 600, H = 220, L = 14, Rr = 14, T = 14, B = 26, span = Math.max(1, hi - lo + 1), bw = (W - L - Rr) / span;
        const need = chamber === "house" ? Math.floor(R.ms.length * 0.5) + 1 : R.threshold;
        let g = ks.map(k => `<rect x="${(L + (k - lo) * bw).toFixed(1)}" y="${(T + (1 - R.hist[k] / mx) * (H - T - B)).toFixed(1)}" width="${Math.max(0.8, bw - 0.6).toFixed(1)}" height="${((R.hist[k] / mx) * (H - T - B)).toFixed(1)}" class="${k >= need ? "pass" : "fail"}"/>`).join("");
        if (need >= lo && need <= hi + 1) g += `<line x1="${L + (need - lo) * bw}" x2="${L + (need - lo) * bw}" y1="${T}" y2="${H - B}" class="need"/><text x="${L + (need - lo) * bw + 5}" y="${T + 12}" class="needt">${need} NEEDED${chamber === "house" ? " (FULL HOUSE)" : ""}</text>`;
        g += `<text x="${L}" y="${H - 7}">${lo} yes</text><text x="${W - Rr}" y="${H - 7}" text-anchor="end">${hi} yes</text>`;
        return `<svg viewBox="0 0 ${W} ${H}" class="leg-chart" role="img" aria-label="Yes votes across ${LEG_CFG.simulations} simulations">${g}</svg>`;
      }

      function table(R) {
        const q = filt.q.trim().toLowerCase();
        const rows = R.ms.map((m, i) => ({ m, o: R.odds[i], cat: catOf(R.odds[i]) }))
          .filter(r => (filt.party === "all" || legCaucus(r.m) === filt.party) && (filt.cat === "all" || r.cat === filt.cat || (filt.cat === "yes" && r.cat === "votedYes") || (filt.cat === "no" && r.cat === "votedNo"))
            && (!q || (r.m.name + " " + r.m.state + " " + seatName(r.m)).toLowerCase().includes(q)))
          .sort((a, b) => b.o.p - a.o.p || a.m.last.localeCompare(b.m.last));
        $("#legCount").textContent = `${rows.length} of ${R.ms.length}`;
        $("#legTable").innerHTML = `<table class="why-tbl leg-tbl"><thead><tr><th>Member</th><th>Seat</th><th>Position</th><th class="n">Chance of yes</th><th>Why</th></tr></thead><tbody>${rows.map(r => `<tr>
          <td><b>${r.m.name}</b></td><td class="mono" style="white-space:nowrap"><span class="pty ${legCaucus(r.m)}">${r.m.party}</span> ${r.m.state}${r.m.chamber === "house" ? "-" + (+r.m.district ? r.m.district : "AL") : ""}</td>
          <td><span class="pos ${r.cat}">${CAT[r.cat]}</span></td>
          <td class="n"><b>${r.o.locked ? (r.o.locked === "yes" ? "100%" : r.o.locked === "no" ? "0%" : "—") : pc(r.o.p)}</b><div class="lw-mini"><i style="width:${(r.o.p * 100).toFixed(1)}%"></i></div></td>
          <td class="why">${r.o.why ? `${r.o.why.note}${r.o.why.source_url ? ` · <a href="${r.o.why.source_url}" target="_blank" rel="noopener">${r.o.why.source}</a>` : ""} <span class="d">${fdate(r.o.why.date)}</span>` : `<span style="color:var(--faint)">No public position yet: party starting point</span>`}</td></tr>`).join("")}</tbody></table>`;
      }

      function draw() {
        const r = runs.find(x => x.bill.id === sel), b = r.bill;
        if (!chamber) chamber = firstOpen(r);
        const R = r[chamber];
        $$("#legTabs button").forEach(x => { const c = x.dataset.c, on = c === chamber; x.classList.toggle("on", on); x.setAttribute("aria-selected", on);
          x.querySelector("span").textContent = c === "house" ? `${r.house.ms.length} seated of 435` : `${r.senate.ms.length} seats`;
          x.querySelector("em").innerHTML = r[c].decided ? (r[c].pPass ? `Passed ${r[c].yes}–${r[c].no}` : `Failed ${r[c].yes}–${r[c].no}`) : `${pc(r[c].pPass)} to pass`; });
        const counts = {}; R.odds.forEach(o => { const k = catOf(o); counts[k] = (counts[k] || 0) + 1; });
        // To pass: a majority of those voting (for a recorded vote), all seated members voting (House), or 60 to end debate (Senate)
        const N = R.ms.length, need = R.decided ? Math.floor((R.yes + R.no) / 2) + 1 : chamber === "house" ? Math.floor(N / 2) + 1 : R.threshold;
        const lastVote = positions.filter(p => p.bill === b.id && p.chamber === chamber && p.kind === "vote").at(-1);
        $("#legHead").innerHTML = `<div class="lh-main"><div class="eyebrow">${b.number} · ${chamber === "house" ? "House" : "Senate"}</div><h2>${b.title}</h2><p>${b.summary}</p>
            ${b.source_url ? `<p class="src"><a href="${b.source_url}" target="_blank" rel="noopener">${b.source}</a></p>` : ""}</div>
          <div class="lh-odds">${R.decided ? `<div class="big ${R.pPass ? "up" : "down"}">${R.pPass ? "Passed" : "Failed"}</div><div class="sub">${R.yes} yes · ${R.no} no${lastVote ? " · " + fdate(lastVote.date) : ""}</div>`
            : `<div class="big">${pc(R.pPass, 2)}</div><div class="sub">chance it passes the ${chamber === "house" ? "House" : "Senate"}</div><div class="sub2">Expected ${R.expectedYes.toFixed(0)} yes · ${chamber === "house" ? `${need} needed with all ${N} voting` : (R.threshold >= 60 ? "60 needed to end debate" : "51, or 50 plus the Vice President")}</div>`}
            <div class="law"><span>Becomes law</span><b>${pc(r.pLaw)}</b></div></div>`;
        // whip bar
        $("#legBar").innerHTML = `<div class="wb">${ORDER.filter(k => counts[k]).map(k => `<i class="${k}" style="flex:${counts[k]}" title="${CAT[k]}: ${counts[k]}"><span>${counts[k] >= (chamber === "house" ? 14 : 4) ? counts[k] : ""}</span></i>`).join("")}<b class="mark" style="left:${(need / N * 100).toFixed(2)}%"></b></div>
          <div class="wb-key">${ORDER.filter(k => counts[k]).map(k => `<span><i class="${k}"></i>${CAT[k]} <b>${counts[k]}</b></span>`).join("")}<span class="mk">${need} to pass${R.decided ? " (a majority of votes cast)" : ""}</span></div>`;
        $("#legSeats").innerHTML = seats(r, chamber);
        $("#legTrend").innerHTML = trend(b, chamber, R);
        $("#legHist").innerHTML = histo(R);
        $("#legHistNote").textContent = R.decided ? "" : `Out of ${LEG_CFG.simulations.toLocaleString()} simulated roll calls. Green = enough to pass.`;
        table(R);
        // updates for this bill and chamber, newest first, one line per day and kind
        const ups = positions.filter(p => p.bill === b.id && p.chamber === chamber);
        const grp = {}; ups.forEach(p => { const k = p.date + "|" + p.kind + "|" + p.source; (grp[k] = grp[k] || []).push(p); });
        $("#legUpdates").innerHTML = Object.entries(grp).sort((a, z) => a[0] < z[0] ? 1 : -1).slice(0, 30).map(([k, ps]) => { const p = ps[0];
          const body = ps.length > 3 ? (p.kind === "vote" ? `Roll call: ${ps.filter(x => +x.reading > 0).length} yes, ${ps.filter(x => +x.reading < 0).length} no, ${ps.filter(x => +x.reading === 0).length} didn't vote` : `${ps.length} members: ${p.note.replace(/^Voted (yes|no) /, "Votes ")}`) : ps.map(x => `<b>${x.member}</b>: ${x.note}`).join("<br>");
          return `<div class="lu"><div class="lu-d">${fdate(p.date)}<span>${KIND[p.kind] || p.kind}</span></div><div class="lu-b">${body}${p.source_url ? ` <a href="${p.source_url}" target="_blank" rel="noopener">${p.source}</a>` : ""}</div></div>`; }).join("") || `<p class="note">Nothing logged yet for this chamber.</p>`;
        billCards();
      }

      // Hover a seat to see who it is
      const tip = $("#legTip");
      $("#legSeats").addEventListener("pointermove", e => {
        const c = e.target.closest("circle[data-i]"); if (!c) { tip.hidden = true; return; }
        const r = runs.find(x => x.bill.id === sel)[chamber], i = +c.dataset.i, m = r.ms[i], o = r.odds[i], cat = catOf(o);
        tip.innerHTML = `<b>${m.name}</b><span>${seatName(m)}</span><span class="pos ${cat}">${CAT[cat]}${o.locked ? "" : " · " + pc(o.p) + " yes"}</span>${o.why ? `<small>${o.why.note}</small>` : ""}`;
        const box = $("#legSeats").getBoundingClientRect();
        tip.hidden = false; tip.style.left = Math.min(box.width - 230, Math.max(0, e.clientX - box.left + 12)) + "px"; tip.style.top = (e.clientY - box.top + 12) + "px";
      });
      $("#legSeats").addEventListener("pointerleave", () => tip.hidden = true);
      $("#legBills").addEventListener("click", e => { const x = e.target.closest("[data-b]"); if (x) { sel = x.dataset.b; chamber = null; draw(); } });
      $$("#legTabs button").forEach(x => x.addEventListener("click", () => { chamber = x.dataset.c; draw(); }));
      $("#legQ").addEventListener("input", e => { filt.q = e.target.value; table(runs.find(x => x.bill.id === sel)[chamber]); });
      $("#legParty").addEventListener("change", e => { filt.party = e.target.value; table(runs.find(x => x.bill.id === sel)[chamber]); });
      $("#legCat").addEventListener("change", e => { filt.cat = e.target.value; table(runs.find(x => x.bill.id === sel)[chamber]); });
      draw();
    });
})();

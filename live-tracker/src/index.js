/* =========================================================
   UNLOCK THE COUNT: LIVE TRACKER
   Runs every 30 minutes on Cloudflare's servers (no computer of yours
   needs to stay on). Each run:
     1. FEC: checks who has filed a Statement of Candidacy for president
        in 2028. A filing is hard evidence, so it's applied automatically.
     2. News: searches GDELT (a free global news index) for each name plus
        2028 words, and saves new headlines to a review queue.
   You approve or reject queued headlines and pick the signal they count
   as. The website reads the results from /api/tracker.json.
   ========================================================= */
const CANDIDATES = ["Jon Ossoff", "Alexandria Ocasio-Cortez", "Pete Buttigieg", "Kamala Harris", "Mark Kelly",
  "Gavin Newsom", "Andy Beshear", "Josh Shapiro", "JB Pritzker", "Cory Booker", "Gretchen Whitmer",
  "Marco Rubio", "JD Vance", "Ron DeSantis", "Tucker Carlson", "Donald Trump Jr.", "Ted Cruz", "Glenn Youngkin", "Josh Hawley"];
const WORDS = '(2028 OR "presidential run" OR "run for president" OR "exploratory committee" OR Iowa OR "New Hampshire" OR "South Carolina")';

async function checkFEC(env) {
  // Presidential candidates who have filed for the 2028 election
  const url = `https://api.open.fec.gov/v1/candidates/?election_year=2028&office=P&per_page=100&sort=-first_file_date&api_key=${env.FEC_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const { results = [] } = await res.json();
  const filed = [];
  for (const r of results) {
    const match = CANDIDATES.find(n => r.name && r.name.toUpperCase().includes(n.split(" ").slice(-1)[0].replace(".", "").toUpperCase()));
    if (match) filed.push({ candidate: match, fec_id: r.candidate_id, filed: r.first_file_date, fec_name: r.name });
  }
  return filed;
}

async function checkNews(name) {
  const q = encodeURIComponent(`"${name}" ${WORDS}`);
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&format=json&maxrecords=15&timespan=1d&sourcelang=english`;
  const res = await fetch(url, { headers: { "User-Agent": "unlockthecount-tracker" } });
  if (!res.ok) return [];
  try { const j = await res.json(); return (j.articles || []).map(a => ({ candidate: name, headline: a.title, source: a.domain, source_url: a.url, seen: a.seendate })); }
  catch { return []; }
}

async function run(env) {
  const state = JSON.parse(await env.TRACKER.get("state") || '{"queue":[],"approved":[],"filed":[],"seen":{}}');
  // 1. FEC filings: automatic
  try {
    for (const f of await checkFEC(env)) {
      if (!state.filed.some(x => x.fec_id === f.fec_id)) {
        state.filed.push(f);
        state.approved.push({ date: f.filed, candidate: f.candidate, type: "announcement", status: "declared", signal: "", headline: `${f.candidate} files a Statement of Candidacy with the FEC`, source: "FEC", source_url: `https://www.fec.gov/data/candidate/${f.fec_id}/`, impact: 0.08 });
      }
    }
  } catch (e) { console.log("FEC check failed", e); }
  // 2. News: queued for your review (headline matching is too noisy to trust blindly)
  for (const name of CANDIDATES) {
    for (const a of await checkNews(name)) {
      if (state.seen[a.source_url]) continue;
      state.seen[a.source_url] = 1;
      state.queue.push({ ...a, date: (a.seen || "").slice(0, 4) + "-" + (a.seen || "").slice(4, 6) + "-" + (a.seen || "").slice(6, 8) });
    }
  }
  state.queue = state.queue.slice(-500);
  state.updated = new Date().toISOString();
  await env.TRACKER.put("state", JSON.stringify(state));
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(run(env)); },
  async fetch(req, env) {
    const url = new URL(req.url);
    const state = JSON.parse(await env.TRACKER.get("state") || "{}");
    const cors = { "content-type": "application/json", "access-control-allow-origin": "*" };
    if (url.pathname === "/api/tracker.json") return new Response(JSON.stringify({ updated: state.updated, news: state.approved || [], filed: state.filed || [] }), { headers: cors });
    // Review queue: protect this with Cloudflare Access (Zero Trust, free for one person)
    if (url.pathname === "/api/queue.json") return new Response(JSON.stringify(state.queue || []), { headers: cors });
    return new Response("Unlock The Count tracker", { status: 200 });
  }
};

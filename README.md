# Keys to the Race

Election data, from the Florida Keys to the White House.

## Folder layout

- `public/`: the website. Everything in here goes live.
- `config/model.json`: every weight and rule the model uses, in one file.
- `engine/`: the Python model (Stage 1 and Stage 2), its tests, and the staging/live commands.
- `tools/`: helper scripts. Never published.
- `.github/workflows/model.yml`: runs the model on GitHub every day.
- `wrangler.jsonc`: Cloudflare settings (live and staging).

## One-time setup

1. Install Node.js (the LTS version) from nodejs.org.
2. Open a terminal in this folder and sign in to Cloudflare:

       npx wrangler login

## Publish the site (first time and every update)

1. Edit files in `public/`.
2. If you changed `public/data/polls.csv` or `pollsters.csv`, run:

       python tools/sync_fallback.py

3. Deploy:

       npx wrangler deploy

The site updates worldwide in a few seconds. The first deploy prints a free
`*.workers.dev` address. Add your own domain in the Cloudflare dashboard under
Workers & Pages > keystotherace > Settings > Domains & Routes.

## Preview before you publish

    npx wrangler dev

Opens the site at http://localhost:8787 so you can click through it first.

## Undo a bad deploy

Cloudflare keeps past versions. In the dashboard, open
Workers & Pages > keystotherace > Deployments and roll back to an earlier one.


## The model (Python)

The model runs in two stages, each a chain:

    Stage 1:  news or a quote -> Decision Maze -> chance they run -> Index (unlocks above 64.9%)
    Stage 2:  announcement -> early states and Super Tuesday -> Attention Index

Stage 1 also runs live in the browser (assets/market.js), so the site works with no server.
Stage 2 runs 11,111 simulated primaries, so it runs in Python and writes `public/data/primary.json`.

### Set up once

    pip install -r requirements.txt

### Every run

From the `engine/` folder:

    python -m ktr run --env staging    # test run: writes build/staging/, nothing live changes
    python -m ktr report               # read what changed
    python -m ktr site                 # build a full test copy of the site in build/site-staging/
    python -m ktr promote              # happy with it? publish that run to public/data/

or `python -m ktr run --env live` to run and publish in one step.
Options: `--date 2026-11-20` scores as of that day, `--sims 3000` for a quick run.

Publishing never rewrites history: it only adds Launch Watch rows for finished days that
aren't in `public/data/launch-log.csv` yet. Each row records the method version (`v2`).
When you change a Stage 1 weight, bump `stage1.method` in `config/model.json`.

### Tests

    cd engine
    python -m unittest discover -s tests -v

They check the Statement Scale rules, the 64.9% gate, that history is append-only, that the
simulator adds up, and (with Node.js installed) that the Python engine and the website's
JavaScript give the same numbers for every candidate on every day, with the same weights.

### On GitHub and Cloudflare

- Cloudflare deploys the site straight from this repository. Connect it once: Cloudflare dashboard >
  Workers & Pages > Create > Import a repository > KeysToTheRace. It reads `wrangler.jsonc` and serves
  `public/`. Every change to `main` goes live in about a minute; any other branch gets its own preview address,
  which is the staging site.
- Every morning, the Model workflow runs the tests and a staging run. The report shows on the Actions page.
- To publish new numbers: Actions > Model > Run workflow > target: live. It commits the numbers to `main`,
  and Cloudflare deploys them.

## Key Legislation

A whip count for every big bill: all 100 senators and every House member, like The 29th Vote.
Everything lives in `public/data/legislation/`:

- `bills.csv`: one row per bill. Each party's starting point in each chamber (0 to 1), whether the
  Senate needs 60 or a simple majority, and the chance the President signs it.
- `positions.csv`: one row per vote, statement or signal. Columns: date, bill, chamber (house/senate),
  bioguide (the member's ID from members.csv), member, kind, reading (−1 to +1), note, source, source_url.
  - `vote`: a recorded vote on the bill itself. It locks the member (1 yes, −1 no, 0 didn't vote).
  - `statement` (weight 2.00): their public position. The latest one stands.
  - `priorVote` (1.00): how they voted on a similar bill before.
  - `leadership` and `policy` (0.50 each).
- `members.csv`: all 535 members. Refresh it with `python -m ktr members` (needs pyyaml).
- `log.csv`: the daily history. Append-only; never edit past rows.

To update: add rows to `positions.csv`. The page recomputes as soon as it loads. Then
`python -m ktr legislation --env live` logs the day (the daily workflow does this too, as part of every run).
To add a bill: add a row to `bills.csv` with the next `order` number.


## Photos

Candidate photos go in `public/photos/`, named by last name: `Ossoff.png`, `Rubio.png`, `Vance.png`.
Two-word last names use an underscore (`Van_Hollen.png`), hyphens stay (`Ocasio-Cortez.png`), and
Donald Trump Jr. is `Trump_Jr.png`. PNG, WEBP or JPG all work, and PNG wins if there are two.
Drop a file in and push; it shows up on the next load. Anyone without a photo shows their initials.

Current field: Ossoff, Ocasio-Cortez, Buttigieg, Harris, Kelly, Newsom, Beshear, Shapiro, Pritzker,
Booker, Whitmer, Rubio, Vance, DeSantis, Carlson, Trump_Jr, Cruz, Youngkin, Hawley.

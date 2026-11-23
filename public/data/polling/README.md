# Polling

One file per poll. The site reads every file in this folder.

**Name** each file by the last day in the field and the pollster: `2026-11-16_Emerson.csv`.

**Columns** (the first line of every file):

```
poll_id,pollster,start_date,end_date,release_date,race,matchup,population,total_sample,sample_type,moe,candidate,party,pct,rounded,source_url
```

One row per candidate. A poll that asks both primaries has rows for both.

| Column | What goes in it |
|---|---|
| poll_id | Pollster and end date, lowercase: `emerson-2026-11-16`. Same on every row of the file. |
| pollster | Spelled exactly as in `pollsters.csv`, so the grade matches. |
| start_date, end_date, release_date | `2026-11-14`. Polls that start before tracking began (2026-10-28) are kept but not counted. |
| race | `dem_primary`, `rep_primary` or `general`. |
| matchup | Only for `general`: `vance-ocasio-cortez`. |
| population | Who answered the question: `Democratic primary voters (n=531)`. |
| total_sample | The full sample: `1027`. |
| sample_type | `LV`, `RV`, `Voters` or `Adults`. |
| moe | Margin of error for the full sample: `3.7`. Blank if not published. |
| candidate | Full name, the same way every time: `Alexandria Ocasio-Cortez`, `JD Vance`, `Donald Trump Jr.` |
| party | `D` or `R`. Blank only for `Undecided` or `Someone else`. |
| pct | The number published: `17` or `17.6`. |
| rounded | `0` almost always. `1` only if the pollster rounded a number it also published with decimals. |
| source_url | The pollster's own release when possible. |

**After adding a file** on GitHub, the Polls workflow checks it and rebuilds `polls.csv` by itself.
On your computer, run `python tools/merge_polls.py`. If something is wrong, it names the file and the line.

**Grades** live in `../pollsters.csv`. A pollster with no grade counts at 0.25.

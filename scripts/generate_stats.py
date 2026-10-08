#!/usr/bin/env python3
"""Draw the profile README's stat graphics from the GitHub GraphQL API.

No third-party services and no dependencies — standard library only.

Outputs, all sharing one visual language with ascii.svg (the portrait):
  stats.svg   hero total + weekly sparkline
  streak.svg  current and longest streak
  langs.svg   top languages, by bytes and by repo count
  year.svg    the year as a character map, in the portrait's own ramp
  hd-*.svg    section heading labels with hairline rules

Env:
  GITHUB_TOKEN  required
  GH_LOGIN      user to summarise (default: shivaraj4791)
  OUT_DIR       where to write (default: repository root)
"""
import base64
import functools
import json
import os
import sys
import urllib.request
from datetime import date, datetime, timedelta, timezone

API = "https://api.github.com/graphql"

# Two things are pinned for determinism:
#  * the contribution window, to whole UTC days — otherwise "the past year" is
#    measured from request time and days drift between week buckets;
#  * privacy: PUBLIC on repositories.
QUERY = """
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { contributionCount date weekday } }
      }
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false,
                 privacy: PUBLIC) {
      nodes {
        languages(first: 12, orderBy: {field: SIZE, direction: DESC}) {
          edges { size node { name } }
        }
      }
    }
  }
}
"""

LIGHT = dict(data="#6e7681", emph="#424a53", dim="#8c959f",
             rule="#d8dee4", surface="#ffffff")
DARK = dict(data="#c9d1d9", emph="#f0f6fc", dim="#8b949e",
            rule="#30363d", surface="#0d1117")

MONO = ("JBMono,ui-monospace,SFMono-Regular,Menlo,Consolas,"
        "&apos;Liberation Mono&apos;,monospace")
FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")


@functools.lru_cache(maxsize=None)
def face(filename, weight):
    with open(os.path.join(FONT_DIR, filename), "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    return (f"@font-face{{font-family:JBMono;font-style:normal;"
            f"font-weight:{weight};font-display:block;"
            f"src:url(data:font/woff2;base64,{b64}) format('woff2')}}")


def font_text():
    return face("jbmono-400.woff2", 400) + face("jbmono-600.woff2", 600)


def font_head():
    return face("jbmono-head.woff2", 600)


WIDTH = 620
LEFT = 34
REVEAL = 1.30
RAMP = [" ", ":", "+", "#", "@"]
MON = ["jan", "feb", "mar", "apr", "may", "jun",
       "jul", "aug", "sep", "oct", "nov", "dec"]


def window():
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=364)
    return (f"{start.isoformat()}T00:00:00Z", f"{today.isoformat()}T23:59:59Z")


def fetch(login, token):
    since, until = window()
    body = json.dumps({"query": QUERY,
                       "variables": {"login": login,
                                     "from": since, "to": until}}).encode()
    req = urllib.request.Request(
        API, data=body,
        headers={"Authorization": f"bearer {token}",
                 "Content-Type": "application/json",
                 "User-Agent": f"{login}-profile-stats"})
    with urllib.request.urlopen(req, timeout=30) as r:
        payload = json.load(r)
    if "errors" in payload:
        raise SystemExit(f"GraphQL errors: {payload['errors']}")
    user = (payload.get("data") or {}).get("user")
    if not user:
        raise SystemExit(f"no such user: {login}")
    return user


def pretty(iso):
    d = date.fromisoformat(iso)
    return f"{MON[d.month - 1]} {d.day}"


def streaks(days):
    best = dict(length=0, start=None, end=None)
    run, run_start = 0, None
    for d in days:
        if d["contributionCount"] > 0:
            run += 1
            run_start = run_start or d["date"]
            if run > best["length"]:
                best = dict(length=run, start=run_start, end=d["date"])
        else:
            run, run_start = 0, None

    cur = dict(length=0, start=None, end=None)
    tail = days[:-1] if days and days[-1]["contributionCount"] == 0 else days
    for d in reversed(tail):
        if d["contributionCount"] == 0:
            break
        cur["length"] += 1
        cur["start"] = d["date"]
        cur["end"] = cur["end"] or d["date"]
    return cur, best


def languages(repos):
    by_size, by_repo = {}, {}
    for node in repos:
        edges = (node.get("languages") or {}).get("edges") or []
        for e in edges:
            name = e["node"]["name"]
            by_size[name] = by_size.get(name, 0) + e["size"]
        if edges:
            top = edges[0]["node"]["name"]
            by_repo[top] = by_repo.get(top, 0) + 1

    def rank(d):
        return sorted(d.items(), key=lambda kv: (-kv[1], kv[0]))[:5]

    return rank(by_size), rank(by_repo)


def summarise(user):
    cal = user["contributionsCollection"]["contributionCalendar"]
    weeks = [w["contributionDays"] for w in cal["weeks"]]
    days = [d for w in weeks for d in w]
    weekly = [sum(d["contributionCount"] for d in w) for w in weeks]
    cur, best = streaks(days)
    by_size, by_repo = languages(user["repositories"]["nodes"])
    return dict(
        total=cal["totalContributions"],
        active=sum(1 for d in days if d["contributionCount"] > 0),
        best_week=max(weekly) if weekly else 0,
        weekly=weekly, weeks=weeks,
        current=cur, longest=best,
        by_size=by_size, by_repo=by_repo)


def style(extra="", font=None):
    def block(t):
        return (f".d-f{{fill:{t['data']}}}.d-s{{stroke:{t['data']}}}"
                f".e-f{{fill:{t['emph']}}}.m-f{{fill:{t['dim']}}}"
                f".u-s{{stroke:{t['rule']}}}.r{{stroke:{t['surface']}}}")
    return (f"<style>{font or font_text()}"
            f"{block(LIGHT)}.w{{fill:{LIGHT['data']};opacity:.13}}{extra}"
            f"@media(prefers-color-scheme:dark){{{block(DARK)}"
            f".w{{fill:{DARK['data']};opacity:.16}}}}</style>")


def head(w, h, font=None):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
            f'viewBox="0 0 {w} {h}" fill="none" font-family="{MONO}">'
            + style(font=font))


def fade(delay, dur=0.45):
    return (f'<animate attributeName="opacity" from="0" to="1" '
            f'begin="{delay:.2f}s" dur="{dur}s" fill="freeze"/>')


def wipe(cid, x, y, w, h, delay, dur=REVEAL):
    clip = (f'<clipPath id="{cid}"><rect x="{x}" y="{y}" height="{h}" width="0">'
            f'<animate attributeName="width" from="0" to="{w}" '
            f'begin="{delay:.2f}s" dur="{dur}s" fill="freeze"/></rect></clipPath>')
    cursor = (f'<rect y="{y}" width="2" height="{h}" class="d-f" opacity="0">'
            f'<animate attributeName="x" from="{x}" to="{x + w}" '
            f'begin="{delay:.2f}s" dur="{dur}s" fill="freeze"/>'
            f'<set attributeName="opacity" to="0.55" begin="{delay:.2f}s"/>'
            f'<set attributeName="opacity" to="0" '
            f'begin="{delay + dur:.2f}s"/></rect>')
    return clip, cursor


def label(x, y, text, size=11, cls="m-f", anchor="start", extra=""):
    a = f' text-anchor="{anchor}"' if anchor != "start" else ""
    return (f'<text x="{x}" y="{y}" class="{cls}" font-size="{size}"{a}'
            f'{extra}>{text}</text>')


def hbar(x, y, w, h, cls="d-f", r=3.0):
    if w <= 0.6:
        return ""
    r = min(r, h / 2.0, w)
    return (f'<path d="M{x:.1f} {y:.1f}H{x + w - r:.1f}'
            f'Q{x + w:.1f} {y:.1f} {x + w:.1f} {y + r:.1f}'
            f'V{y + h - r:.1f}Q{x + w:.1f} {y + h:.1f} {x + w - r:.1f} {y + h:.1f}'
            f'H{x:.1f}Z" class="{cls}"/>')


def draw_stats(s):
    H = 148
    p = [head(WIDTH, H)]

    p.append(f'<g opacity="0">{fade(0.00)}'
             + label(LEFT, 18, "CONTRIBUTIONS IN THE LAST YEAR", 9, "m-f",
                     extra=' letter-spacing="1.3"')
             + label(LEFT, 64, str(s["total"]), 44, "e-f",
                     extra=' font-weight="600"')
             + label(LEFT, 86, f'{s["active"]} active days', 11, "m-f")
             + label(LEFT, 102, f'best week {s["best_week"]}', 11, "m-f")
             + '</g>')

    chart_x, chart_w, chart_h = 240, WIDTH - 240 - 6, 76
    chart_y = 38
    p.append(f'<line x1="{chart_x}" y1="{chart_y + chart_h + 0.5}" '
             f'x2="{chart_x + chart_w}" y2="{chart_y + chart_h + 0.5}" '
             f'class="u-s" stroke-width="1"/>')

    weeks = s["weekly"]
    n = len(weeks)
    step = chart_w / n
    bar_w = 4.0
    top = max(s["best_week"], 1)

    clip, cursor = wipe("c-spk", chart_x, chart_y, chart_w, chart_h + 1,
                        0.25, REVEAL)
    p.append(clip)
    bars = []
    for i, count in enumerate(weeks):
        x = chart_x + i * step + (step - bar_w) / 2.0
        h = 0 if count == 0 else max(3.0, (count / top) * chart_h)
        y = chart_y + chart_h - h
        bars.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bar_w:.1f}" '
                    f'height="{h:.1f}" rx="1.5" class="d-f"/>')
    p.append(f'<g clip-path="url(#c-spk)">{"".join(bars)}</g>')
    p.append(cursor)

    p.append(f'<g opacity="0">{fade(0.15)}'
             + label(chart_x, chart_y + chart_h + 16, "1 year ago", 9, "m-f")
             + label(chart_x + chart_w, chart_y + chart_h + 16, "now", 9, "m-f",
                     "end")
             + '</g>')

    p.append("</svg>")
    return "".join(p)


def draw_streak(s):
    H = 92
    p = [head(WIDTH, H)]

    cols = [
        (LEFT, "CURRENT STREAK", s["current"]),
        (LEFT + 280, "LONGEST STREAK", s["longest"]),
    ]
    for col_x, title, data in cols:
        clip, cursor = wipe(f"c-{title[:3]}", col_x, 26, 220, 48, 0.20, 0.85)
        p.append(clip)
        days_str = f'{data["length"]} days' if data["length"] != 1 else "1 day"
        range_str = (f'{pretty(data["start"])} — {pretty(data["end"])}'
                     if data["start"] else "none yet")
        p.append(f'<g opacity="0">{fade(0.05)}'
                 + label(col_x, 14, title, 9, "m-f",
                         extra=' letter-spacing="1.3"')
                 + '</g>')
        p.append(f'<g clip-path="url(#c-{title[:3]})">'
                 + label(col_x, 50, days_str, 24, "e-f",
                         extra=' font-weight="600"')
                 + label(col_x, 70, range_str, 11, "m-f")
                 + '</g>')
        p.append(cursor)

    p.append("</svg>")
    return "".join(p)


def draw_langs(s):
    rows = max(len(s["by_size"]), len(s["by_repo"]), 1)
    H = 28 + rows * 22 + 10
    p = [head(WIDTH, H)]

    colw = 260
    groups = [
        (LEFT, "TOP LANGUAGES · BY BYTES", s["by_size"], True),
        (LEFT + 295, "TOP LANGUAGES · BY REPOS", s["by_repo"], False),
    ]

    name_w = 90
    bar_max = colw - name_w - 44

    for gi, (gx, title, data, as_pct) in enumerate(groups):
        p.append(f'<g opacity="0">{fade(0.10 + gi * 0.10)}'
                 + label(gx, 12, title.upper(), 9, "m-f",
                         extra=' letter-spacing="1.3"') + '</g>')
        if not data:
            continue
        top = max(v for _, v in data) or 1
        total = sum(v for _, v in data) or 1
        cid = f"rl{gi}"
        clip, cursor = wipe(cid, gx + name_w, 20, bar_max, rows * 22,
                            0.34 + gi * 0.12, 0.95)
        p.append(clip)
        for ri, (name, val) in enumerate(data):
            y = 26 + ri * 22
            shown = (f"{val / total * 100:.0f}%" if as_pct else f"{val}")
            p.append(f'<g opacity="0">{fade(0.24 + gi * 0.10 + ri * 0.05)}'
                     + label(gx, y + 8, name.lower()[:11], 11, "e-f")
                     + label(gx + colw - 6, y + 8, shown, 11, "m-f", "end")
                     + '</g>')
            p.append(f'<g clip-path="url(#{cid})">'
                     + hbar(gx + name_w, y, bar_max * val / top, 7)
                     + '</g>')
        p.append(cursor)
    p.append("</svg>")
    return "".join(p)


def draw_heading(word):
    FS = 16
    H = 26
    text_end = len(word) * FS * 0.6 + 18
    p = [head(WIDTH, H, font=font_head())]
    p.append(label(0, 18, word, FS, "e-f", extra=' font-weight="600"'))
    p.append(f'<line x1="{text_end:.0f}" y1="12.5" x2="{WIDTH}" y2="12.5" '
             f'class="u-s" stroke-width="1"/>')
    p.append("</svg>")
    return "".join(p)


def draw_year(s):
    FS, LH, COLW = 9.2, 11.0, 2
    CW = FS * 0.6
    pad_l, pad_t = LEFT, 44
    weeks = s["weeks"]
    H = int(pad_t + 7 * LH + 26)

    def level(v):
        for i, cut in enumerate((0, 2, 5, 9)):
            if v <= cut:
                return i
        return 4

    p = [head(WIDTH, H)]
    p.append(f'<g opacity="0">{fade(0.10)}'
             + label(pad_l, 16, "THE YEAR", 9, "m-f",
                     extra=' letter-spacing="1.3"')
             + label(pad_l, 32, f'{s["active"]} of '
                     f'{sum(len(w) for w in weeks)} days had a contribution', 11)
             + '</g>')

    lx = WIDTH - 6
    p.append(f'<g opacity="0">{fade(1.30)}'
             + label(lx - 78, 32, "less", 9, "m-f", "end")
             + f'<text xml:space="preserve" x="{lx - 72}" y="32" class="d-f" '
             f'font-size="{FS}">{" ".join(RAMP[1:])}</text>'
             + label(lx, 32, "more", 9, "m-f", "end") + '</g>')

    for r in range(7):
        chars = []
        for w in weeks:
            day = next((d for d in w if d.get("weekday") == r), None)
            v = day["contributionCount"] if day else 0
            chars.append(RAMP[level(v)] * COLW)
        line = "".join(chars).rstrip()
        if not line:
            continue
        y = pad_t + r * LH
        w_px = max(len(line), 1) * CW
        cid = f"ry{r}"
        delay = 0.30 + r * 0.07
        p.append(f'<clipPath id="{cid}"><rect x="{pad_l}" y="{y}" '
                 f'height="{LH}" width="0"><animate attributeName="width" '
                 f'from="0" to="{w_px:.1f}" begin="{delay:.2f}s" dur="0.40s" '
                 f'fill="freeze"/></rect></clipPath>')
        safe = line.replace("&", "&amp;").replace("<", "&lt;")
        p.append(f'<g clip-path="url(#{cid})"><text xml:space="preserve" '
                 f'x="{pad_l}" y="{y + FS - 0.6:.1f}" class="d-f" '
                 f'font-size="{FS}">{safe}</text></g>')

    for r, lab in ((1, "mon"), (3, "wed"), (5, "fri")):
        p.append(label(pad_l - 7, pad_t + r * LH + FS - 0.6, lab, 9, "m-f",
                       "end"))

    last_m, last_x = None, -999.0
    base_y = pad_t + 7 * LH + 13
    for i, w in enumerate(weeks):
        m = int(w[0]["date"][5:7])
        x = pad_l + i * COLW * CW
        if m != last_m and i < len(weeks) - 1 and x - last_x >= 34:
            p.append(label(x, base_y, MON[m - 1], 9, "m-f"))
            last_x = x
        last_m = m

    p.append("</svg>")
    return "".join(p)


def write(path, svg):
    old = ""
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            old = f.read()
    if old == svg:
        return False
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)
    return True


def main():
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        try:
            import subprocess
            token = subprocess.check_output(["gh", "auth", "token"]).decode("utf-8").strip()
        except Exception:
            pass
    if not token:
        sys.exit("GITHUB_TOKEN is not set")

    login = os.environ.get("GH_LOGIN", "shivaraj4791")
    out_dir = os.environ.get("OUT_DIR", ".")

    s = summarise(fetch(login, token))
    files = {"stats.svg": draw_stats(s), "streak.svg": draw_streak(s),
             "langs.svg": draw_langs(s), "year.svg": draw_year(s)}
    for word in ("about", "stack", "projects", "stats", "about this page"):
        files[f"hd-{word.replace(' ', '-')}.svg"] = draw_heading(word)

    changed = [n for n, svg in files.items()
               if write(os.path.join(out_dir, n), svg)]
    print(f"{s['total']} contributions, {s['active']} active days, "
          f"best week {s['best_week']}, current streak "
          f"{s['current']['length']}, longest {s['longest']['length']}")
    print("languages by bytes: "
          + ", ".join(f"{n} {v}" for n, v in s["by_size"]))
    print("updated: " + (", ".join(sorted(changed)) if changed else "nothing"))


if __name__ == "__main__":
    main()

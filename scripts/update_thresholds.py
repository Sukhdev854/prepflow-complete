#!/usr/bin/env python3
"""
Downloads Cambridge's official grade-threshold PDFs for every subject in PrepFlow and
writes src/data/thresholds.generated.json (read by the app).

Run automatically by .github/workflows/update-thresholds.yml — you never need to run it by hand.

  python scripts/update_thresholds.py             # fetch new series only
  FORCE=1 python scripts/update_thresholds.py     # re-download everything
  MIN_YEAR=2023 python scripts/update_thresholds.py
  python scripts/update_thresholds.py --selftest  # test the PDF reader (no internet)
"""
import io, json, os, re, sys, time, datetime, pathlib, urllib.request, urllib.error, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[1]
SUBJECTS_TS = ROOT / "src/data/subjects.ts"
OUT = ROOT / "src/data/thresholds.generated.json"

BASE = "https://www.cambridgeinternational.org/programmes-and-qualifications"
INDEX_PAGES = {
    "igcse": f"{BASE}/cambridge-upper-secondary/cambridge-igcse/grade-threshold-tables",
    "alevel": f"{BASE}/cambridge-advanced/cambridge-international-as-and-a-levels/grade-threshold-tables",
}
MIN_YEAR = int(os.environ.get("MIN_YEAR", "2022"))
FORCE = os.environ.get("FORCE") == "1"
SESSION_OF = {"march": "m", "june": "s", "november": "w"}
MONTH_OF = {"m": "march", "s": "june", "w": "november"}
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}

# ───────────────────────── PDF text -> numbers ─────────────────────────

COMP_RE = re.compile(r"^\s*Component\s+(\d{2})\s+((?:\d+\s+){3,9}\d+)\s*$")
DASH = r"[–—\-]"
# "AX 250 11, 31, 41, 51 223 197 169 134 99 64"   (option code, max, combination, thresholds)
COMBO_MAX_FIRST = re.compile(rf"^\s*(?:[A-Z][A-Z0-9]\s+)?(\d{{2,3}})\s+(\d{{2}}(?:\s*,\s*\d{{2}})*)\s+((?:{DASH}|\d+)(?:\s+\d+){{4,8}})\s*$")
# "11, 31, 41, 51 250 223 197 163 128 94 60"       (combination, max, thresholds)
COMBO_COMBO_FIRST = re.compile(rf"^\s*(\d{{2}}(?:\s*,\s*\d{{2}})*)\s+(\d{{2,3}})\s+((?:{DASH}|\d+)(?:\s+\d+){{4,8}})\s*$")


def parse_components(text):
    """-> {component: [max, A, B, C, D, E] or [max, A..G]}  (9-1 tables are ignored)"""
    out = {}
    for line in text.splitlines():
        m = COMP_RE.match(line)
        if not m:
            continue
        nums = [int(x) for x in m.group(2).split()]
        if len(nums) not in (6, 8):
            continue
        mx, grades = nums[0], nums[1:]
        if mx <= 0 or any(g > mx for g in grades) or any(grades[i] < grades[i + 1] for i in range(len(grades) - 1)):
            continue  # not a sensible threshold row
        out.setdefault(m.group(1), nums)
    return out


def parse_combos(text):
    """-> [[combination, max, [A*, A, B, C, D, E]]]   (A* is null for AS rows)"""
    out = []
    for line in text.splitlines():
        if line.lstrip().startswith("Component"):
            continue
        m = COMBO_MAX_FIRST.match(line)
        if m:
            mx, combo, vals = m.group(1), m.group(2), m.group(3)
        else:
            m = COMBO_COMBO_FIRST.match(line)
            if not m:
                continue
            combo, mx, vals = m.group(1), m.group(2), m.group(3)
        toks = vals.split()
        parsed = [None if re.fullmatch(DASH, t) else int(t) for t in toks]
        if len(parsed) == 5:
            parsed = [None] + parsed          # a-e only
        if len(parsed) != 6:
            continue                          # IGCSE / other scales: not needed
        nums = [x for x in parsed if x is not None]
        if any(nums[i] < nums[i + 1] for i in range(len(nums) - 1)):
            continue
        out.append([re.sub(r"\s+", "", combo), int(mx), parsed])
    return out


# ───────────────────────── downloading ─────────────────────────

def http_get(url, binary=False, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            return data if binary else data.decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            last = e
        except Exception as e:  # network hiccup
            last = e
        time.sleep(1.5 * (i + 1))
    print(f"   ! could not fetch {url}: {last}")
    return None


def pdf_text(data):
    try:
        from pypdf import PdfReader
        txt = "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(data)).pages)
        if "Component" in txt:
            return txt
    except Exception as e:
        print(f"   ! pypdf failed: {e}")
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            return "\n".join((p.extract_text() or "") for p in pdf.pages)
    except Exception as e:
        print(f"   ! pdfplumber failed: {e}")
        return ""


def subject_codes():
    ts = SUBJECTS_TS.read_text(encoding="utf-8", errors="replace")
    return sorted(set(re.findall(r"code:\s*'(\d{4})'", ts)))


def series_pages(index_url):
    """All 'march-2026' style pages for one index page."""
    found = {}
    html = http_get(index_url)
    if html:
        for href in re.findall(r'href="([^"]+)"', html):
            m = re.search(r"/grade-threshold-tables/(march|june|november)-?(\d{4})/?$", href, re.I)
            if m:
                found[(m.group(1).lower(), int(m.group(2)))] = urllib.parse.urljoin(index_url, href)
    # also try the predictable addresses, in case the index page did not list them
    this_year = datetime.date.today().year
    for y in range(MIN_YEAR, this_year + 1):
        for month in ("march", "june", "november"):
            found.setdefault((month, y), f"{index_url}/{month}-{y}")
    return {k: v for k, v in found.items() if k[1] >= MIN_YEAR}


def pdf_links(page_html, page_url):
    links = []
    for href in re.findall(r'href="([^"]+\.pdf)"', page_html, re.I):
        if "grade-threshold" in href.lower():
            links.append(urllib.parse.urljoin(page_url, href))
    return sorted(set(links))


def main():
    codes = subject_codes()
    print(f"Subjects in app: {', '.join(codes)}")
    data = {"generatedAt": None, "components": {}, "combos": {}}
    if OUT.exists():
        try:
            data.update(json.loads(OUT.read_text()))
        except Exception:
            pass
    data.setdefault("components", {}); data.setdefault("combos", {})

    report, missing = [], []
    for kind, index_url in INDEX_PAGES.items():
        print(f"\n== {kind.upper()} ==")
        for (month, year), page_url in sorted(series_pages(index_url).items(), key=lambda kv: (kv[0][1], kv[0][0])):
            session = SESSION_OF[month]
            series = f"{year}-{session}"
            html = http_get(page_url)
            if not html:
                continue  # that series does not exist (yet)
            links = pdf_links(html, page_url)
            if not links:
                print(f"-- {month.title()} {year}: page found but no PDF links (page layout changed?)")
                continue
            print(f"-- {month.title()} {year}: {len(links)} tables on the page")
            for code in codes:
                is_igcse = code.startswith("0")
                if (kind == "igcse") != is_igcse:
                    continue
                mine = [l for l in links if f"-{code}-" in os.path.basename(l).lower()]
                if not mine:
                    continue
                if not FORCE and data["components"].get(code, {}).get(series):
                    continue
                pdf = http_get(mine[0], binary=True)
                if not pdf:
                    missing.append(f"{code} {series}: download failed")
                    continue
                text = pdf_text(pdf)
                comps = parse_components(text)
                if not comps:
                    missing.append(f"{code} {series}: PDF found but no component rows read ({mine[0]})")
                    continue
                data["components"].setdefault(code, {})[series] = comps
                combos = parse_combos(text)
                if combos:
                    data["combos"].setdefault(code, {})[series] = combos
                report.append(f"{code} {series}: {len(comps)} papers, {len(combos)} combinations")
                print(f"   ✓ {report[-1]}")
                time.sleep(0.4)

    if report:
        data["generatedAt"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    # keep the file tidy and stable
    data["components"] = {c: dict(sorted(s.items())) for c, s in sorted(data["components"].items())}
    OUT.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False))
    n = sum(len(s) for s in data["components"].values())
    print(f"\nDone. {len(report)} new tables this run, {n} in total across {len(data['components'])} subjects.")
    if missing:
        print("\nProblems (send these to Claude so the reader can be fixed):")
        for m in missing:
            print("  -", m)
    if not n:
        print("\nNOTHING was read. The Cambridge page layout may have changed, or the site blocked this request.")
        sys.exit(1)


# ───────────────────────── self-test (real Cambridge text) ─────────────────────────

SAMPLE_JUNE_2026 = """Component Maximum raw 
mark A B C D E
Component 11 75 59 48 37 26 15
Component 12 75 61 51 37 23 10
Component 21 50 40 35 28 21 15
Component 50 75 63 54 43 33 23
Grade A* does not exist at the level of an individual component.
Combination of 
components
Maximum
weighted 
mark
A* A B C D E
11, 31, 41, 51 250 223 197 163 128 94 60
12, 32, 42, 52 250 222 194 161 124 88 52
59, 60 150 136 126 108 87 66 46
Cambridge International AS Level
11, 21 125 99 83 65 47 30
50 75 63 54 43 33 23
"""
SAMPLE_NOV_2025 = """Component 11 75 60 51 40 28 16
Component 32 75 45 38 32 25 17
AX 250 11, 31, 41, 51 223 197 169 134 99 64
OV 250 32, 52, 75 212 188 164 134 104 74
S1 125 11, 21 – 102 88 68 48 29
"""
SAMPLE_IGCSE = """Component 12 80 50 46 41 39 36 32 27 22 15
Component 21 70 58 53 49 43 38 32 24 16 8
Component 31 120 98 80 62 45 33 24 15
"""


def selftest():
    c = parse_components(SAMPLE_JUNE_2026)
    assert c["11"] == [75, 59, 48, 37, 26, 15], c
    assert c["50"] == [75, 63, 54, 43, 33, 23], c
    assert len(c) == 4, c
    k = parse_combos(SAMPLE_JUNE_2026)
    assert ["11,31,41,51", 250, [223, 197, 163, 128, 94, 60]] in k, k
    assert ["59,60", 150, [136, 126, 108, 87, 66, 46]] in k, k
    assert ["11,21", 125, [None, 99, 83, 65, 47, 30]] in k, k
    assert not any(x[0] == "50" for x in k), k
    c2 = parse_components(SAMPLE_NOV_2025)
    assert c2["32"] == [75, 45, 38, 32, 25, 17], c2
    k2 = parse_combos(SAMPLE_NOV_2025)
    assert ["11,31,41,51", 250, [223, 197, 169, 134, 99, 64]] in k2, k2
    assert ["32,52,75", 250, [212, 188, 164, 134, 104, 74]] in k2, k2
    assert ["11,21", 125, [None, 102, 88, 68, 48, 29]] in k2, k2
    c3 = parse_components(SAMPLE_IGCSE)
    assert "12" not in c3 and "21" not in c3, c3          # 9-1 tables ignored
    assert c3["31"] == [120, 98, 80, 62, 45, 33, 24, 15], c3  # A-G table kept
    print("selftest OK")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        main()

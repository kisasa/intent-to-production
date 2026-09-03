"""Render every Markdown file in docs/source/ to a PDF in docs/.

Usage: python3 scripts/build-docs-pdf.py            # all sources
       python3 scripts/build-docs-pdf.py <name>     # one source, by basename
Requires: pip install reportlab

The PDFs in docs/ are the artifacts people read; the Markdown under
docs/source/ is what you edit. Re-run this after every edit and commit both.
The design ledger is not a source here: it is a working record read by people
and agents alike and changes with every session, so it stays Markdown.

Markdown supported: #/##/### headings, paragraphs, '-' bullet lists (with
'- [ ]' checkboxes and indented continuation lines), '1.' numbered lists,
fenced code blocks, pipe tables, '---' rules, block quotes, inline `code`,
**bold**, *italic*, and [text](url) links. That is what the documents use;
extend it when a document needs more rather than working around it.
"""
import re
import sys
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (HRFlowable, ListFlowable, ListItem, Paragraph,
                                Preformatted, SimpleDocTemplate, Spacer, Table,
                                TableStyle, KeepTogether)

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "docs" / "source"
OUT_DIR = ROOT / "docs"

# --- fonts -------------------------------------------------------------------
# Built-in Helvetica/Courier lack box-drawing and arrow glyphs, which the
# runbooks use in directory trees. Prefer DejaVu when present; fall back to the
# built-ins and substitute ASCII for the glyphs they cannot draw.
FONT_CANDIDATES = {
    "sans": ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
             "C:/Windows/Fonts/segoeui.ttf", "/Library/Fonts/Arial Unicode.ttf"],
    "sans-bold": ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                  "C:/Windows/Fonts/segoeuib.ttf", "/Library/Fonts/Arial Unicode.ttf"],
    "sans-italic": ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
                    "C:/Windows/Fonts/segoeuii.ttf"],
    "mono": ["/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
             "C:/Windows/Fonts/consola.ttf", "/System/Library/Fonts/Menlo.ttc"],
}


def register(name, candidates):
    for path in candidates:
        if Path(path).exists():
            try:
                pdfmetrics.registerFont(TTFont(name, path))
                return name
            except Exception:  # noqa: BLE001 - try the next candidate
                continue
    return None


SANS = register("DocSans", FONT_CANDIDATES["sans"]) or "Helvetica"
SANS_BOLD = register("DocSansBold", FONT_CANDIDATES["sans-bold"]) or "Helvetica-Bold"
SANS_ITALIC = register("DocSansItalic", FONT_CANDIDATES["sans-italic"]) or "Helvetica-Oblique"
MONO = register("DocMono", FONT_CANDIDATES["mono"]) or "Courier"
if SANS != "Helvetica":
    pdfmetrics.registerFontFamily("DocSans", normal=SANS, bold=SANS_BOLD,
                                  italic=SANS_ITALIC, boldItalic=SANS_BOLD)
UNICODE_OK = MONO != "Courier"

ASCII_SUBS = str.maketrans({"├": "|", "└": "`", "─": "-", "│": "|", "←": "<-",
                            "→": "->", "…": "...", "·": "-"})

# --- styles ------------------------------------------------------------------
styles = getSampleStyleSheet()
BODY = ParagraphStyle("Body", parent=styles["Normal"], fontName=SANS,
                      fontSize=10.5, leading=14.5, spaceAfter=7, alignment=TA_LEFT)
LEAD = ParagraphStyle("Lead", parent=BODY, fontSize=11, leading=15.5,
                      textColor=colors.HexColor("#333333"))
H1 = ParagraphStyle("H1", parent=styles["Title"], fontName=SANS_BOLD,
                    fontSize=22, leading=26, alignment=TA_LEFT, spaceAfter=10)
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontName=SANS_BOLD,
                    fontSize=14.5, leading=18, spaceBefore=16, spaceAfter=6,
                    textColor=colors.HexColor("#1f2d3d"), keepWithNext=True)
H3 = ParagraphStyle("H3", parent=styles["Heading3"], fontName=SANS_BOLD,
                    fontSize=11.5, leading=15, spaceBefore=10, spaceAfter=4, keepWithNext=True)
ITEM = ParagraphStyle("Item", parent=BODY, spaceAfter=3)
CELL = ParagraphStyle("Cell", parent=BODY, fontSize=9.5, leading=12.5, spaceAfter=0)
CELL_HEAD = ParagraphStyle("CellHead", parent=CELL, fontName=SANS_BOLD)
CODE = ParagraphStyle("Code", parent=styles["Code"], fontName=MONO, fontSize=8.8,
                      leading=11.5, leftIndent=8, backColor=colors.HexColor("#f4f6f8"),
                      borderPadding=(6, 6, 6, 6), spaceBefore=4, spaceAfter=10)
QUOTE = ParagraphStyle("Quote", parent=BODY, leftIndent=14,
                       textColor=colors.HexColor("#444444"), borderPadding=(0, 0, 0, 6))


def inline(text: str) -> str:
    """Markdown inline -> reportlab paragraph XML."""
    if not UNICODE_OK:
        text = text.translate(ASCII_SUBS)
    text = escape(text)
    # code first, so markup inside code is preserved literally
    text = re.sub(r"`([^`]+)`",
                  lambda m: f'<font face="{MONO}" size="9.3" color="#1a4d7a">{m.group(1)}</font>',
                  text)
    text = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)",
                  lambda m: f'<link href="{m.group(2)}" color="#1a4d7a"><u>{m.group(1)}</u></link>',
                  text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<![\w*])\*([^*\n]+?)\*(?![\w*])", r"<i>\1</i>", text)
    return text


def flush_para(buf, story, style=BODY):
    if buf:
        story.append(Paragraph(inline(" ".join(s.strip() for s in buf)), style))
        buf.clear()


BULLET = re.compile(r"^-\s+(.*)$")
NUMBERED = re.compile(r"^(\d+)\.\s+(.*)$")


def parse_list(lines, i, ordered):
    """Consume a list starting at lines[i]; return (items, next_i)."""
    marker = NUMBERED if ordered else BULLET
    items, cur = [], []
    while i < len(lines):
        line = lines[i]
        m = marker.match(line)
        if m:
            if cur:
                items.append(" ".join(cur))
            cur = [m.group(2) if ordered else m.group(1)]
            i += 1
        elif line.startswith("  ") and cur and line.strip():
            cur.append(line.strip())
            i += 1
        elif not line.strip():
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            if j < len(lines) and marker.match(lines[j]):
                i = j
                continue
            break
        else:
            break
    if cur:
        items.append(" ".join(cur))
    return items, i


def parse_table(lines, i, avail_width):
    rows = []
    while i < len(lines) and lines[i].startswith("|"):
        cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
        if not all(re.fullmatch(r":?-{3,}:?", c) for c in cells):
            rows.append(cells)
        i += 1
    if not rows:
        return None, i
    ncols = max(len(r) for r in rows)
    data = []
    for r_i, r in enumerate(rows):
        r = r + [""] * (ncols - len(r))
        style = CELL_HEAD if r_i == 0 else CELL
        data.append([Paragraph(inline(c), style) for c in r])
    # first column narrower when there are two or more columns
    if ncols >= 2:
        first = min(avail_width * 0.32, 2.1 * inch)
        widths = [first] + [(avail_width - first) / (ncols - 1)] * (ncols - 1)
    else:
        widths = [avail_width]
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef1f4")),
        ("LINEBELOW", (0, 0), (-1, 0), 0.8, colors.HexColor("#9aa4ae")),
        ("LINEBELOW", (0, 1), (-1, -1), 0.3, colors.HexColor("#d5dae0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t, i


def build(src: Path, avail_width):
    lines = src.read_text(encoding="utf-8").splitlines()
    story, buf, quote = [], [], []
    i = 0
    first_body_para = True
    while i < len(lines):
        line = lines[i]
        if line.startswith("```"):
            flush_para(buf, story)
            code, i = [], i + 1
            while i < len(lines) and not lines[i].startswith("```"):
                code.append(lines[i])
                i += 1
            i += 1  # closing fence
            text = "\n".join(code)
            if not UNICODE_OK:
                text = text.translate(ASCII_SUBS)
            story.append(Preformatted(text, CODE))
        elif line.startswith("# "):
            flush_para(buf, story)
            story.append(Paragraph(inline(line[2:]), H1))
            i += 1
        elif line.startswith("## "):
            flush_para(buf, story)
            story.append(Paragraph(inline(line[3:]), H2))
            i += 1
        elif line.startswith("### "):
            flush_para(buf, story)
            story.append(Paragraph(inline(line[4:]), H3))
            i += 1
        elif line.strip() == "---":
            flush_para(buf, story)
            story.append(Spacer(1, 4))
            story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#b0b8c1")))
            story.append(Spacer(1, 4))
            i += 1
        elif line.startswith("|"):
            flush_para(buf, story)
            table, i = parse_table(lines, i, avail_width)
            if table is not None:
                story.append(table)
                story.append(Spacer(1, 8))
        elif line.startswith("> "):
            flush_para(buf, story)
            while i < len(lines) and lines[i].startswith(">"):
                quote.append(lines[i][1:].strip())
                i += 1
            story.append(Paragraph(inline(" ".join(quote)), QUOTE))
            quote = []
        elif BULLET.match(line) or NUMBERED.match(line):
            flush_para(buf, story)
            ordered = bool(NUMBERED.match(line))
            items, i = parse_list(lines, i, ordered)
            checklist = not ordered and all(re.match(r"^\[( |x)\]\s", t) for t in items)
            if checklist:
                box_done, box_open = ("\u2611", "\u2610") if UNICODE_OK else ("[x]", "[ ]")
                flow = [ListItem(Paragraph(inline(re.sub(r"^\[( |x)\]\s+", "", t)), ITEM),
                                 leftIndent=18, value=box_done if t.startswith("[x]") else box_open)
                        for t in items]
                story.append(ListFlowable(flow, bulletType="bullet", bulletFontName=SANS,
                                          bulletFontSize=10.5, leftIndent=18, bulletOffsetY=0))
            else:
                flow = [ListItem(Paragraph(inline(t), ITEM), leftIndent=16) for t in items]
                story.append(ListFlowable(flow, bulletType="1" if ordered else "bullet",
                                          start="1" if ordered else None,
                                          bulletFontName=SANS, bulletFontSize=9.5,
                                          leftIndent=16, bulletOffsetY=0))
            story.append(Spacer(1, 5))
        elif not line.strip():
            style = LEAD if first_body_para and buf else BODY
            if buf:
                first_body_para = False
            flush_para(buf, story, style)
            i += 1
        else:
            buf.append(line)
            i += 1
    flush_para(buf, story)
    return story


def render(src: Path):
    out = OUT_DIR / (src.stem + ".pdf")
    title = next((l[2:].strip() for l in src.read_text(encoding="utf-8").splitlines()
                  if l.startswith("# ")), src.stem)
    rel = src.relative_to(ROOT).as_posix()

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont(SANS, 8.5)
        canvas.setFillColor(colors.HexColor("#6b7580"))
        canvas.drawString(doc.leftMargin, 0.58 * inch, f"{title}  |  intent-to-production")
        canvas.drawRightString(letter[0] - doc.rightMargin, 0.58 * inch, f"Page {doc.page}")
        canvas.setFont(SANS, 7.5)
        canvas.drawString(doc.leftMargin, 0.42 * inch, f"rendered from {rel}; edit the source, not this file")
        canvas.restoreState()

    doc = SimpleDocTemplate(str(out), pagesize=letter,
                            leftMargin=0.9 * inch, rightMargin=0.9 * inch,
                            topMargin=0.85 * inch, bottomMargin=0.85 * inch,
                            title=title, author="Kisasa")
    avail = letter[0] - doc.leftMargin - doc.rightMargin
    doc.build(build(src, avail), onFirstPage=footer, onLaterPages=footer)
    print(f"wrote {out.relative_to(ROOT).as_posix()}")


def main(argv):
    if not UNICODE_OK:
        print("note: DejaVu/Consolas not found; using built-in fonts with ASCII substitutions",
              file=sys.stderr)
    sources = sorted(SRC_DIR.glob("*.md"))
    if len(argv) > 1:
        wanted = {Path(a).stem for a in argv[1:]}
        sources = [s for s in sources if s.stem in wanted]
        missing = wanted - {s.stem for s in sources}
        if missing:
            sys.exit(f"no source for: {', '.join(sorted(missing))}")
    if not sources:
        sys.exit(f"no Markdown sources in {SRC_DIR}")
    for src in sources:
        render(src)


if __name__ == "__main__":
    main(sys.argv)

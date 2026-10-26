#!/usr/bin/env python3
"""Converte relatorio-cronograma.md em PDF usando reportlab."""
import re, os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
    Table, TableStyle, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

BASE = os.path.dirname(__file__)
MD   = os.path.join(BASE, "relatorio-cronograma.md")
PDF  = os.path.join(BASE, "relatorio-cronograma.pdf")

# ── Paleta ──────────────────────────────────────────────────────────────────
DARK   = colors.HexColor("#1a1a2e")
RED    = colors.HexColor("#c0392b")
ORANGE = colors.HexColor("#e67e22")
GRAY   = colors.HexColor("#555555")
LGRAY  = colors.HexColor("#f5f5f5")
DGRAY  = colors.HexColor("#dddddd")
WHITE  = colors.white

# ── Estilos ─────────────────────────────────────────────────────────────────
ss = getSampleStyleSheet()

def style(name, parent="Normal", **kw):
    s = ParagraphStyle(name, parent=ss[parent], **kw)
    return s

S = {
    "h1":  style("h1",  "Heading1",  fontSize=18, textColor=DARK,
                 spaceAfter=4, spaceBefore=0, leading=22),
    "h2":  style("h2",  "Heading2",  fontSize=13, textColor=DARK,
                 spaceAfter=3, spaceBefore=14, leading=17),
    "h3":  style("h3",  "Heading3",  fontSize=11, textColor=DARK,
                 spaceAfter=3, spaceBefore=10, leading=15, fontName="Helvetica-Bold"),
    "body": style("body", fontSize=10, textColor=colors.black,
                  spaceAfter=4, leading=15),
    "bold_label": style("bold_label", fontSize=10, textColor=DARK,
                        fontName="Helvetica-Bold", spaceAfter=2, leading=14),
    "quote": style("quote", fontSize=9.5, textColor=GRAY, leftIndent=14,
                   spaceAfter=4, leading=14, fontName="Helvetica-Oblique"),
    "bullet": style("bullet", fontSize=10, textColor=colors.black,
                    leftIndent=16, spaceAfter=2, leading=14,
                    bulletIndent=6, bulletFontName="Helvetica"),
    "footer": style("footer", fontSize=8, textColor=GRAY, alignment=TA_CENTER),
    "th":  style("th",  fontSize=9.5, textColor=WHITE, fontName="Helvetica-Bold",
                 alignment=TA_CENTER, leading=13),
    "td":  style("td",  fontSize=9.5, textColor=colors.black, leading=13),
}

# ── Helpers ─────────────────────────────────────────────────────────────────
def inline(text):
    """Converte **bold**, `code` e ✅ para markup reportlab."""
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'`([^`]+)`',     r'<font name="Courier" size="9">\1</font>', text)
    return text

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=DGRAY,
                      spaceAfter=6, spaceBefore=2)

def spacer(h=6):
    return Spacer(1, h)

# ── Parser do Markdown ───────────────────────────────────────────────────────
def parse(md_text):
    story = []
    lines = md_text.splitlines()
    i = 0
    in_table = False
    table_rows = []

    def flush_table():
        nonlocal in_table, table_rows
        if not table_rows:
            return
        header = table_rows[0]
        body   = table_rows[2:]          # linha 1 = separador

        col_n = len(header)
        col_w = [None] * col_n

        data = []
        data.append([Paragraph(inline(c.strip()), S["th"]) for c in header])
        for row in body:
            cells = row + [""] * max(0, col_n - len(row))
            data.append([Paragraph(inline(c.strip()), S["td"]) for c in cells[:col_n]])

        # largura das colunas: tenta heurística
        avail = 17 * cm
        if col_n == 2:
            col_w = [3.5*cm, avail - 3.5*cm]
        elif col_n == 3:
            col_w = [1.2*cm, avail - 4*cm, 3*cm]
        else:
            col_w = [avail / col_n] * col_n

        ts = TableStyle([
            ("BACKGROUND",  (0, 0), (-1, 0), DARK),
            ("TEXTCOLOR",   (0, 0), (-1, 0), WHITE),
            ("ALIGN",       (0, 0), (-1, -1), "LEFT"),
            ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
            ("GRID",        (0, 0), (-1, -1), 0.4, DGRAY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LGRAY]),
            ("TOPPADDING",  (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING",(0, 0), (-1, -1), 7),
        ])
        t = Table(data, colWidths=col_w, repeatRows=1)
        t.setStyle(ts)
        story.append(spacer(4))
        story.append(t)
        story.append(spacer(6))
        table_rows = []
        in_table = False

    while i < len(lines):
        line = lines[i]

        # Tabela
        if line.strip().startswith("|"):
            in_table = True
            cells = [c for c in line.strip().split("|") if True]
            # remove vazios das bordas
            if cells and cells[0].strip() == "":
                cells = cells[1:]
            if cells and cells[-1].strip() == "":
                cells = cells[:-1]
            table_rows.append(cells)
            i += 1
            continue
        elif in_table:
            flush_table()

        # H1
        if line.startswith("# "):
            story.append(Paragraph(inline(line[2:]), S["h1"]))
            story.append(HRFlowable(width="100%", thickness=1.5, color=RED,
                                    spaceAfter=8, spaceBefore=2))
            i += 1; continue

        # H2
        if line.startswith("## "):
            story.append(spacer(8))
            story.append(Paragraph(inline(line[3:]), S["h2"]))
            story.append(HRFlowable(width="100%", thickness=0.7, color=DGRAY,
                                    spaceAfter=4, spaceBefore=2))
            i += 1; continue

        # H3
        if line.startswith("### "):
            story.append(Paragraph(inline(line[4:]), S["h3"]))
            i += 1; continue

        # HR
        if re.match(r'^-{3,}$', line.strip()):
            story.append(hr())
            i += 1; continue

        # Blockquote
        if line.startswith("> "):
            story.append(Paragraph(inline(line[2:]), S["quote"]))
            i += 1; continue

        # Lista com marcadores
        m = re.match(r'^[-*]\s+(.*)', line)
        if m:
            story.append(Paragraph("• " + inline(m.group(1)), S["bullet"]))
            i += 1; continue

        # Lista numerada
        m = re.match(r'^\d+\.\s+(.*)', line)
        if m:
            story.append(Paragraph("• " + inline(m.group(1)), S["bullet"]))
            i += 1; continue

        # **Negrito como label** (linha inteira negrito)
        if re.match(r'^\*\*[^*]+:\*\*$', line.strip()):
            story.append(Paragraph(inline(line.strip()), S["bold_label"]))
            i += 1; continue

        # Linha vazia
        if not line.strip():
            story.append(spacer(4))
            i += 1; continue

        # Parágrafo normal
        story.append(Paragraph(inline(line.strip()), S["body"]))
        i += 1

    if in_table:
        flush_table()

    return story

# ── Main ────────────────────────────────────────────────────────────────────
def main():
    with open(MD, encoding="utf-8") as f:
        md = f.read()

    doc = SimpleDocTemplate(
        PDF,
        pagesize=A4,
        leftMargin=2.5*cm, rightMargin=2.5*cm,
        topMargin=2.2*cm,  bottomMargin=2.2*cm,
        title="Relatório de Atendimento — Módulo de Cronograma",
        author="Equipe de Desenvolvimento Terral",
    )

    story = parse(md)

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(GRAY)
        canvas.drawCentredString(
            A4[0] / 2,
            1.4*cm,
            f"Relatório de Atendimento — Módulo de Cronograma (Gantt) | Página {doc.page}"
        )
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(f"✅ PDF gerado: {PDF}")

main()


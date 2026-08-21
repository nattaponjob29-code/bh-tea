#!/usr/bin/env python3
"""BH Tea Production Log — User Manual PDF Generator"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
import os

# ── Register Thai fonts ──────────────────────────────────────────────────────
FONT_DIR = "/System/Library/Fonts/Supplemental"
pdfmetrics.registerFont(TTFont("Thai",      f"{FONT_DIR}/Ayuthaya.ttf"))
pdfmetrics.registerFont(TTFont("ThaiKrung", f"{FONT_DIR}/Krungthep.ttf"))

# ── Colour palette ────────────────────────────────────────────────────────────
C_BG       = colors.HexColor("#FFFDF7")   # warm cream
C_INK      = colors.HexColor("#1A1714")
C_INK2     = colors.HexColor("#4A4440")
C_INK3     = colors.HexColor("#8A837D")
C_AMBER    = colors.HexColor("#C98A3C")
C_OK       = colors.HexColor("#4E7C3A")
C_BAD      = colors.HexColor("#C0392B")
C_WARN     = colors.HexColor("#D4882A")
C_INFO     = colors.HexColor("#2980B9")
C_TEA      = colors.HexColor("#6B4F3A")
C_MATCHA   = colors.HexColor("#5D8C4A")
C_LINE     = colors.HexColor("#E8E0D8")
C_BRANCH   = colors.HexColor("#C98A3C")
C_AREA     = colors.HexColor("#5D8C4A")
C_QC       = colors.HexColor("#2980B9")
C_ADMIN    = colors.HexColor("#6B4F3A")
WHITE      = colors.white

PAGE_W, PAGE_H = A4  # 595 x 842 pt

# ── Style factory ─────────────────────────────────────────────────────────────
def S(name, font="Thai", size=11, leading=None, color=C_INK,
      align=TA_LEFT, spaceAfter=6, spaceBefore=0, leftIndent=0,
      bold=False):
    return ParagraphStyle(
        name,
        fontName="ThaiKrung" if bold else font,
        fontSize=size,
        leading=leading or (size * 1.55),
        textColor=color,
        alignment=align,
        spaceAfter=spaceAfter,
        spaceBefore=spaceBefore,
        leftIndent=leftIndent,
        wordWrap="CJK",
    )

# Pre-build common styles
sTitle    = S("Title",   bold=True, size=28, color=C_INK,  align=TA_CENTER, leading=36, spaceAfter=8)
sSubtitle = S("Sub",     size=14,   color=C_INK3, align=TA_CENTER, spaceAfter=4)
sChTitle  = S("ChTitle", bold=True, size=20, color=C_INK,  spaceAfter=6,  spaceBefore=18)
sSec      = S("Sec",     bold=True, size=14, color=C_INK,  spaceAfter=4,  spaceBefore=12)
sSubsec   = S("Subsec",  bold=True, size=12, color=C_INK2, spaceAfter=3,  spaceBefore=8)
sBody     = S("Body",    size=10.5, color=C_INK,  spaceAfter=5, leading=18)
sBodyJ    = S("BodyJ",   size=10.5, color=C_INK,  spaceAfter=5, leading=18, align=TA_JUSTIFY)
sNote     = S("Note",    size=9.5,  color=C_INK3, spaceAfter=4, leading=16, leftIndent=8)
sStep     = S("Step",    size=10.5, color=C_INK,  spaceAfter=4, leading=17, leftIndent=14)
sBadge    = S("Badge",   bold=True, size=9, color=WHITE, align=TA_CENTER, spaceAfter=0, leading=14)
sTip      = S("Tip",     size=9.5,  color=C_OK,   spaceAfter=3, leading=16, leftIndent=8)
sWarn     = S("Warn",    size=9.5,  color=C_WARN, spaceAfter=3, leading=16, leftIndent=8)
sCaption  = S("Cap",     size=9,    color=C_INK3, align=TA_CENTER, spaceAfter=8)
sFooter   = S("Foot",    size=8,    color=C_INK3, align=TA_CENTER)
sLabel    = S("Lbl",     bold=True, size=9.5, color=C_INK3, spaceAfter=2)
sPageH    = S("PageH",   bold=True, size=22, color=WHITE, align=TA_CENTER, leading=28, spaceAfter=0)
sToc      = S("Toc",     size=11,   color=C_INK,  spaceAfter=5, leading=18)
sTocCh    = S("TocCh",   bold=True, size=12, color=C_INK,  spaceAfter=3, spaceBefore=8)

# ── Helper builders ───────────────────────────────────────────────────────────
def hr(color=C_LINE, thickness=0.8):
    return HRFlowable(width="100%", thickness=thickness, color=color, spaceAfter=8, spaceBefore=4)

def sp(h=8):
    return Spacer(1, h)

def colored_box(text, bg, fg=WHITE, width=75, height=20, font_size=9):
    """Small colored badge as a 1-cell table."""
    style = ParagraphStyle("b", fontName="ThaiKrung", fontSize=font_size,
                           textColor=fg, alignment=TA_CENTER, leading=font_size*1.3)
    t = Table([[Paragraph(text, style)]], colWidths=[width], rowHeights=[height])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), bg),
        ("ROUNDEDCORNERS", [6]),
        ("VALIGN",     (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",    (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ]))
    return t

def role_header(title, color, subtitle=""):
    """Full-width role title banner."""
    s1 = ParagraphStyle("rh1", fontName="ThaiKrung", fontSize=18,
                        textColor=WHITE, alignment=TA_CENTER, leading=24)
    s2 = ParagraphStyle("rh2", fontName="Thai", fontSize=11,
                        textColor=colors.HexColor("#FFFFFF99"), alignment=TA_CENTER, leading=16)
    cells = [[Paragraph(title, s1)]]
    if subtitle:
        cells.append([Paragraph(subtitle, s2)])
    t = Table(cells, colWidths=[PAGE_W - 4*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), color),
        ("TOPPADDING",    (0,0), (-1,-1), 14),
        ("BOTTOMPADDING", (0,-1), (-1,-1), 14),
        ("LEFTPADDING",   (0,0), (-1,-1), 20),
        ("RIGHTPADDING",  (0,0), (-1,-1), 20),
        ("ROUNDEDCORNERS", [10]),
    ]))
    return t

def info_box(text, color=C_OK, icon=""):
    """Coloured callout box."""
    s = ParagraphStyle("ib", fontName="Thai", fontSize=10,
                       textColor=C_INK, leading=17)
    bg = colors.HexColor(
        {C_OK: "#F0F7ED", C_WARN: "#FDF6ED", C_BAD: "#FAEAEA", C_INFO: "#EBF4FB"}.get(color, "#F5F5F5")
    )
    border = color
    full = (f"<b>{icon} </b>" if icon else "") + text
    t = Table([[Paragraph(full, s)]], colWidths=[PAGE_W - 4*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), bg),
        ("LINEABOVE",     (0,0), (-1,0), 3, border),
        ("TOPPADDING",    (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
        ("LEFTPADDING",   (0,0), (-1,-1), 14),
        ("RIGHTPADDING",  (0,0), (-1,-1), 14),
        ("ROUNDEDCORNERS", [6]),
    ]))
    return t

def step_table(steps):
    """Numbered steps table."""
    rows = []
    for i, (title, desc) in enumerate(steps, 1):
        num_s  = ParagraphStyle("ns", fontName="ThaiKrung", fontSize=12,
                                textColor=WHITE, alignment=TA_CENTER, leading=16)
        tit_s  = ParagraphStyle("ts", fontName="ThaiKrung", fontSize=11,
                                textColor=C_INK, leading=16)
        desc_s = ParagraphStyle("ds", fontName="Thai", fontSize=10,
                                textColor=C_INK2, leading=16)
        rows.append([
            Paragraph(str(i), num_s),
            [Paragraph(title, tit_s), Paragraph(desc, desc_s)],
        ])
    t = Table(rows, colWidths=[1.2*cm, PAGE_W - 4*cm - 1.2*cm])
    style = [
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING",   (1,0), (1,-1), 10),
        ("RIGHTPADDING",  (0,0), (-1,-1), 6),
        ("ROWBACKGROUNDS",(0,0), (-1,-1), [colors.HexColor("#FAF7F2"), C_BG]),
        ("LINEBEFORE",    (1,0), (1,-1), 1, C_LINE),
    ]
    for i in range(len(rows)):
        style.append(("BACKGROUND", (0,i), (0,i), C_AMBER))
        style.append(("ROUNDEDCORNERS", [6]))
    t.setStyle(TableStyle(style))
    return t

def feature_grid(items):
    """2-column feature list: icon box + description."""
    rows = []
    for icon, title, desc in items:
        ic_s  = ParagraphStyle("ic", fontName="ThaiKrung", fontSize=14,
                               textColor=C_AMBER, alignment=TA_CENTER)
        tit_s = ParagraphStyle("ti", fontName="ThaiKrung", fontSize=11,
                               textColor=C_INK, leading=16)
        des_s = ParagraphStyle("de", fontName="Thai", fontSize=10,
                               textColor=C_INK3, leading=16)
        rows.append([
            Paragraph(icon, ic_s),
            [Paragraph(title, tit_s), Paragraph(desc, des_s)],
        ])
    t = Table(rows, colWidths=[1.4*cm, PAGE_W - 4*cm - 1.4*cm])
    t.setStyle(TableStyle([
        ("VALIGN",     (0,0), (-1,-1), "TOP"),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING",(0,0),(-1,-1), 8),
        ("LEFTPADDING",(1,0),(1,-1), 10),
        ("BACKGROUND", (0,0),(-1,-1), colors.HexColor("#FAF7F2")),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [colors.HexColor("#FAF7F2"), C_BG]),
        ("LINEBELOW",  (0,0),(-1,-2), 0.5, C_LINE),
    ]))
    return t

def two_col(left_items, right_items, col_w=None):
    """Two equal columns."""
    cw = col_w or [(PAGE_W - 4*cm - 18) / 2] * 2
    rows = []
    max_len = max(len(left_items), len(right_items))
    for i in range(max_len):
        l = left_items[i] if i < len(left_items) else Paragraph("", sBody)
        r = right_items[i] if i < len(right_items) else Paragraph("", sBody)
        rows.append([l, r])
    t = Table(rows, colWidths=cw)
    t.setStyle(TableStyle([
        ("VALIGN",  (0,0),(-1,-1),"TOP"),
        ("TOPPADDING",(0,0),(-1,-1),0),
        ("BOTTOMPADDING",(0,0),(-1,-1),0),
        ("LEFTPADDING",(1,0),(1,-1),12),
    ]))
    return t

# ── Page template ─────────────────────────────────────────────────────────────
page_num = [0]

def on_page(canvas, doc):
    page_num[0] += 1
    canvas.saveState()
    # Top bar
    canvas.setFillColor(C_INK)
    canvas.rect(0, PAGE_H - 28, PAGE_W, 28, fill=1, stroke=0)
    canvas.setFont("ThaiKrung", 9)
    canvas.setFillColor(colors.HexColor("#FFFFFF99"))
    canvas.drawString(2*cm, PAGE_H - 18, "BH Tea Production Log")
    canvas.drawRightString(PAGE_W - 2*cm, PAGE_H - 18, "คู่มือการใช้งาน v1.0")
    # Bottom bar
    canvas.setFillColor(C_LINE)
    canvas.rect(0, 0, PAGE_W, 22, fill=1, stroke=0)
    canvas.setFont("Thai", 8)
    canvas.setFillColor(C_INK3)
    canvas.drawCentredString(PAGE_W/2, 7, f"หน้า {page_num[0]}")
    canvas.restoreState()

def on_first_page(canvas, doc):
    canvas.saveState()
    canvas.restoreState()

# ── Cover page ────────────────────────────────────────────────────────────────
def cover():
    elems = []
    # gradient-like background bar
    elems.append(sp(60))

    # Logo circle placeholder
    logo_s = ParagraphStyle("logo", fontName="ThaiKrung", fontSize=52,
                            textColor=C_AMBER, alignment=TA_CENTER)
    elems.append(Paragraph("☕", logo_s))
    elems.append(sp(16))

    # Main title
    t1 = ParagraphStyle("T1", fontName="ThaiKrung", fontSize=30,
                        textColor=C_INK, alignment=TA_CENTER, leading=38)
    elems.append(Paragraph("BH Tea Production Log", t1))
    elems.append(sp(8))

    t2 = ParagraphStyle("T2", fontName="Thai", fontSize=16,
                        textColor=C_INK3, alignment=TA_CENTER, leading=24)
    elems.append(Paragraph("คู่มือการใช้งานระบบบันทึกการผลิตชา", t2))
    elems.append(sp(4))

    t3 = ParagraphStyle("T3", fontName="Thai", fontSize=11,
                        textColor=C_INK3, alignment=TA_CENTER)
    elems.append(Paragraph("เวอร์ชัน 1.0  ·  สำหรับผู้ใช้งานทุก Role", t3))
    elems.append(sp(50))

    # Role badges row
    role_data = [
        ("พนักงานสาขา", C_BRANCH),
        ("Area Manager", C_AREA),
        ("QC", C_QC),
        ("ผู้ดูแลระบบ", C_ADMIN),
    ]
    badge_cells = []
    for label, color in role_data:
        bs = ParagraphStyle("rb", fontName="ThaiKrung", fontSize=10,
                            textColor=WHITE, alignment=TA_CENTER, leading=14)
        badge_cells.append(Paragraph(label, bs))

    bt = Table([badge_cells], colWidths=[(PAGE_W - 4*cm) / 4] * 4)
    bt.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(0,0), C_BRANCH),
        ("BACKGROUND", (1,0),(1,0), C_AREA),
        ("BACKGROUND", (2,0),(2,0), C_QC),
        ("BACKGROUND", (3,0),(3,0), C_ADMIN),
        ("TOPPADDING",    (0,0),(-1,-1), 10),
        ("BOTTOMPADDING", (0,0),(-1,-1), 10),
        ("LEFTPADDING",   (0,0),(-1,-1), 4),
        ("RIGHTPADDING",  (0,0),(-1,-1), 4),
    ]))
    elems.append(bt)
    elems.append(sp(60))

    # Divider
    elems.append(HRFlowable(width="60%", thickness=1.5, color=C_AMBER,
                            hAlign="CENTER", spaceAfter=20, spaceBefore=0))

    t4 = ParagraphStyle("T4", fontName="Thai", fontSize=10,
                        textColor=C_INK3, alignment=TA_CENTER)
    elems.append(Paragraph("เอกสารนี้จัดทำสำหรับผู้ใช้งานระบบบันทึกการผลิต BH Tea ทุกระดับ", t4))
    elems.append(Paragraph("ครอบคลุมการบันทึกล็อตผลิต · การบันทึกของเสีย · การวิเคราะห์คุณภาพ", t4))

    elems.append(PageBreak())
    return elems

# ── Table of Contents ─────────────────────────────────────────────────────────
def toc():
    elems = []
    elems.append(sp(20))

    th = ParagraphStyle("toch", fontName="ThaiKrung", fontSize=22,
                        textColor=C_INK, leading=28, spaceAfter=20)
    elems.append(Paragraph("สารบัญ", th))
    elems.append(hr(C_AMBER, 2))
    elems.append(sp(8))

    entries = [
        ("1", "บทนำ — ระบบ BH Tea Production Log", "3"),
        ("1.1", "ฟีเจอร์หลัก", "3"),
        ("1.2", "บทบาทผู้ใช้งาน (Roles)", "3"),
        ("2", "การเข้าสู่ระบบ", "4"),
        ("3", "Role พนักงานสาขา (Branch)", "5"),
        ("3.1", "หน้าหลัก", "5"),
        ("3.2", "บันทึกล็อตการผลิต", "6"),
        ("3.3", "บันทึกของเสียหาย", "8"),
        ("3.4", "ประวัติการผลิต & ประวัติเสียหาย", "9"),
        ("4", "Role Area Manager", "10"),
        ("4.1", "แดชบอร์ดภาพรวมพื้นที่", "10"),
        ("4.2", "รายละเอียดรายสาขา", "11"),
        ("5", "Role QC (Quality Control)", "12"),
        ("5.1", "ภาพรวมองค์กร", "12"),
        ("5.2", "ทุกสาขา", "13"),
        ("5.3", "วิเคราะห์รายเมนู", "13"),
        ("6", "Role Admin (ผู้ดูแลระบบ)", "14"),
        ("7", "ประวัติ & การค้นหาข้อมูล", "15"),
        ("8", "คำถามที่พบบ่อย (FAQ)", "16"),
    ]

    for num, title, page in entries:
        is_main = len(num) == 1
        s = ParagraphStyle(
            f"toc_{num}", fontName="ThaiKrung" if is_main else "Thai",
            fontSize=11 if is_main else 10,
            textColor=C_INK if is_main else C_INK2,
            leading=18, leftIndent=0 if is_main else 16, spaceAfter=2
        )
        sp_s = ParagraphStyle("p", fontName="Thai", fontSize=10,
                              textColor=C_INK3, alignment=TA_RIGHT, leading=18)
        row = Table(
            [[Paragraph(f"{num}.  {title}" if is_main else f"  {num}  {title}", s),
              Paragraph(page, sp_s)]],
            colWidths=[PAGE_W - 4*cm - 40, 40]
        )
        row.setStyle(TableStyle([
            ("VALIGN", (0,0),(-1,-1), "BOTTOM"),
            ("TOPPADDING",    (0,0),(-1,-1), 1),
            ("BOTTOMPADDING", (0,0),(-1,-1), 1),
            ("LINEBELOW", (0,0),(-1,0), 0.4 if is_main else 0.2,
             C_LINE if not is_main else colors.HexColor("#D0C8C0")),
        ]))
        elems.append(row)
        if is_main:
            elems.append(sp(4))

    elems.append(PageBreak())
    return elems

# ── Chapter 1: Introduction ────────────────────────────────────────────────────
def ch1():
    e = []
    e.append(sp(10))
    e.append(Paragraph("บทที่ 1  บทนำ", sChTitle))
    e.append(hr(C_AMBER, 1.5))
    e.append(sp(6))

    e.append(Paragraph("ระบบ BH Tea Production Log คืออะไร?", sSec))
    e.append(Paragraph(
        "BH Tea Production Log คือระบบบันทึกและติดตามคุณภาพการผลิตเครื่องดื่มชา "
        "สำหรับร้าน BH Tea ที่มีหลายสาขา ระบบช่วยให้ทีมงานทุกระดับสามารถ "
        "บันทึกข้อมูลการผลิต ตรวจสอบคุณภาพ และวิเคราะห์ข้อมูลได้แบบ Real-time "
        "ผ่าน Web Browser ทั้งบนคอมพิวเตอร์และมือถือ",
        sBodyJ
    ))
    e.append(sp(10))

    e.append(Paragraph("1.1  ฟีเจอร์หลักของระบบ", sSec))
    feats = [
        ("📋", "บันทึกล็อตการผลิต", "บันทึกข้อมูลการผลิตแต่ละล็อต พร้อมผลการเทสชิม วัตถุดิบที่ใช้ และผู้รับผิดชอบ"),
        ("⚠️", "บันทึกของเสียหาย", "ลงบันทึกปริมาณของเสียจากการผลิต พร้อมระบุสาเหตุ ระบบคำนวณวัตถุดิบที่เสียหายให้อัตโนมัติ"),
        ("📊", "แดชบอร์ดแบบ Real-time", "ดูสถิติการผลิต Pass Rate กราฟ Trend และ Top 10 วัตถุดิบเสียหาย แบบ Interactive"),
        ("🔍", "ค้นหา & ประวัติ", "ค้นหาล็อตการผลิตย้อนหลัง กรองด้วยวันที่ สาขา เมนู หรือสถานะ"),
        ("📱", "รองรับมือถือ", "ออกแบบ Responsive ใช้งานได้สะดวกทั้งบนโทรศัพท์มือถือและแท็บเล็ต"),
        ("🔐", "จัดการสิทธิ์ตาม Role", "แต่ละ Role เห็นและทำได้เฉพาะสิ่งที่จำเป็น ปลอดภัยและไม่สับสน"),
    ]
    e.append(feature_grid(feats))
    e.append(sp(14))

    e.append(Paragraph("1.2  บทบาทผู้ใช้งาน (Roles)", sSec))
    e.append(Paragraph("ระบบมีผู้ใช้งาน 4 บทบาท แต่ละบทบาทมีหน้าที่และสิทธิ์การเข้าถึงแตกต่างกัน:", sBody))
    e.append(sp(6))

    role_rows = [
        ["Role", "ชื่อ", "หน้าที่หลัก", "เห็นข้อมูล"],
        ["Branch", "พนักงานสาขา", "บันทึกล็อตผลิต, บันทึกของเสีย", "เฉพาะสาขาตัวเอง"],
        ["Area",   "Area Manager", "ดูภาพรวมพื้นที่, วิเคราะห์สาขา", "ทุกสาขาในพื้นที่ที่รับผิดชอบ"],
        ["QC",     "Quality Control", "ตรวจคุณภาพทั้งองค์กร, วิเคราะห์เมนู", "ทุกสาขา ทุกเมนู"],
        ["Admin",  "ผู้ดูแลระบบ", "จัดการผู้ใช้, ตั้งค่าเมนู, BOM", "ทุกอย่างในระบบ"],
    ]
    role_colors = [None, C_BRANCH, C_AREA, C_QC, C_ADMIN]

    role_sty = [
        ("FONTNAME",   (0,0),(-1,-1), "Thai"),
        ("FONTNAME",   (0,0),(-1,0),  "ThaiKrung"),
        ("FONTSIZE",   (0,0),(-1,-1), 9.5),
        ("FONTSIZE",   (0,0),(-1,0),  10),
        ("BACKGROUND", (0,0),(-1,0),  C_INK),
        ("TEXTCOLOR",  (0,0),(-1,0),  WHITE),
        ("ALIGN",      (0,0),(-1,-1), "LEFT"),
        ("VALIGN",     (0,0),(-1,-1), "MIDDLE"),
        ("TOPPADDING",    (0,0),(-1,-1), 7),
        ("BOTTOMPADDING", (0,0),(-1,-1), 7),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.HexColor("#FAF7F2"), C_BG]),
        ("LINEBELOW",  (0,0),(-1,-2), 0.5, C_LINE),
        ("GRID",       (0,0),(-1,-1), 0.5, C_LINE),
    ]
    for row_i, rc in enumerate(role_colors):
        if rc:
            role_sty.append(("TEXTCOLOR", (0, row_i),(0, row_i), rc))
            role_sty.append(("FONTNAME",  (0, row_i),(0, row_i), "ThaiKrung"))

    rt = Table(role_rows, colWidths=[2.2*cm, 3.5*cm, 6*cm, 5.3*cm])
    rt.setStyle(TableStyle(role_sty))
    e.append(rt)
    e.append(PageBreak())
    return e

# ── Chapter 2: Login ──────────────────────────────────────────────────────────
def ch2():
    e = []
    e.append(sp(10))
    e.append(Paragraph("บทที่ 2  การเข้าสู่ระบบ", sChTitle))
    e.append(hr(C_AMBER, 1.5))
    e.append(sp(6))

    e.append(Paragraph(
        "เปิด Web Browser (Chrome แนะนำ) แล้วเข้าไปที่ URL ของระบบที่ได้รับจาก Admin "
        "จากนั้นกรอก Username และ Password ที่ Admin สร้างให้",
        sBodyJ
    ))
    e.append(sp(10))

    e.append(Paragraph("ขั้นตอนการเข้าสู่ระบบ", sSec))
    steps = [
        ("เปิดหน้า Login",
         "เข้าไปที่ URL ของระบบ — หน้า Login จะปรากฏโดยอัตโนมัติ"),
        ("กรอก Username",
         "พิมพ์ Username ที่ได้รับจาก Admin ตรงในช่อง 'ชื่อผู้ใช้'"),
        ("กรอก Password",
         "พิมพ์รหัสผ่าน — สามารถกดไอคอนตาเพื่อแสดง/ซ่อนรหัสผ่านได้"),
        ("กดปุ่ม 'เข้าสู่ระบบ'",
         "ระบบจะตรวจสอบข้อมูลและพาไปหน้าหลักตาม Role ของคุณ"),
    ]
    e.append(step_table(steps))
    e.append(sp(14))

    e.append(info_box(
        "แต่ละ Role จะเห็นหน้าจอที่แตกต่างกันหลัง Login: "
        "Branch จะเห็นหน้าบันทึกผลิต, Area เห็นแดชบอร์ดพื้นที่, "
        "QC เห็นภาพรวมองค์กร, Admin เห็นระบบจัดการทั้งหมด",
        C_INFO
    ))
    e.append(sp(14))

    e.append(Paragraph("การออกจากระบบ", sSec))
    e.append(Paragraph(
        "กดที่ชื่อผู้ใช้หรือไอคอน Avatar มุมบน จะมีปุ่ม 'ออกจากระบบ' ปรากฏ "
        "ควร Logout ทุกครั้งเมื่อเลิกใช้งาน โดยเฉพาะเมื่อใช้อุปกรณ์สาธารณะ",
        sBody
    ))
    e.append(sp(10))

    e.append(info_box(
        "หากลืมรหัสผ่านหรือบัญชีถูกล็อก กรุณาติดต่อ Admin ของระบบ "
        "ระบบไม่มีฟีเจอร์ Reset Password ด้วยตนเอง",
        C_WARN
    ))
    e.append(PageBreak())
    return e

# ── Chapter 3: Branch Role ────────────────────────────────────────────────────
def ch3():
    e = []
    e.append(sp(10))
    e.append(role_header("บทที่ 3  Role พนักงานสาขา (Branch)",
                         C_BRANCH, "บันทึกล็อตการผลิต · บันทึกของเสีย · ดูประวัติ"))
    e.append(sp(16))

    e.append(Paragraph(
        "พนักงานสาขาเป็นผู้ใช้งานหลักในระบบ มีหน้าที่บันทึกข้อมูลการผลิตและของเสียประจำวัน "
        "ข้อมูลที่บันทึกจะถูกส่งต่อให้ Area Manager และ QC ใช้วิเคราะห์ต่อไป",
        sBodyJ
    ))
    e.append(sp(12))

    # 3.1 Home
    e.append(Paragraph("3.1  หน้าหลัก (Dashboard)", sSec))
    e.append(Paragraph("หลัง Login สำเร็จ จะเห็นหน้าหลักประกอบด้วย:", sBody))

    items = [
        ("📊 Stat Cards (4 การ์ด)", "ล็อตวันนี้, ผ่าน QC, ไม่ผ่าน QC, ของเสียหาย — แสดงข้อมูลวันปัจจุบัน"),
        ("📋 กิจกรรมล่าสุด", "5 รายการล่าสุดที่บันทึกในสาขา พร้อมสถานะ ผ่าน/ไม่ผ่าน/ของเสีย"),
        ("⚡ เริ่มทำงานวันนี้", "Shortcut 3 ปุ่ม: บันทึกล็อตผลิต, บันทึกของเสีย, ดูประวัติ"),
    ]
    rows = [[Paragraph(a, S("f", bold=True, size=10)), Paragraph(b, sBody)] for a, b in items]
    t = Table(rows, colWidths=[4.5*cm, PAGE_W - 4*cm - 4.5*cm])
    t.setStyle(TableStyle([
        ("VALIGN",    (0,0),(-1,-1), "TOP"),
        ("TOPPADDING",    (0,0),(-1,-1), 7),
        ("BOTTOMPADDING", (0,0),(-1,-1), 7),
        ("LEFTPADDING",   (1,0),(1,-1), 12),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[colors.HexColor("#FAF7F2"), C_BG]),
        ("LINEBELOW",  (0,0),(-1,-2), 0.4, C_LINE),
    ]))
    e.append(t)
    e.append(sp(10))

    # 3.2 บันทึกล็อต
    e.append(Paragraph("3.2  บันทึกล็อตการผลิต", sSec))
    e.append(Paragraph(
        "กดปุ่ม 'บันทึกล็อตใหม่' หรือ 'บันทึกล็อตการผลิต' ในเมนูด้านซ้าย "
        "แล้วกรอกข้อมูลตามขั้นตอนด้านล่าง",
        sBody
    ))
    e.append(sp(8))

    steps = [
        ("เลือกหมวดเมนู",
         "เลือก Tab หมวดหมู่ที่ต้องการ: ทั้งหมด / เบส / เครื่องดื่ม / 3.3 / ท็อปปิ้ง"),
        ("เลือกเมนูที่ผลิต",
         "กดเลือกเมนูจาก Dropdown เช่น เบสชาดำเข้มข้น, ไข่มุกโมจิ ฯลฯ"),
        ("กรอกล็อตวัตถุดิบ",
         "สำหรับแต่ละวัตถุดิบใน BOM กรอก 'หมายเลขล็อต' ของวัตถุดิบที่ใช้จริง (เช่น LOT-2024-001) "
         "ข้อมูลนี้ใช้สำหรับ Traceability — บังคับกรอกทุกรายการ"),
        ("วัดอุณหภูมิ (เฉพาะไข่มุกโมจิ)",
         "หากเลือกเมนูไข่มุกโมจิ จะมีช่องกรอกอุณหภูมิแช่แข็งปรากฏ — แนะนำ ≤ -18°C"),
        ("เลือกเวลาบันทึก",
         "'บันทึกทันที' ใช้เวลาปัจจุบัน | 'บันทึกย้อนหลัง' เลือกวันและเวลาที่ต้องการ"),
        ("ผลการเทสชิม",
         "กดเลือก 'ผ่าน' หรือ 'ไม่ผ่าน' — หากไม่ผ่านต้องระบุสาเหตุเพิ่มเติม"),
        ("ระบุสาเหตุที่ไม่ผ่าน (ถ้าไม่ผ่าน)",
         "เลือกสาเหตุจาก Dropdown: สี/กลิ่นไม่ผ่าน, ความเข้มข้นต่ำ, ตกตะกอน, เก็บอุณหภูมิไม่ได้, อื่นๆ"),
        ("กรอกชื่อผู้ผลิต & ผู้ทดสอบ",
         "กรอกชื่อพนักงานที่ผลิตและผู้ที่ทำการเทสชิม (บังคับ)"),
        ("กดบันทึก & ยืนยัน",
         "กดปุ่ม 'บันทึกล็อตการผลิต' ตรวจทานข้อมูลใน Modal แล้วกด 'ยืนยัน' "
         "ระบบจะสร้าง ID ล็อตให้อัตโนมัติ เช่น LOT-20260529-1234"),
    ]
    e.append(step_table(steps))
    e.append(sp(12))

    e.append(info_box(
        "รหัสล็อตที่ระบบสร้างให้จะอยู่ในรูปแบบ LOT-YYYYMMDD-XXXX "
        "เก็บบันทึกไว้เพื่อการอ้างอิงในกรณีต้องการค้นหาย้อนหลัง",
        C_OK
    ))
    e.append(sp(8))

    e.append(Paragraph("สาเหตุที่ไม่ผ่าน QC (Fail Reasons)", sSubsec))
    fail_reasons = [
        ["สี/กลิ่นไม่ผ่าน", "สี หรือกลิ่นของเครื่องดื่มไม่ตรงมาตรฐาน"],
        ["ความเข้มข้นต่ำ", "รสชาติเจือจางกว่าที่กำหนด"],
        ["ตกตะกอน", "มีตะกอนปรากฏในเครื่องดื่มหลังจากผลิต"],
        ["เก็บอุณหภูมิไม่ได้", "ไม่สามารถรักษาอุณหภูมิที่กำหนดได้"],
        ["อื่นๆ", "สาเหตุอื่นที่ไม่อยู่ในรายการข้างต้น"],
    ]
    fr_t = Table(fail_reasons, colWidths=[4.5*cm, PAGE_W-4*cm-4.5*cm])
    fr_t.setStyle(TableStyle([
        ("FONTNAME",   (0,0),(-1,-1), "Thai"),
        ("FONTNAME",   (0,0),(0,-1),  "ThaiKrung"),
        ("FONTSIZE",   (0,0),(-1,-1), 10),
        ("TEXTCOLOR",  (0,0),(0,-1),  C_BAD),
        ("VALIGN",     (0,0),(-1,-1), "TOP"),
        ("TOPPADDING",    (0,0),(-1,-1), 6),
        ("BOTTOMPADDING", (0,0),(-1,-1), 6),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[colors.HexColor("#FDF4F4"), C_BG]),
        ("LINEBELOW",  (0,0),(-1,-2), 0.4, C_LINE),
        ("GRID",       (0,0),(-1,-1), 0.4, C_LINE),
    ]))
    e.append(fr_t)
    e.append(PageBreak())
    return e

# ── Chapter 3 continued: Defect & History ────────────────────────────────────
def ch3b():
    e = []
    e.append(sp(10))

    # 3.3 บันทึกของเสีย
    e.append(Paragraph("3.3  บันทึกของเสียหาย", sSec))
    e.append(Paragraph(
        "เมื่อเกิดของเสียในกระบวนการผลิต ให้บันทึกทันทีผ่านเมนู 'บันทึกของเสียหาย' "
        "ระบบจะคำนวณมูลค่าวัตถุดิบที่เสียหายโดยอัตโนมัติจาก BOM ที่ตั้งไว้",
        sBodyJ
    ))
    e.append(sp(8))

    steps = [
        ("เลือกเมนูที่เสีย",
         "กด Dropdown แล้วเลือกเมนูที่มีของเสีย — สามารถเพิ่มหลายเมนูในครั้งเดียวได้ "
         "โดยกดปุ่ม '+ เพิ่มเมนู'"),
        ("กรอกจำนวนกรัมที่เสีย",
         "ระบุน้ำหนักของเสียเป็น กรัม — ระบบจะคำนวณวัตถุดิบให้อัตโนมัติ"),
        ("เลือกสาเหตุของเสีย",
         "กดเลือกสาเหตุจาก Chip ที่แสดง: วัตถุดิบหมดอายุ, ตักล้น/หกระหว่างผลิต, "
         "ปั่นไม่ละเอียด, ลูกค้ายกเลิก, ทำผิดสูตร, อุปกรณ์เสีย, อื่นๆ"),
        ("กรอกหมายเหตุ (ไม่บังคับ)",
         "เพิ่มคำอธิบายรายละเอียดถ้าต้องการ"),
        ("กดบันทึกของเสีย",
         "ระบบสร้าง ID ในรูปแบบ DEF-YYYYMMDD-XXXX และบันทึกข้อมูลทันที"),
    ]
    e.append(step_table(steps))
    e.append(sp(12))

    e.append(Paragraph("สาเหตุของเสีย (Defect Reasons)", sSubsec))
    defect_rows = [
        ["วัตถุดิบหมดอายุ",          "วัตถุดิบที่ใช้หมดอายุหรือเสื่อมคุณภาพ"],
        ["ตักล้น/หกระหว่างผลิต",      "เกิดการหกหรือตักเกินระหว่างกระบวนการผลิต"],
        ["ปั่นไม่ละเอียด",            "การปั่นไม่ได้มาตรฐาน ส่งผลต่อเนื้อสัมผัส"],
        ["ลูกค้ายกเลิก",             "ลูกค้ายกเลิกออร์เดอร์หลังผลิตแล้ว"],
        ["ทำผิดสูตร",                "พนักงานทำผิดสัดส่วน/ขั้นตอนตามสูตร"],
        ["อุปกรณ์เสีย",              "อุปกรณ์ขัดข้องระหว่างการผลิต"],
        ["อื่นๆ",                    "สาเหตุอื่นที่ไม่อยู่ในรายการ"],
    ]
    dr_t = Table(defect_rows, colWidths=[4.5*cm, PAGE_W-4*cm-4.5*cm])
    dr_t.setStyle(TableStyle([
        ("FONTNAME",  (0,0),(-1,-1), "Thai"),
        ("FONTNAME",  (0,0),(0,-1),  "ThaiKrung"),
        ("FONTSIZE",  (0,0),(-1,-1), 10),
        ("TEXTCOLOR", (0,0),(0,-1),  C_WARN),
        ("VALIGN",    (0,0),(-1,-1), "TOP"),
        ("TOPPADDING",    (0,0),(-1,-1), 6),
        ("BOTTOMPADDING", (0,0),(-1,-1), 6),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[colors.HexColor("#FEFAF2"), C_BG]),
        ("LINEBELOW",  (0,0),(-1,-2), 0.4, C_LINE),
        ("GRID",       (0,0),(-1,-1), 0.4, C_LINE),
    ]))
    e.append(dr_t)
    e.append(sp(14))

    # 3.4 ประวัติ
    e.append(Paragraph("3.4  ประวัติการผลิต & ประวัติเสียหาย", sSec))
    e.append(Paragraph(
        "สามารถดูประวัติการบันทึกทั้งหมดของสาขาผ่านเมนู 'ประวัติการผลิต' และ 'ประวัติเสียหาย' "
        "มีฟีเจอร์กรองและค้นหาดังนี้:",
        sBody
    ))
    hist_items = [
        ("กรองตามวันที่", "เลือก From — To หรือกดปุ่มลัด: 7 วันล่าสุด, 14 วันล่าสุด, วันนี้"),
        ("ค้นหา",         "พิมพ์ค้นหาด้วยชื่อเมนู, รหัสล็อต, หรือชื่อผู้ผลิต"),
        ("กรองสถานะ",      "เลือกดูเฉพาะ: ทั้งหมด / ผ่าน / ไม่ผ่าน"),
        ("ลบรายการ",       "กดปุ่ม 'ลบ' ข้างรายการ — ต้องยืนยันก่อนลบ"),
    ]
    for label, desc in hist_items:
        e.append(Paragraph(f"• <b>{label}</b> — {desc}", sStep))
    e.append(sp(8))

    e.append(info_box(
        "การลบข้อมูลจะถาวร ไม่สามารถกู้คืนได้ กรุณาตรวจสอบก่อนกด 'ยืนยันลบ' ทุกครั้ง",
        C_BAD
    ))
    e.append(PageBreak())
    return e

# ── Chapter 4: Area Manager ───────────────────────────────────────────────────
def ch4():
    e = []
    e.append(sp(10))
    e.append(role_header("บทที่ 4  Role Area Manager",
                         C_AREA, "ดูแลภาพรวมการผลิตในพื้นที่ · วิเคราะห์รายสาขา"))
    e.append(sp(16))

    e.append(Paragraph(
        "Area Manager ดูแลสาขาหลายสาขาในพื้นที่ (Area) ที่รับผิดชอบ สามารถดูข้อมูลรวม "
        "และรายสาขาในพื้นที่ของตนเอง รวมถึงประวัติการผลิตและของเสียย้อนหลัง",
        sBodyJ
    ))
    e.append(sp(12))

    # 4.1 Dashboard
    e.append(Paragraph("4.1  แดชบอร์ดภาพรวมพื้นที่", sSec))

    dash_items = [
        ("📊 Stat Cards", "4 การ์ดสรุป: ล็อตผลิต, ผ่าน QC, ไม่ผ่าน QC, ของเสียหาย ในช่วงเวลาที่เลือก"),
        ("📈 กราฟผลิตรายวัน", "Stacked Bar Chart แสดง ผ่าน / ไม่ผ่าน / ของเสีย แยกตามวัน"),
        ("🏪 การผลิตรายสาขา", "แถบ Progress Bar เปรียบเทียบปริมาณผลิตของแต่ละสาขา"),
        ("🍩 สัดส่วนคุณภาพ", "Donut Chart แสดงสัดส่วน ผ่าน / ไม่ผ่าน / ของเสีย พร้อม Pass Rate"),
        ("📋 สาเหตุปัญหาสูงสุด", "รายการสาเหตุ 'ไม่ผ่าน QC' และ 'ของเสีย' ที่พบบ่อยที่สุด"),
        ("🔍 เสียหายรายวัตถุดิบ", "Interactive Donut Chart + Top 10 วัตถุดิบที่เสียหายมากที่สุด"),
    ]
    rows = [[Paragraph(a, S("f", bold=True, size=10)), Paragraph(b, sBody)] for a, b in dash_items]
    t = Table(rows, colWidths=[4*cm, PAGE_W-4*cm-4*cm])
    t.setStyle(TableStyle([
        ("FONTNAME",   (0,0),(-1,-1), "Thai"),
        ("VALIGN",     (0,0),(-1,-1), "TOP"),
        ("TOPPADDING",    (0,0),(-1,-1), 7),
        ("BOTTOMPADDING", (0,0),(-1,-1), 7),
        ("LEFTPADDING",   (1,0),(1,-1), 12),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[colors.HexColor("#F2F7F0"), C_BG]),
        ("LINEBELOW",  (0,0),(-1,-2), 0.4, C_LINE),
    ]))
    e.append(t)
    e.append(sp(12))

    e.append(Paragraph("การใช้ตัวกรองวันที่", sSubsec))
    e.append(Paragraph(
        "ทุกส่วนในแดชบอร์ดสามารถกรองช่วงเวลาได้ ผ่านตัวเลือกด้านบนขวาของหน้า:",
        sBody
    ))
    e.append(Paragraph("• กดปุ่ม '7 วันล่าสุด' / '14 วันล่าสุด' / 'วันนี้' สำหรับช่วงเวลามาตรฐาน", sStep))
    e.append(Paragraph("• กรอกวันที่ From — To เองสำหรับช่วงเวลาที่ต้องการ", sStep))
    e.append(sp(12))

    e.append(Paragraph("Interactive Donut Chart — เสียหายรายวัตถุดิบ", sSubsec))
    e.append(Paragraph(
        "กราฟวงกลมใน Section 'เสียหายรายวัตถุดิบ' สามารถโต้ตอบได้:",
        sBody
    ))
    e.append(Paragraph("• เอาเมาส์ไปจ่อที่ Segment ของกราฟ — จะแสดงชื่อและปริมาณวัตถุดิบตรงกลางวง", sStep))
    e.append(Paragraph("• บนมือถือ แตะที่ Segment เพื่อดูข้อมูล แตะอีกครั้งเพื่อยกเลิก", sStep))
    e.append(Paragraph("• ด้านขวา (หรือด้านล่างบนมือถือ) มี Top 10 วัตถุดิบพร้อม Progress Bar", sStep))
    e.append(sp(14))

    # 4.2 รายสาขา
    e.append(Paragraph("4.2  รายละเอียดรายสาขา", sSec))
    e.append(Paragraph(
        "เมนู 'รายสาขา' แสดงการ์ดสรุปของแต่ละสาขาในพื้นที่ ประกอบด้วย:",
        sBody
    ))
    e.append(Paragraph("• Badge สถานะ: สีเขียว (≥90%), เหลือง (80-89%), แดง (<80%)", sStep))
    e.append(Paragraph("• สถิติ 4 ตัว: ล็อตผลิต / ผ่าน / ไม่ผ่าน / ของเสีย", sStep))
    e.append(Paragraph("• Progress Bar แสดง Pass Rate ของแต่ละสาขา", sStep))
    e.append(sp(8))

    e.append(info_box(
        "Area Manager เห็นเฉพาะสาขาที่อยู่ใน Area ของตนเอง "
        "หาก Area ของคุณไม่มีสาขาปรากฏ ติดต่อ Admin เพื่อกำหนดสาขาให้ถูกต้อง",
        C_INFO
    ))
    e.append(PageBreak())
    return e

# ── Chapter 5: QC Role ────────────────────────────────────────────────────────
def ch5():
    e = []
    e.append(sp(10))
    e.append(role_header("บทที่ 5  Role QC (Quality Control)",
                         C_QC, "ตรวจสอบคุณภาพทั้งองค์กร · วิเคราะห์รายสาขาและรายเมนู"))
    e.append(sp(16))

    e.append(Paragraph(
        "QC มีสิทธิ์ดูข้อมูลของทุกสาขาทั่วทั้งองค์กร มีเครื่องมือวิเคราะห์คุณภาพ "
        "ที่ครอบคลุมกว่า Area Manager เพื่อตรวจสอบและควบคุมมาตรฐานการผลิต",
        sBodyJ
    ))
    e.append(sp(12))

    # 5.1 ภาพรวม
    e.append(Paragraph("5.1  ภาพรวมองค์กร (QC Overview)", sSec))
    e.append(Paragraph("แดชบอร์ดหลักของ QC แสดงข้อมูลทุกสาขารวมกัน ประกอบด้วย:", sBody))

    overview = [
        ("📊 Stat Cards", "ล็อตทั้งหมด, Pass Rate %, ไม่ผ่าน QC, ของเสียหาย — รวมทุกสาขา"),
        ("📈 Quality Trend", "Stacked Bar Chart แสดง ผ่าน / ไม่ผ่าน / ของเสีย รายวัน รวมทุกสาขา"),
        ("🏆 Top สาขาคุณภาพดี", "Top 3 สาขาที่มี Pass Rate สูงที่สุดในช่วงเวลาที่เลือก"),
        ("⚠️  สาขาที่ต้องดูแล", "Top 3 สาขาที่มี Pass Rate ต่ำที่สุด — ควรเข้าไปตรวจสอบ"),
        ("📋 เมนูที่ไม่ผ่านบ่อย", "เมนูที่มีอัตราไม่ผ่าน QC สูงสุด 6 อันดับแรก"),
    ]
    rows = [[Paragraph(a, S("f", bold=True, size=10)), Paragraph(b, sBody)] for a, b in overview]
    t = Table(rows, colWidths=[4.5*cm, PAGE_W-4*cm-4.5*cm])
    t.setStyle(TableStyle([
        ("VALIGN",    (0,0),(-1,-1), "TOP"),
        ("TOPPADDING",    (0,0),(-1,-1), 7),
        ("BOTTOMPADDING", (0,0),(-1,-1), 7),
        ("LEFTPADDING",   (1,0),(1,-1), 12),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[colors.HexColor("#EBF4FB"), C_BG]),
        ("LINEBELOW",  (0,0),(-1,-2), 0.4, C_LINE),
    ]))
    e.append(t)
    e.append(sp(12))

    e.append(Paragraph("การอ่านสีสถานะ Pass Rate", sSubsec))
    status_rows = [
        ["สีเขียว", "Pass Rate ≥ 90%", "คุณภาพดี — ผ่านมาตรฐาน"],
        ["สีเหลือง", "Pass Rate 80–89%", "ต้องปรับปรุง — เฝ้าระวัง"],
        ["สีแดง",   "Pass Rate < 80%",  "วิกฤต — ต้องดำเนินการทันที"],
    ]
    st_colors = [C_OK, C_WARN, C_BAD]
    st_t = Table(status_rows, colWidths=[2.5*cm, 5*cm, PAGE_W-4*cm-7.5*cm])
    st_style = [
        ("FONTNAME",  (0,0),(-1,-1), "Thai"),
        ("FONTNAME",  (0,0),(0,-1),  "ThaiKrung"),
        ("FONTSIZE",  (0,0),(-1,-1), 10),
        ("VALIGN",    (0,0),(-1,-1), "MIDDLE"),
        ("TOPPADDING",    (0,0),(-1,-1), 7),
        ("BOTTOMPADDING", (0,0),(-1,-1), 7),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [colors.HexColor("#F0F7ED"), colors.HexColor("#FDF6ED"), colors.HexColor("#FAEAEA")]),
        ("GRID",       (0,0),(-1,-1), 0.4, C_LINE),
    ]
    for i, c in enumerate(st_colors):
        st_style.append(("TEXTCOLOR", (0,i),(0,i), c))
    st_t.setStyle(TableStyle(st_style))
    e.append(st_t)
    e.append(sp(14))

    # 5.2 ทุกสาขา
    e.append(Paragraph("5.2  ทุกสาขา", sSec))
    e.append(Paragraph(
        "เมนู 'ทุกสาขา' แสดงการ์ดสรุปของทุกสาขาในระบบพร้อมกัน ค่าเริ่มต้นแสดง 14 วันล่าสุด "
        "แต่ละการ์ดมี: ชื่อสาขา, พื้นที่, Pass Rate %, สถิติผลิต และ Dot สถานะ (กระพริบ)",
        sBodyJ
    ))
    e.append(sp(12))

    # 5.3 รายเมนู
    e.append(Paragraph("5.3  วิเคราะห์รายเมนู (Menu Analysis)", sSec))
    e.append(Paragraph(
        "เมนู 'รายเมนู' วิเคราะห์คุณภาพแยกตามเมนูทุกเมนูในระบบ สามารถดูได้ว่าเมนูใด "
        "มีปัญหาคุณภาพบ่อย เพื่อนำไปปรับปรุงสูตรหรือกระบวนการผลิต",
        sBodyJ
    ))
    e.append(sp(6))

    e.append(Paragraph("คอลัมน์ในตาราง (Desktop) / การ์ด (Mobile):", sSubsec))
    col_rows = [
        ["เมนู",        "ชื่อเมนูที่ผลิต"],
        ["หมวด",        "หมวดหมู่ของเมนู (เบส, เครื่องดื่ม, 3.3, ท็อปปิ้ง)"],
        ["ล็อตผลิต",   "จำนวนล็อตที่ผลิตทั้งหมดในช่วงเวลาที่เลือก"],
        ["ผ่าน",        "จำนวนล็อตที่ผ่าน QC"],
        ["ไม่ผ่าน",    "จำนวนล็อตที่ไม่ผ่าน QC"],
        ["ของเสีย",     "ปริมาณของเสียที่บันทึกสำหรับเมนูนี้ (หน่วยตามเมนู)"],
        ["Pass Rate",   "เปอร์เซ็นต์ผ่าน QC — แสดงเป็น Progress Bar พร้อมสี"],
    ]
    cr_t = Table(col_rows, colWidths=[3.5*cm, PAGE_W-4*cm-3.5*cm])
    cr_t.setStyle(TableStyle([
        ("FONTNAME",   (0,0),(-1,-1), "Thai"),
        ("FONTNAME",   (0,0),(0,-1),  "ThaiKrung"),
        ("FONTSIZE",   (0,0),(-1,-1), 10),
        ("TEXTCOLOR",  (0,0),(0,-1),  C_QC),
        ("VALIGN",     (0,0),(-1,-1), "TOP"),
        ("TOPPADDING",    (0,0),(-1,-1), 6),
        ("BOTTOMPADDING", (0,0),(-1,-1), 6),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[colors.HexColor("#EBF4FB"), C_BG]),
        ("LINEBELOW",  (0,0),(-1,-2), 0.4, C_LINE),
        ("GRID",       (0,0),(-1,-1), 0.4, C_LINE),
    ]))
    e.append(cr_t)
    e.append(PageBreak())
    return e

# ── Chapter 6: Admin ──────────────────────────────────────────────────────────
def ch6():
    e = []
    e.append(sp(10))
    e.append(role_header("บทที่ 6  Role Admin (ผู้ดูแลระบบ)",
                         C_ADMIN, "จัดการผู้ใช้ · ตั้งค่าเมนู · กำหนด BOM"))
    e.append(sp(16))

    e.append(Paragraph(
        "Admin มีสิทธิ์สูงสุดในระบบ สามารถจัดการข้อมูลหลักทั้งหมด ซึ่งรวมถึง "
        "การสร้าง/แก้ไขผู้ใช้งาน, สาขา, เมนู, วัตถุดิบ, และ BOM (Bill of Materials) "
        "ควรมีเพียง 1-2 คนที่มีสิทธิ์ Admin เพื่อความปลอดภัยของข้อมูล",
        sBodyJ
    ))
    e.append(sp(12))

    e.append(Paragraph("ฟีเจอร์หลักของ Admin", sSec))

    admin_feats = [
        ("👥 จัดการผู้ใช้",      "สร้าง/แก้ไข/ลบบัญชีผู้ใช้ กำหนด Role, สาขา, และ Area ที่รับผิดชอบ"),
        ("🏪 จัดการสาขา",        "เพิ่ม/แก้ไข/ลบสาขา กำหนด ID สาขาและพื้นที่ (Area)"),
        ("🍵 จัดการเมนู",        "เพิ่ม/แก้ไข/ลบเมนูการผลิต กำหนดหมวดหมู่, Yield, และหน่วย"),
        ("🧪 จัดการวัตถุดิบ",    "จัดการ Ingredient Master: รหัส, ชื่อ, หน่วย"),
        ("📋 กำหนด BOM ผลิต",    "ผูกวัตถุดิบกับเมนูสำหรับการบันทึก Lot Traceability"),
        ("⚠️ กำหนด BOM ของเสีย", "ผูกวัตถุดิบกับเมนูเพื่อคำนวณมูลค่าของเสียโดยอัตโนมัติ"),
        ("📊 แดชบอร์ด Admin",    "ดูสถิติรวมทั้งองค์กร รายงานเสียหายรายวัตถุดิบ"),
    ]
    rows = [[Paragraph(a, S("f", bold=True, size=10)), Paragraph(b, sBody)] for a, b in admin_feats]
    t = Table(rows, colWidths=[4.5*cm, PAGE_W-4*cm-4.5*cm])
    t.setStyle(TableStyle([
        ("VALIGN",    (0,0),(-1,-1), "TOP"),
        ("TOPPADDING",    (0,0),(-1,-1), 8),
        ("BOTTOMPADDING", (0,0),(-1,-1), 8),
        ("LEFTPADDING",   (1,0),(1,-1), 12),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[colors.HexColor("#F5F0EB"), C_BG]),
        ("LINEBELOW",  (0,0),(-1,-2), 0.4, C_LINE),
    ]))
    e.append(t)
    e.append(sp(14))

    e.append(Paragraph("การสร้างผู้ใช้งานใหม่", sSec))
    steps = [
        ("ไปที่เมนู 'จัดการผู้ใช้'",
         "เลือกจากแถบนำทางด้านซ้าย"),
        ("กดปุ่ม '+ เพิ่มผู้ใช้'",
         "Form สร้างผู้ใช้จะปรากฏ"),
        ("กรอกข้อมูลผู้ใช้",
         "Username, Password, ชื่อแสดง, Role "
         "(Branch/Area/QC/Admin)"),
        ("เลือกสาขาหรือพื้นที่",
         "สำหรับ Branch: เลือกสาขา 1 สาขา | Area: เลือก Area ที่รับผิดชอบ"),
        ("บันทึก",
         "ผู้ใช้ใหม่สามารถ Login ได้ทันทีด้วย Username/Password ที่กำหนด"),
    ]
    e.append(step_table(steps))
    e.append(sp(12))

    e.append(info_box(
        "การกำหนด BOM (Bill of Materials) ที่ถูกต้องมีความสำคัญมาก: "
        "BOM ผลิต ใช้สำหรับ Lot Traceability | BOM ของเสีย ใช้สำหรับคำนวณ "
        "มูลค่าวัตถุดิบที่เสียหายในแดชบอร์ด หาก BOM ไม่ถูกผูกไว้ "
        "พนักงานยังบันทึกล็อตได้ แต่จะไม่มีข้อมูล Traceability",
        C_WARN
    ))
    e.append(PageBreak())
    return e

# ── Chapter 7: History & Search ───────────────────────────────────────────────
def ch7():
    e = []
    e.append(sp(10))
    e.append(Paragraph("บทที่ 7  ประวัติ & การค้นหาข้อมูล", sChTitle))
    e.append(hr(C_AMBER, 1.5))
    e.append(sp(6))

    e.append(Paragraph(
        "ทุก Role มีหน้า 'ประวัติการผลิต' และ 'ประวัติเสียหาย' ที่แสดงข้อมูลย้อนหลัง "
        "Area, QC, และ Admin สามารถกรองตามสาขาเพิ่มเติมได้",
        sBodyJ
    ))
    e.append(sp(10))

    e.append(Paragraph("ฟีเจอร์การกรองและค้นหา", sSec))
    filter_items = [
        ("📅 กรองวันที่",     "เลือกช่วง From — To หรือกด Preset: วันนี้, 7 วัน, 14 วัน"),
        ("🔍 ค้นหา",          "พิมพ์คีย์เวิร์ดค้นหาในช่องค้นหา (ชื่อเมนู, รหัสล็อต ฯลฯ)"),
        ("🏷️ กรองสถานะ",     "ทั้งหมด / ผ่าน / ไม่ผ่าน / ของเสีย"),
        ("🏪 กรองสาขา",       "Area/QC/Admin เลือกดูเฉพาะสาขาที่ต้องการ"),
        ("⬇️ เรียงลำดับ",     "ค่าเริ่มต้นเรียงจากล่าสุด — เก่าสุด"),
    ]
    rows = [[Paragraph(a, S("f", bold=True, size=10)), Paragraph(b, sBody)] for a, b in filter_items]
    t = Table(rows, colWidths=[4*cm, PAGE_W-4*cm-4*cm])
    t.setStyle(TableStyle([
        ("VALIGN",    (0,0),(-1,-1), "TOP"),
        ("TOPPADDING",    (0,0),(-1,-1), 7),
        ("BOTTOMPADDING", (0,0),(-1,-1), 7),
        ("LEFTPADDING",   (1,0),(1,-1), 12),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[colors.HexColor("#FAF7F2"), C_BG]),
        ("LINEBELOW",  (0,0),(-1,-2), 0.4, C_LINE),
    ]))
    e.append(t)
    e.append(sp(12))

    e.append(Paragraph("ข้อมูลในแต่ละรายการประวัติ", sSec))
    detail_rows = [
        ["รหัสล็อต",      "ID อ้างอิงของล็อตการผลิต เช่น LOT-20260529-1234"],
        ["เมนู",          "ชื่อเมนูที่ผลิต"],
        ["ปริมาณ",        "Yield ของล็อตนั้น พร้อมหน่วย"],
        ["สถานะ",         "ผ่าน / ไม่ผ่าน QC พร้อมสีแสดง"],
        ["วันที่ / เวลา", "วันและเวลาที่บันทึก (แสดงเป็น พ.ศ. ไทย)"],
        ["ผู้ผลิต / ผู้ทดสอบ", "ชื่อพนักงานที่รับผิดชอบ"],
        ["วัตถุดิบที่ใช้", "ล็อตวัตถุดิบแต่ละรายการ (สำหรับ Traceability)"],
        ["สาเหตุ",        "กรณีไม่ผ่าน/ของเสีย จะแสดงสาเหตุที่ระบุไว้"],
    ]
    dr_t = Table(detail_rows, colWidths=[4*cm, PAGE_W-4*cm-4*cm])
    dr_t.setStyle(TableStyle([
        ("FONTNAME",   (0,0),(-1,-1), "Thai"),
        ("FONTNAME",   (0,0),(0,-1),  "ThaiKrung"),
        ("FONTSIZE",   (0,0),(-1,-1), 10),
        ("TEXTCOLOR",  (0,0),(0,-1),  C_INK2),
        ("VALIGN",     (0,0),(-1,-1), "TOP"),
        ("TOPPADDING",    (0,0),(-1,-1), 6),
        ("BOTTOMPADDING", (0,0),(-1,-1), 6),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[colors.HexColor("#FAF7F2"), C_BG]),
        ("LINEBELOW",  (0,0),(-1,-2), 0.4, C_LINE),
        ("GRID",       (0,0),(-1,-1), 0.4, C_LINE),
    ]))
    e.append(dr_t)
    e.append(PageBreak())
    return e

# ── Chapter 8: FAQ ────────────────────────────────────────────────────────────
def ch8():
    e = []
    e.append(sp(10))
    e.append(Paragraph("บทที่ 8  คำถามที่พบบ่อย (FAQ)", sChTitle))
    e.append(hr(C_AMBER, 1.5))
    e.append(sp(6))

    faqs = [
        ("Q: ลืมรหัสผ่าน ทำอย่างไร?",
         "A: ติดต่อ Admin เพื่อ Reset รหัสผ่าน ระบบไม่มีฟีเจอร์ลืมรหัสผ่านด้วยตนเอง"),
        ("Q: กรอกล็อตวัตถุดิบผิด แก้ไขได้ไหม?",
         "A: ปัจจุบันระบบยังไม่มีฟีเจอร์แก้ไข สามารถลบรายการที่ผิดแล้วบันทึกใหม่ "
         "หรือแจ้ง Admin เพื่อแก้ไขในฐานข้อมูลโดยตรง"),
        ("Q: บันทึกล็อตย้อนหลังได้ไหม?",
         "A: ได้ — ใน Form บันทึกล็อตผลิต กดเลือก 'บันทึกย้อนหลัง' แล้วระบุวันและเวลา "
         "ที่ต้องการ (ไม่สามารถบันทึกล่วงหน้าได้)"),
        ("Q: เหตุใด BOM วัตถุดิบไม่ปรากฏ?",
         "A: Admin ยังไม่ได้ผูก BOM กับเมนูนี้ ติดต่อ Admin เพื่อกำหนด BOM ก่อน "
         "ระบบยังให้บันทึกล็อตต่อได้ แต่จะไม่มีข้อมูล Traceability"),
        ("Q: เห็นข้อมูลสาขาอื่นได้ไหม?",
         "A: ขึ้นอยู่กับ Role — Branch เห็นเฉพาะสาขาตัวเอง "
         "Area Manager เห็นเฉพาะสาขาในพื้นที่ของตน QC และ Admin เห็นทุกสาขา"),
        ("Q: ระบบรองรับมือถือไหม?",
         "A: รองรับ — ออกแบบ Responsive ใช้ได้ดีทั้งบนมือถือ แท็บเล็ต และคอมพิวเตอร์ "
         "แนะนำให้ใช้ Chrome เพื่อประสิทธิภาพสูงสุด"),
        ("Q: ข้อมูลบันทึกไปเก็บที่ไหน?",
         "A: ข้อมูลเก็บในฐานข้อมูล Supabase บน Cloud มีความปลอดภัยและสำรองข้อมูลอัตโนมัติ"),
        ("Q: แดชบอร์ดไม่แสดงข้อมูล ทำไม?",
         "A: ลองปรับช่วงวันที่ใหม่ หากยังไม่มีข้อมูล แสดงว่าไม่มีการบันทึกในช่วงเวลานั้น "
         "หรือตรวจสอบว่า Branch บันทึกข้อมูลแล้วหรือยัง"),
        ("Q: ลบข้อมูลแล้วกู้คืนได้ไหม?",
         "A: ไม่ได้ — การลบข้อมูลจะถาวร กรุณาตรวจสอบให้แน่ใจก่อนกดยืนยันลบ "
         "ในกรณีเร่งด่วนติดต่อ Admin เพื่อกู้คืนจาก Database Backup"),
    ]

    for q, a in faqs:
        q_s = ParagraphStyle("qs", fontName="ThaiKrung", fontSize=11,
                             textColor=C_TEA, leading=17, spaceBefore=10, spaceAfter=2)
        a_s = ParagraphStyle("as", fontName="Thai", fontSize=10,
                             textColor=C_INK2, leading=17, spaceAfter=6, leftIndent=14)
        e.append(Paragraph(q, q_s))
        e.append(Paragraph(a, a_s))

    e.append(sp(20))
    e.append(hr(C_AMBER, 1.5))
    e.append(sp(12))

    end_s = ParagraphStyle("end", fontName="ThaiKrung", fontSize=14,
                           textColor=C_INK, alignment=TA_CENTER, leading=22)
    e.append(Paragraph("ขอบคุณที่ใช้งาน BH Tea Production Log", end_s))

    end2 = ParagraphStyle("end2", fontName="Thai", fontSize=10,
                          textColor=C_INK3, alignment=TA_CENTER, leading=18)
    e.append(sp(6))
    e.append(Paragraph("หากพบปัญหาหรือต้องการความช่วยเหลือเพิ่มเติม กรุณาติดต่อ Admin ระบบ", end2))
    e.append(Paragraph("เวอร์ชัน 1.0  ·  พฤษภาคม 2569", end2))
    return e

# ── Build PDF ─────────────────────────────────────────────────────────────────
OUTPUT = "/Users/zesza/Desktop/BH Tea Production Log/BH_Tea_Manual.pdf"

def build():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=2*cm,
        rightMargin=2*cm,
        topMargin=1.8*cm,
        bottomMargin=1.6*cm,
        title="BH Tea Production Log — คู่มือการใช้งาน",
        author="BH Tea",
        subject="User Manual",
    )

    story = []
    story += cover()
    story += toc()
    story += ch1()
    story += ch2()
    story += ch3()
    story += ch3b()
    story += ch4()
    story += ch5()
    story += ch6()
    story += ch7()
    story += ch8()

    # First page has no header/footer (cover)
    doc.build(story,
              onFirstPage=on_first_page,
              onLaterPages=on_page)

    print(f"PDF saved: {OUTPUT}")

if __name__ == "__main__":
    build()

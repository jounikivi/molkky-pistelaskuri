from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "codex-handover-summary.txt"
TARGET = ROOT / "codex-handover-summary.pdf"


def escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def wrap_paragraph(text: str, width: int = 92):
    words = text.split()
    if not words:
        return [""]
    lines = []
    current = words[0]
    for word in words[1:]:
        if len(current) + 1 + len(word) <= width:
            current += " " + word
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def build_lines(text: str):
    lines = []
    for raw_line in text.splitlines():
        if not raw_line.strip():
            lines.append("")
            continue
        if raw_line.startswith("- ") or raw_line[:2].isdigit():
            lines.extend(wrap_paragraph(raw_line, 88))
        else:
            lines.extend(wrap_paragraph(raw_line, 92))
    return lines


def make_page_stream(lines, page_width=595, page_height=842):
    content = ["BT", "/F1 11 Tf", "14 TL", "50 800 Td"]
    first = True
    for line in lines:
        safe = escape_pdf_text(line)
        if first:
            content.append(f"({safe}) Tj")
            first = False
        else:
            content.append("T*")
            content.append(f"({safe}) Tj")
    content.append("ET")
    return "\n".join(content).encode("latin-1", errors="replace")


def paginate(lines, per_page=52):
    pages = []
    current = []
    for line in lines:
        current.append(line)
        if len(current) >= per_page:
            pages.append(current)
            current = []
    if current:
        pages.append(current)
    return pages


def build_pdf(page_streams):
    objects = []

    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")

    kids = " ".join(f"{3 + i * 2} 0 R" for i in range(len(page_streams)))
    objects.append(f"<< /Type /Pages /Kids [{kids}] /Count {len(page_streams)} >>".encode("latin-1"))

    font_obj_num = 3 + len(page_streams) * 2
    for i, stream in enumerate(page_streams):
        page_obj_num = 3 + i * 2
        content_obj_num = page_obj_num + 1
        page_obj = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 {font_obj_num} 0 R >> >> "
            f"/Contents {content_obj_num} 0 R >>"
        ).encode("latin-1")
        content_obj = b"<< /Length %d >>\nstream\n%s\nendstream" % (len(stream), stream)
        objects.append(page_obj)
        objects.append(content_obj)

    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for idx, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{idx} 0 obj\n".encode("latin-1"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_pos = len(pdf)
    pdf.extend(f"xref\n0 {len(objects)+1}\n".encode("latin-1"))
    pdf.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        pdf.extend(f"{off:010d} 00000 n \n".encode("latin-1"))
    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\n"
            f"startxref\n{xref_pos}\n%%EOF\n"
        ).encode("latin-1")
    )
    return pdf


def main():
    text = SOURCE.read_text(encoding="utf-8")
    lines = build_lines(text)
    pages = paginate(lines)
    streams = [make_page_stream(page) for page in pages]
    TARGET.write_bytes(build_pdf(streams))
    print(TARGET)


if __name__ == "__main__":
    main()

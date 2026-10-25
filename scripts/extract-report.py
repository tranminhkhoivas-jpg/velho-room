import sys
from pypdf import PdfReader

reader = PdfReader(sys.argv[1])
parts = []
length = 0
for number, page in enumerate(reader.pages):
    if number >= 60 or length >= 180000:
        break
    text = page.extract_text() or ""
    parts.append("[PDF page " + str(number + 1) + "]\n" + text)
    length += len(text)
sys.stdout.buffer.write("\n\n".join(parts).encode("utf-8"))

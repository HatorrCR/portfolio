from datetime import date, datetime
from pathlib import Path
import json
import re
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

CATALOG = Path("datos/como-se-juega.json")
FIRST_DAY = date(2026, 11, 27)
USED = {"bufer-de-salto", "salto-2d-guia", "dash-2d", "dash-2d-guia"}
SITE = "https://hatorrcr.github.io/portfolio/como-se-juega.html"
RAW = "https://raw.githubusercontent.com/HatorrCR/portfolio/main/"

# Each format uses a dark background and a light accent.
PALETTES = {
    "Guía": ("#142522", "#9CD7AB"),
    "Estudio": ("#182538", "#9AC6FF"),
    "Conferencia": ("#2C2038", "#D7AEF4"),
    "Artículo": ("#35281A", "#FFCB78"),
    "Código fuente": ("#102D33", "#83DDE4"),
    "Demo": ("#3A261E", "#FFAB80"),
    "Documentación": ("#272C35", "#C0CDDF"),
    "Vídeo": ("#35202A", "#FFAFC1"),
    "Entrevista": ("#372321", "#FFAC9D"),
}
DEFAULT_PALETTE = ("#142522", "#E9AD90")


def short(text, limit):
    if len(text) <= limit:
        return text
    return text[:limit - 1].rsplit(" ", 1)[0].rstrip(".,;:") + "…"


def choose(catalog, queue):
    used_ids = USED | {job["id"] for job in queue}
    used_titles = {job.get("titulo", "").casefold() for job in queue}
    last_used = {job.get("tema"): index for index, job in enumerate(queue)}
    eligible = [
        entry for entry in catalog
        if re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", entry.get("id", ""))
        and entry["id"] not in used_ids
        and entry.get("titulo", "").strip()
        and entry["titulo"].strip().casefold() not in used_titles
        and entry.get("resumen", "").strip()
    ]
    return min(eligible, key=lambda entry: last_used.get(entry.get("tema"), -1), default=None)


def artwork(path, title, topic, summary, content_format):
    from PIL import Image, ImageDraw, ImageFont

    background, accent = PALETTES.get(content_format, DEFAULT_PALETTE)
    image = Image.new("RGB", (1080, 1350), background)
    draw = ImageDraw.Draw(image)
    fonts = Path("/usr/share/fonts/truetype/dejavu")
    if not fonts.exists():
        fonts = Path("C:/Windows/Fonts")
    def font(size, serif=False):
        if fonts.name == "Fonts":
            name = "georgia.ttf" if serif else "arial.ttf"
        else:
            name = "DejaVuSerif.ttf" if serif else "DejaVuSans.ttf"
        return ImageFont.truetype(str(fonts / name), size)

    def wrap(text, face):
        lines = [""]
        for word in text.split():
            line = f"{lines[-1]} {word}".strip()
            if lines[-1] and draw.textlength(line, font=face) > 900:
                lines.append(word)
            else:
                lines[-1] = line
        return lines

    draw.text((88, 100), "CÓMO SE JUEGA", font=font(31), fill="#e2ece4")
    draw.line((88, 178, 992, 178), fill=accent, width=2)
    draw.text((88, 222), content_format.upper(), font=font(30), fill=accent)
    draw.text((88, 270), short(topic.upper(), 51), font=font(22), fill="#e2ece4")
    for size in (83, 72, 61, 50):
        title_font = font(size, serif=True)
        lines = wrap(title, title_font)
        if len(lines) <= 4:
            break
    y = 327
    for line in lines[:4]:
        draw.text((88, y), line, font=title_font, fill="#f8ede2")
        y += size + 17
    y += 75
    summary_font = font(36)
    for line in wrap(short(summary, 210), summary_font)[:5]:
        draw.text((88, y), line, font=summary_font, fill="#e2ece4")
        y += 54
    draw.line((88, 1155, 992, 1155), fill=accent, width=2)
    draw.text((88, 1203), "DISEÑO DE VIDEOJUEGOS EN ESPAÑOL", font=font(25), fill="#b4c9ba")
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)


def enqueue(queue, save, now=None):
    now = now or datetime.now(ZoneInfo("Europe/Oslo"))
    day = now.date()
    if day < FIRST_DAY or day.weekday() >= 5 or now.hour != 10:
        return
    if any(job.get("fecha") == day.isoformat() for job in queue):
        return
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    entry = choose(catalog, queue)
    if entry is None:
        print("No quedan fichas inéditas en el catálogo.")
        return

    slug = entry["id"]
    title = entry["titulo"].strip()
    summary = " ".join(entry["resumen"].split())
    topic = entry.get("tema") or "Diseño de videojuegos"
    path = Path("social/fichas") / f"{slug}.png"
    url = SITE + "?" + urlencode({"lectura": slug})
    content_format = (entry.get("formato") or "Ficha").strip() or "Ficha"
    artwork(path, title, topic, summary, content_format)
    # Allow room for X's shortened URL and conservative Unicode weighting.
    tweet = short(f"{title}\n\n{summary}", 220) + "\n" + url
    queue.append({
        "id": slug,
        "fecha": day.isoformat(),
        "titulo": title,
        "tema": topic,
        "instagram": {
            "estado": "pendiente",
            "texto": f"{title}\n\n{summary}\n\nEnlace en el perfil.",
            "imagenes": [RAW + path.as_posix()],
        },
        "x": {"estado": "pendiente", "texto": tweet},
    })
    save(queue, f"Preparar ficha de Cómo se juega: {slug}", path)

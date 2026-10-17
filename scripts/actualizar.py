#!/usr/bin/env python3
"""Actualiza el portfolio a partir de fichas públicas de DeVuego.
Las nuevas publicaciones impresas requieren autoría comprobada o aprobación explícita.
"""
import json, re, sys, unicodedata, hashlib, mimetypes
from collections import Counter
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse, parse_qs, unquote
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'datos'
DATA.mkdir(exist_ok=True)
BASE = 'https://www.devuego.es'
HEADERS = {'User-Agent': 'PortfolioCristian/1.0 (consulta publica semanal)'}
SESSION = requests.Session()
SESSION.headers.update(HEADERS)

def fetch(url):
    if urlparse(url).netloc not in {'www.devuego.es', 'devuego.es'}:
        raise ValueError('Dominio no permitido')
    r = SESSION.get(url, timeout=25)
    r.raise_for_status()
    return BeautifulSoup(r.text, 'html.parser')

def normalized(text):
    text = unicodedata.normalize('NFKD', text)
    return ''.join(c for c in text if not unicodedata.combining(c)).casefold()

def read(name, default):
    p = DATA / name
    return json.loads(p.read_text(encoding='utf8')) if p.exists() else default

def save(name, data):
    (DATA / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf8')

def unique(items):
    return list(dict.fromkeys(items))

def get_podcast():
    soup = fetch(BASE + '/podcast/')
    found = []
    for tr in soup.select('tr'):
        cells = tr.find_all(['td', 'th'], recursive=False)
        if len(cells) < 3:
            continue
        raw_date = cells[1].get_text(' ', strip=True)
        try:
            date = datetime.strptime(raw_date, '%d/%m/%Y').date().isoformat()
        except ValueError:
            continue
        title = cells[2].get_text(' ', strip=True)
        if date < '2026-03-01' or not re.search(r'\bentrevista\b|conociendo\s+a', normalized(title)):
            continue
        a = cells[2].find('a', href=True)
        link = urljoin(BASE, a['href']) if a else BASE + '/podcast/'
        if urlparse(link).netloc not in {'www.devuego.es','devuego.es'}:
            link = BASE + '/podcast/'
        found.append({'fecha': date, 'titulo': title, 'url': link})
    if not found:
        raise RuntimeError('La fuente del podcast no contiene entrevistas; no se modifica el archivo.')
    return found

def add_interviews():
    """Une fichas por URL canónica, conservando los datos editoriales."""
    old = read('entrevistas.json', [])
    found = get_podcast()

    def key(row):
        url = row.get('url', '').rstrip('/')
        match = re.search(r'/devuego-devcast/(\d+)', url)
        if match:
            return 'episode:' + match.group(1)
        # Respaldo para registros antiguos sin enlace individual.
        return 'date:' + row.get('fecha', '') + ':' + normalized(row.get('titulo', ''))

    def score(row):
        # Priorizar descripciones, clasificación y títulos editados manualmente.
        title = row.get('titulo', '')
        return (bool(row.get('descripcion', '').strip()),
                row.get('categoria', 'Profesionales') != 'Profesionales',
                not title.startswith('DeVCast'),
                bool(row.get('imagen')))

    indexed = {}
    for row in old:
        k = key(row)
        if k not in indexed:
            indexed[k] = dict(row)
        else:
            preferred, secondary = sorted((indexed[k], row), key=score, reverse=True)
            merged = dict(secondary)
            merged.update(preferred)
            if not merged.get('descripcion'):
                merged['descripcion'] = secondary.get('descripcion', '')
            if not merged.get('imagen'):
                merged['imagen'] = secondary.get('imagen', '')
            indexed[k] = merged

    for item in found:
        k = key(item)
        if k in indexed:
            if '/devuego-devcast/' in item['url']:
                indexed[k]['url'] = item['url']
        else:
            indexed[k] = {**item, 'categoria': 'Profesionales', 'descripcion': ''}

    rows = sorted(indexed.values(), key=lambda x: (x['fecha'], x['titulo']), reverse=True)
    save('entrevistas.json', rows)
    return len(found)

def discover_print():
    # Catálogo de libros y página editorial de DeVuego. Los resultados nuevos
    # no se atribuyen automáticamente sin verificar la colaboración.
    candidates = []
    for listing, pattern, kind in [
        (BASE + '/anuario/', r'/codice/flibro/anuario-devuego-\d{4}', 'anuario'),
        (BASE + '/pres/medio/devuego', r'/pres/revista/devuego/\d+', 'revista'),
    ]:
        try:
            soup = fetch(listing)
        except requests.RequestException as exc:
            print('Aviso: fuente no disponible:', listing, exc, file=sys.stderr)
            continue
        for a in soup.select('a[href]'):
            url = urljoin(BASE, a['href']).split('#')[0]
            if re.search(pattern, url):
                candidates.append({'tipo': kind, 'url': url})
    # También comprobar directamente los números/años siguientes conocidos,
    # sin inventar que estén publicados: solo 200 OK y ficha válida.
    for year in range(2026, datetime.now().year + 1):
        candidates.append({'tipo':'anuario','url':f'{BASE}/codice/flibro/anuario-devuego-{year}'})
    for issue in range(2, max(3, datetime.now().year - 2025 + 2)):
        candidates.append({'tipo':'revista','url':f'{BASE}/pres/revista/devuego/{issue}'})
    existing = {x['url'] for x in read('publicaciones.json', [])}
    pending = []
    for c in {x['url']: x for x in candidates}.values():
        if c['url'] in existing:
            continue
        try:
            soup = fetch(c['url'])
        except requests.RequestException:
            continue
        heading = soup.find('h1') or soup.find('h2')
        title = heading.get_text(' ', strip=True) if heading else c['url'].rsplit('/', 1)[-1]
        body = soup.get_text(' ', strip=True)
        if c['tipo'] == 'anuario' and 'anuario devuego' not in normalized(body):
            continue
        if c['tipo'] == 'revista' and 'revista' not in normalized(body):
            continue
        # Aun apareciendo Cristian Rodríguez en una ficha, requiere revisión
        # para evitar atribuciones incorrectas por nombres homónimos.
        pending.append({**c, 'titulo': title, 'posible_credito': 'cristian rodriguez' in normalized(body)})
    save('pendientes_revision.json', sorted(pending, key=lambda x: x['url']))
    return len(pending)

# Imágenes de episodios: primero plataformas de audio enlazadas desde DeVuego.
# Se descargan a /imagenes/devcast para que GitHub Pages no dependa de URLs externas.
AUDIO_HOSTS = ('ivoox.com', 'spotify.com', 'open.spotify.com')
IMAGE_HOSTS = ('ivoox.com', 'spotify.com', 'scdn.co', 'spotifycdn.com',
               'devuego.es', 'googleusercontent.com', 'google.com')
IMAGE_DIR = ROOT / 'imagenes' / 'devcast'

def allowed_host(host, domains):
    host = (host or '').lower().strip('.')
    return any(host == d or host.endswith('.' + d) for d in domains)

def meta_image(soup, base_url):
    for attrs in ({'property':'og:image'}, {'name':'twitter:image'}, {'name':'twitter:image:src'}):
        tag = soup.find('meta', attrs=attrs)
        if tag and tag.get('content'):
            return urljoin(base_url, tag['content'])
    return None

def platform_links(soup, base_url):
    """Incluye reproductores iframe y enlaces normales de plataformas."""
    links = []
    for element in soup.select('a[href], iframe[src], iframe[data-src]'):
        raw = element.get('href') or element.get('src') or element.get('data-src')
        if not raw:
            continue
        url = urljoin(base_url, raw)
        parsed = urlparse(url)
        if parsed.scheme == 'https' and allowed_host(parsed.hostname, AUDIO_HOSTS):
            links.append(url)
    return list(dict.fromkeys(links))


def platform_images(soup, base_url):
    """Metadatos de portada y miniaturas expuestas por reproductores."""
    images = []
    meta = meta_image(soup, base_url)
    if meta:
        images.append(meta)
    for tag in soup.select('meta[itemprop="thumbnailUrl"], meta[itemprop="image"], link[rel="image_src"]'):
        raw = tag.get('content') or tag.get('href')
        if raw:
            images.append(urljoin(base_url, raw))
    for script in soup.select('script[type="application/ld+json"]'):
        try:
            obj = json.loads(script.string or script.get_text())
        except (ValueError, TypeError):
            continue
        def walk(value):
            if isinstance(value, dict):
                for key, child in value.items():
                    if key in ('thumbnailUrl', 'image'):
                        if isinstance(child, str): images.append(urljoin(base_url, child))
                        elif isinstance(child, dict) and isinstance(child.get('url'), str):
                            images.append(urljoin(base_url, child['url']))
                    if isinstance(child, (dict, list)): walk(child)
            elif isinstance(value, list):
                for child in value: walk(child)
        walk(obj)
    return list(dict.fromkeys(images))

def image_bytes(url):
    parsed = urlparse(url)
    if parsed.scheme != 'https' or not allowed_host(parsed.hostname, IMAGE_HOSTS):
        return None
    try:
        response = SESSION.get(url, timeout=18, stream=True, allow_redirects=True)
        response.raise_for_status()
        final = urlparse(response.url)
        if final.scheme != 'https' or not allowed_host(final.hostname, IMAGE_HOSTS):
            return None
        content_type = response.headers.get('content-type', '').split(';')[0].lower()
        if content_type not in ('image/jpeg','image/png','image/webp'):
            return None
        data = bytearray()
        for chunk in response.iter_content(65536):
            data.extend(chunk)
            if len(data) > 4_000_000:
                return None
        raw = bytes(data)
        valid = (content_type == 'image/jpeg' and raw.startswith(b'\xff\xd8\xff')) or (content_type == 'image/png' and raw.startswith(b'\x89PNG\r\n\x1a\n')) or (content_type == 'image/webp' and raw[:4] == b'RIFF' and raw[8:12] == b'WEBP')
        if not valid or len(raw) < 2000:
            return None
        return raw, {'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[content_type]
    except requests.RequestException:
        return None

def episode_id(row):
    match = re.search(r'/devuego-devcast/(\d+)', row.get('url',''))
    return match.group(1) if match else hashlib.sha256(row['url'].encode()).hexdigest()[:12]

def update_episode_images():
    rows = read('entrevistas.json', [])
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    candidates = {}
    stats = Counter()
    for row in rows:
        if row.get('imagen') and (ROOT / row['imagen']).is_file():
            stats['existentes'] += 1
            continue
        episode_url = row.get('url', '')
        if not allowed_host(urlparse(episode_url).hostname, ('devuego.es',)):
            continue
        try:
            page = fetch(episode_url)
        except (requests.RequestException, ValueError) as exc:
            print('Imagen:', row['titulo'], '- ficha inaccesible:', str(exc)[:90]); continue
        links = platform_links(page, episode_url)
        print('Imagen:', row['titulo'], '- reproductores/enlaces:', len(links))
        if not links:
            stats['sin_enlaces'] += 1
        sources = []
        for link in links:
            try:
                resp = SESSION.get(link, timeout=18)
                resp.raise_for_status()
                if not allowed_host(urlparse(resp.url).hostname, AUDIO_HOSTS):
                    print('  Plataforma redirige fuera de dominios admitidos:', urlparse(resp.url).hostname)
                    continue
                art = platform_images(BeautifulSoup(resp.text, 'html.parser'), resp.url)
                print('  Plataforma:', urlparse(resp.url).hostname, '- imágenes candidatas:', len(art))
                sources.extend((img, 'plataforma') for img in art)
            except requests.RequestException as exc:
                print('  Plataforma inaccesible:', type(exc).__name__)
        devuego_art = meta_image(page, episode_url)
        if devuego_art:
            sources.append((devuego_art, 'devuego'))
        for image_url, origin in list(dict.fromkeys(sources)):
            result = image_bytes(image_url)
            if result:
                raw, extension = result
                candidates[episode_id(row)] = (raw, extension, origin)
                stats['descargadas'] += 1
                break
        else:
            stats['sin_imagen_valida'] += 1
    counts = Counter(hashlib.sha256(v[0]).hexdigest() for v in candidates.values())
    accepted = 0
    for row in rows:
        key = episode_id(row)
        if key not in candidates:
            continue
        raw, ext, origin = candidates[key]
        if counts[hashlib.sha256(raw).hexdigest()] > 1:
            stats['repetidas'] += 1
            continue
        if origin != 'plataforma':
            stats['solo_devuego'] += 1
            continue
        path = IMAGE_DIR / (key + ext)
        path.write_bytes(raw)
        row['imagen'] = 'imagenes/devcast/' + path.name
        accepted += 1
    save('entrevistas.json', rows)
    print('Diagnóstico miniaturas:', dict(stats))
    print('Miniaturas individuales nuevas:', accepted)
    return accepted

def render_interviews():
    soup = BeautifulSoup((ROOT/'entrevistas.html').read_text(encoding='utf8'), 'html.parser')
    grid = soup.select_one('.interview-grid')
    if not grid: raise RuntimeError('No se encontró el contenedor de entrevistas')
    grid.clear()
    rows = read('entrevistas.json', [])
    artwork = {'Estudios': ('◈','ESTUDIO / DESARROLLO'), 'Academia': ('⌘','ACADEMIA / GAME STUDIES'), 'Medios': ('▤','MEDIOS / PERIODISMO'), 'Profesionales': ('✦','PROFESIONALES'), 'Personas': ('◎','CONOCIENDO A...')}
    for x in rows:
        category = x.get('categoria', 'Profesionales')
        card = soup.new_tag('article', attrs={'class':'interview-card','data-category':category})
        art = soup.new_tag('div', attrs={'class':'interview-art','data-kind':category})
        image = x.get('imagen')
        if image:
            img = soup.new_tag('img', attrs={'src':image,'alt':'Imagen del episodio '+x['titulo'],'loading':'lazy'})
            art.append(img)
        else:
            glyph, caption = artwork.get(category, ('✦', category.upper()))
            mark = soup.new_tag('span',attrs={'class':'interview-glyph','aria-hidden':'true'});mark.string=glyph;art.append(mark)
            line = soup.new_tag('span',attrs={'class':'interview-art-label'});line.string=caption;art.append(line)
        card.append(art)
        body=soup.new_tag('div',attrs={'class':'interview-card-body'})
        top=soup.new_tag('div', attrs={'class':'interview-top'})
        for label in (category.upper(), datetime.fromisoformat(x['fecha']).strftime('%d/%m/%Y')):
            span=soup.new_tag('span');span.string=label;top.append(span)
        body.append(top)
        h=soup.new_tag('h3');h.string=x['titulo'];body.append(h)
        if x.get('descripcion'):
            desc=soup.new_tag('p');desc.string=x['descripcion'];body.append(desc)
        a=soup.new_tag('a', attrs={'class':'pub-link','href':x['url'],'target':'_blank','rel':'noopener noreferrer'})
        a.string='Ver entrevista / charla ↗' if x['url'] != BASE+'/podcast/' else 'Ver archivo de DeVCast ↗'
        body.append(a);card.append(body);grid.append(card)
    title = soup.select_one('.interview-intro h2')
    if title:title.string=f'{len(rows)} entrevistas/charlas publicadas'
    for b in soup.select('.interview-filters button'):
        if b.get('data-filter')=='Todas':b.string=f'Todas ({len(rows)})'
    (ROOT/'entrevistas.html').write_text(str(soup), encoding='utf8')
    # Mantener la cifra de la página principal sincronizada con los datos.
    homepage = ROOT/'index.html'
    main = BeautifulSoup(homepage.read_text(encoding='utf8'), 'html.parser')
    counter = main.select_one('[data-interview-count]')
    if counter:counter.string=f'{len(rows)} entrevistas/charlas publicadas'
    homepage.write_text(str(main), encoding='utf8')

def render_print():
    pubs=read('publicaciones.json', [])
    for filename, kind in [('anuarios.html','anuario'),('revistas.html','revista')]:
        soup=BeautifulSoup((ROOT/filename).read_text(encoding='utf8'), 'html.parser')
        grid=soup.select_one('.editorial-grid')
        if not grid:raise RuntimeError('No se encontró la cuadrícula de publicaciones')
        grid.clear()
        for x in [v for v in pubs if v['tipo']==kind]:
            card=soup.new_tag('article',attrs={'class':'mini'})
            if x.get('imagen'):
                im=soup.new_tag('img',attrs={'class':'cover','src':x['imagen'],'alt':'Portada de '+x['titulo'],'loading':'lazy'})
                card.append(im)
            meta=soup.new_tag('div',attrs={'class':'meta'});meta.string=x.get('etiqueta',x['titulo']);card.append(meta)
            h=soup.new_tag('h3');h.string=x['titulo'];card.append(h)
            p=soup.new_tag('p');p.string=x['descripcion'];card.append(p)
            a=soup.new_tag('a',attrs={'class':'pub-link','href':x['url'],'target':'_blank','rel':'noopener noreferrer'});a.string='Ver ficha oficial ↗';card.append(a)
            grid.append(card)
        (ROOT/filename).write_text(str(soup),encoding='utf8')

if __name__ == '__main__':
    errors=[]
    try:
        print('Entrevistas encontradas en la fuente:', add_interviews())
        update_episode_images()
        render_interviews()
    except Exception as exc:
        errors.append('Entrevistas: '+str(exc))
    try:
        print('Nuevas publicaciones pendientes de revisión:', discover_print())
    except Exception as exc:
        errors.append('Publicaciones: '+str(exc))
    render_print()
    for err in errors:print('ERROR',err,file=sys.stderr)
    if errors:sys.exit(1)

#!/usr/bin/env python3
"""Actualiza el portfolio a partir de fichas públicas de DeVuego.
Las nuevas publicaciones impresas requieren autoría comprobada o aprobación explícita.
"""
import json, re, sys, unicodedata
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse
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
    old = read('entrevistas.json', [])
    found = get_podcast()
    indexed = {normalized(x['titulo']): x for x in old}
    for item in found:
        key = normalized(item['titulo'])
        if key in indexed:
            if item['url'] != BASE + '/podcast/':
                indexed[key]['url'] = item['url']
        else:
            indexed[key] = {**item, 'categoria': 'Profesionales', 'descripcion': ''}
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
    existing = {x['url'].rstrip('/') for x in read('publicaciones.json', [])}
    pending = []
    for c in {x['url']: x for x in candidates}.values():
        c['url'] = c['url'].rstrip('/')
        if c['tipo'] == 'anuario':
            match = re.search(r'/anuario-devuego-(\d{4})$', c['url'])
            if not match or int(match.group(1)) < 2026:
                continue
        if c['url'] in existing:
            continue
        try:
            soup = fetch(c['url'])
        except requests.RequestException:
            continue
        heading = soup.find('h1') or soup.find('h2')
        title = heading.get_text(' ', strip=True) if heading else ''
        if c['tipo'] == 'anuario':
            match = re.search(r'anuario-devuego-(\d{4})$', c['url'])
            if match:
                title = 'Anuario DeVuego ' + match.group(1)
        elif not title or normalized(title) == 'devuego':
            issue = re.search(r'/devuego/(\d+)$', c['url'])
            title = 'Revista DeVuego Nº ' + issue.group(1) if issue else 'Revista DeVuego'
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

def render_interviews():
    soup = BeautifulSoup((ROOT/'entrevistas.html').read_text(encoding='utf8'), 'html.parser')
    grid = soup.select_one('.interview-grid')
    if not grid: raise RuntimeError('No se encontró el contenedor de entrevistas')
    grid.clear()
    rows = read('entrevistas.json', [])
    for x in rows:
        card = soup.new_tag('article', attrs={'class':'interview-card','data-category':x.get('categoria','Profesionales')})
        top = soup.new_tag('div', attrs={'class':'interview-top'})
        for label in (x.get('categoria','Profesionales').upper(), datetime.fromisoformat(x['fecha']).strftime('%d/%m/%Y')):
            span=soup.new_tag('span');span.string=label;top.append(span)
        card.append(top)
        h=soup.new_tag('h3');h.string=x['titulo'];card.append(h)
        if x.get('descripcion'):
            p=soup.new_tag('p');p.string=x['descripcion'];card.append(p)
        a=soup.new_tag('a', attrs={'class':'pub-link','href':x['url'],'target':'_blank','rel':'noopener noreferrer'})
        a.string='Ver episodio ↗' if x['url'] != BASE+'/podcast/' else 'Ver archivo de DeVCast ↗'
        card.append(a);grid.append(card)
    title = soup.select_one('.interview-intro h2')
    if title:title.string=f'{len(rows)} conversaciones publicadas'
    meta=soup.select_one('.interview-intro .meta')
    if meta:meta.string='DEVCast · Desde marzo de 2026 · Actualización automática'
    note=soup.select_one('.interview-intro .note')
    if note:note.string='Datos del catálogo público de DeVCast. Actualización automática semanal.'
    for b in soup.select('.interview-filters button'):
        if b.get('data-filter')=='Todas':b.string=f'Todas ({len(rows)})'
    (ROOT/'entrevistas.html').write_text(str(soup), encoding='utf8')

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

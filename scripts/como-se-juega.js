'use strict';

const search = document.querySelector('#buscar');
const topic = document.querySelector('#tema');
const format = document.querySelector('#formato');
const results = document.querySelector('#resultados');
const status = document.querySelector('#estado');
const reading = document.querySelector('#lectura');
const areas = document.querySelector('#areas');
const params = new URLSearchParams(location.search);
const languages = { es: 'Español', en: 'Inglés' };
const selected = params.get('papers');
const language = Object.hasOwn(languages, selected) ? selected : '';
const isPapers = selected === 'todos' || Boolean(language);
const isInterviews = !isPapers && params.get('seccion') === 'entrevistas';
const currentTopic = params.get('tema') ?? '';
const collection = !isPapers && !isInterviews && currentTopic === 'Mecánicas' ? params.get('coleccion') : null;
const sourceSections = {
  conferencias: ['Conferencias', ['Charla', 'Conferencia']],
  articulos: ['Artículos', ['Artículo']],
  documentacion: ['Documentación técnica', ['Documentación']],
  codigo: ['Código fuente', ['Código fuente']],
  demos: ['Demos', ['Demo']],
  guias: ['Guías', ['Guía']],
  videos: ['Vídeos', ['Vídeo']]
};
const sectionKey = params.get('seccion');
const sourceSection = !isPapers && Object.hasOwn(sourceSections, sectionKey) ? sourceSections[sectionKey] : null;
const disciplines = {
  sistemas: ['Diseño de sistemas', {
    'Mecánicas': 'Reglas, acciones y estados del jugador.',
    'Dinámicas': 'Comportamientos y estrategias que surgen al interactuar las reglas.',
    'Jugabilidad y bucles': 'Secuencias de acciones y objetivos que estructuran una partida.',
    'Sistemas y economías': 'Recursos, recompensas y progresión.',
    'Dificultad y equilibrio': 'Reto, opciones viables y ajuste de parámetros.'
  }],
  niveles: ['Diseño de niveles', {
    'Espacios y recorridos': 'Geometría, orientación, rutas y ritmo espacial.',
    'Encuentros y puzles': 'Obstáculos, situaciones y retos colocados en un espacio.'
  }],
  narrativa: ['Diseño narrativo', {
    'Diseño narrativo': 'Historia interactiva, personajes, mundo y decisiones narrativas.',
    'Localización': 'Adaptación de diálogos, voz y elementos narrativos al público.'
  }],
  interfaz: ['Interfaz y experiencia de usuario', {
    'Interfaz e interacción': 'HUD, menús, controles y navegación.',
    'Respuesta y legibilidad': 'Señales visuales o sonoras que comunican lo que ocurre.',
    'Tutoriales y aprendizaje': 'Incorporación del jugador y enseñanza de reglas.',
    'Experiencia de usuario y accesibilidad': 'Barreras de acceso, usabilidad y ajustes.'
  }]
};
const areaKey = params.get('diseno');
const discipline = Object.hasOwn(disciplines, areaKey) ? disciplines[areaKey] : null;
const designCategory = params.get('categoria') ?? '';
const categoriesById = {
  'mda-hunicke-leblanc-zubek': 'Dinámicas',
  'juiciness-kao': 'Respuesta y legibilidad',
  'idiomas-esports-postigo': ''
};
function designTopic(entry) {
  return categoriesById[entry.id] ?? (entry.tema === 'Diseño de niveles' ? 'Espacios y recorridos' : entry.tema);
}
const librarySection = sectionKey === 'biblioteca' || location.hash === '#catalogo';
const isEditorial = entry => entry.editorial === true;
const isHome = !params.has('lectura') && !sectionKey && !discipline && !isPapers && !currentTopic && !librarySection;
const libraryQuery = values => new URLSearchParams({
  ...(isPapers ? {papers: selected} : {}),
  ...(isInterviews ? {seccion: 'entrevistas'} : {}),
  ...(collection ? {coleccion: collection} : {}),
  ...(sourceSection ? {seccion: sectionKey} : {}),
  ...(discipline ? {diseno: areaKey, ...(designCategory ? {categoria: designCategory} : {})} : {}),
  ...(currentTopic ? {tema: currentTopic} : {}),
  ...values
});
const libraryUrl = 'como-se-juega.html?' + libraryQuery({...(discipline || currentTopic || isPapers || sourceSection || isInterviews ? {} : {seccion: 'biblioteca'})}) + '#catalogo';
const studyAreas = [
  'Mecánicas',
  'Diseño de niveles',
  'Sistemas y economías',
  'Tutoriales y aprendizaje',
  'Dificultad y equilibrio',
  'Diseño narrativo',
  'Experiencia de usuario y accesibilidad',
  'Prototipado y pruebas'
];
const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const slug = value => normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const archiveUrl = name => 'como-se-juega.html?' + new URLSearchParams({tema: 'Mecánicas', coleccion: slug(name)});
const isArchive = entry => entry.tema === 'Mecánicas' && isEditorial(entry) && entry.subtema;

function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function link(text, href) {
  const node = element('a', text);
  node.href = href;
  return node;
}

function fillOptions(select, values) {
  for (const value of [...new Set(values)].sort((a, b) => a.localeCompare(b, 'es'))) {
    const option = element('option', value);
    option.value = value;
    select.append(option);
  }
}

function showFeatured(entries) {
  const resource = entries.find(entry => entry.formato === 'Guía') ?? entries[0];
  if (!resource) return;
  document.querySelector('#destacado-meta').textContent = resource.formato + ' · ' + resource.tema;
  document.querySelector('#destacado-titulo').textContent = resource.titulo;
  document.querySelector('#destacado-resumen').textContent = resource.resumen;
  document.querySelector('#destacado-enlace').href = '?lectura=' + encodeURIComponent(resource.id);
  const hasDiagram = resource.id === 'tutoriales-laberinto';
  document.querySelector('#esquema-tutorial').hidden = !hasDiagram;
  document.querySelector('#destacado').classList.toggle('con-esquema', hasDiagram);
  document.querySelector('#destacado').hidden = false;
}

function showSources(resource) {
  const sources = [...(resource.materiales ?? [])];
  if (resource.fuente) sources.unshift({nombre: 'Publicación original', url: resource.fuente});
  const links = sources.filter(source => /^https:\/\//i.test(source.url ?? ''));
  if (!resource.referencia && !links.length) return;
  const section = element('section', '', 'referencias');
  const heading = element('h2', 'Referencias y materiales');
  section.append(heading);
  if (resource.referencia) section.append(element('p', resource.referencia));
  if (links.length) {
    const list = element('ul', '');
    for (const source of links) {
      const item = element('li', '');
      item.append(link(source.nombre, source.url));
      list.append(item);
    }
    section.append(list);
  }
  reading.append(section);
  return {section, heading};
}

function addPlayableJump(lab, controls) {
  const canvas = lab.querySelector('[data-juego-salto]');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const status = lab.querySelector('[data-estado-juego]');
  const coyote = lab.querySelector('[data-ayuda="coyote"]');
  const buffer = lab.querySelector('[data-ayuda="buffer"]');
  const held = new Map();
  const platformAt = x => x <= 3 || x >= 6;
  const isHeld = action => [...held.values()].includes(action);
  const step = 1 / 120;
  let x, y, vx, vy, grounded, grace, queued, shortHop, won;
  let last = 0;
  let elapsed = 0;

  function paint() {
    const px = value => 25 + value * 62;
    const py = value => 205 - value * 46;
    ctx.fillStyle = '#fff6e6';
    ctx.fillRect(0, 0, 680, 252);
    ctx.fillStyle = '#dec9ad';
    for (let line = 1; line <= 3; line++) ctx.fillRect(25, py(line), 620, 1);
    ctx.fillStyle = '#254f52';
    ctx.fillRect(px(0), py(0), 186, 47);
    ctx.fillRect(px(6), py(0), 248, 47);
    ctx.fillStyle = '#40382e';
    ctx.font = '15px system-ui';
    ctx.fillText('Hueco de 3 unidades', px(3) + 25, 230);
    ctx.fillRect(px(9.3), py(0) - 49, 3, 49);
    ctx.fillStyle = won ? '#254f52' : '#a64328';
    ctx.fillRect(px(9.3) + 3, py(0) - 49, 24, 15);
    ctx.fillRect(px(x) - 10, py(y) - 22, 20, 20);
    ctx.fillStyle = '#fff6e6';
    ctx.fillRect(px(x) + (vx < 0 ? -5 : 2), py(y) - 17, 4, 4);
  }

  function reset(message) {
    x = 1.2;
    y = vx = vy = grace = 0;
    queued = -1;
    grounded = true;
    shortHop = won = false;
    status.textContent = message;
    paint();
  }

  function press(key, action) {
    if (held.has(key)) return;
    if (action === 'reiniciar') {
      held.clear();
      reset('Otra vez desde el inicio.');
      return;
    }
    if (action === 'salto' && !isHeld('salto')) queued = buffer.checked ? 0.1 : 0;
    held.set(key, action);
  }

  const keys = {ArrowLeft:'izquierda', KeyA:'izquierda', ArrowRight:'derecha', KeyD:'derecha', Space:'salto', KeyR:'reiniciar'};
  canvas.addEventListener('keydown', event => {
    const action = keys[event.code];
    if (!action) return;
    event.preventDefault();
    if (!event.repeat) press(event.code, action);
  });
  canvas.addEventListener('keyup', event => held.delete(event.code));
  canvas.addEventListener('blur', () => held.clear());
  window.addEventListener('blur', () => held.clear());

  function update() {
    const height = Number(controls.altura.value);
    const rise = Number(controls.subida.value);
    const fallGravity = Number(controls.caida.value);
    const gravity = 2 * height / (rise * rise);
    const launch = gravity * rise;
    vx = 6 * (Number(isHeld('derecha')) - Number(isHeld('izquierda')));
    x = Math.max(0.15, Math.min(9.8, x + vx * step));
    if (grounded && !platformAt(x)) {
      grounded = false;
      grace = 0.1;
    }
    if (queued >= 0 && (grounded || (coyote.checked && grace > 0))) {
      vy = launch;
      grounded = false;
      shortHop = false;
      queued = -1;
      grace = 0;
    }
    if (!grounded) {
      if (vy > 0 && !shortHop && !isHeld('salto')) {
        vy = Math.min(vy, launch * 0.45);
        shortHop = true;
      }
      const oldY = y;
      y += vy * step;
      vy -= gravity * (vy > 0 ? 1 : fallGravity) * step;
      if (vy <= 0 && oldY >= 0 && y <= 0 && platformAt(x)) {
        grounded = true;
        y = vy = grace = 0;
      }
    }
    if (queued >= 0) queued -= step;
    grace = Math.max(0, grace - step);
    if (y < -3) reset('Al foso. Prueba a despegar más cerca del borde o dale un poco más de tiempo al salto.');
    if (!won && grounded && x >= 9.3) {
      won = true;
      status.textContent = 'Bandera conseguida. Dale más gravedad a la caída y prueba otra vez desde el mismo sitio.';
    }
  }

  function frame(now) {
    elapsed += last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    while (elapsed >= step) {
      update();
      elapsed -= step;
    }
    paint();
    requestAnimationFrame(frame);
  }
  reset('Acércate al borde y prueba el primer salto.');
  requestAnimationFrame(frame);
}

function addJumpLab() {
  const lab = document.querySelector('#plantilla-laboratorio-salto').content.firstElementChild.cloneNode(true);
  reading.append(lab);
  const canvas = lab.querySelector('[data-grafico-salto]');
  const ctx = canvas.getContext('2d');
  const controls = Object.fromEntries([...lab.querySelectorAll('[data-salto]')].map(input => [input.dataset.salto, input]));
  const number = new Intl.NumberFormat('es', {maximumFractionDigits: 2});
  const display = value => number.format(value);

  function draw() {
    const {altura, subida, caida, progreso} = controls;
    const height = Number(altura.value);
    const rise = Number(subida.value);
    const gravityMultiplier = Number(caida.value);
    const fall = rise / Math.sqrt(gravityMultiplier);
    const duration = rise + fall;
    const gravity = 2 * height / (rise * rise);
    const launch = gravity * rise;
    const position = time => time <= rise
      ? launch * time - gravity * time * time / 2
      : height - gravity * gravityMultiplier * (time - rise) ** 2 / 2;
    const current = duration * Number(progreso.value) / 100;
    const measures = 'Altura: ' + display(height) + ' u · Subida: ' + display(rise) +
      ' s · Gravedad de caída: ×' + display(gravityMultiplier) + ' · Vuelo: ' +
      display(duration) + ' s · Alcance: ' + display(6 * duration) + ' u';
    lab.querySelector('[data-salto-medidas]').textContent = measures;
    canvas.setAttribute('aria-label', measures);
    for (const [input, value] of [[altura, height + ' unidades'], [subida, rise + ' segundos'],
      [caida, gravityMultiplier + ' veces la gravedad de subida'],
      [progreso, display(current) + ' segundos, altura ' + display(Math.max(0, position(current))) + ' unidades']]) {
      input.setAttribute('aria-valuetext', value);
    }
    if (!ctx) return;

    const x = time => 40 + time * 440;
    const y = units => 203 - units * 54;
    ctx.clearRect(0, 0, 680, 250);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#d8c8b6';
    ctx.font = '15px system-ui';
    ctx.fillStyle = '#40382e';
    for (let level = 0; level <= 3; level++) {
      ctx.beginPath();
      ctx.moveTo(40, y(level));
      ctx.lineTo(630, y(level));
      ctx.stroke();
      ctx.fillText(level + ' u', 8, y(level) + 5);
    }
    ctx.beginPath();
    for (let step = 0; step <= 80; step++) {
      const time = duration * step / 80;
      if (step === 0) ctx.moveTo(x(time), y(0));
      else ctx.lineTo(x(time), y(position(time)));
    }
    ctx.strokeStyle = '#8a3721';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillText('Salida', x(0), 231);
    ctx.fillText('Llegada', x(duration) - 24, 231);
    ctx.fillText('Punto más alto', x(rise) + 8, y(height) - 8);
    ctx.beginPath();
    ctx.arc(x(current), y(position(current)), 7, 0, Math.PI * 2);
    ctx.fillStyle = '#254f52';
    ctx.fill();
  }
  lab.addEventListener('input', draw);
  draw();
  return controls;
}

function showReading(entries, archive) {
  const id = params.get('lectura') ?? archive?.id;
  if (!id) {
    if (!document.querySelector('.portada').hidden) showFeatured(entries);
    return;
  }
  const resource = entries.find(entry => entry.id === id);
  const title = element('h1', resource?.titulo ?? 'Recurso no encontrado');
  title.id = 'titulo-lectura';
  const archiveReading = resource && isArchive(resource);
  const archiveIndex = archiveReading ? element('nav', '', 'referencias') : null;
  const index = archiveReading ? element('ol', '') : null;
  if (archiveIndex) {
    archiveIndex.setAttribute('aria-label', 'Índice de la mecánica');
    archiveIndex.append(element('h2', 'Índice'), index);
  }
  const addToIndex = (heading, id) => {
    heading.id = id;
    if (!index) return;
    const item = element('li', '');
    item.append(link(heading.textContent, '#' + id));
    index.append(item);
  };
  reading.append(link(archiveReading ? 'Volver a Mecánicas' : 'Volver a la biblioteca',
    archiveReading ? 'como-se-juega.html?tema=Mec%C3%A1nicas#catalogo' : libraryUrl), title);
  if (archiveIndex) reading.append(archiveIndex);
  if (resource) {
    const visualJump = id === 'salto-2d-guia';
    document.title = resource.titulo + ' · Cómo se juega';
    reading.append(element('p', resource.formato + ' · ' + resource.tema, 'meta'));
    const jumpControls = visualJump ? addJumpLab() : null;
    for (const [blockIndex, block] of resource.cuerpo.split(/^\x60\x60\x60(?:csharp)?[ \t]*\r?$/m).entries()) {
      if (blockIndex % 2 === 1) {
        const pre = element('pre', '', 'codigo');
        pre.tabIndex = 0;
        pre.setAttribute('aria-label', 'Código C#');
        pre.append(element('code', block.trim()));
        if (visualJump) {
          const details = element('details', '', 'detalle-codigo');
          details.append(element('summary', 'Ver código C#'), pre);
          reading.append(details);
        } else {
          reading.append(pre);
        }
      } else {
        for (const paragraph of block.trim().split(/\r?\n\s*\r?\n/).filter(Boolean)) {
          const heading = paragraph.match(/^## ([^\r\n]+)$/);
          const content = heading ? element('h2', heading[1]) : element('p', paragraph);
          if (heading && index) addToIndex(content, 'apartado-' + (index.children.length + 1) + '-' + slug(heading[1]));
          reading.append(content);
          if (jumpControls && heading?.[1] === 'Ponte al mando') {
            const game = document.querySelector('#plantilla-juego-salto').content.firstElementChild.cloneNode(true);
            reading.append(game);
            addPlayableJump(game, jumpControls);
          }
          if (visualJump && heading?.[1] === '¿Pulsé demasiado pronto o demasiado tarde?') {
            reading.append(document.querySelector('#plantilla-margen-salto').content.cloneNode(true));
          }
        }
      }
    }
    const references = showSources(resource);
    if (references && index) addToIndex(references.heading, 'referencias');
    if (resource.subtema) {
      const related = entries.filter(entry => entry.tema === resource.tema &&
        entry.subtema === resource.subtema && entry.id !== id && (archiveReading || isArchive(entry)));
      const list = element('ul', '');
      for (const entry of related) {
        const item = element('li', '');
        const sourceRoute = Object.entries(sourceSections).find(([, [, formats]]) => formats.includes(entry.formato));
        const href = isArchive(entry) ? archiveUrl(entry.subtema) :
          'como-se-juega.html?' + new URLSearchParams({...(sourceRoute ? {seccion: sourceRoute[0]} : {}), lectura: entry.id});
        item.append(link(archiveReading ? entry.formato + ' · ' + entry.titulo : entry.titulo, href));
        list.append(item);
      }
      if (related.length) {
        const heading = element(archiveReading && references ? 'h3' : 'h2', archiveReading ? 'Fichas de las fuentes' : 'Archivo de la mecánica');
        addToIndex(heading, 'fichas-relacionadas');
        const destination = archiveReading && references ? references.section : reading;
        destination.append(heading, list);
      }
    }
    if (archiveReading) document.querySelector('#catalogo').hidden = true;
  }
  reading.hidden = false;
  document.querySelector('.portada').hidden = true;
}

async function loadCatalog() {
  const response = await fetch('datos/como-se-juega.json?v=tipos-salto', {cache: 'no-cache'});
  if (!response.ok) throw new Error('No se pudo cargar el catálogo');
  const catalog = await response.json();
  const archives = catalog.filter(isArchive);
  const archive = archives.find(entry => slug(entry.subtema) === collection);
  const allTopics = [...new Set([...studyAreas, ...catalog.map(entry => entry.tema)])];
  const category = discipline && Object.hasOwn(discipline[1], designCategory) ? designCategory : '';
  const topTopic = !isPapers && !isInterviews && !sourceSection && allTopics.includes(currentTopic) ? currentTopic : '';
  const editorialView = Boolean(discipline || topTopic);
  const entries = catalog.filter(entry =>
    (editorialView ? isEditorial(entry) : !isEditorial(entry)) &&
    (!isPapers || entry.formato === 'Estudio') &&
    (!language || entry.idioma === languages[language]) &&
    (!isInterviews || entry.formato === 'Entrevista') &&
    (!sourceSection || sourceSection[1].includes(entry.formato)) &&
    (!discipline || Object.hasOwn(discipline[1], designTopic(entry))) &&
    (!category || designTopic(entry) === category) &&
    (!topTopic || ((topTopic === 'Mecánicas' ? designTopic(entry) === topTopic && !entry.subtema : entry.tema === topTopic))) &&
    !isArchive(entry)
  );
  const sectionTitle = language ? 'Papers en ' + languages[language].toLowerCase() :
    isPapers ? 'Papers' : isInterviews ? 'Entrevistas' : (sourceSection?.[0] ?? (discipline ? category || discipline[0] : topTopic));
  const mechanics = document.querySelector('#archivo-mecanicas');
  if ((topTopic === 'Mecánicas' || category === 'Mecánicas') && !archive && archives.length) {
    mechanics.hidden = false;
    for (const entry of archives) {
      const card = link('', archiveUrl(entry.subtema));
      card.append(element('span', entry.subtema, 'area-titulo'), element('span', entry.resumen, 'area-recuento'));
      mechanics.append(card);
    }
  }
  const sections = document.querySelector('#secciones');
  const updates = document.querySelector('#novedades');
  updates.hidden = !isHome;
  if (isHome || (params.has('lectura') && !sectionTitle && !librarySection)) document.querySelector('#catalogo').hidden = true;
  if (sectionTitle) {
    document.querySelector('#titulo-catalogo').textContent = sectionTitle;
    document.querySelector('#volver-biblioteca').hidden = editorialView;
    document.querySelector('.portada').hidden = true;
    sections.hidden = true;
    if (discipline && !category) {
      sections.hidden = false;
      for (const [name, description] of Object.entries(discipline[1])) {
        const card = link('', name === 'Mecánicas' ? '?tema=Mec%C3%A1nicas#catalogo' : '?' + libraryQuery({categoria: name}) + '#catalogo');
        card.append(element('span', name, 'area-titulo'), element('span', description, 'area-recuento'));
        sections.append(card);
      }
    }
    if (discipline || topTopic === 'Mecánicas') {
      const back = document.querySelector('#volver-diseno');
      back.hidden = false;
      back.append(link(discipline?.[0] ?? disciplines.sistemas[0], '?diseno=' + (discipline ? areaKey : 'sistemas') + '#catalogo'));
    }
  } else if (!isHome && (!params.has('lectura') || librarySection)) {
    sections.hidden = false;
    const sectionLinks = [
      ['Papers', '?papers=todos'],
      ['Entrevistas', '?seccion=entrevistas'],
      ...Object.entries(sourceSections).map(([key, [title]]) => [title, '?seccion=' + key])
    ];
    sections.replaceChildren(...sectionLinks.map(([name, url]) => {
      const card = link('', url + '#catalogo');
      card.append(element('span', name, 'area-titulo'));
      return card;
    }));
  }
  if (isPapers) document.querySelector('#idiomas').hidden = false;
  document.querySelector('#volver-papers').hidden = !language;
  const chooseLanguage = (isPapers && !language) || (topTopic === 'Mecánicas' && !archive && !entries.length && archives.length > 0);
  search.form.hidden = chooseLanguage || editorialView || isHome;
  status.hidden = chooseLanguage || editorialView;
  results.hidden = chooseLanguage;
  if (language) document.querySelector('[data-papers="' + language + '"]').setAttribute('aria-current', 'page');
  const topics = [...new Set(entries.map(entry => entry.tema))];
  const showTopics = !editorialView && (Boolean(language) || (!sectionTitle && !isHome)) && topics.length > 0;
  document.querySelector('#subcategorias').hidden = !showTopics;
  document.querySelector('#filtro-tema').hidden = !showTopics;
  document.querySelector('#filtro-formato').hidden = isPapers || isInterviews;
  if (showTopics) {
    fillOptions(topic, topics);
    if (topics.includes(currentTopic)) topic.value = currentTopic;
  }
  fillOptions(format, entries.map(entry => entry.formato));
  showReading(catalog, archive);
  if (editorialView && !archive && !entries.length && mechanics.hidden) {
    status.hidden = false;
  }

  const topicCounts = new Map();
  for (const entry of entries) {
    topicCounts.set(entry.tema, (topicCounts.get(entry.tema) ?? 0) + 1);
  }
  const shortcuts = (showTopics ? topics : []).map(name => {
    const shortcut = link('', 'como-se-juega.html?' + libraryQuery({tema: name}) + '#catalogo');
    const count = topicCounts.get(name) ?? 0;
    shortcut.append(
      element('span', name, 'area-titulo'),
      element('span', count === 1 ? '1 recurso' : count + ' recursos', 'area-recuento')
    );
    shortcut.dataset.tema = name;
    shortcut.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      topic.value = name === topic.value ? '' : name;
      render();
    });
    return shortcut;
  });
  areas.replaceChildren(...shortcuts);
  areas.hidden = !showTopics;

  function render() {
    const query = normalize(search.value.trim());
    const matches = entries.filter(entry =>
      (!topic.value || entry.tema === topic.value) &&
      (!format.value || entry.formato === format.value) &&
      normalize([entry.titulo, entry.resumen, entry.tema, entry.formato].join(' ')).includes(query)
    );
    const cards = matches.map(entry => {
      const card = element('article', '', 'ficha');
      const title = element('h3', '');
      title.append(link(entry.titulo, '?' + libraryQuery({...(topic.value ? {tema: topic.value} : {}), lectura: entry.id})));
      card.append(element('div', entry.formato + ' · ' + (discipline ? designTopic(entry) : entry.tema), 'meta'), title, element('p', entry.resumen));
      return card;
    });
    results.replaceChildren(...cards);
    for (const shortcut of shortcuts) {
      if (shortcut.dataset.tema === topic.value) shortcut.setAttribute('aria-current', 'true');
      else shortcut.removeAttribute('aria-current');
    }
    const emptyTopic = topic.value && !entries.some(entry => entry.tema === topic.value);
    status.textContent = !entries.length && editorialView ? 'Todavía no hay textos publicados en esta sección.' :
      !entries.length && sectionTitle ? 'Todavía no hay recursos en esta sección.' :
      emptyTopic ? 'Todavía no hay recursos en esta área.' :
      matches.length === 0 ? 'No hay recursos que coincidan.' :
      matches.length === 1 ? '1 recurso' : matches.length + ' recursos';
  }

  search.addEventListener('input', render);
  topic.addEventListener('change', render);
  format.addEventListener('change', render);
  search.form.addEventListener('submit', event => { event.preventDefault(); render(); });
  render();
}

loadCatalog().catch(() => {
  status.textContent = 'No se pudo cargar el catálogo. Recarga la página para volver a intentarlo.';
});

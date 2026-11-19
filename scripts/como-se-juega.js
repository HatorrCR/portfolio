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
const isJump = !isPapers && !isInterviews && currentTopic === 'Mecánicas' && params.get('coleccion') === 'salto-2d';
const jumpUrl = 'como-se-juega.html?tema=Mec%C3%A1nicas&coleccion=salto-2d';
const libraryQuery = values => new URLSearchParams({
  ...(isPapers ? {papers: selected} : {}),
  ...(isInterviews ? {seccion: 'entrevistas'} : {}),
  ...(isJump ? {coleccion: 'salto-2d'} : {}),
  ...(currentTopic ? {tema: currentTopic} : {}),
  ...values
});
const libraryUrl = 'como-se-juega.html?' + libraryQuery({}) + '#catalogo';
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
  section.append(element('h2', 'Referencias y materiales'));
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
}

function showReading(entries) {
  const id = params.get('lectura');
  if (!id) {
    if (!document.querySelector('.portada').hidden) showFeatured(entries);
    return;
  }
  const resource = entries.find(entry => entry.id === id);
  const title = element('h1', resource?.titulo ?? 'Recurso no encontrado');
  title.id = 'titulo-lectura';
  reading.append(link('Volver a la biblioteca', libraryUrl), title);
  if (resource) {
    document.title = resource.titulo + ' · Cómo se juega';
    reading.append(element('p', resource.formato + ' · ' + resource.tema, 'meta'));
    for (const [index, block] of resource.cuerpo.split(/^\x60\x60\x60(?:csharp)?[ \t]*\r?$/m).entries()) {
      if (index % 2 === 1) {
        const pre = element('pre', '', 'codigo');
        pre.tabIndex = 0;
        pre.setAttribute('aria-label', 'Código C#');
        pre.append(element('code', block.trim()));
        reading.append(pre);
      } else {
        for (const paragraph of block.trim().split(/\r?\n\s*\r?\n/).filter(Boolean)) {
          const heading = paragraph.match(/^## ([^\r\n]+)$/);
          reading.append(heading ? element('h2', heading[1]) : element('p', paragraph));
        }
      }
    }
    showSources(resource);
    if (resource.subtema === 'Salto 2D') {
      const related = entries.filter(entry => entry.subtema === resource.subtema &&
        entry.id !== id && (resource.formato === 'Guía' || entry.formato === 'Guía'));
      const list = element('ul', '');
      for (const entry of related) {
        const item = element('li', '');
        item.append(link(entry.titulo, jumpUrl + '&lectura=' + encodeURIComponent(entry.id)));
        list.append(item);
      }
      if (related.length) reading.append(element('h2', 'Lecturas de Salto 2D'), list);
    }
  }
  reading.hidden = false;
  document.querySelector('.portada').hidden = true;
}

async function loadCatalog() {
  const response = await fetch('datos/como-se-juega.json?v=salto-2d', {cache: 'no-cache'});
  if (!response.ok) throw new Error('No se pudo cargar el catálogo');
  const catalog = await response.json();
  const allTopics = [...new Set([...studyAreas, ...catalog.map(entry => entry.tema)])];
  const topTopic = !isPapers && !isInterviews && allTopics.includes(currentTopic) ? currentTopic : '';
  const entries = catalog.filter(entry =>
    (!isPapers || entry.formato === 'Estudio') &&
    (!language || entry.idioma === languages[language]) &&
    (!isInterviews || entry.formato === 'Entrevista') &&
    (!topTopic || entry.tema === topTopic) &&
    (!isJump || entry.subtema === 'Salto 2D')
  );
  const sectionTitle = language ? 'Papers en ' + languages[language].toLowerCase() :
    isPapers ? 'Papers' : isInterviews ? 'Entrevistas' : isJump ? 'Salto 2D' : topTopic;
  const jumpCollection = document.querySelector('#coleccion-salto');
  if (topTopic === 'Mecánicas' && !isJump) jumpCollection.hidden = false;
  if (isJump) document.querySelector('#volver-mecanicas').hidden = false;
  const sections = document.querySelector('#secciones');
  if (sectionTitle) {
    document.querySelector('#titulo-catalogo').textContent = sectionTitle;
    document.querySelector('#volver-biblioteca').hidden = false;
    document.querySelector('.portada').hidden = true;
    sections.hidden = true;
  } else {
    const sectionLinks = [
      ['Papers', '?papers=todos'],
      ['Mecánicas', '?tema=Mec%C3%A1nicas'],
      ['Entrevistas', '?seccion=entrevistas'],
      ...allTopics.filter(name => name !== 'Mecánicas').map(name => [name, '?tema=' + encodeURIComponent(name)])
    ];
    sections.replaceChildren(...sectionLinks.map(([name, url]) => {
      const card = link('', url + '#catalogo');
      card.append(element('span', name, 'area-titulo'));
      return card;
    }));
  }
  if (isPapers) document.querySelector('#idiomas').hidden = false;
  document.querySelector('#volver-papers').hidden = !language;
  const chooseLanguage = isPapers && !language;
  search.form.hidden = chooseLanguage;
  status.hidden = chooseLanguage;
  results.hidden = chooseLanguage;
  if (language) document.querySelector('[data-papers="' + language + '"]').setAttribute('aria-current', 'page');
  const topics = [...new Set(entries.map(entry => entry.tema))];
  const showTopics = Boolean(language) && topics.length > 0;
  document.querySelector('#subcategorias').hidden = !showTopics;
  document.querySelector('#filtro-tema').hidden = !showTopics;
  document.querySelector('#filtro-formato').hidden = isPapers || isInterviews;
  if (showTopics) {
    fillOptions(topic, topics);
    if (topics.includes(currentTopic)) topic.value = currentTopic;
  }
  fillOptions(format, entries.map(entry => entry.formato));
  showReading(catalog);

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
      card.append(element('div', entry.formato + ' · ' + entry.tema, 'meta'), title, element('p', entry.resumen));
      return card;
    });
    results.replaceChildren(...cards);
    for (const shortcut of shortcuts) {
      if (shortcut.dataset.tema === topic.value) shortcut.setAttribute('aria-current', 'true');
      else shortcut.removeAttribute('aria-current');
    }
    const emptyTopic = topic.value && !entries.some(entry => entry.tema === topic.value);
    status.textContent = !entries.length && sectionTitle ? 'Todavía no hay recursos en esta sección.' :
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

'use strict';

const search = document.querySelector('#buscar');
const topic = document.querySelector('#tema');
const results = document.querySelector('#resultados');
const status = document.querySelector('#estado');
const reading = document.querySelector('#lectura');
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
const isDevelopment = !isPapers && sectionKey === 'decisiones';
const developmentIds = new Set(['nihilumbra-postmortem-modo-vacio', 'blasphemous-ii-entrevista-diseno']);
const sourceSection = !isPapers && Object.hasOwn(sourceSections, sectionKey) ? sourceSections[sectionKey] : null;
const disciplines = {
  sistemas: ['Diseño de sistemas', {
    'Mecánicas': 'Reglas, acciones y estados del jugador.',
    'Dinámicas': 'Lo que acaba haciendo la gente cuando las reglas se juntan.',
    'Jugabilidad y bucles': 'Lo que haces una y otra vez en una partida, y por qué apetece repetir.',
    'Sistemas y economías': 'Recursos, recompensas y progresión.',
    'Dificultad y equilibrio': 'Reto, opciones viables y ajuste de parámetros.'
  }],
  niveles: ['Diseño de niveles', {
    'Espacios y recorridos': 'Cómo te orientas, qué caminos eliges y cuándo decides desviarte.',
    'Encuentros y puzles': 'Cómo colocar los obstáculos y dar pistas para resolverlos.'
  }],
  narrativa: ['Diseño narrativo', {
    'Diseño narrativo': 'Historia interactiva, personajes, mundo y decisiones narrativas.',
    'Localización': 'Cómo traducir lo que se dice sin perder la voz de quien habla.'
  }],
  interfaz: ['Interfaz y experiencia de usuario', {
    'Interfaz e interacción': 'HUD, menús, controles y navegación.',
    'Respuesta y legibilidad': 'Señales visuales o sonoras que comunican lo que ocurre.',
    'Tutoriales y aprendizaje': 'Cómo enseñar a jugar y cuándo viene bien una pista.',
    'Experiencia de usuario y accesibilidad': 'Qué puede estorbar al jugar y qué ajustes ayudan.'
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
  ...(sourceSection || isDevelopment || sectionKey === 'biblioteca' ? {seccion: sectionKey} : {}),
  ...(discipline ? {diseno: areaKey, ...(designCategory ? {categoria: designCategory} : {})} : {}),
  ...(currentTopic ? {tema: currentTopic} : {}),
  ...values
});
const libraryUrl = 'como-se-juega.html?' + libraryQuery({...(discipline || currentTopic || isPapers || sourceSection || isInterviews || isDevelopment ? {} : {seccion: 'biblioteca'})}) + '#catalogo';
const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const slug = value => normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const archiveUrl = name => 'como-se-juega.html?' + new URLSearchParams({tema: 'Mecánicas', coleccion: slug(name)});
const isArchive = entry => entry.tema === 'Mecánicas' && isEditorial(entry) && entry.subtema;
const editorialLabel = entry => isArchive(entry) ? 'Ficha de mecánica' : 'Guía de diseño';

function editorialSection(entry) {
  const name = designTopic(entry);
  if (name === 'Mecánicas') return { name, query: { tema: name } };
  const area = Object.entries(disciplines).find(([, [, categories]]) => Object.hasOwn(categories, name));
  return { name, query: area ? { diseno: area[0], categoria: name } : { tema: entry.tema } };
}

function editorialCard(entry, href) {
  const kind = isArchive(entry) ? 'mecanica' : 'guia';
  const card = link('', href);
  card.className = 'tarjeta-editorial tarjeta-editorial--' + kind;
  card.append(element('span', editorialLabel(entry), 'etiqueta-editorial'),
    element('h3', entry.titulo), element('p', entry.resumen),
    countBadge((entry.cuerpo.match(/^## /gm) ?? []).length || 1, 'apartado', 'apartados'));
  return card;
}

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
  const selection = [
    ['salto-3d-guia', 'mecanica'],
    ['hitos-orientacion', 'niveles'],
    ['machinations-dormans', 'paper'],
    ['narrativa-ambiental', 'narrativa'],
    ['prioridad-hud', 'interfaz'],
    ['booth-director-l4d', 'charla']
  ].flatMap(([id, style]) => {
    const entry = entries.find(item => item.id === id);
    return entry ? [{entry, style}] : [];
  });
  if (!selection.length) return;
  const carousel = document.querySelector('#destacado');
  const slide = document.querySelector('#carrusel-pieza');
  const position = document.querySelector('#carrusel-posicion');
  const previous = document.querySelector('#carrusel-anterior');
  const next = document.querySelector('#carrusel-siguiente');
  let current = 0;

  function render() {
    const {entry, style} = selection[current];
    let href;
    let label;
    const query = {lectura: entry.id};
    if (isArchive(entry)) {
      href = archiveUrl(entry.subtema);
      label = 'Abrir ficha';
    } else if (isEditorial(entry)) {
      Object.assign(query, editorialSection(entry).query);
      label = 'Leer guía';
    } else if (entry.formato === 'Estudio') {
      query.papers = entry.idioma === 'Español' ? 'es' : 'en';
      label = 'Leer ficha del estudio';
    } else {
      query.seccion = 'conferencias';
      label = 'Ver ficha de la charla';
    }
    const text = element('div', '', 'carrusel-texto');
    const open = link(label, href ?? '?' + new URLSearchParams(query));
    open.className = 'boton';
    const category = isEditorial(entry) ? editorialLabel(entry) : entry.formato;
    text.append(element('p', category + ' · ' + entry.tema, 'meta'),
      element('h2', entry.titulo), element('p', entry.resumen), open);
    const art = element('div', '', 'carrusel-arte carrusel-arte--' + style);
    art.setAttribute('aria-hidden', 'true');
    slide.replaceChildren(text, art);
    slide.dataset.estilo = style;
    position.textContent = (current + 1) + ' / ' + selection.length;
  }

  function change(step) {
    current = (current + step + selection.length) % selection.length;
    render();
  }

  previous.addEventListener('click', () => change(-1));
  next.addEventListener('click', () => change(1));
  carousel.addEventListener('keydown', event => {
    if (event.target !== previous && event.target !== next) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    change(event.key === 'ArrowLeft' ? -1 : 1);
  });
  previous.disabled = next.disabled = selection.length === 1;
  render();
  carousel.hidden = false;
}

function countBadge(count, singular, plural) {
  const label = count + ' ' + (count === 1 ? singular : plural);
  const badge = element('span', String(count), 'recuento-tarjeta');
  badge.title = label;
  badge.setAttribute('role', 'img');
  badge.setAttribute('aria-label', label);
  return badge;
}

function areaCard(name, href, count, description = '') {
  const card = link('', href);
  card.append(element('span', name, 'area-titulo'), countBadge(count, 'entrada', 'entradas'));
  if (description) card.append(element('span', description, 'area-recuento'));
  return card;
}

function showSources(resource, entries) {
  const sources = [...(resource.materiales ?? [])];
  if (resource.fuente) sources.unshift({nombre: 'Publicación original', url: resource.fuente});
  const links = sources.filter(source => /^https:\/\//i.test(source.url ?? ''));
  const fichas = (resource.fuentes ?? []).map(id => entries.find(entry => entry.id === id)).filter(Boolean);
  if (!resource.referencia && !links.length && !fichas.length) return;
  const section = element('section', '', 'referencias');
  const heading = element('h2', 'Fuentes');
  section.append(heading);
  if (resource.referencia) section.append(element('p', resource.referencia));
  if (links.length || fichas.length) {
    const list = element('ul', '');
    for (const source of links) {
      const item = element('li', '');
      item.append(link(source.nombre, source.url));
      list.append(item);
    }
    for (const source of fichas) {
      const item = element('li', '');
      const route = Object.entries(sourceSections).find(([, [, formats]]) => formats.includes(source.formato));
      const query = new URLSearchParams(source.formato === 'Estudio' ? {papers: 'en'} :
        {seccion: route?.[0] ?? 'biblioteca'});
      query.set('lectura', source.id);
      item.append(link(source.formato + ' · ' + source.titulo, '?' + query));
      list.append(item);
    }
    section.append(list);
  }
  reading.append(section);
  return {section, heading};
}

const labColors = {
  paper: '#fff6e6', horizon: '#eadac1', grid: '#dec9ad',
  ground: '#356062', face: '#193c3d', player: '#a64328',
  ink: '#40382e', flag: '#f7c477', shadow: 'rgba(47,35,29,.42)'
};

function paintLabAvatar(ctx, x, y, size, facing = 1, stretch = 0) {
  ctx.fillStyle = labColors.player;
  ctx.fillRect(x - size/2 - stretch, y - size + stretch, size + stretch*2, size - stretch);
  ctx.fillStyle = labColors.paper;
  ctx.fillRect(x + (facing < 0 ? -5 : 2), y - size + 5 + stretch, 4, 4);
}

function perspectiveLabView(view) {
  return view === 'primera' || view === 'tercera';
}

function labCamera(ctx, view, x, y, z) {
  const overhead = view === 'cenital';
  const firstPerson = view === 'primera';
  const perspective = perspectiveLabView(view);
  const cameraX = x - (firstPerson ? 0 : 3.2);
  const cameraY = Math.max(0.35, y + (firstPerson ? 0.62 : 2.1));
  const pitch = firstPerson ? 0.2 : 0.44;
  const cos = Math.cos(pitch), sin = Math.sin(pitch);
  const near = 0.2;
  function cameraPoint([worldX,worldZ,worldY=0]) {
    if (!perspective) return [65 + worldX*66 + (overhead ? 0 : worldZ*23),
      190 + worldZ*(overhead ? 63 : 36) - (overhead ? 0 : worldY*50), 1];
    const ahead = worldX-cameraX;
    const up = worldY-cameraY;
    return [worldZ-z, up*cos + ahead*sin, ahead*cos - up*sin];
  }
  const screen = ([side,up,depth]) => perspective
    ? [340 + 300*side/depth, 148 - 300*up/depth] : [side,up];
  function path(points) {
    const camera = points.map(cameraPoint);
    const visible = [];
    let previous = camera.at(-1);
    for (const current of camera) {
      if ((previous[2] >= near) !== (current[2] >= near)) {
        const t = (near-previous[2])/(current[2]-previous[2]);
        visible.push([previous[0]+(current[0]-previous[0])*t,previous[1]+(current[1]-previous[1])*t,near]);
      }
      if (current[2] >= near) visible.push(current);
      previous = current;
    }
    if (visible.length < 3) return false;
    ctx.beginPath();
    visible.forEach((point,i) => {
      const [sx,sy] = screen(point);
      if (i) ctx.lineTo(sx,sy);
      else ctx.moveTo(sx,sy);
    });
    ctx.closePath();
    return true;
  }
  function polygon(points, color) {
    if (!path(points)) return;
    ctx.fillStyle = color;
    ctx.fill();
  }

  function paintBackground() {
    ctx.fillStyle = labColors.paper;
    ctx.fillRect(0, 0, 680, 320);
    if (perspective) {
      ctx.fillStyle = labColors.horizon;
      ctx.fillRect(0, 0, 680, 148 - 300*Math.tan(pitch));
    }
  }

  function paintPlayer(worldX, worldY, worldZ) {
    if (firstPerson) {
      ctx.fillStyle = labColors.ink;
      ctx.fillRect(334,157,12,2);
      ctx.fillRect(339,152,2,12);
      return;
    }
    const foot = cameraPoint([worldX,worldZ,worldY]);
    if (foot[2] < near) return;
    const [sx,sy] = screen(foot);
    paintLabAvatar(ctx, sx, sy, perspective ? Math.min(32,72/foot[2]) : 20);
  }

  function paintShadow(x, z) {
    polygon(Array.from({length:16}, (_,i) => {
      const angle = i*Math.PI/8;
      return [x+Math.cos(angle)*0.24,z+Math.sin(angle)*0.2];
    }), labColors.shadow);
  }

  return { overhead, perspective, path, polygon, paintBackground, paintPlayer, paintShadow };
}

function addPlayableJump(lab, controls) {
  const canvas = lab.querySelector('[data-juego-salto]');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const status = lab.querySelector('[data-estado-juego]');
  const mode = lab.querySelector('[data-escenario-salto]');
  const air = lab.querySelector('[data-control-aereo]');
  const sensor = lab.querySelector('[data-sensor-salto]');
  const effects = lab.querySelector('[data-efectos-salto]');
  const coyote = lab.querySelector('[data-ayuda="coyote"]');
  const buffer = lab.querySelector('[data-ayuda="buffer"]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const held = new Map();
  const isHeld = action => [...held.values()].includes(action);
  const scenes = {
    normal: {platforms: [[0,3,0],[6,10,0]], goal: [9.3,0]},
    estrecha: {platforms: [[0,3,0],[6,6.85,0],[8,10,0]], goal: [9.3,0]},
    oculta: {platforms: [[0,3,0],[6,10,0]], goal: [9.3,0], hiddenLanding: true},
    rebote: {platforms: [[0,10,0],[6.7,9.7,2.65]], goal: [8.9,2.65], enemy: 5.4}
  };
  const step = 1 / 120;
  let scene, x, y, vx, vy, grounded, grace, queued, shortHop, won, enemyAlive, revealed, landingEffect;
  let last = 0, elapsed = 0, audio;

  function landingFeedback() {
    if (!effects.checked) return;
    landingEffect = 0.18;
    if (!audio || audio.state !== 'running') return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const now = audio.currentTime;
    oscillator.frequency.setValueAtTime(150, now);
    oscillator.frequency.exponentialRampToValueAtTime(60, now + 0.1);
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.12);
  }

  function paint() {
    const px = value => 25 + value * 62;
    const py = value => 205 - value * 46;
    ctx.fillStyle = labColors.paper;
    ctx.fillRect(0, 0, 680, 252);
    ctx.fillStyle = labColors.grid;
    for (let line = 1; line <= 4; line++) ctx.fillRect(25, py(line), 620, 1);
    ctx.fillStyle = labColors.ground;
    for (const [left,right,top] of scene.platforms) {
      if (scene.hiddenLanding && left > 0 && !revealed) continue;
      ctx.fillRect(px(left), py(top), (right-left)*62, top ? 12 : 47);
    }
    const [goalX,goalY] = scene.goal;
    if (!scene.hiddenLanding || revealed) {
      ctx.fillStyle = labColors.ink;
      ctx.fillRect(px(goalX), py(goalY)-44, 3, 44);
      ctx.fillStyle = won ? labColors.ground : '#a64328';
      ctx.fillRect(px(goalX)+3, py(goalY)-44, 23, 14);
    }
    ctx.font = '15px system-ui';
    ctx.fillStyle = labColors.ink;
    if (scene.hiddenLanding && !revealed) ctx.fillText('La llegada aparece al despegar', 270, 230);
    else if (scene.enemy != null && enemyAlive) {
      ctx.fillStyle = '#a64328';
      ctx.fillRect(px(1.65)-8, py(0)-3, 16, 3);
      ctx.fillStyle = '#623c83';
      ctx.fillRect(px(scene.enemy)-14, py(0.75), 28, 35);
    } else if (scene.enemy == null) ctx.fillText('Hueco de 3 unidades', 250, 230);
    const effectVisible = effects.checked && landingEffect > 0 && !reducedMotion.matches;
    const stretch = effectVisible ? 4 : 0;
    if (effectVisible) {
      ctx.fillStyle = '#ad8059';
      const spread = 18 + (0.18 - landingEffect) * 105;
      ctx.fillRect(px(x)-spread-4, py(y)-4, 5, 3);
      ctx.fillRect(px(x)+spread, py(y)-5, 5, 3);
    }
    paintLabAvatar(ctx, px(x), py(y), 22, vx, stretch);
    if (sensor.checked) {
      ctx.strokeStyle = '#9931a5';
      ctx.lineWidth = 2;
      ctx.strokeRect(px(x)-10, py(y)-22, 20, 22);
      ctx.fillStyle = '#9931a5';
      ctx.fillRect(px(x)-3, py(y)-3, 6, 6);
      for (const [left,right,top] of scene.platforms) {
        if (scene.hiddenLanding && left > 0 && !revealed) continue;
        ctx.fillRect(px(left)-1, py(top)-6, 2, 12);
        ctx.fillRect(px(right)-1, py(top)-6, 2, 12);
      }
    }
  }

  function reset(message) {
    scene = scenes[mode.value] ?? scenes.normal;
    x = 1.2;
    y = vx = vy = grace = landingEffect = 0;
    queued = -1;
    grounded = enemyAlive = true;
    shortHop = won = revealed = false;
    status.textContent = message;
    paint();
  }

  const keys = {ArrowLeft:'izquierda', KeyA:'izquierda', ArrowRight:'derecha', KeyD:'derecha', Space:'salto', KeyR:'reiniciar'};
  canvas.addEventListener('keydown', event => {
    const action = keys[event.code];
    if (!action) return;
    event.preventDefault();
    if (event.repeat) return;
    if (effects.checked && window.AudioContext) {
      try {
        audio ??= new window.AudioContext();
        if (audio.state === 'suspended') audio.resume().catch(() => {});
      } catch { /* El audio es opcional. */ }
    }
    if (action === 'reiniciar') {
      held.clear();
      reset('Otra vez desde el inicio.');
      return;
    }
    if (action === 'salto') {
      queued = buffer.checked ? 0.1 : 0;
    }
    held.set(event.code, action);
  });
  canvas.addEventListener('keyup', event => held.delete(event.code));
  canvas.addEventListener('blur', () => held.clear());
  window.addEventListener('blur', () => held.clear());
  mode.addEventListener('change', () => {
    held.clear();
    reset('Escenario listo. Vuelve al recuadro para jugar.');
  });

  function update() {
    landingEffect = Math.max(0, landingEffect-step);
    const height = Number(controls.altura.value);
    const rise = Number(controls.subida.value);
    const gravity = 2 * height / (rise * rise);
    const launch = gravity * rise;
    const targetX = 6 * (Number(isHeld('derecha')) - Number(isHeld('izquierda')));
    if (grounded || air.value === 'inmediato') vx = targetX;
    else if (air.value === 'progresivo') vx += Math.max(-18*step, Math.min(18*step, targetX-vx));
    x = Math.max(0.15, Math.min(scene.enemy != null && won ? 9.55 : 9.8, x + vx*step));
    if (grounded && !scene.platforms.some(([l,r,top]) => x >= l && x <= r && y === top)) {
      grounded = false;
      grace = 0.1;
      if (scene.hiddenLanding) revealed = true;
    }
    if (queued >= 0 && (grounded || (coyote.checked && grace > 0))) {
      vy = launch;
      grounded = shortHop = false;
      revealed = true;
      queued = -1;
      grace = 0;
    }
    if (!grounded) {
      if (vy > 0 && !shortHop && !isHeld('salto')) {
        vy = Math.min(vy, launch*0.45);
        shortHop = true;
      }
      const oldY = y;
      y += vy*step;
      vy -= gravity * (vy > 0 ? 1 : Number(controls.caida.value)) * step;
      if (enemyAlive && scene.enemy != null && vy <= 0 && oldY >= 0.75 && y <= 0.75 && Math.abs(x-scene.enemy) <= 0.23) {
        enemyAlive = false;
        shortHop = true;
        y = 0.75;
        vy = Math.sqrt(2*gravity*2.55);
        status.textContent = '¡Rebote! Sigue hacia la repisa.';
        landingFeedback();
      } else if (vy <= 0) {
        const surfaces = scene.platforms.filter(([l,r,top]) => x>=l && x<=r && oldY>=top && y<=top);
        if (surfaces.length) {
          y = Math.max(...surfaces.map(platform => platform[2]));
          grounded = true;
          vy = grace = 0;
          landingFeedback();
        }
      }
    }
    if (queued >= 0) queued -= step;
    grace = Math.max(0, grace - step);
    if (y < -3) reset('Al foso. Acércate un poco más al borde antes de saltar.');
    if (!won && grounded && x >= scene.goal[0] && y === scene.goal[1]) {
      won = true;
      status.textContent = 'Bandera conseguida. Cambia una sola opción y vuelve a intentarlo.';
    }
  }

  function frame(now) {
    elapsed += last ? Math.min((now-last)/1000, 0.05) : 0;
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
    ctx.fillStyle = labColors.ink;
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
    ctx.fillStyle = labColors.ground;
    ctx.fill();
  }
  lab.addEventListener('input', draw);
  draw();
  return controls;
}

function addJump3D() {
  const panel = document.querySelector('#plantilla-salto-3d').content.firstElementChild.cloneNode(true);
  reading.append(panel);
  const canvas = panel.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const view = panel.querySelector('[data-vista-3d]');
  const scenario = panel.querySelector('[data-escenario-3d]');
  const air = panel.querySelector('[data-aire-3d]');
  const shadow = panel.querySelector('[data-sombra-3d]');
  const status = panel.querySelector('[data-estado-3d]');
  const held = new Set();
  const keys = {ArrowLeft:'KeyA', ArrowRight:'KeyD', ArrowUp:'KeyW', ArrowDown:'KeyS'};
  const landings = {desplazada: [5,8.5,0.2,1.65], alineada: [5,8.5,-0.75,0.75], estrecha: [5,8.5,0.6,1.1]};
  const platforms = [[0,3,-1.7,1.7], landings.desplazada];
  const goalZ = () => (platforms[1][2] + platforms[1][3]) / 2;
  const isSupported = (x,z) => platforms.some(([l,r,n,f]) => x>=l && x<=r && z>=n && z<=f);
  const step = 1/120;
  let x, y, z, vx, vy, vz, grounded, requested, cut, won;
  let last = 0, elapsed = 0, pendingFrame = false;

  const isPerspective = () => perspectiveLabView(view.value);

  function draw() {
    const { overhead, perspective, path, polygon, paintBackground, paintPlayer, paintShadow } =
      labCamera(ctx, view.value, x, y, z);
    const surface = ([l,r,n,f]) => [[l,n],[r,n],[r,f],[l,f]];
    paintBackground();
    for (const platform of [...platforms].reverse()) {
      const [l,r,n,f] = platform;
      if (perspective) polygon([[l,n],[l,f],[l,f,-0.3],[l,n,-0.3]], labColors.face);
      else if (!overhead) polygon([[l,f],[r,f],[r,f,-0.3],[l,f,-0.3]], labColors.face);
      polygon(surface(platform), labColors.ground);
    }
    const goal = goalZ();
    polygon([[7.7,goal-0.14],[8.02,goal-0.14],[8.02,goal+0.14],[7.7,goal+0.14]], won ? labColors.paper : labColors.flag);
    if (!overhead) {
      polygon([[7.72,goal],[7.72,goal+0.03],[7.72,goal+0.03,0.65],[7.72,goal,0.65]], labColors.ink);
      polygon([[7.72,goal,0.65],[7.72,goal+0.22,0.65],[7.72,goal+0.22,0.46],[7.72,goal,0.46]], labColors.flag);
    }
    const supportingPlatform = y >= 0 && platforms.find(([l,r,n,f]) => x>=l && x<=r && z>=n && z<=f);
    if (shadow.checked && supportingPlatform && path(surface(supportingPlatform))) {
      ctx.save();
      ctx.clip();
      paintShadow(x, z);
      ctx.restore();
    }
    paintPlayer(x, y, z);
    ctx.fillStyle = labColors.ink;
    ctx.font = '16px system-ui';
    if (!perspective) ctx.fillText('W / ↑  al fondo     S / ↓  hacia ti', 24, 309);
  }

  function reset(message) {
    x = 1.2;
    y = z = vx = vy = vz = 0;
    grounded = true;
    requested = cut = won = false;
    status.textContent = message;
    draw();
  }

  function update() {
    const lateral = Number(held.has('KeyD')) - Number(held.has('KeyA'));
    const forward = Number(held.has('KeyW')) - Number(held.has('KeyS'));
    const dx = isPerspective() ? forward : lateral;
    const dz = isPerspective() ? lateral : -forward;
    const speed = 5.5 / Math.max(1, Math.hypot(dx,dz));
    if (grounded || air.value === 'inmediato') {
      vx = dx*speed;
      vz = dz*speed;
    } else if (air.value === 'progresivo') {
      const deltaX = dx*speed - vx, deltaZ = dz*speed - vz;
      const fraction = Math.min(1, 18*step / Math.max(0.0001, Math.hypot(deltaX,deltaZ)));
      vx += deltaX*fraction;
      vz += deltaZ*fraction;
    }
    x = Math.max(0, Math.min(8.6,x+vx*step));
    z = Math.max(-2, Math.min(1.9,z+vz*step));
    if (grounded && !isSupported(x,z)) grounded = false;
    if (requested && grounded) {
      grounded = false;
      vy = 9.8;
      cut = false;
    }
    requested = false;
    if (!grounded) {
      if (!held.has('Space') && !cut && vy>0) {
        vy = Math.min(vy,4.4);
        cut = true;
      }
      const before = y;
      y += vy*step;
      vy -= 25*step;
      if (before>=0 && y<=0 && vy<=0 && isSupported(x,z)) {
        y = vy = 0;
        grounded = true;
      }
    }
    if (y < -2.3) reset('Al foso. Ajusta la profundidad antes de despegar y vuelve a probar.');
    if (!won && grounded && x>=7.7 && isSupported(x,z)) {
      won = true;
      status.textContent = 'Bandera conseguida. Repite desde arriba o quita la sombra para comparar.';
    }
  }

  function frame(now) {
    elapsed += last ? Math.min((now-last)/1000,0.05) : 0;
    last = now;
    while (elapsed >= step) {
      update();
      elapsed -= step;
    }
    draw();
    if (held.size || !grounded || requested) requestAnimationFrame(frame);
    else {
      pendingFrame = false;
      last = elapsed = 0;
    }
  }

  canvas.addEventListener('keydown', event => {
    const key = keys[event.code] ?? event.code;
    if (!['KeyA','KeyD','KeyW','KeyS','KeyR','Space'].includes(key)) return;
    event.preventDefault();
    if (event.repeat) return;
    if (key === 'KeyR') {
      held.clear();
      reset('Otra vez desde el inicio.');
      return;
    }
    if (key === 'Space') requested = true;
    held.add(key);
    if (!pendingFrame) {
      pendingFrame = true;
      requestAnimationFrame(frame);
    }
  });
  canvas.addEventListener('keyup', event => held.delete(keys[event.code] ?? event.code));
  canvas.addEventListener('blur', () => held.clear());
  window.addEventListener('blur', () => held.clear());
  scenario.addEventListener('change', () => {
    platforms[1] = landings[scenario.value] ?? landings.desplazada;
    held.clear();
    reset('Llegada cambiada. Vuelve al recuadro para probar.');
  });
  panel.addEventListener('change', draw);
  reset('Empieza alineándote con la plataforma de llegada.');
}

const systemLabs = {
  'iniciativa-combate': {
    modes: ['Sin premio', 'Premio por atacar'],
    start: () => ({round: 0, pts: 0}),
    view: s => [['Intercambios', s.round + ' / 6'], ['Puntos', s.pts]],
    hint: s => s.round === 6 ? 'Duelo terminado.' : 'El rival se prepara para ' + ['contraatacar', 'atacar', 'defender'][s.round % 3] + '.',
    actions: (s, mode) => ['Atacar', 'Esperar', 'Fintar'].map((name, choice) =>
      [name, s.round < 6, () => {
        const points = [[-2, 0, 0], [0, 2, 0], [1, -1, 2]][s.round % 3][choice]
          + (mode && choice === 0 ? 2 : 0);
        s.round++;
        s.pts += points;
        return 'Resultado del intercambio: ' + points + ' puntos.';
      }])
  },
  'roles-cooperativos': {
    modes: ['Pistas compartidas', 'Pistas repartidas'],
    start: () => ({round: 0, role: 0, points: 0}),
    view: s => [['Ronda', Math.min(s.round + 1, 3) + ' / 3'], ['Aciertos', s.points]],
    hint: (s, mode) => {
      if (s.round === 3) return 'Partida terminada. Cambiad los roles y probad otra variante.';
      const a = ['estrella', 'luna', 'estrella'][s.round], b = ['azul', 'roja', 'roja'][s.round];
      if (!s.role) return 'Rol A. Pista: la puerta tiene una ' + a + '. Memorízala y pasa el turno.';
      return 'Rol B. Pista: la puerta es ' + b + '.' + (mode ? ' Pregunta al otro rol por el símbolo.' : ' El símbolo es ' + a + '.');
    },
    actions: s => [
      ['Pasar el turno al rol B', s.round < 3 && s.role === 0, () => { s.role = 1; return ''; }],
      ...['Estrella azul', 'Estrella roja', 'Luna azul', 'Luna roja'].map((name, door) =>
        [name, s.round < 3 && s.role === 1, () => {
          const correct = door === [0, 3, 1][s.round];
          if (correct) s.points++;
          s.round++;
          s.role = 0;
          return correct ? 'Puerta correcta.' : 'La puerta no coincide con las dos pistas.';
        }])
    ]
  },
  'ritmo-en-rondas': {
    modes: ['Elección rápida', 'Gestión de inventario'],
    start: () => ({round: 0, active: 0, pending: 0, moves: 0, damage: 0}),
    view: s => [['Rondas', s.round + ' / 4'], ['Preparativos', s.moves], ['Daño', s.damage], ['Protección', ['Ninguna', 'Escudo', 'Filtro', 'Ambas'][s.active]]],
    hint: s => s.round === 4 ? 'Combate terminado.' :
      'Siguiente amenaza: ' + ['golpe', 'vapor', 'golpe', 'golpe y vapor'][s.round] + '. Preparado: ' + ['nada', 'escudo', 'filtro', 'ambos'][s.pending] + '.',
    actions: (s, mode) => [
      ...['Escudo', 'Filtro'].map((name, i) => [name, s.round < 4, () => {
        const gear = i + 1;
        if (mode) s.pending ^= gear;
        else s.active = gear;
        s.moves++;
        return mode ? 'Inventario modificado. Puedes confirmar el equipo.' : name + ' equipado.';
      }]),
      ['Confirmar equipo', Boolean(mode) && s.round < 4 && s.pending !== s.active, () => {
        s.active = s.pending;
        s.moves++;
        return 'Equipo confirmado.';
      }],
      ['Jugar ronda', s.round < 4, () => {
        const lacks = [1, 2, 1, 3][s.round++] & ~s.active;
        const hit = Number(Boolean(lacks & 1)) + Number(Boolean(lacks & 2));
        s.damage += hit;
        return hit ? 'Daño de esta ronda: ' + hit + '.' : 'Saliste sin daño.';
      }]
    ]
  },
  'reinicio-tras-fallar': {
    modes: ['Reinicio completo', 'Punto de control', 'Atajo descubierto'],
    start: () => ({room: 0, steps: 0, failed: false, done: false}),
    view: s => [['Tramos recorridos', s.room + ' / 4'], ['Pasos totales', s.steps], ['Caídas', Number(s.failed)]],
    hint: s => s.done ? 'Encuentro superado.' : s.room === 4 ? 'El encuentro final está delante.' : 'Avanza por el siguiente tramo.',
    actions: (s, mode) => [
      ['Avanzar', s.room < 4, () => { s.room++; s.steps++; return 'Tramo recorrido.'; }],
      ['Tomar atajo', mode === 2 && s.failed && s.room < 4, () => { s.room = 4; s.steps++; return 'Has vuelto al encuentro.'; }],
      ['Intentar encuentro', s.room === 4 && !s.done, () => {
        if (s.failed) { s.done = true; return 'Encuentro superado.'; }
        s.failed = true;
        s.room = mode === 1 ? 2 : 0;
        return 'Primer intento fallido. ' + (mode === 2 ? 'El atajo queda abierto.' : 'Vuelve a intentarlo.');
      }]
    ]
  },
  'descuentos-inventario': {
    modes: ['Cuatro plazas', 'Seis plazas'],
    start: () => ({gold: 20, items: 0, keys: 0}),
    view: (s, mode) => [['Oro', s.gold], ['Consumibles', s.items], ['Llaves', s.keys + ' / 2'], ['Plazas libres', (mode ? 6 : 4) - s.items - s.keys]],
    hint: s => s.keys === 2 && s.items >= 2 ? 'Objetivo cumplido. Compara cuánto oro y qué reserva te quedan.' : 'Objetivo: dos llaves y al menos dos consumibles.',
    actions: (s, mode) => {
      const space = (mode ? 6 : 4) - s.items - s.keys;
      const open = s.keys < 2 || s.items < 2;
      return [
        ['Comprar uno · 5', open && s.gold >= 5 && space >= 1, () => { s.gold -= 5; s.items++; return 'Compraste un consumible.'; }],
        ['Comprar paquete · 10', open && s.gold >= 10 && space >= 3, () => { s.gold -= 10; s.items += 3; return 'Compraste tres consumibles.'; }],
        ['Usar consumible', open && s.items > 0, () => { s.items--; return 'Liberaste una plaza.'; }],
        ['Recoger llave', s.keys < 2 && space > 0, () => { s.keys++; return 'Llave guardada.'; }]
      ];
    }
  },
  'mejorar-o-cambiar-arma': {
    modes: ['Sin reembolso', 'Reembolso de dos materiales'],
    start: () => ({round: 0, materials: 4, spear: false, swordLevel: 1, spearLevel: 0, points: 0}),
    view: s => [['Encuentros', s.round + ' / 4'], ['Materiales', s.materials],
      ['Arma activa', s.spear ? 'Lanza' : 'Espada'], ['Niveles espada / lanza', s.swordLevel + ' / ' + s.spearLevel], ['Puntos', s.points]],
    hint: s => s.round === 4 ? 'Recorrido completo.' : s.round % 2 ? 'La amenaza está lejos. La lanza tiene ventaja.' : 'La amenaza está cerca. La espada tiene ventaja.',
    actions: (s, mode) => [
      ['Cambiar arma', s.round > 0 && s.round < 4, () => { s.spear = !s.spear; return 'Arma cambiada.'; }],
      ['Revertir mejora de espada', Boolean(mode) && s.round > 0 && s.round < 4 && s.swordLevel > 0, () => {
        s.swordLevel--; s.materials += 2; return 'Recuperaste dos materiales.';
      }],
      ['Mejorar arma activa · 3', s.round < 4 && s.materials >= 3, () => {
        s.materials -= 3;
        if (s.spear) s.spearLevel++;
        else s.swordLevel++;
        return 'Mejora aplicada.';
      }],
      ['Resolver encuentro', s.round < 4, () => {
        const far = s.round++ % 2 === 1;
        const gain = (far === s.spear ? 3 : 1) + (s.spear ? s.spearLevel : s.swordLevel);
        s.points += gain;
        return 'Resultado del encuentro: ' + gain + ' puntos.';
      }]
    ]
  },
  'vida-y-ventanas': {
    modes: ['Más vida', 'Menos ventanas'],
    start: () => ({turn: 0, hits: 0, damage: 0}),
    view: (s, mode) => [['Turnos', s.turn], ['Golpes acertados', s.hits + ' / ' + (mode ? 4 : 6)], ['Daño recibido', s.damage]],
    hint: (s, mode) => s.hits === (mode ? 4 : 6) ? 'Encuentro superado.' :
      (s.turn + 1) % (mode ? 3 : 2) === 0 ? 'Guardia abierta.' : 'Guardia cerrada.',
    actions: (s, mode) => ['Atacar', 'Defender'].map((name, choice) => [
      name, s.hits < (mode ? 4 : 6), () => {
        const open = ++s.turn % (mode ? 3 : 2) === 0;
        if (choice === 1) return 'Esperaste a cubierto.';
        if (open) { s.hits++; return 'Golpe acertado.'; }
        s.damage++;
        return 'El enemigo te castigó por atacar con la guardia cerrada.';
      }
    ])
  },
  'ayudas-dificultad': {
    modes: ['Pista opcional', 'Ajuste automático'],
    start: () => ({step: 0, fails: 0, errors: 0, hint: false}),
    view: (s, mode) => [['Señales resueltas', s.step + ' / 3'], ['Intentos fallidos', s.fails],
      ['Margen restante', mode && s.fails >= 2 ? 1 - s.errors : 0]],
    hint: (s, mode) => {
      if (s.step === 3) return 'Secuencia resuelta.';
      const signal = ['círculo', 'triángulo', 'círculo'][s.step];
      return 'Señal: ' + signal + '.' + (s.hint ? ' El círculo pide cubrirse. El triángulo pide moverse.' :
        mode && s.fails >= 2 ? ' Ajuste activo: puedes cometer un error por intento.' : '');
    },
    actions: (s, mode) => [
      ['Pedir pista', !mode && s.fails >= 2 && !s.hint && s.step < 3, () => { s.hint = true; return ''; }],
      ...['Cubrirse', 'Moverse'].map((name, choice) => [name, s.step < 3, () => {
        if (choice === s.step % 2) { s.step++; return 'Respuesta correcta.'; }
        if (mode && s.fails >= 2 && s.errors === 0) {
          s.errors++;
          s.step++;
          return 'Error absorbido por el ajuste.';
        }
        s.fails++;
        s.step = s.errors = 0;
        return 'Fallaste la secuencia. Vuelve a empezar.';
      }])
    ]
  },
  'pociones-para-luego': {
    modes: ['Reserva finita', 'Recarga intermedia'],
    start: () => ({room: 0, hp: 10, potions: 2}),
    view: s => [['Salas superadas', s.room + ' / 4'], ['Vida', s.hp], ['Pociones', s.potions]],
    actions: (s, mode) => [
      ['Tomar poción', s.hp > 0 && s.hp < 10 && s.potions > 0 && s.room < 4, () => {
        s.potions--;
        s.hp = Math.min(10, s.hp + 4);
        return 'Poción usada.';
      }],
      ['Entrar en la sala', s.hp > 0 && s.room < 4, () => {
        const damage = [3, 4, 2, 5][s.room];
        s.hp = Math.max(0, s.hp - damage);
        if (!s.hp) return 'Caíste con ' + s.potions + ' pociones en la mochila.';
        s.room++;
        if (mode && s.room === 2) {
          s.potions = 2;
          return 'Golpe de ' + damage + '. El refugio repone tu reserva a dos.';
        }
        return 'Golpe de ' + damage + '.' + (s.room === 4 ? ' ¡Llegaste!' : '');
      }]
    ],
    hint: (s, mode) => mode ? 'Hay un refugio después de la sala 2.' : 'La reserva dura toda la expedición.'
  },
  'campear-ventana': {
    modes: ['Ventana fija', 'Flanco activo'],
    start: () => ({wave: 0, hp: 3, score: 0}),
    view: s => [['Oleadas', s.wave + ' / 6'], ['Vida', s.hp], ['Puntos', s.score]],
    hint: (s, mode) => mode && s.wave >= 2 ? 'El flanco está abierto. La ventana recibe daño.' : 'La ventana tiene cobertura frontal.',
    actions: (s, mode) => ['Cubrir la ventana', 'Moverse al pasillo'].map((label, position) =>
      [label, s.wave < 6 && s.hp > 0, () => {
        s.wave++;
        const flanked = mode && !position && s.wave >= 3;
        if (flanked) s.hp--;
        s.score += position ? 2 : 3;
        return !s.hp ? 'El flanco te dejó sin vida.' : flanked ? 'Te alcanzaron por el flanco.' : 'Oleada superada.';
      }])
  },
  'extraer-o-seguir': {
    modes: ['Salida por sala', 'Salida cada tres salas'],
    start: () => ({room: 0, bag: 0, bank: 0, runs: 0}),
    view: s => [['Sala', s.room + ' / 6'], ['En la mochila', s.bag], ['Asegurado', s.bank], ['Expediciones cerradas', s.runs]],
    hint: (s, mode) => s.room === 6 ? 'Ya puedes extraer.' : 'Riesgo de perder la expedición: ' + (10 + s.room * 8) + ' %. ' +
      (mode ? 'Salidas en salas 3 y 6.' : 'Salidas en todas las salas.'),
    actions: (s, mode) => [
      ['Avanzar', s.room < 6, () => {
        if (Math.random() * 100 < 10 + s.room * 8) {
          s.room = s.bag = 0;
          s.runs++;
          return 'Perdiste la mochila. Empieza otra expedición.';
        }
        s.room++;
        s.bag += 10;
        return 'Guardas diez monedas en la mochila.';
      }],
      ['Extraer', s.room > 0 && (!mode || s.room % 3 === 0), () => {
        s.bank += s.bag;
        s.room = s.bag = 0;
        s.runs++;
        return 'Botín asegurado. Empieza otra expedición.';
      }]
    ]
  },
  'botin-abre-rutas': {
    start: () => ({trip: 0, time: 0, gold: 0, filter: false}),
    view: s => [['Vueltas', s.trip + ' / 3'], ['Minutos', s.time], ['Monedas', s.gold], ['Filtro', s.filter ? 'Sí' : 'No']],
    hint: s => s.filter ? 'El filtro te deja pasar por el vapor.' : 'La rejilla está llena de vapor. El desvío tarda tres minutos.',
    actions: s => [
      ['Desvío y filtro', s.trip === 0, () => {
        s.filter = true;
        s.trip++;
        s.time += 3;
        return 'Conseguiste el filtro.';
      }],
      ['Desvío y monedas', s.trip < 3, () => {
        s.trip++;
        s.time += 3;
        s.gold += 12;
        return 'Doce monedas por el camino largo.';
      }],
      ['Cruzar la rejilla', s.trip < 3 && s.filter, () => {
        s.trip++;
        s.time++;
        s.gold += 8;
        return 'Ocho monedas por el atajo.';
      }]
    ]
  },
  'mina-compra-mina': {
    modes: ['Precio fijo', 'Precio creciente'],
    start: () => ({turn: 0, gold: 0, mines: 1}),
    view: (s, mode) => [['Turno', s.turn + ' / 12'], ['Oro', s.gold], ['Minas', s.mines], ['Oro por turno', s.mines * 4], ['Precio', 12 + (mode ? (s.mines - 1) * 8 : 0)]],
    hint: s => s.turn === 12 ? 'Cuenta el oro líquido al final.' : 'Puedes comprar antes de cerrar el turno.',
    actions: (s, mode) => {
      const price = 12 + (mode ? (s.mines - 1) * 8 : 0);
      return [
        ['Pasar turno', s.turn < 12, () => { s.turn++; s.gold += 4 * s.mines; return 'Cobras la producción.'; }],
        ['Comprar mina', s.turn < 12 && s.gold >= price, () => { s.gold -= price; s.mines++; return 'La nueva mina produce desde el siguiente cobro.'; }]
      ];
    }
  },
  'cofres-de-oro': {
    modes: ['Dos compras', 'Compras repetibles'],
    start: () => ({chests: 0, gold: 0, buys: 0, closed: false}),
    view: s => [['Cofres', s.chests + ' / 8'], ['Oro', s.gold], ['Mejoras', s.buys]],
    hint: (s, mode) => mode || s.buys < 2 ? 'La próxima mejora cuesta 30.' : 'La tienda ha vendido todas sus mejoras.',
    actions: (s, mode) => [
      ['Abrir cofre', s.chests < 8, () => { s.chests++; s.gold += 20; return 'Veinte monedas más.'; }],
      ['Comprar mejora', s.gold >= 30 && (mode || s.buys < 2), () => { s.gold -= 30; s.buys++; return 'Mejora comprada.'; }],
      ['Cerrar la prueba', s.chests === 8, () => { s.closed = true; return 'La tienda cierra por hoy.'; }]
    ]
  },
  'avisar-ataques': {
    modes: ['Aviso de 1,5 s', 'Aviso de 0,65 s'],
    start: () => ({round: 0, lane: 1, hits: 0, target: -1}),
    view: s => [['Ataques resueltos', s.round + ' / 3'], ['Tu carril', ['Izquierdo', 'Central', 'Derecho'][s.lane]], ['Golpes recibidos', s.hits]],
    hint: s => s.target < 0 ? 'Las flechas izquierda y derecha cambian de carril.' :
      '¡Ataque al carril ' + ['izquierdo', 'central', 'derecho'][s.target] + '!',
    actions: (s, mode, schedule) => [
      ['← Izquierda', s.lane > 0, () => { s.lane--; }],
      ['Derecha →', s.lane < 2, () => { s.lane++; }],
      ['Lanzar ataque', s.round < 3 && s.target < 0, () => {
        s.target = [1, 0, 2][s.round];
        schedule(() => {
          const hit = s.lane === s.target;
          if (hit) s.hits++;
          s.target = -1;
          s.round++;
          return hit ? 'Te alcanzó.' : 'Esquivaste el ataque.';
        }, mode ? 650 : 1500);
        return '';
      }]
    ]
  },
  'armas-situacionales': {
    modes: ['Pasillos', 'Campo abierto'],
    start: () => ({round: 0, hits: 0, ammo: 0}),
    view: s => [['Encuentros', s.round + ' / 4'], ['Resueltos de un tiro', s.hits], ['Disparos necesarios', s.ammo]],
    hint: (s, mode) => s.round >= 4 ? 'Ronda completa.' :
      'Distancia del próximo encuentro: ' + ((s.round === 3 ? !mode : Boolean(mode)) ? 'lejos.' : 'cerca.'),
    actions: (s, mode) => ['Escopeta', 'Rifle'].map((label, weapon) =>
      [label, s.round < 4, () => {
        const far = s.round === 3 ? !mode : Boolean(mode);
        const quick = far === Boolean(weapon);
        s.round++;
        s.ammo += quick ? 1 : 3;
        if (quick) s.hits++;
        return quick ? 'Resuelto con un disparo.' : 'Hicieron falta tres disparos.';
      }])
  }
};

const mapMoves = [[0,-1],[-1,0],[1,0],[0,1]];
const mapDirections = ['↑ Norte', '← Oeste', 'Este →', 'Sur ↓'];

function mapActions(state, canMove, onMove) {
  return mapMoves.map(([dx,dy], i) => {
    const x = state.x + dx, y = state.y + dy;
    return [mapDirections[i], !state.done && canMove(x,y), () => {
      state.x = x;
      state.y = y;
      state.steps++;
      return onMove();
    }];
  });
}

function levelGrid(width, height, describe) {
  return Array.from({length:height}, (_,y) =>
    Array.from({length:width}, (_,x) => describe(x,y)));
}

const town = ['##...##','##.#.##','.......','.#.#.#.','.......'];
const walkTown = (x,y) => town[y]?.[x] === '.';
const sightRoom = ['..#....','..#....','.......','..#....','.......'];
const walkSightRoom = (x,y) => sightRoom[y]?.[x] === '.';
const levelLabs = {
  'hitos-orientacion': {
    modes: ['Sin torre', 'Con torre'],
    start: () => ({x:1,y:4,steps:0,returning:false,done:false}),
    view: s => [['Pasos', s.steps], ['Objetivo', s.returning ? 'Volver a casa' : 'Llegar a la plaza']],
    hint: (s, mode) => {
      if (s.done) return 'Has vuelto a casa.';
      const task = s.returning ? 'Regresa a casa.' : 'Ve a la plaza del extremo noreste.';
      const bearing = [s.y > 0 ? 'al norte' : '', s.x === 3 ? '' : s.x > 3 ? 'al oeste' : 'al este'].filter(Boolean);
      return task + (mode ? bearing.length ? ' La torre queda ' + bearing.join(' y ') + '.' : ' Estás junto a la torre.' : '');
    },
    board: (s, mode) => levelGrid(3,3,(col,row) => {
      const x = s.x+col-1, y = s.y+row-1;
      if (col === 1 && row === 1) return ['player','Tú'];
      if (x === 1 && y === 4) return ['goal','Casa'];
      if (x === 4 && y === 0) return ['goal','Plaza'];
      if (mode && x === 3 && y === 0) return ['goal','Torre'];
      return walkTown(x,y) ? ['floor',''] : ['wall',''];
    }),
    actions: s => mapActions(s,walkTown,() => {
      if (s.x === 4 && s.y === 0) { s.returning = true; return 'Llegaste a la plaza.'; }
      if (s.returning && s.x === 1 && s.y === 4) { s.done = true; return 'Has vuelto a casa.'; }
      return '';
    })
  },
  'atajos-rutas': {
    modes: ['Puerta bloqueada', 'Puerta desbloqueable'],
    start: () => ({node:0,legs:0,steps:0,items:0,open:false}),
    view: s => [['Vueltas', s.legs + ' / 2'], ['Minutos', s.steps], ['Recursos', s.items]],
    hint: s => s.legs === 2 ? 'Recorrido completo.' : s.node ? 'Estás en el patio. Puedes volver a la entrada.' : 'Estás en la entrada. Llega al patio y vuelve.',
    board: s => [[['floor','Ruta larga · 3'],['goal','Recursos'],['floor','Ruta larga · 3']],[
      [s.node ? 'floor' : 'player','Entrada'],[s.open ? 'goal' : 'wall',s.open ? 'Atajo · 1' : 'Cerrado'],[s.node ? 'player' : 'floor','Patio']]],
    actions: (s,mode) => {
      const travel = fast => {
        s.steps += fast ? 1 : 3;
        if (!fast && s.items < 2) s.items++;
        if (s.node) s.legs++;
        s.node = 1-s.node;
        return fast ? 'Pasaste por el atajo.' : 'Recorriste el camino largo.';
      };
      return [
        ['Ruta larga',s.legs < 2,() => travel(false)],
        ['Abrir atajo',mode === 1 && s.node === 1 && !s.open,() => { s.open = true; return 'El atajo queda abierto.'; }],
        ['Tomar atajo',s.legs < 2 && s.open,() => travel(true)]
      ];
    }
  },
  'anticipacion-revelacion': {
    modes: ['Meta visible', 'Meta oculta'],
    start: () => ({x:0,y:2,steps:0,done:false}),
    view: s => [['Pasos',s.steps],['Llegada',s.done ? 'Alcanzada' : 'Pendiente']],
    hint: (s,mode) => s.done ? 'Encontraste la salida.' : mode && s.x < 3 ? 'El muro tapa el otro lado de la sala.' : 'La salida queda abajo a la derecha.',
    board: (s,mode) => levelGrid(7,5,(x,y) => {
      if (x===s.x && y===s.y) return ['player','Tú'];
      if (mode && s.x < 3 && x >= 3) return ['unknown',''];
      if (x===6 && y===4) return ['goal','Salida'];
      return walkSightRoom(x,y) ? ['floor',''] : ['wall',''];
    }),
    actions: s => mapActions(s,walkSightRoom,() => {
      s.done = s.x === 6 && s.y === 4;
      return s.done ? 'Llegaste a la salida.' : '';
    })
  },
  'ensenar-puzle-espacio': {
    modes: ['Puerta a la vista', 'Puerta tras el muro'],
    start: () => ({x:0,y:2,steps:0,open:false,done:false}),
    view: s => [['Pasos', s.steps], ['Interruptor',s.open ? 'Activado' : 'Sin activar']],
    hint: s => s.done ? 'Atravesaste la puerta.' : s.open ? 'Oíste abrirse una puerta. Encuentra el paso.' : 'Busca y activa el interruptor.',
    board: (s,mode) => levelGrid(7,5,(x,y) => {
      if (x===s.x && y===s.y) return ['player','Tú'];
      if (mode && s.x < 3 && x >= 3) return ['unknown',''];
      if (x===6 && y===2) return [s.open ? 'goal' : 'wall',s.open ? 'Abierta' : 'Puerta'];
      if (x===1 && y===1) return ['goal','Mando'];
      return walkSightRoom(x,y) ? ['floor',''] : ['wall',''];
    }),
    actions: s => [
      ...mapActions(s,(x,y) => walkSightRoom(x,y) && (s.open || x!==6 || y!==2),() => {
        s.done = s.x===6 && s.y===2;
        return s.done ? 'Atravesaste la puerta.' : '';
      }),
      ['Activar interruptor',s.x===1 && s.y===1 && !s.open,() => { s.open = true; return 'Clic. Se abrió el paso.'; }]
    ]
  },
  'cobertura-lineas-vision': {
    modes: ['Cobertura central', 'Cobertura lateral'],
    start: () => ({x:0,y:2,steps:0,hits:0,done:false}),
    view: s => [['Pasos',s.steps],['Casillas expuestas',s.hits]],
    hint: s => s.done ? 'Llegaste a la salida.' : 'Los vigilantes miran a la izquierda. El rayado señala las casillas expuestas.',
    board: (s,mode) => levelGrid(7,5,(x,y) => {
      if (x===s.x && y===s.y) return ['player','Tú'];
      if (x===6 && y===2) return ['goal','Salida'];
      if (x===6 && [1,3].includes(y)) return ['hazard','Vigía'];
      if (isCover(x,y,mode)) return ['wall','Muro'];
      return exposed(x,y,mode) ? ['hazard',''] : ['floor',''];
    }),
    actions: (s,mode) => mapActions(s,(x,y) => x>=0 && x<7 && y>=0 && y<5 &&
      !isCover(x,y,mode) && !(x===6 && [1,3].includes(y)),() => {
      if (exposed(s.x,s.y,mode)) s.hits++;
      s.done = s.x===6 && s.y===2;
      return s.done ? 'Llegaste a la salida.' : exposed(s.x,s.y,mode) ? 'El vigía te vio en esta casilla.' : '';
    })
  },
  'combinar-obstaculos': {
    modes: ['Secuencia de aprendizaje', 'Combinación directa'],
    start: () => ({stage:0,beat:0,tries:0,done:false}),
    view: s => [['Pulso',s.beat],['Fallos',s.tries]],
    hint: (s,mode) => s.done ? 'Obstáculo superado.' :
      (mode || s.stage===2 ? 'Espera a que la plataforma y el paso estén listos a la vez.' :
        s.stage===0 ? 'Practica cuándo llega la plataforma.' : 'Practica cuándo se abre el paso.'),
    board: (s,mode) => [[['player','Tú'],
      mode || s.stage!==1 ? [s.beat%2===0?'goal':'wall',s.beat%2===0?'Plataforma lista':'Plataforma lejos'] : ['floor','Suelo'],
      mode || s.stage!==0 ? [s.beat%3===1?'goal':'hazard',s.beat%3===1?'Paso abierto':'Paso cerrado'] : ['floor','Paso libre'],
      ['goal','Meta']]],
    actions: (s,mode) => [
      ['Esperar un pulso',!s.done,() => { s.beat++; return ''; }],
      ['Cruzar',!s.done,() => {
        const needPlatform = mode || s.stage!==1, needGate = mode || s.stage!==0;
        if ((needPlatform && s.beat%2!==0) || (needGate && s.beat%3!==1)) {
          s.tries++;
          s.beat++;
          return 'El obstáculo no estaba listo. Avanzó un pulso.';
        }
        if (mode || s.stage===2) { s.done = true; return 'Combinación superada.'; }
        s.stage++;
        s.beat=0;
        return 'Práctica superada. Pasa al siguiente tramo.';
      }]
    ]
  }
};

function isCover(x,y,mode) {
  return mode ? x===4 && [1,3,4].includes(y) : x===2 && y>=1 && y<=3;
}

function exposed(x,y,mode) {
  return [1,3].includes(y) && x<6 && x>(mode ? 4 : 2);
}

const narrativeLabs = {
  'decisiones-consecuencias': {
    modes: ['Resultado inmediato', 'Resultado al regresar'],
    start: () => ({choice:-1, back:false}),
    view: s => [['Escena', s.back ? 'Refugio' : 'Camino']],
    hint: (s,mode) => {
      if (s.choice < 0) return 'Una vecina necesita llegar al refugio. También puedes vigilar los suministros.';
      if (mode && !s.back) return 'Continúas hacia el refugio. Allí sabrás cómo acabó todo.';
      return s.choice === 0 ? 'La vecina llegó contigo. Alguien se llevó una caja.' : 'Salvaste la caja. La vecina tuvo que pasar la noche fuera.';
    },
    actions: s => [
      ['Acompañar a la vecina', s.choice < 0, () => { s.choice = 0; return ''; }],
      ['Vigilar la caja', s.choice < 0, () => { s.choice = 1; return ''; }],
      ['Volver al refugio', s.choice >= 0 && !s.back, () => { s.back = true; return ''; }]
    ]
  },
  'dialogos-ramificados': {
    modes: ['Solo importa el diálogo', 'El diálogo recuerda acciones'],
    start: () => ({book:0, result:''}),
    view: s => [['Cuaderno', ['Pendiente','Devuelto','Guardado'][s.book]]],
    hint: s => s.result || (s.book ? 'La guardiana te pregunta qué buscas.' : 'Encuentras el cuaderno de la guardiana.'),
    actions: (s,mode) => [
      ['Devolver el cuaderno', !s.book, () => { s.book=1; return ''; }],
      ['Guardar el cuaderno', !s.book, () => { s.book=2; return ''; }],
      ['Pedir la pista con calma', s.book>0 && !s.result, () => {
        s.result = mode && s.book===2 ? 'Guardiana: He perdido mi cuaderno. Hoy no tengo ganas de hablar.' :
          (mode ? 'Guardiana: Gracias por devolverme el cuaderno. ' : 'Guardiana: ') + 'Busca detrás del reloj.';
        return '';
      }],
      ['Exigir la pista', s.book>0 && !s.result, () => { s.result = 'Guardiana: Con esas maneras, busca por tu cuenta.'; return ''; }]
    ]
  },
  'narrativa-ambiental': {
    modes: ['Taller con nota', 'Solo pistas del entorno'],
    start: () => ({clues:0, done:false}),
    view: s => [['Pistas examinadas', [1,2,4].filter(bit => s.clues & bit).length]],
    hint: s => s.done ? 'Caso cerrado. ¿Qué pista te convenció?' : 'El taller está vacío. Examina lo que dejaron antes de responder.',
    actions: (s,mode) => {
      const ready = !s.done && ((s.clues & 3) === 3 || Boolean(s.clues & 4));
      return [
        ['Examinar la pared', !s.done, () => { s.clues |= 1; return 'Una línea de barro recorre la pared a la altura de la cintura.'; }],
        ['Examinar el carro', !s.done, () => { s.clues |= 2; return 'Lo subieron a una mesa junto con las herramientas que aún están secas.'; }],
        ['Leer la nota', !mode && !s.done, () => { s.clues |= 4; return 'Nota: El agua volvió a entrar. Subid las herramientas y salid.'; }],
        ['Hubo una inundación', ready, () => { s.done = true; return 'La marca del agua y el carro elevado encajan con esa lectura.'; }],
        ['Hubo un robo', ready, () => 'La hipótesis no explica la marca de barro ni por qué están las herramientas sobre la mesa.']
      ];
    }
  },
  'narrativa-mecanicas': {
    modes: ['Reserva común', 'Inventario personal'],
    start: () => ({items:3,given:0,done:false}),
    view: s => [['Raciones en la mochila', s.items], ['Raciones donadas',s.given]],
    hint: (s,mode) => s.done ? 'Terminó la escena.' : 'El viaje pide dos raciones. ' +
      (mode ? 'Las donaciones salen de tu mochila.' : 'Las donaciones salen de una reserva común.'),
    actions: (s,mode) => [
      ['Donar una ración', !s.done && s.given < 2, () => { s.given++; if(mode)s.items--; return 'El refugio recibe una ración.'; }],
      ['Emprender el viaje', !s.done, () => {
        s.done=true;
        return s.items >= 2 ? 'Tienes comida suficiente para salir.' : 'Te quedas en el refugio. Te falta una ración para el viaje.';
      }]
    ]
  },
  'voz-personaje-traduccion': {
    start: () => ({round:0,lines:[]}),
    view: s => [['Réplicas elegidas',s.round+' / 2']],
    hint: s => ['El casco está abollado. La capitana se burla: “Nice parking.”',
      'El motor arranca a la tercera. La misma capitana remata: “About time.”',
      'Escena completa. Capitana: «' + s.lines.join('» / «') + '».'][s.round],
    actions: s => [
      ['Lectura literal: «'+(['Qué buen aparcamiento','Ya iba siendo hora'][s.round] ?? 'Terminada')+'»',s.round < 2,() => {
        s.lines.push(['Qué buen aparcamiento','Ya iba siendo hora'][s.round++]);
        return 'Leída con énfasis suficiente, la ironía también puede funcionar.';
      }],
      ['Adaptar el tono: «'+(['Menudo aterrizaje','Ya le costaba'][s.round] ?? 'Terminada')+'»',s.round < 2,() => {
        s.lines.push(['Menudo aterrizaje','Ya le costaba'][s.round++]);
        return 'La frase se ajusta al registro informal. Comprueba si conserva la intención.';
      }]
    ]
  },
  'traducir-con-contexto': {
    modes: ['Solo la línea', 'Línea y contexto'],
    start: () => ({round:0, fixes:0}),
    view: s => [['Líneas revisadas',s.round+' / 2'],['Correcciones',s.fixes]],
    hint: (s,mode) => s.round === 2 ? 'Revisión terminada.' : 'Original: “You’re clear.”' +
      (mode ? (s.round ? ' Por radio, el equipo confirma que ya no hay peligro.' : ' En un control, una guardia te autoriza a entrar.') : ''),
    actions: s => ['Puedes pasar', 'Estás a salvo'].map((line,i) => [line,s.round < 2,() => {
      const round = s.round++;
      const match = i===round;
      if(!match)s.fixes++;
      return (round ? 'Escena: el equipo confirma que ya no hay peligro. ' : 'Escena: la guardia autoriza el paso. ') +
        (match ? 'La traducción cumple esa función.' : 'Cambia la traducción para que cumpla esa función.');
    }])
  }
};

const uxLabs = {
  'prioridad-hud': {
    modes: ['Datos en una lista', 'Datos agrupados por tarea'],
    start: () => ({round:0, correct:0}),
    view: (s,mode) => {
      const all = [['Vida','28 / 100'],['Oro','140'],['Munición','2 / 12'],['Fichas','3'],['Armadura','60'],['Llaves','2']];
      return mode ? [all[0],all[4],all[2],all[1],all[3],all[5]] : all;
    },
    hint: s => ['Tu arma necesita tres balas. ¿Qué indicador compruebas antes de disparar?',
      'Vas a cruzar una zona que quita 30 puntos de vida e ignora la armadura. ¿Qué indicador miras?',
      'Prueba terminada. Respuestas correctas: ' + s.correct + ' de 2.'][s.round],
    actions: s => ['Vida','Armadura','Munición'].map((name,i) => [name,s.round<2,() => {
      const ok = i === [2,0][s.round++];
      if(ok)s.correct++;
      return ok ? 'Ese era el indicador que necesitabas.' : 'La tarea dependía de otro indicador.';
    }])
  },
  'estado-de-accion': {
    modes: ['Resultado al final', 'Confirmación y resultado'],
    start: () => ({pending:false, done:false, retries:0}),
    view: s => [['Pulsaciones repetidas',s.retries]],
    hint: (s,mode) => s.done ? 'Tu partida se ha guardado.' : mode && s.pending ? 'Guardando…' : 'Puedes guardar la partida.',
    actions: (s,mode,schedule) => [
      ['Guardar partida',!s.done,() => {
        if(s.pending){s.retries++;return '';}
        s.pending=true;
        schedule(() => { s.pending=false; s.done=true; return 'Guardado completado.'; },2200);
        return '';
      }]
    ]
  },
  'instrucciones-a-tiempo': {
    modes: ['Instrucciones al inicio', 'Instrucciones durante la tarea'],
    start: () => ({step:0, mistakes:0}),
    view: s => [['Tareas',s.step+' / 3'],['Errores',s.mistakes]],
    hint: (s,mode) => {
      if(s.step===3)return 'Ejercicio completado.';
      const tasks=['La caja está fuera de sitio.','La caja está en posición.','La caja está cerrada.'];
      const tips=['Usa Mover para colocar la caja.','Usa Sellar para cerrar la caja.','Usa Enviar para despacharla.'];
      return tasks[s.step]+' '+(mode ? tips[s.step] : s.step===0 ? tips.join(' ') : '');
    },
    actions: s => ['Mover','Sellar','Enviar'].map((name,i)=>[name,s.step<3,()=>{
      if(i!==s.step){s.mistakes++;return 'Esa acción no toca todavía.';}
      s.step++;
      return 'Paso completado.';
    }])
  },
  'tamano-texto-interfaz': {
    modes: ['Texto base', 'Texto ampliado'],
    largeText: true,
    start: () => ({selected:false,received:false}),
    view: s => [['Alerta','La compuerta norte cierra en 15 segundos.'],['Ruta disponible','Compuerta sur'],['Estado',s.received ? 'Ruta confirmada' : s.selected ? 'Ruta seleccionada' : 'Ruta pendiente']],
    hint: s => s.received ? 'Ruta confirmada. Prueba el otro tamaño y estrecha la ventana para comparar.' : 'Selecciona la ruta y confírmala. Comprueba qué ocurre con las líneas largas al estrechar la ventana.',
    actions: s => [
      ['Usar la compuerta sur',!s.selected,()=>{s.selected=true;return 'Ruta seleccionada.';}],
      ['Confirmar ruta',s.selected&&!s.received,()=>{s.received=true;return 'Confirmación recibida.';}]
    ]
  }
};

const labBriefs = {
  "iniciativa-combate": ["Juega seis intercambios contra el mismo rival.", "Repite tus jugadas en la otra variante y compara puntos.", (s, mode) => s.round === 6],
  "roles-cooperativos": ["Jugad en pareja y encontrad tres puertas.", "Pasad la pantalla al cambiar de turno. Al repetir, intercambiad papeles.", (s, mode) => s.round === 3],
  "ritmo-en-rondas": ["Prepara el equipo y supera cuatro rondas.", "Compara cuántas acciones de preparación necesitas para evitar el daño.", (s, mode) => s.round === 4],
  "reinicio-tras-fallar": ["Llega al encuentro final, falla y vuelve a intentarlo.", "Cuenta los pasos que repites en cada variante.", (s, mode) => s.done],
  "descuentos-inventario": ["Guarda dos llaves y al menos dos consumibles.", "Mira si el paquete sigue compensando cuando la mochila se llena.", (s, mode) => s.keys === 2 && s.items >= 2],
  "mejorar-o-cambiar-arma": ["Resuelve cuatro encuentros con espada o lanza.", "Compara qué puedes mejorar con y sin recuperar materiales.", (s, mode) => s.round === 4],
  "vida-y-ventanas": ["Ataca cuando se abra la guardia.", "Compara el tiempo y el daño con más vida o con menos oportunidades.", (s, mode) => s.hits === (mode ? 4 : 6)],
  "ayudas-dificultad": ["Responde a las tres señales en orden.", "Tras dos fallos, fíjate en qué te aporta cada forma de ayuda.", (s, mode) => s.step === 3],
  "pociones-para-luego": ["Cruza cuatro salas con la vida que tienes.", "Compara cuántas pociones te quedan cuando llegas al final o caes.", (s, mode) => s.room === 4 || s.hp <= 0],
  "campear-ventana": ["Aguanta seis oleadas desde la ventana o el pasillo.", "Compara cuándo te conviene moverte y cuántos puntos consigues.", (s, mode) => s.wave === 6 || s.hp <= 0],
  "extraer-o-seguir": ["Juega tres expediciones y pon a salvo el botín que puedas.", "Cada huida o derrota cuenta como una expedición. Compara lo que lograste guardar.", (s, mode) => s.runs >= 3],
  "botin-abre-rutas": ["Da tres vueltas y elige entre el filtro y las monedas.", "Compara lo que ahorras de tiempo con lo que renuncias a recoger.", (s, mode) => s.trip === 3],
  "mina-compra-mina": ["Tienes doce turnos para invertir o guardar el oro.", "Repite la misma política de compras y compara el oro final.", (s, mode) => s.turn === 12],
  "cofres-de-oro": ["Decide qué hacer con el oro de ocho cofres.", "Al abrir el último cofre aún puedes comprar. Cierra la prueba cuando hayas acabado.", (s, mode) => s.closed],
  "avisar-ataques": ["Esquiva tres ataques cambiando de carril.", "Prueba los dos tiempos de aviso. Usa las flechas o los botones.", (s, mode) => s.round === 3],
  "armas-situacionales": ["Escoge un arma para cada uno de los cuatro encuentros.", "Compara los disparos que gastas cuando cambia la distancia habitual.", (s, mode) => s.round === 4],
  "hitos-orientacion": ["Encuentra la plaza y vuelve a casa.", "Muévete con las flechas o con los botones. Compara los pasos con y sin torre.", (s, mode) => s.done],
  "atajos-rutas": ["Completa dos viajes de ida y vuelta.", "Abre el atajo desde el patio y compara el tiempo y los recursos.", (s, mode) => s.legs === 2],
  "anticipacion-revelacion": ["Encuentra la salida de la sala.", "Usa las flechas o los botones. Fíjate en cuándo ves la meta y qué camino tomas.", (s, mode) => s.done],
  "ensenar-puzle-espacio": ["Busca el mando y cruza la puerta que abre.", "Usa las flechas o los botones. Fíjate en qué pista te dice dónde está la puerta.", (s, mode) => s.done],
  "cobertura-lineas-vision": ["Llega a la salida intentando pasar desapercibido.", "Muévete con las flechas o los botones. Compara pasos y casillas expuestas.", (s, mode) => s.done],
  "combinar-obstaculos": ["Cruza cuando coincidan la plataforma y el paso abierto.", "Compara cuántos fallos tienes con y sin práctica previa.", (s, mode) => s.done],
  "decisiones-consecuencias": ["Elige a quién o qué proteger y regresa al refugio.", "Fíjate en cuándo entiendes la consecuencia de tu decisión.", (s, mode) => s.back],
  "dialogos-ramificados": ["Decide qué hacer con el cuaderno y habla con la guardiana.", "Repite la misma respuesta con y sin memoria de lo que hiciste.", (s, mode) => Boolean(s.result)],
  "narrativa-ambiental": ["Examina el taller y decide qué pasó.", "Compara lo que deduces al leer la nota y al mirar los objetos.", (s, mode) => s.done],
  "narrativa-mecanicas": ["Decide cuánta comida donar antes de viajar.", "Compara qué eliges cuando la comida sale de tu propia mochila.", (s, mode) => s.done],
  "voz-personaje-traduccion": ["Traduce las dos réplicas de la capitana y lee la escena final.", "Vuelve a jugar con otra mezcla y comprueba cómo cambia su voz.", (s, mode) => s.round === 2],
  "traducir-con-contexto": ["Traduce la misma frase en dos escenas.", "Compara cuántas correcciones haces con y sin contexto.", (s, mode) => s.round === 2],
  "prioridad-hud": ["Encuentra el indicador que necesitas para cada tarea.", "Compara dónde miras primero en las dos distribuciones.", (s, mode) => s.round === 2],
  "estado-de-accion": ["Guarda la partida y espera a que termine.", "Fíjate en si vuelves a pulsar cuando el juego no avisa de que está guardando.", (s, mode) => s.done],
  "instrucciones-a-tiempo": ["Mueve, sella y envía una caja.", "Compara los pasos que te cuestan cuando la ayuda aparece al inicio o sobre la marcha.", (s, mode) => s.step === 3],
  "tamano-texto-interfaz": ["Selecciona y confirma la ruta de salida.", "Estrecha la ventana y comprueba si sigues viendo el aviso y los botones.", (s, mode) => s.received]
};

function addSystemLab(config, id) {
  const lab = element('section', '', 'referencias laboratorio-sistemas');
  lab.setAttribute('aria-label', 'Prueba jugable');
  const [goal, tip, isFinished] = labBriefs[id] ?? ['', '', () => false];
  const intro = element('div', '', 'lab-intro');
  intro.append(element('h3', goal || 'Ponte a prueba'), element('p', tip));
  const toolbar = element('div', '', 'lab-herramientas');
  lab.append(intro, toolbar);
  lab.tabIndex = 0;
  const lanes = id === 'avisar-ataques' ? element('div', '', 'lab-carriles') : null;
  if (lanes) lanes.setAttribute('aria-hidden', 'true');
  const board = config.board ? element('div', '', 'tablero-nivel') : null;
  if (board) {
    board.setAttribute('role', 'group');
    board.setAttribute('aria-label', 'Plano del nivel');
  }
  let state = config.start();
  let mode = 0;
  let timer;
  let recorded = false;
  const attempts = new Map();
  const stats = element('dl', '', 'lab-estadisticas');
  const hint = element('p', '', 'lab-situacion');
  hint.setAttribute('role', 'status');
  const feedback = element('p', '', 'lab-respuesta');
  feedback.setAttribute('role', 'status');
  const controls = element('div', '', 'lab-botones');
  const recap = element('section', '', 'lab-resumen');
  recap.hidden = true;

  const reset = () => {
    clearTimeout(timer);
    state = config.start();
    recorded = false;
    feedback.textContent = '';
    render();
  };

  const select = config.modes ? element('select', '') : null;
  if (select) {
    const label = element('label', 'Modo de prueba');
    for (const name of config.modes) select.append(element('option', name));
    select.addEventListener('change', () => {
      mode = select.selectedIndex;
      reset();
    });
    label.append(select);
    toolbar.append(label);
  }

  const resetButton = element('button', 'Empezar de nuevo', 'lab-reiniciar');
  resetButton.type = 'button';
  resetButton.addEventListener('click', reset);
  toolbar.append(resetButton);
  lab.append(hint, stats);
  if (lanes) lab.append(lanes);
  if (board) lab.append(board);
  lab.append(controls, feedback, recap);
  const schedule = (finish, delay) => {
    timer = setTimeout(() => {
      feedback.textContent = finish();
      render();
    }, delay);
  };
  const actions = config.actions(state, mode, schedule);
  const buttons = actions.map(([name], index) => {
    const button = element('button', name);
    button.type = 'button';
    button.addEventListener('click', () => act(index));
    return button;
  });

  function act(index) {
    const [, available, run] = config.actions(state, mode, schedule)[index];
    if (!available || isFinished(state, mode)) return;
    const message = run();
    if (message !== undefined) feedback.textContent = message;
    render();
  }

  function render() {
    const finished = isFinished(state, mode);
    if (config.largeText) lab.classList.toggle('texto-ampliado', Boolean(mode));
    if (id === 'prioridad-hud') lab.classList.toggle('hud-agrupado', Boolean(mode));
    stats.replaceChildren(...config.view(state, mode).map(([name, value]) => {
      const stat = element('div', '');
      stat.append(element('dt', name), element('dd', String(value)));
      return stat;
    }));
    if (lanes) lanes.replaceChildren(...['Izquierdo', 'Central', 'Derecho'].map((name, i) => {
      const lane = element('div', name);
      if (state.target === i) lane.append(element('strong', 'Ataque'));
      if (state.lane === i) lane.append(element('span', 'Tú'));
      lane.classList.toggle('amenaza', state.target === i);
      return lane;
    }));
    if (board) {
      const tileNames = {player:'Jugador', goal:'Punto de interés', floor:'Camino', wall:'Bloqueado', unknown:'Oculto', hazard:'Peligro'};
      board.replaceChildren(...config.board(state, mode).map((row, i) => {
        const line = element('div', '', 'fila-nivel');
        line.style.gridTemplateColumns = 'repeat(' + row.length + ', minmax(0, 1fr))';
        line.setAttribute('role', 'group');
        line.setAttribute('aria-label', 'Fila ' + (i+1));
        line.append(...row.map(([kind,label], col) => {
          const tile = element('span', label, 'casilla-nivel casilla-nivel--' + kind);
          tile.setAttribute('role', 'img');
          tile.setAttribute('aria-label', 'Columna ' + (col+1) + ': ' + (label || tileNames[kind]));
          return tile;
        }));
        return line;
      }));
    }
    const nextHint = config.hint(state, mode);
    if (hint.textContent !== nextHint) hint.textContent = nextHint;
    config.actions(state, mode, schedule).forEach(([name, available], index) => {
      if (buttons[index].textContent !== name) buttons[index].textContent = name;
      buttons[index].setAttribute('aria-disabled', String(!available || finished));
    });
    recap.hidden = !finished;
    if (!finished || recorded) return;
    recorded = true;
    attempts.set(mode, config.view(state, mode));
    const title = element('h3', attempts.size > 1 ? 'Así te fue en cada modo' : 'Prueba terminada');
    const summary = element('div', '', 'lab-resultados');
    for (const [variant, values] of attempts) {
      const group = element('div', '', 'lab-intento');
      if (select) group.append(element('h4', config.modes[variant]));
      const list = element('ul', '');
      for (const [label,value] of values) list.append(element('li', label + ': ' + value));
      group.append(list);
      summary.append(group);
    }
    recap.replaceChildren(title, summary);
    if (select && config.modes.length > 1) {
      const compare = element('button', 'Probar otro modo');
      compare.type = 'button';
      compare.addEventListener('click', () => {
        mode = (mode + 1) % config.modes.length;
        select.selectedIndex = mode;
        reset();
        select.focus();
      });
      recap.append(compare);
    }
  }

  if (Object.hasOwn(levelLabs, id) && actions[0]?.[0] === mapDirections[0]) {
    lab.addEventListener('keydown', event => {
      const index = ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'].indexOf(event.key);
      if (event.target.tagName === 'SELECT' || index < 0) return;
      event.preventDefault();
      act(index);
    });
  }
  if (id === 'avisar-ataques') lab.addEventListener('keydown', event => {
    if (event.target.tagName === 'SELECT' || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    act(event.key === 'ArrowLeft' ? 0 : 1);
  });
  controls.append(...buttons);
  reading.append(lab);
  render();
}

function addDashLab(is3D) {
  const lab = element('section', '', 'laboratorio-salto laboratorio-mecanica');
  const canvas = element('canvas', 'Prueba de desplazamiento rápido.');
  canvas.width = 680;
  canvas.height = is3D ? 320 : 252;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Laboratorio de dash. Usa las flechas o WASD, Espacio para dash y R para reiniciar.');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const options = element('div', '', 'ajustes-salto');
  const status = element('p', '', 'estado-laboratorio');
  status.setAttribute('role', 'status');
  const label = element('label', 'Variante');
  const select = element('select', '');
  const variants = is3D ? ['Dirección fija', 'Con giro', 'Protección contra daño'] :
    ['Horizontal', 'En ocho direcciones', 'Con recarga en el aire'];
  variants.forEach(name => select.append(element('option', name)));
  label.append(select);
  const view = is3D ? document.querySelector('#plantilla-salto-3d').content
    .querySelector('[data-vista-3d]').cloneNode(true) : null;
  if (view) {
    const viewLabel = element('label', 'Vista');
    viewLabel.append(view);
    options.append(viewLabel);
  }
  options.append(label);
  const controls = is3D
    ? 'Llega a la bandera. Haz clic en la prueba y usa WASD o las flechas. Pulsa Espacio para el dash y R para volver al inicio. En primera y tercera persona, W avanza y A/D te llevan a los lados.'
    : 'Cruza el foso y llega a la bandera. Haz clic en la prueba. Usa A/D o las flechas para moverte, J para saltar, Espacio para el dash y R para volver al inicio.';
  const instructions = element('p', controls);
  instructions.id = is3D ? 'controles-dash-3d' : 'controles-dash-2d';
  canvas.setAttribute('aria-describedby', instructions.id);
  lab.append(options, instructions, canvas, status);
  reading.append(lab);

  const keys = new Set();
  const duration = .16;
  const bounds = { left: 18, right: 662, near: 15, far: 185 };
  const floor = 205;
  const goal = { x: 607, end: 656, near: 76, far: 123 };
  const wall3D = { x: 293, z: 60, w: 31, d: 87 };
  const hazard = { x: 463, w: 33, gate: 62 };
  const pit = { start: 245, end: 384 };
  let state;
  let lastTime;
  let frame = null;

  function report(message) {
    if (status.textContent !== message) status.textContent = message;
  }

  function reset(message = 'Busca la ruta hasta la meta.') {
    state = { x: 70, y: floor - 11, z: 100, vy: 0, facing: 1, ground: true,
      left: 0, cooldown: 0, charges: select.selectedIndex === 2 && !is3D ? 2 : 1,
      direction: [1, 0], finished: false };
    report(message);
    draw();
  }

  function axes() {
    const held = (...names) => names.some(name => keys.has(name));
    const x = Number(held('arrowright', 'd')) - Number(held('arrowleft', 'a'));
    const y = Number(held('arrowdown', 's')) - Number(held('arrowup', 'w'));
    const length = Math.hypot(x, y);
    if (!length) return [0, 0];
    return view && perspectiveLabView(view.value) ? [-y / length, x / length] : [x / length, y / length];
  }

  function dash() {
    if (state.finished || state.left > 0) return;
    if (state.cooldown > 0 || (!is3D && state.charges === 0)) {
      report(is3D ? 'El dash aún se está recargando.' : 'Sin cargas. Aterriza para reponerlas.');
      return;
    }
    let [x, y] = axes();
    if (!is3D && select.selectedIndex === 0) { x = Math.sign(x); y = 0; }
    state.direction = x || y ? [x, y] : [view && perspectiveLabView(view.value) ? 1 : state.facing, 0];
    state.left = duration;
    if (!is3D) { state.charges--; state.vy = 0; }
    report('Dash en marcha.');
  }

  function draw() {
    if (is3D) {
      const worldX = x => x / 79;
      const worldZ = z => (z - 100) / 50;
      const x = worldX(state.x), z = worldZ(state.z);
      const { overhead, perspective, path, polygon, paintBackground, paintPlayer, paintShadow } =
        labCamera(ctx, view.value, x, 0, z);
      const toWorld = points => points.map(([x,z,y]) => [worldX(x),worldZ(z),y]);
      const face = (points, color) => polygon(toWorld(points), color);
      const tile = (left, right, near, far, color, y = 0) =>
        face([[left,near,y],[right,near,y],[right,far,y],[left,far,y]], color);
      const {left, right, near, far} = bounds;
      paintBackground();
      if (!overhead) {
        face([[left,far],[right,far],[right,far,-.3],[left,far,-.3]], labColors.face);
        if (perspective) face([[left,near],[left,far],[left,far,-.3],[left,near,-.3]], labColors.face);
      }
      tile(left, right, near, far, labColors.ground);
      tile(hazard.x, hazard.x + hazard.w, near, hazard.gate, labColors.flag);
      tile(hazard.x, hazard.x + hazard.w, hazard.gate, far, labColors.player);
      for (let edge = hazard.gate + 15; edge < far; edge += 18) {
        face([[hazard.x,edge],[hazard.x+hazard.w,edge-7],
          [hazard.x+hazard.w,edge-4],[hazard.x,edge+3]], labColors.flag);
      }
      tile(goal.x, goal.end, goal.near, goal.far, labColors.flag);
      const flagZ = (goal.near + goal.far) / 2;
      if (!overhead) {
        face([[goal.end-8,flagZ],[goal.end-8,flagZ+1.5],[goal.end-8,flagZ+1.5,.65],[goal.end-8,flagZ,.65]], labColors.ink);
        face([[goal.end-8,flagZ,.65],[goal.end-8,flagZ+15,.65],[goal.end-8,flagZ+15,.44],[goal.end-8,flagZ,.44]], labColors.flag);
      }
      const wall = wall3D;
      const wallRight = wall.x + wall.w, wallFar = wall.z + wall.d;
      const paintWall = () => {
        if (!overhead) {
          face([[wall.x,wallFar],[wallRight,wallFar],[wallRight,wallFar,.7],[wall.x,wallFar,.7]], labColors.face);
          face([[wall.x,wall.z],[wall.x,wallFar],[wall.x,wallFar,.7],[wall.x,wall.z,.7]], labColors.face);
        }
        tile(wall.x, wallRight, wall.z, wallFar, '#759799', overhead ? 0 : .7);
      };
      const wallBehind = perspective ? state.x > wallRight : state.z > wallFar;
      if (wallBehind) paintWall();
      if (path(toWorld([[left,near],[right,near],[right,far],[left,far]]))) {
        ctx.save();
        ctx.clip();
        paintShadow(x, z);
        ctx.restore();
      }
      paintPlayer(x, 0, z);
      if (!wallBehind) paintWall();
    } else {
      ctx.fillStyle = labColors.paper;
      ctx.fillRect(0, 0, 680, 252);
      ctx.fillStyle = labColors.grid;
      for (let line = 1; line <= 4; line++) ctx.fillRect(25, floor - line*46, 620, 1);
      ctx.fillStyle = labColors.ground;
      ctx.fillRect(0, floor, pit.start, 47);
      ctx.fillRect(pit.end, floor, 680 - pit.end, 47);
      ctx.fillRect(493, floor - 54, 29, 54);
      ctx.fillStyle = labColors.ink;
      ctx.fillRect(623, floor - 44, 3, 44);
      ctx.fillStyle = state.finished ? labColors.ground : labColors.player;
      ctx.fillRect(626, floor - 44, 23, 14);
      if (state.left > 0) {
        const [dx,dy] = state.direction;
        ctx.fillStyle = labColors.grid;
        ctx.beginPath();
        ctx.ellipse(state.x - dx*19, state.y - dy*19, 11, 4, Math.atan2(dy,dx), 0, 2*Math.PI);
        ctx.fill();
      }
      paintLabAvatar(ctx, state.x, state.y + 11, 20, state.facing);
    }
    ctx.fillStyle = labColors.paper;
    ctx.fillRect(10, 8, 160, 25);
    ctx.fillStyle = labColors.ink;
    ctx.font = '15px system-ui';
    const meter = is3D ? (state.left > 0 ? 'Dash en marcha' :
      state.cooldown > 0 ? 'Recarga: ' + state.cooldown.toFixed(1) + ' s' : 'Dash listo') :
      'Cargas: ' + state.charges;
    ctx.fillText(state.finished ? '¡Meta!' : meter, 17, 26);
  }

  function move3D(x, z, dt, active) {
    const speed = active ? 900 : 205;
    const oldX = state.x;
    const hitWall = (x, z) => x > wall3D.x - 9 && x < wall3D.x + wall3D.w + 9 &&
      z > wall3D.z - 9 && z < wall3D.z + wall3D.d + 9;
    const nextX = Math.max(bounds.left, Math.min(bounds.right, state.x + x * speed * dt));
    if (!hitWall(nextX, state.z)) state.x = nextX;
    else if (active) state.left = 0;
    const nextZ = Math.max(bounds.near, Math.min(bounds.far, state.z + z * speed * dt));
    if (!hitWall(state.x, nextZ)) state.z = nextZ;
    else if (active) state.left = 0;

    const touchesHazard = Math.max(oldX, state.x) + 8 > hazard.x &&
      Math.min(oldX, state.x) - 8 < hazard.x + hazard.w && state.z + 8 > hazard.gate;
    if (touchesHazard && !(active && select.selectedIndex === 2)) {
      reset('La línea te alcanzó. Usa la abertura del fondo o prueba la protección.');
      return;
    }
    if (state.x > goal.x && state.x < goal.end && state.z > goal.near && state.z < goal.far) finish();
  }

  function move2D(x, y, dt, active) {
    const oldBottom = state.y + 11;
    if (!active) state.vy += 1100 * dt;
    let nextX = Math.max(10, Math.min(670, state.x + x * (active ? 1220 : 215) * dt));
    let nextY = state.y + (active ? y * 1220 : state.vy) * dt;
    const blockTop = floor - 54;
    const touchesBlock = nextX + 9 > 493 && nextX - 9 < 522;
    if (touchesBlock && nextY + 11 > blockTop && oldBottom > blockTop) {
      nextX = state.x;
      if (active) state.left = 0;
    }
    const supported = nextX < pit.start || nextX > pit.end;
    const surface = touchesBlock && oldBottom <= blockTop ? blockTop : floor;
    state.ground = false;
    if ((surface === blockTop || supported) && oldBottom <= surface && nextY + 11 >= surface) {
      nextY = surface - 11;
      state.ground = true;
      state.vy = 0;
      if (active && y > 0) state.left = 0;
      if (state.left === 0) state.charges = select.selectedIndex === 2 ? 2 : 1;
    }
    state.x = nextX;
    state.y = Math.max(20, nextY);
    if (state.y > 285) { reset('Caíste al foso. Prueba a saltar antes de gastar el dash.'); return; }
    if (state.x > 623 && state.ground) finish();
  }

  function finish() {
    state.finished = true;
    report('¡Meta! Pulsa R para probar otra ruta.');
  }

  function update(dt) {
    if (state.finished) return;
    let [x, y] = axes();
    if (!is3D) x = Math.sign(x);
    if (x) state.facing = Math.sign(x);
    const active = state.left > 0;
    const step = active ? Math.min(dt, state.left) : dt;
    if (active) {
      state.left = Math.max(0, state.left - step);
      if (is3D && select.selectedIndex === 1 && (x || y)) state.direction = [x, y];
      [x, y] = state.direction;
    }
    if (is3D) {
      if (active) state.cooldown = .43;
      else state.cooldown = Math.max(0, state.cooldown - step);
      move3D(x, y, step, active);
    } else {
      move2D(x, y, step, active);
    }
  }

  function tick(now) {
    const elapsed = lastTime === undefined ? 0 : Math.min(.034, (now - lastTime) / 1000);
    lastTime = now;
    for (let remaining = elapsed; remaining > 0;) {
      const step = Math.min(remaining, 1 / 120);
      update(step);
      remaining -= step;
    }
    draw();
    frame = requestAnimationFrame(tick);
  }

  canvas.addEventListener('focus', () => {
    if (frame === null) frame = requestAnimationFrame(tick);
  });
  canvas.addEventListener('blur', () => {
    keys.clear();
    cancelAnimationFrame(frame);
    frame = null;
    lastTime = undefined;
  });
  canvas.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (!['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's', ' ', 'j', 'r'].includes(key)) return;
    event.preventDefault();
    keys.add(key);
    if (event.repeat) return;
    if (key === 'r') reset();
    if (key === ' ') dash();
    if (key === 'j' && !is3D && state.ground && state.left === 0 && !state.finished) {
      state.vy = -380;
      state.ground = false;
    }
  });
  canvas.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
  select.addEventListener('change', () => reset());
  view?.addEventListener('change', () => {
    keys.clear();
    draw();
  });
  reset();
}

function httpsLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url : null;
  } catch { return null; }
}

function videoFor(entry) {
  for (const value of [entry.video, entry.fuente, ...(entry.materiales ?? []).map(item => item.url)]) {
    const url = httpsLink(value);
    if (!url) continue;
    const host = url.hostname.replace(/^www\./, '');
    const id = host === 'youtu.be' ? url.pathname.split('/')[1] : host === 'youtube.com' || host === 'm.youtube.com' ?
      url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] : '';
    if (/^[A-Za-z0-9_-]{11}$/.test(id ?? '')) return {url:url.href, id};
    if (value === entry.video || entry.formato === 'Vídeo' || host === 'gdcvault.com' && url.pathname.startsWith('/play/')) {
      return {url:url.href};
    }
  }
  return null;
}

function videoBlock(entry, video) {
  const block = element('section', '', 'video-biblioteca');
  block.append(element('h3', 'Vídeo'), link('Abrir el vídeo en su fuente', video.url));
  if (video.id) {
    const preview = element('button', '', 'video-miniatura');
    preview.type = 'button';
    preview.setAttribute('aria-label', 'Reproducir: ' + entry.titulo);
    const image = element('img', '');
    image.alt = '';
    image.loading = 'lazy';
    image.src = 'https://i.ytimg.com/vi/' + video.id + '/hqdefault.jpg';
    preview.append(image, element('span', 'Reproducir vídeo'));
    preview.addEventListener('click', () => {
      const player = element('iframe', '');
      player.title = entry.titulo;
      player.src = 'https://www.youtube-nocookie.com/embed/' + video.id + '?autoplay=1';
      player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      player.allowFullscreen = true;
      preview.replaceWith(player);
      player.focus();
    });
    block.append(preview);
  }
  return block;
}


const gamesIndexUrl = '?seccion=juegos';
const gamePageUrl = id => gamesIndexUrl + '&' + new URLSearchParams({juego: id});

// These guides discuss named examples in prose, outside the structured juegos field.
const guideGames = {
  'tutoriales-laberinto': ['El laberinto'],
  'salto-2d-guia': ['Super Mario Bros.', 'Celeste', 'Platformer Toolkit', 'Metroid Dread', 'Portal 2'],
  'salto-3d-guia': ['Super Mario 64'],
  'pociones-para-luego': ['Dark Souls'],
  'campear-ventana': ['Left 4 Dead'],
  'extraer-o-seguir': ['Hunt: Showdown'],
  'botin-abre-rutas': ['Metroid Dread'],
  'mina-compra-mina': ['Age of Empires II'],
  'cofres-de-oro': ['Diablo IV'],
  'avisar-ataques': ['Into the Breach'],
  'armas-situacionales': ['Destiny 2'],
  'dash-2d-guia': ['Celeste'],
  'dash-3d-guia': ['Returnal', 'DOOM Eternal'],
  'roles-cooperativos': ['It Takes Two'],
  'ritmo-en-rondas': ['Left 4 Dead'],
  'reinicio-tras-fallar': ['God of War Ragnarök'],
  'mejorar-o-cambiar-arma': ['Monster Hunter Rise: Sunbreak'],
  'ayudas-dificultad': ['Hades'],
  'atajos-rutas': ['Metroid Dread']
};

function gameReferences(entry) {
  return [
    ...(entry.juegos ?? []),
    ...(guideGames[entry.id] ?? []).map(nombre => ({nombre}))
  ];
}

function buildGameIndex(entries) {
  const games = new Map();
  for (const entry of entries) {
    for (const {nombre, observacion} of gameReferences(entry)) {
      const id = slug(nombre);
      if (!id) continue;
      if (!games.has(id)) games.set(id, {nombre, entries: new Map()});
      const references = games.get(id).entries;
      if (!references.has(entry.id)) references.set(entry.id, {entry, observacion});
    }
  }
  return games;
}

function showGames(entries) {
  const games = buildGameIndex(entries);
  const selectedGame = params.get('juego');
  const game = games.get(selectedGame);
  const title = game?.nombre ?? (selectedGame ? 'Juego no encontrado' : 'Explorar por juego');
  const heading = element('h1', title);
  heading.id = 'titulo-lectura';
  document.title = title + ' · Cómo se juega';
  document.querySelector('.portada').hidden = true;
  document.querySelector('#catalogo').hidden = true;
  reading.append(link(selectedGame ? 'Todos los juegos' : 'Volver a la Biblioteca',
    selectedGame ? gamesIndexUrl : '?seccion=biblioteca#catalogo'), heading);
  reading.hidden = false;

  if (game) {
    const resources = element('div', '', 'rejilla');
    for (const {entry, observacion} of game.entries.values()) {
      const card = element('article', '', 'ficha');
      const title = element('h2', '');
      title.append(link(entry.titulo, '?lectura=' + encodeURIComponent(entry.id)));
      card.append(element('p', entry.formato + ' · ' + designTopic(entry), 'meta'),
        title, element('p', observacion || entry.resumen));
      resources.append(card);
    }
    reading.append(resources);
    return;
  }

  const label = element('label', 'Buscar por título ');
  const input = element('input', '');
  input.type = 'search';
  label.append(input);
  const count = element('p', '', 'meta');
  count.setAttribute('role', 'status');
  const list = element('ul', '', 'rejilla');
  const sorted = [...games].sort(([, a], [, b]) => a.nombre.localeCompare(b.nombre, 'es'));

  function filterGames() {
    const query = slug(input.value);
    const matches = sorted.filter(([id]) => id.includes(query));
    list.replaceChildren(...matches.map(([id, item]) => {
      const row = element('li', '', 'ficha');
      row.append(link(item.nombre, gamePageUrl(id)),
        element('p', item.entries.size + (item.entries.size === 1 ? ' ficha' : ' fichas'), 'meta'));
      return row;
    }));
    count.textContent = matches.length ? matches.length + (matches.length === 1 ? ' resultado' : ' resultados') :
      'No encontramos juegos con ese título.';
  }

  const intro = element('p', 'Reunimos en una página por juego las fichas, guías y artículos que lo analizan o lo usan como ejemplo.');
  reading.append(intro, label, count, list);
  input.addEventListener('input', filterGames);
  filterGames();
}

function renderLibraryReading(resource, entries) {
  reading.classList.add('lectura-biblioteca');
  const intro = element('section', '', 'entrada-biblioteca');
  intro.append(element('h2', 'De qué va'), element('p', resource.resumen));
  reading.append(intro);

  const summary = element('section', '', 'resumen-biblioteca');
  summary.append(element('h2', 'Resumen y puntos clave'));
  for (const paragraph of resource.cuerpo.trim().split(/\r?\n\s*\r?\n/).filter(Boolean)) {
    if (paragraph === resource.resumen) continue;
    const heading = paragraph.match(/^#{2,3} ([^\r\n]+)$/);
    summary.append(heading ? element('h3', heading[1]) : element('p', paragraph));
  }

  const video = videoFor(resource);
  if (video) summary.append(videoBlock(resource, video));
  const supplementary = resource.materiales ?? [];
  if (supplementary.length || resource.figuras?.length || resource.esquemaBiblioteca || resource.fragmento) {
    const materials = element('div', '', 'materiales-biblioteca');
    materials.append(element('h3', 'Material para mirar de cerca'));
    if (resource.esquemaBiblioteca) {
      const {flujo, pie} = resource.esquemaBiblioteca;
      const figure = element('figure', '', 'figura-biblioteca');
      const diagram = element('ol', '', 'esquema-sistemas');
      diagram.append(...flujo.map(step => element('li', step)));
      figure.append(diagram, element('figcaption', pie));
      materials.append(figure);
    }
    for (const asset of resource.figuras ?? []) {
      const figure = element('figure', '', 'figura-biblioteca');
      const image = element('img', '');
      image.alt = asset.alt;
      image.loading = 'lazy';
      image.addEventListener('error', () => { image.hidden = true; });
      const caption = element('figcaption', asset.pie + ' ');
      caption.append(link('Abrir imagen original', asset.url));
      const videoUrl = httpsLink(asset.video) ?? (asset.miniatura && video ? httpsLink(video.url) : null);
      if (videoUrl) caption.append(element('span', ' · '), link('Ver el vídeo', videoUrl.href));
      if (asset.url.endsWith('.gif')) {
        const animation = element('details', '', 'animacion-biblioteca');
        animation.append(element('summary', 'Ver animación'), image);
        animation.addEventListener('toggle', () => {
          if (animation.open) image.src = asset.url;
          else image.removeAttribute('src');
        });
        image.addEventListener('load', () => { image.hidden = false; });
        figure.append(animation);
      } else {
        image.src = asset.url;
        figure.append(image);
      }
      figure.append(caption);
      materials.append(figure);
    }
    if (resource.fragmento) {
      const fragment = element('figure', '', 'figura-biblioteca');
      const quote = element('blockquote', resource.fragmento.texto);
      quote.lang = 'en';
      fragment.append(quote, element('figcaption', resource.fragmento.atribucion));
      materials.append(fragment);
    }
    if (supplementary.length) {
      const links = element('ul', '', 'adjuntos-biblioteca');
      for (const material of supplementary) {
        const row = element('li', '');
        row.append(link(material.nombre, material.url));
        links.append(row);
      }
      materials.append(links);
    }
    summary.append(materials);
  }
  reading.append(summary);

  const examples = element('section', '', 'ejemplos-biblioteca');
  examples.append(element('h2', 'Juegos donde fijarte'));
  const games = element('dl', '');
  for (const game of resource.juegos ?? []) {
    const name = element('dt', '');
    name.append(link(game.nombre, gamePageUrl(slug(game.nombre))));
    games.append(name, element('dd', game.observacion));
  }
  examples.append(games);
  if (resource.subtema) {
    const guide = entries.find(entry => isArchive(entry) && entry.tema === resource.tema && entry.subtema === resource.subtema);
    if (guide) examples.append(link('Ver nuestra ficha de ' + guide.subtema, archiveUrl(guide.subtema)));
  }
  reading.append(examples);
  showSources(resource, entries);
}

function showReading(entries, archive) {
  const id = params.get('lectura') ?? archive?.id;
  if (!id) return;
  const resource = entries.find(entry => entry.id === id);
  const title = element('h1', resource?.titulo ?? 'Recurso no encontrado');
  title.id = 'titulo-lectura';
  const archiveReading = resource && isArchive(resource);
  const labId = resource?.laboratorio;
  const systemLab = Object.hasOwn(systemLabs, labId) ? systemLabs[labId] :
    Object.hasOwn(levelLabs, labId) ? levelLabs[labId] :
    Object.hasOwn(narrativeLabs, labId) ? narrativeLabs[labId] :
    Object.hasOwn(uxLabs, labId) ? uxLabs[labId] : null;
  const editorial = Boolean(resource && isEditorial(resource));
  const archiveIndex = archiveReading || systemLab || (editorial && /^## /m.test(resource.cuerpo)) ? element('nav', '', 'referencias') : null;
  const index = archiveIndex ? element('ol', '') : null;
  if (archiveIndex) {
    archiveIndex.setAttribute('aria-label', archiveReading ? 'Índice de la ficha' : 'Índice de la guía');
    archiveIndex.append(element('h2', 'Índice'), index);
  }
  const addToIndex = (heading, id) => {
    heading.id = id;
    if (!index) return;
    const item = element('li', '');
    item.append(link(heading.textContent, '#' + id));
    index.append(item);
  };
  const section = editorial ? editorialSection(resource) : null;
  reading.append(link(section ? 'Volver a ' + section.name : 'Volver a la Biblioteca',
    section ? '?' + new URLSearchParams(section.query) + '#catalogo' : libraryUrl));
  if (editorial) {
    reading.classList.add(archiveReading ? 'lectura-mecanica' : 'lectura-guia');
    const header = element('header', '', 'cabecera-editorial');
    header.append(element('p', editorialLabel(resource) + ' · ' + section.name, 'etiqueta-editorial'),
      title, element('p', resource.resumen, 'entradilla-editorial'));
    reading.append(header);
  } else {
    reading.append(title);
  }
  if (catalogDrafts().some(draft => draft.id === id)) reading.append(element('p', 'Estás viendo tu borrador local.', 'meta'));
  if (archiveIndex) reading.append(archiveIndex);
  if (resource) {
    const visualJump = id === 'salto-2d-guia';
    const dashGuide = id === 'dash-2d-guia' || id === 'dash-3d-guia';
    document.title = resource.titulo + ' · Cómo se juega';
    if (!editorial) {
      reading.append(element('p', resource.formato + ' · ' + resource.tema, 'meta'));
      renderLibraryReading(resource, entries);
      document.querySelector('#catalogo').hidden = true;
      reading.hidden = false;
      document.querySelector('.portada').hidden = true;
      return;
    }
    const games = gameReferences(resource);
    if (games.length) {
      const related = element('section', '', 'referencias');
      const links = element('ul', '');
      for (const {nombre} of games) {
        const item = element('li', '');
        item.append(link(nombre, gamePageUrl(slug(nombre))));
        links.append(item);
      }
      related.append(element('h2', 'Juegos relacionados'), links);
      reading.append(related);
    }
    const jumpControls = visualJump ? addJumpLab() : null;
    for (const [blockIndex, block] of resource.cuerpo.split(/^\x60\x60\x60(?:csharp)?[ \t]*\r?$/m).entries()) {
      if (blockIndex % 2 === 1) {
        const pre = element('pre', '', 'codigo');
        pre.tabIndex = 0;
        pre.setAttribute('aria-label', 'Código C#');
        pre.append(element('code', block.trim()));
        if (archiveReading || systemLab) {
          const details = element('details', '', 'detalle-codigo');
          details.append(element('summary', 'Ver código C#'), pre);
          reading.append(details);
        } else {
          reading.append(pre);
        }
      } else {
        for (const paragraph of block.trim().split(/\r?\n\s*\r?\n/).filter(Boolean)) {
          const heading = paragraph.match(/^(#{2,3}) ([^\r\n]+)$/);
          const content = heading ? element(heading[1] === '##' ? 'h2' : 'h3', heading[2]) : element('p', paragraph);
          if (heading?.[1] === '##' && index) addToIndex(content, 'apartado-' + (index.children.length + 1) + '-' + slug(heading[2]));
          reading.append(content);
          if (systemLab && heading?.[2] === 'Qué puedes cambiar') {
            const diagram = element('ol', '', 'esquema-sistemas');
            diagram.setAttribute('aria-label', 'Secuencia del sistema');
            diagram.append(...resource.esquema.map(step => element('li', step)));
            reading.insertBefore(diagram, content);
          }
          if (systemLab && heading?.[1] === '##' && heading[2] === 'Implementación en Unity') {
            reading.removeChild(content);
            addSystemLab(systemLab, id);
            reading.append(content);
          }
          if (dashGuide && heading?.[2] === 'Qué puedes cambiar') {
            const diagram = element('ol', '', 'esquema-sistemas');
            diagram.setAttribute('aria-label', 'Fases del dash');
            for (const step of ['Pulsas y eliges rumbo', 'Avanzas durante el impulso', 'Terminas o chocas', 'Recuperas el control']) {
              diagram.append(element('li', step));
            }
            reading.insertBefore(diagram, content);
          }
          if (dashGuide && heading?.[2] === 'Ponte al mando') addDashLab(id === 'dash-3d-guia');
          if (id === 'salto-3d-guia' && heading?.[2] === 'Ponte al mando') addJump3D();
          if (jumpControls && heading?.[2] === 'Ponte al mando') {
            const game = document.querySelector('#plantilla-juego-salto').content.firstElementChild.cloneNode(true);
            reading.append(game);
            game.id = 'ruta-salto-2d';
            if (location.hash === '#ruta-salto-2d') requestAnimationFrame(() => game.scrollIntoView());
            addPlayableJump(game, jumpControls);
          }
          if (visualJump && heading?.[2] === '¿Pulsé demasiado pronto o demasiado tarde?') {
            reading.append(document.querySelector('#plantilla-margen-salto').content.cloneNode(true));
          }
        }
      }
    }
    const references = showSources(resource, entries);
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
        if (archiveReading && references) {
          const existingList = references.section.querySelector('ul');
          if (existingList) existingList.prepend(...list.children);
          else references.section.append(list);
        } else {
          const heading = element('h2', archiveReading ? 'Fuentes' : 'Archivo de la mecánica');
          addToIndex(heading, 'fichas-relacionadas');
          reading.append(heading, list);
        }
      }
    }
    document.querySelector('#catalogo').hidden = true;
  }
  reading.hidden = false;
  document.querySelector('.portada').hidden = true;
}

const themeButton = document.querySelector('#modo-pagina');
if (themeButton) {
  const applyTheme = dark => {
    document.documentElement.dataset.tema = dark ? 'oscuro' : 'claro';
    themeButton.setAttribute('aria-pressed', String(dark));
    themeButton.children[0].textContent = dark ? '☀' : '☾';
    themeButton.children[1].textContent = dark ? 'Claro' : 'Oscuro';
  };
  applyTheme(document.documentElement.dataset.tema === 'oscuro');
  themeButton.hidden = false;
  themeButton.addEventListener('click', () => {
    const dark = document.documentElement.dataset.tema !== 'oscuro';
    applyTheme(dark);
    try { localStorage.setItem('como-se-juega-tema', dark ? 'oscuro' : 'claro'); } catch {}
  });
}

const areaIntroductions = {
  sistemas: 'Una mesa de prototipos para ver qué pasa cuando juntas reglas.',
  niveles: 'Abre una zona del plano y entra en sus guías.',
  narrativa: 'Un cuaderno para escribir escenas y trabajar la traducción.',
  interfaz: 'Un banco de pruebas para lo que ves y tocas al jugar.'
};

function areaSample(area, interactive = true) {
  const box = element('div', '', 'muestra-diseno muestra-diseno--' + area);
  if (area === 'sistemas') {
    const steps = element('ol', '', 'ciclo-mina');
    for (const [kind, label] of [['mina', 'Extraer oro'], ['oro', 'Cobrar'], ['reinvertir', 'Abrir otra mina']]) {
      const step = element('li', '', 'ciclo-mina-nodo');
      const icon = element('i', '', 'ciclo-icono ciclo-icono--' + kind);
      icon.setAttribute('aria-hidden', 'true');
      step.append(icon, element('strong', label));
      steps.append(step);
    }
    box.append(steps, element('p', '↶  Más minas, más oro para reinvertir', 'ciclo-mina-retorno'));
  } else if (area === 'niveles') {
    box.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 28; i++) {
      const kind = [2,25].includes(i) ? 'plano-punto' :
        [3,4,5,12,19,18].includes(i) ? 'plano-ruta' : '';
      box.append(element('i', '', kind));
    }
  } else if (area === 'narrativa') {
    for (const [label,line] of [['Original', '“Nice parking.”'], ['Adaptación', '«Menudo aterrizaje».']]) {
      const page = element('div', '');
      page.append(element('small', label), element('blockquote', line));
      box.append(page);
    }
  } else if (area === 'biblioteca') {
    box.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 5; i++) box.append(element('i', '', 'muestra-lomo'));
  } else if (area === 'mecanicas') {
    box.setAttribute('aria-hidden', 'true');
    box.append(element('i', '', 'muestra-salto-arco'), element('i', '', 'muestra-salto-suelo'));
  } else if (!interactive) {
    box.append(element('p', 'Partida guardada'), element('span', '✓', 'muestra-guardado'));
  } else {
    const message = element('p', 'La partida tiene cambios');
    message.setAttribute('role', 'status');
    const save = element('button', 'Guardar');
    save.type = 'button';
    save.addEventListener('click', () => {
      save.disabled = true;
      message.textContent = 'Guardando…';
      setTimeout(() => {
        message.textContent = 'Partida guardada';
        save.disabled = false;
      }, 450);
    });
    box.append(message, save);
  }
  return box;
}

function renderThemedHub(sections, own) {
  const heading = document.querySelector('#titulo-catalogo');
  const copy = element('div', '');
  const intro = element('div', '', 'portada-diseno');
  heading.before(intro);
  copy.append(heading, element('p', areaIntroductions[areaKey], 'descripcion-seccion'));
  intro.append(copy, areaSample(areaKey));
  document.querySelector('#catalogo').dataset.areaDiseno = areaKey;
  sections.className = 'colecciones-diseno';
  sections.hidden = false;
  for (const [name, description] of Object.entries(discipline[1])) {
    const entries = own.filter(entry => designTopic(entry) === name);
    const href = name === 'Mecánicas' ? '?tema=Mec%C3%A1nicas#catalogo' :
      '?' + libraryQuery({categoria: name}) + '#catalogo';
    const folder = element('details', '', 'coleccion-diseno');
    const summary = element('summary', '');
    summary.append(element('span', name), element('span',
      entries.length + (entries.length === 1 ? ' ficha' : ' fichas'), 'cuenta-coleccion'));
    const content = element('div', '', 'contenido-coleccion');
    content.append(element('p', description, 'descripcion-seccion'));
    // El catálogo añade las nuevas fichas al final.
    for (const entry of entries.slice(-4).reverse()) {
      const url = isArchive(entry) ? archiveUrl(entry.subtema) : href.split('#')[0] + '&lectura=' + encodeURIComponent(entry.id);
      const item = element('article', '', 'ficha-coleccion');
      const title = element('h3', '');
      title.append(link(entry.titulo, url));
      item.append(title, element('p', entry.resumen));
      content.append(item);
    }
    const openCollection = link('Abrir colección', href);
    openCollection.className = 'abrir-coleccion';
    openCollection.setAttribute('aria-label', 'Abrir colección: ' + name);
    content.append(openCollection);
    folder.append(summary, content);
    sections.append(folder);
  }
}

const catalogDraftKey = 'como-se-juega-fichas-borrador';
const editableFields = {
  id: 'Identificador', titulo: 'Título', tema: 'Tema', subtema: 'Subtema',
  formato: 'Formato', idioma: 'Idioma', resumen: 'De qué va', cuerpo: 'Resumen y puntos clave',
  referencia: 'Referencia', fuente: 'Fuente original', video: 'Enlace del vídeo'
};

function catalogDrafts() {
  try {
    const draft = JSON.parse(localStorage.getItem(catalogDraftKey) ?? '[]');
    return Array.isArray(draft) ? draft.filter(entry => entry && typeof entry.id === 'string') : [];
  } catch { return []; }
}

function applyCatalogDrafts(published) {
  const entries = new Map(published.map(entry => [entry.id, entry]));
  for (const draft of catalogDrafts()) entries.set(draft.id, draft);
  return [...entries.values()];
}

function setupCatalogEditor(published, catalog) {
  const dialog = document.querySelector('#editor-catalogo');
  const open = document.querySelector('#abrir-editor');
  if (!dialog || !open) return;
  const picker = dialog.querySelector('#ficha-editor');
  const fields = dialog.querySelector('#campos-editor');
  const extras = dialog.querySelector('#extras-editor');
  const status = dialog.querySelector('#estado-editor');
  const inputs = new Map();
  const records = new Map(catalog.map(entry => [entry.id, entry]));
  const existing = new Set(published.map(entry => entry.id));
  for (const entry of [...catalog].sort((a,b) => a.titulo.localeCompare(b.titulo, 'es'))) {
    const option = element('option', entry.titulo);
    option.value = entry.id;
    picker.append(option);
  }
  for (const [key, label] of Object.entries(editableFields)) {
    const row = element('label', label);
    const input = element(['cuerpo','resumen'].includes(key) ? 'textarea' : 'input', '');
    input.rows = key === 'cuerpo' ? 10 : 3;
    input.required = ['id','titulo','tema','formato','resumen','cuerpo'].includes(key);
    if (key === 'id') input.pattern = '[a-z0-9\\-]+';
    if (['fuente','video'].includes(key)) input.type = 'url';
    row.append(input);
    inputs.set(key, input);
    fields.append(row);
  }
  function select(id) {
    picker.value = records.has(id) ? id : '';
    const entry = records.get(picker.value) ?? {formato:'Artículo', idioma:'Español'};
    for (const [key,input] of inputs) input.value = entry[key] ?? '';
    inputs.get('id').readOnly = Boolean(picker.value);
    extras.value = JSON.stringify(Object.fromEntries(Object.entries(entry).filter(([key]) => !Object.hasOwn(editableFields,key))), null, 2);
    status.textContent = catalogDrafts().some(draft => draft.id === id) ? 'Esta ficha tiene un borrador local.' : '';
  }

  dialog.querySelector('#form-editor').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const entry = JSON.parse(extras.value || '{}');
      if (!entry || Array.isArray(entry) || typeof entry !== 'object') throw Error('Los campos adicionales deben ser un objeto JSON.');
      for (const [key,input] of inputs) {
        delete entry[key];
        if (input.value.trim()) entry[key] = input.value.trim();
      }
      if (!/^[a-z0-9-]+$/.test(entry.id) || (!picker.value && records.has(entry.id))) throw Error('Elige un identificador válido que todavía no exista.');
      for (const key of ['fuente','video']) if (entry[key] && !httpsLink(entry[key])) throw Error('Usa una dirección HTTPS en ' + editableFields[key] + '.');
      const arrays = {juegos:['nombre','observacion'], materiales:['nombre','url'], figuras:['url','alt','pie']};
      for (const [key, keys] of Object.entries(arrays)) {
        if (entry[key] !== undefined && (!Array.isArray(entry[key]) || entry[key].some(item => !item ||
          keys.some(name => typeof item[name] !== 'string' || !item[name].trim()) || (keys.includes('url') && !httpsLink(item.url))))) {
          throw Error('Revisa la lista «' + key + '» y sus campos: ' + keys.join(', ') + '.');
        }
      }
      if (entry.fuentes !== undefined && (!Array.isArray(entry.fuentes) || entry.fuentes.some(id => typeof id !== 'string'))) {
        throw Error('El campo «fuentes» debe ser una lista de identificadores.');
      }
      if (entry.esquemaBiblioteca && (!Array.isArray(entry.esquemaBiblioteca.flujo) || entry.esquemaBiblioteca.flujo.some(step => typeof step !== 'string'))) {
        throw Error('El campo «flujo» del esquema debe ser una lista de textos.');
      }
      const drafts = catalogDrafts().filter(draft => draft.id !== entry.id);
      drafts.push(entry);
      localStorage.setItem(catalogDraftKey, JSON.stringify(drafts));
      location.assign('como-se-juega.html?lectura=' + encodeURIComponent(entry.id));
    } catch (error) { status.textContent = error.message; }
  });
  dialog.querySelector('#exportar-editor').addEventListener('click', async () => {
    try {
      if (!catalogDrafts().length) throw Error('Guarda al menos un borrador antes de descargar.');
      const response = await fetch('datos/como-se-juega.json', {cache:'no-cache'});
      if (!response.ok) throw Error('No se pudo comprobar la versión pública del catálogo.');
      const latest = await response.json();
      const all = applyCatalogDrafts(latest);
      const file = new Blob([JSON.stringify(all,null,2) + '\n'], {type:'application/json'});
      const url = URL.createObjectURL(file);
      const anchor = link('', url);
      anchor.download = 'como-se-juega.json';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = 'Descargado. Incluye las fichas publicadas y tus borradores.';
    } catch (error) { status.textContent = error.message; }
  });
  dialog.querySelector('#descartar-editor').addEventListener('click', () => {
    const id = picker.value;
    const drafts = catalogDrafts();
    if (!drafts.some(draft => draft.id === id)) { status.textContent = 'Esta ficha no tiene borrador.'; return; }
    try {
      localStorage.setItem(catalogDraftKey, JSON.stringify(drafts.filter(draft => draft.id !== id)));
      location.assign(existing.has(id) ? 'como-se-juega.html?lectura=' + encodeURIComponent(id) : 'como-se-juega.html?seccion=biblioteca');
    } catch (error) { status.textContent = error.message; }
  });
  picker.addEventListener('change', () => select(picker.value));
  dialog.querySelector('#cerrar-editor').addEventListener('click', () => dialog.close());
  open.hidden = false;
  open.addEventListener('click', () => {
    select(params.get('lectura') ?? catalog.find(entry => isArchive(entry) && slug(entry.subtema) === collection)?.id);
    dialog.showModal();
  });
}

async function loadCatalog() {
  const response = await fetch('datos/como-se-juega.json?v=catalogo-total', {cache: 'no-cache'});
  if (!response.ok) throw new Error('No se pudo cargar el catálogo');
  const published = await response.json();
  const catalog = applyCatalogDrafts(published);
  setupCatalogEditor(published, catalog);
  if (sectionKey === 'juegos' && !params.has('lectura')) {
    showGames(catalog);
    return;
  }
  const own = catalog.filter(isEditorial);
  const sources = catalog.filter(entry => !isEditorial(entry));
  const publishedCount = published.filter(entry => !isEditorial(entry)).length;
  const archives = own.filter(isArchive);
  const archive = archives.find(entry => slug(entry.subtema) === collection);
  const category = discipline && Object.hasOwn(discipline[1], designCategory) ? designCategory : '';
  const topTopic = !isPapers && !isInterviews && !isDevelopment && !sourceSection && sectionKey !== 'biblioteca' &&
    own.some(entry => entry.tema === currentTopic) ? currentTopic : '';
  const editorialView = Boolean(discipline || topTopic);
  const sectionHub = Boolean(discipline && !category);
  const papersHub = isPapers && !language;
  const libraryHub = !editorialView && !isPapers && !isInterviews && !isDevelopment && !sourceSection && !isHome;
  const mechanicsView = category === 'Mecánicas' || topTopic === 'Mecánicas';
  const countCategory = name => own.filter(entry => designTopic(entry) === name).length;
  const countArea = key => Object.keys(disciplines[key][1]).reduce((n, name) => n + countCategory(name), 0);
  const papers = sources.filter(entry => entry.formato === 'Estudio');
  const interviews = sources.filter(entry => entry.formato === 'Entrevista');
  const relevant = editorialView
    ? own.filter(entry => !isArchive(entry) && (category ? designTopic(entry) === category : entry.tema === topTopic))
    : isPapers ? papers.filter(entry => !language || entry.idioma === languages[language])
    : isInterviews ? interviews
    : isDevelopment ? sources.filter(entry => entry.decisionDesarrollo === true || developmentIds.has(entry.id))
    : sourceSection ? sources.filter(entry => sourceSection[1].includes(entry.formato))
    : sources;

  const heading = language ? 'Papers en ' + languages[language].toLowerCase() :
    isPapers ? 'Papers' : isInterviews ? 'Entrevistas' : isDevelopment ? 'Decisiones de desarrollo' :
    sourceSection?.[0] ?? (discipline ? category || discipline[0] : topTopic || 'Biblioteca');
  document.querySelector('#titulo-catalogo').textContent = heading;
  document.querySelector('#novedades').hidden = !isHome;
  document.querySelector('.portada').hidden = !isHome;
  if (isHome) {
    showFeatured(catalog);
    document.querySelector('#catalogo').hidden = true;
    for (const card of document.querySelectorAll('[data-recuento-area]')) {
      const key = card.dataset.recuentoArea;
      const count = key === 'biblioteca' ? publishedCount : key === 'mecanicas' ? countCategory('Mecánicas') : countArea(key);
      card.dataset.areaDiseno = key;
      card.prepend(areaSample(key, false));
      card.append(countBadge(count, 'entrada', 'entradas'));
    }
    return;
  }
  if (params.has('lectura') || archive) {
    document.querySelector('#catalogo').hidden = true;
    showReading(catalog, archive);
    return;
  }

  const sections = document.querySelector('#secciones');
  const languageFilter = document.querySelector('#idioma-catalogo');
  const clear = document.querySelector('#limpiar-catalogo');
  const more = document.querySelector('#mas-fichas');
  let activeCollection = null;
  let pageSize = 5;
  const shelfCards = new Map();
  if (isDevelopment) {
    const description = element('p', 'Postmortems y entrevistas donde los equipos cuentan qué probaron, qué cambiaron y por qué.', 'descripcion-seccion');
    const examples = element('section', '', 'ejemplos-decisiones');
    const examplesTitle = element('h3', 'Cuatro casos para empezar');
    examplesTitle.id = 'titulo-ejemplos-decisiones';
    examples.setAttribute('aria-labelledby', examplesTitle.id);
    const cards = element('div', '', 'rejilla ejemplos-decisiones-rejilla');
    const featured = [
      ['nihilumbra-postmortem-modo-vacio', 'Nihilumbra', 'BeautiFun dejó los puzles más duros tras los créditos. Parte del público cerró el juego sin descubrirlos.'],
      ['neva-reducir-combate', 'Neva', 'Nomada Studio rehízo tramos donde las peleas interrumpían demasiado el recorrido.'],
      ['endling-guarida-centro', 'Endling: Extinction is Forever', 'Herobeat puso la guarida en el centro para que volver a casa mostrara el deterioro del entorno.'],
      ['red-strings-unir-prototipos', 'The Red Strings Club', 'Deconstructeam unió tres prototipos sobre servir copas, modelar piezas y hacer llamadas.']
    ];
    for (const [id, game, description] of featured) {
      const entry = relevant.find(resource => resource.id === id);
      if (!entry) continue;
      const card = element('article', '', 'ficha ejemplo-decision');
      const title = element('h4', '');
      title.append(link(entry.titulo, '?' + libraryQuery({lectura: id})));
      card.append(element('p', game, 'meta'), title, element('p', description));
      cards.append(card);
    }
    examples.append(examplesTitle, cards);
    document.querySelector('#titulo-catalogo').after(description, examples);
  } else if (category) {
    document.querySelector('#titulo-catalogo').after(element('p', discipline[1][category], 'descripcion-seccion'));
  }
  if (sectionHub) {
    renderThemedHub(sections, own);
  } else if (libraryHub) {
    document.querySelector('#catalogo').classList.add('biblioteca-estanteria');
    const intro = document.querySelector('#biblioteca-intro');
    intro.hidden = false;
    intro.after(link('Decisiones de desarrollo', '?seccion=decisiones#catalogo'), ' · ', link('Explorar por juego', gamesIndexUrl));
    const total = document.querySelector('#biblioteca-total');
    total.textContent = publishedCount + (publishedCount === 1 ? ' ficha publicada' : ' fichas publicadas');
    total.hidden = false;
    document.querySelector('#encabezado-fichas').hidden = false;
    document.querySelector('#filtro-idioma').hidden = false;
    clear.hidden = false;
    fillOptions(languageFilter, [...new Set(sources.map(entry => entry.idioma).filter(Boolean))]);
    sections.hidden = false;
    sections.classList.add('estanteria');
    sections.setAttribute('aria-label', 'Colecciones de la Biblioteca');
    const collections = [
      ['Estudios', ['Estudio']],
      ['Charlas', ['Charla', 'Conferencia']],
      ['Entrevistas', ['Entrevista']],
      ...Object.entries(sourceSections).filter(([key]) => key !== 'conferencias').sort(([a],[b]) => ['articulos','documentacion','codigo','demos','guias','videos'].indexOf(a) - ['articulos','documentacion','codigo','demos','guias','videos'].indexOf(b))
        .map(([key,[name,formats]]) => [key === 'documentacion' ? 'Documentación' : key === 'codigo' ? 'Código' : name, formats])
    ];
    for (const [name, formats] of collections) {
      const count = sources.filter(entry => formats.includes(entry.formato)).length;
      if (!count) continue;
      const book = element('button', '', 'lomo-coleccion');
      book.type = 'button';
      book.setAttribute('aria-pressed', 'false');
      book.append(element('strong', name), element('span', count + (count === 1 ? ' ficha' : ' fichas')));
      book.addEventListener('click', () => {
        activeCollection = activeCollection === formats ? null : formats;
        for (const [card, group] of shelfCards) card.setAttribute('aria-pressed', String(group === activeCollection));
        refresh();
      });
      shelfCards.set(book, formats);
      sections.append(book);
    }
    languageFilter.addEventListener('change', refresh);
    clear.addEventListener('click', () => {
      activeCollection = null;
      search.value = topic.value = languageFilter.value = '';
      for (const card of shelfCards.keys()) card.setAttribute('aria-pressed', 'false');
      refresh();
    });
    more.addEventListener('click', () => {
      pageSize += 5;
      render();
    });
  }

  if (papersHub) {
    const languagesNav = document.querySelector('#idiomas');
    languagesNav.hidden = false;
    for (const [key, name] of Object.entries(languages)) {
      const card = languagesNav.querySelector('[data-papers="' + key + '"]');
      card.append(countBadge(papers.filter(entry => entry.idioma === name).length, 'paper', 'papers'));
    }
  }
  if (!editorialView && !libraryHub) {
    const back = document.querySelector('#volver-biblioteca');
    back.hidden = false;
    back.append(language ? link('Volver a Papers', '?papers=todos#catalogo') :
      link('Volver a la Biblioteca', '?seccion=biblioteca#catalogo'));
  }
  if ((discipline && category) || topTopic === 'Mecánicas') {
    const back = document.querySelector('#volver-diseno');
    back.hidden = false;
    back.append(link('Volver a ' + (discipline?.[0] ?? disciplines.sistemas[0]),
      '?diseno=' + (discipline ? areaKey : 'sistemas') + '#catalogo'));
  }
  if (mechanicsView && archives.length) {
    const mechanics = document.querySelector('#archivo-mecanicas');
    mechanics.hidden = false;
    for (const entry of archives) mechanics.append(editorialCard(entry, archiveUrl(entry.subtema)));
  }

  const searchable = !editorialView && !papersHub;
  search.form.hidden = !searchable;
  status.hidden = sectionHub || papersHub || mechanicsView || (editorialView && relevant.length > 0);
  results.hidden = sectionHub || papersHub || mechanicsView;
  results.classList.toggle('archivo-guias', editorialView && !sectionHub);
  if (searchable) {
    const topics = [...new Set(relevant.map(entry => entry.tema))];
    document.querySelector('#filtro-tema').hidden = topics.length < 2;
    fillOptions(topic, topics);
    if (topics.includes(currentTopic)) topic.value = currentTopic;
  }
  if (sectionHub || papersHub || mechanicsView) return;

  function render() {
    const query = normalize(search.value.trim());
    const matches = relevant.filter(entry =>
      (!topic.value || entry.tema === topic.value) &&
      (!libraryHub || ((!activeCollection || activeCollection.includes(entry.formato)) &&
        (!languageFilter.value || entry.idioma === languageFilter.value))) &&
      normalize([entry.titulo, entry.resumen, entry.tema, entry.formato, entry.id].join(' ')).includes(query)
    );
    more.hidden = !libraryHub || matches.length <= pageSize;
    const visible = libraryHub ? matches.slice(0, pageSize) : matches;
    results.replaceChildren(...visible.map(entry => {
      if (isEditorial(entry)) {
        return editorialCard(entry, '?' + new URLSearchParams({
          ...editorialSection(entry).query, lectura: entry.id
        }));
      }
      const card = element('article', '', 'ficha ficha-biblioteca');
      const title = element('h3', '');
      title.append(link(entry.titulo, '?' + libraryQuery({...(topic.value ? {tema: topic.value} : {}), lectura: entry.id})));
      card.append(element('div', entry.formato + ' · ' + entry.tema, 'meta'), title,
        element('p', entry.resumen));
      const video = videoFor(entry);
      if (video) card.append(link('Ver vídeo', video.url));
      return card;
    }));
    status.textContent = matches.length === 1 ? '1 recurso' : matches.length ? matches.length + ' recursos' :
      editorialView ? 'Todavía no hemos publicado nada aquí.' : 'No encontramos nada con esa búsqueda.';
  }

  function refresh() {
    pageSize = 5;
    render();
  }

  search.addEventListener('input', refresh);
  topic.addEventListener('change', refresh);
  search.form.addEventListener('submit', event => { event.preventDefault(); render(); });
  render();
}

loadCatalog().catch(() => {
  status.hidden = false;
  status.textContent = 'No hemos podido cargar el catálogo. Prueba a recargar la página.';
});

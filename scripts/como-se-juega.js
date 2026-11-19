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
    ctx.fillStyle = '#fff6e6';
    ctx.fillRect(0, 0, 680, 252);
    ctx.fillStyle = '#dec9ad';
    for (let line = 1; line <= 4; line++) ctx.fillRect(25, py(line), 620, 1);
    ctx.fillStyle = '#254f52';
    for (const [left,right,top] of scene.platforms) {
      if (scene.hiddenLanding && left > 0 && !revealed) continue;
      ctx.fillRect(px(left), py(top), (right-left)*62, top ? 12 : 47);
    }
    const [goalX,goalY] = scene.goal;
    if (!scene.hiddenLanding || revealed) {
      ctx.fillStyle = '#40382e';
      ctx.fillRect(px(goalX), py(goalY)-44, 3, 44);
      ctx.fillStyle = won ? '#254f52' : '#a64328';
      ctx.fillRect(px(goalX)+3, py(goalY)-44, 23, 14);
    }
    ctx.font = '15px system-ui';
    ctx.fillStyle = '#40382e';
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
    ctx.fillStyle = '#a64328';
    ctx.fillRect(px(x)-10-stretch, py(y)-22+stretch, 20+stretch*2, 20-stretch);
    ctx.fillStyle = '#fff6e6';
    ctx.fillRect(px(x)+(vx<0?-5:2), py(y)-17+stretch, 4, 4);
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

  const isPerspective = () => view.value === 'primera' || view.value === 'tercera';

  function draw() {
    const overhead = view.value === 'cenital';
    const firstPerson = view.value === 'primera';
    const perspective = isPerspective();
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
    const surface = ([l,r,n,f]) => [[l,n],[r,n],[r,f],[l,f]];
    ctx.fillStyle = '#fff6e6';
    ctx.fillRect(0,0,680,320);
    if (perspective) {
      ctx.fillStyle = '#eadac1';
      ctx.fillRect(0,0,680,148 - 300*Math.tan(pitch));
    }
    for (const platform of [...platforms].reverse()) {
      const [l,r,n,f] = platform;
      if (perspective) polygon([[l,n],[l,f],[l,f,-0.3],[l,n,-0.3]], '#193c3d');
      else if (!overhead) polygon([[l,f],[r,f],[r,f,-0.3],[l,f,-0.3]], '#193c3d');
      polygon(surface(platform), '#356062');
    }
    const goal = goalZ();
    polygon([[7.7,goal-0.14],[8.02,goal-0.14],[8.02,goal+0.14],[7.7,goal+0.14]], won ? '#fff6e6' : '#f7c477');
    if (!overhead) {
      polygon([[7.72,goal],[7.72,goal+0.03],[7.72,goal+0.03,0.65],[7.72,goal,0.65]], '#40382e');
      polygon([[7.72,goal,0.65],[7.72,goal+0.22,0.65],[7.72,goal+0.22,0.46],[7.72,goal,0.46]], '#f7c477');
    }
    const supportingPlatform = y >= 0 && platforms.find(([l,r,n,f]) => x>=l && x<=r && z>=n && z<=f);
    if (shadow.checked && supportingPlatform && path(surface(supportingPlatform))) {
      ctx.save();
      ctx.clip();
      const disc = Array.from({length:16}, (_,i) => {
        const angle = i*Math.PI/8;
        return [x+Math.cos(angle)*0.24,z+Math.sin(angle)*0.2];
      });
      polygon(disc, 'rgba(47,35,29,.42)');
      ctx.restore();
    }
    if (!firstPerson) {
      const foot = cameraPoint([x,z,y]);
      if (foot[2] >= near) {
        const [sx,sy] = screen(foot);
        const size = perspective ? Math.min(32,72/foot[2]) : 20;
        ctx.fillStyle = '#a64328';
        ctx.fillRect(sx-size/2,sy-size,size*0.9,size);
        ctx.fillStyle = '#fff6e6';
        ctx.fillRect(sx+size*0.1,sy-size*0.73,4,4);
      }
    } else {
      ctx.fillStyle = '#40382e';
      ctx.fillRect(334,157,12,2);
      ctx.fillRect(339,152,2,12);
    }
    ctx.fillStyle = '#40382e';
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
    start: () => ({chests: 0, gold: 0, buys: 0}),
    view: s => [['Cofres', s.chests + ' / 8'], ['Oro', s.gold], ['Mejoras', s.buys]],
    hint: (s, mode) => mode || s.buys < 2 ? 'La próxima mejora cuesta 30.' : 'La tienda ha vendido todas sus mejoras.',
    actions: (s, mode) => [
      ['Abrir cofre', s.chests < 8, () => { s.chests++; s.gold += 20; return 'Veinte monedas más.'; }],
      ['Comprar mejora', s.gold >= 30 && (mode || s.buys < 2), () => { s.gold -= 30; s.buys++; return 'Mejora comprada.'; }]
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

function addSystemLab(config, id) {
  const lab = element('section', '', 'referencias laboratorio-sistemas');
  lab.setAttribute('aria-label', 'Prueba interactiva');
  lab.tabIndex = 0;
  const lanes = id === 'avisar-ataques' ? element('div', '', 'lab-carriles') : null;
  if (lanes) lanes.setAttribute('aria-hidden', 'true');
  let state = config.start();
  let mode = 0;
  let timer;
  const stats = element('dl', '', 'lab-estadisticas');
  const hint = element('p', '');
  hint.setAttribute('role', 'status');
  const feedback = element('p', '');
  feedback.setAttribute('role', 'status');
  const controls = element('div', '', 'lab-botones');

  const reset = () => {
    clearTimeout(timer);
    state = config.start();
    feedback.textContent = '';
    render();
  };

  if (config.modes) {
    const label = element('label', 'Variante ');
    const select = element('select', '');
    for (const name of config.modes) select.append(element('option', name));
    select.addEventListener('change', () => {
      mode = select.selectedIndex;
      reset();
    });
    label.append(select);
    lab.append(label);
  }

  const resetButton = element('button', 'Reiniciar');
  resetButton.type = 'button';
  resetButton.addEventListener('click', reset);
  lab.append(stats, hint);
  if (lanes) lab.append(lanes);
  lab.append(controls, feedback);
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
    if (!available) return;
    const message = run();
    if (message !== undefined) feedback.textContent = message;
    render();
  }

  function render() {
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
    const nextHint = config.hint(state, mode);
    if (hint.textContent !== nextHint) hint.textContent = nextHint;
    config.actions(state, mode, schedule).forEach(([, available], index) => {
      buttons[index].setAttribute('aria-disabled', String(!available));
    });
  }

  if (id === 'avisar-ataques') lab.addEventListener('keydown', event => {
    if (event.target.tagName === 'SELECT' || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    act(event.key === 'ArrowLeft' ? 0 : 1);
  });
  controls.append(...buttons, resetButton);
  reading.append(lab);
  render();
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
  const systemLab = resource?.laboratorio && Object.hasOwn(systemLabs, resource.laboratorio) ? systemLabs[resource.laboratorio] : null;
  const archiveIndex = archiveReading || systemLab ? element('nav', '', 'referencias') : null;
  const index = archiveIndex ? element('ol', '') : null;
  if (archiveIndex) {
    archiveIndex.setAttribute('aria-label', 'Índice de la guía');
    archiveIndex.append(element('h2', 'Índice'), index);
  }
  const addToIndex = (heading, id) => {
    heading.id = id;
    if (!index) return;
    const item = element('li', '');
    item.append(link(heading.textContent, '#' + id));
    index.append(item);
  };
  const systemSection = systemLab && '?' + new URLSearchParams({diseno: 'sistemas', categoria: resource.tema}) + '#catalogo';
  reading.append(link(systemLab ? 'Volver a ' + resource.tema : archiveReading ? 'Volver a Mecánicas' : 'Volver a la biblioteca',
    systemSection || (archiveReading ? 'como-se-juega.html?tema=Mec%C3%A1nicas#catalogo' : libraryUrl)), title);
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
          if (systemLab && heading?.[2] === 'Variantes de diseño') {
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
          if (id === 'salto-3d-guia' && heading?.[2] === 'Ponte al mando') addJump3D();
          if (jumpControls && heading?.[2] === 'Ponte al mando') {
            const game = document.querySelector('#plantilla-juego-salto').content.firstElementChild.cloneNode(true);
            reading.append(game);
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
    if (archiveReading || systemLab) document.querySelector('#catalogo').hidden = true;
  }
  reading.hidden = false;
  document.querySelector('.portada').hidden = true;
}

async function loadCatalog() {
  const response = await fetch('datos/como-se-juega.json?v=laboratorios-sistemas', {cache: 'no-cache'});
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

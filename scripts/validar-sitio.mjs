#!/usr/bin/env node
/* Validación local sin dependencias. Ejecutar: node scripts/validar-sitio.mjs */
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),errors=[],warnings=[];
const file=p=>path.join(root,p);
const exists=p=>fs.existsSync(file(p));
const read=p=>fs.readFileSync(file(p),'utf8');
const assert=(ok,message)=>{if(!ok)errors.push(message)};
const warn=message=>warnings.push(message);
const html=fs.readdirSync(root).filter(x=>x.endsWith('.html'));
const required=['index.html','articulos.html','entrevistas.html','anuarios.html','revistas.html','darkdepths.html','cv.html','cv-diseno.html','como-diseno.html','game-studies.html','ensayo.html','proyecto.html','plantilla-gdd.html','perfil-diseno.html','microexperimento.html'];
for(const p of required)assert(exists(p),'Falta página '+p);
for(const p of html){
 const s=read(p);
 assert(/<html\b[^>]*lang=["']es["']/i.test(s),p+': falta lang=es');
 assert(/<title>[^<]+<\/title>/i.test(s),p+': falta título');
 assert(/name=["']viewport["']/i.test(s),p+': falta viewport');
 assert(/<main\b/i.test(s),p+': falta main');
 assert(s.includes('estilos/comun.css'),p+': falta CSS común');
 assert(s.includes('scripts/navegacion.js'),p+': falta navegación común');
 for(const m of s.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)){
  const raw=m[1];if(!raw||/^(?:#|mailto:|tel:|data:|https?:|\/\/)/i.test(raw))continue;
  const target=decodeURIComponent(raw.split(/[?#]/)[0]);
  if(!target||target.startsWith('/')||target.includes('..'))continue;
  assert(exists(target),p+': referencia local inexistente: '+target);
 }
}
function data(name){
 const p='datos/'+name+'.json';assert(exists(p),'Falta '+p);
 if(!exists(p))return [];
 try{const v=JSON.parse(read(p));assert(Array.isArray(v),p+' debe ser una lista');return Array.isArray(v)?v:[]}
 catch(e){errors.push(p+': JSON inválido: '+e.message);return []}
}
const articles=data('articulos'),interviews=data('entrevistas'),pubs=data('publicaciones'),projects=data('proyectos'),essays=data('game-studies');
function checkId(items,name){
 const ids=new Set();
 for(const [i,item] of items.entries()){
  assert(item&&typeof item==='object'&&!Array.isArray(item),name+'['+i+']: objeto inválido');
  if(!item||typeof item!=='object')continue;
  const id=String(item.id||'');
  assert(/^[a-z0-9][a-z0-9_-]*$/.test(id),name+'['+i+']: ID obligatorio, minúsculas sin espacios');
  assert(!ids.has(id),name+': ID duplicado '+id);ids.add(id);
  assert(Boolean(String(item.titulo||'').trim()),name+'['+i+']: falta título');
  if(item.publicacion&& !['publicado','borrador','revision'].includes(item.publicacion))errors.push(name+'['+i+']: estado editorial inválido');
  if(item.publicacion==='borrador'||item.publicacion==='revision')errors.push(name+'['+i+']: borrador/revisión en JSON público. Mantén el borrador fuera del repositorio y publica solo la versión final.');
  for(const field of ['imagen'])if(item[field]&&(!/^imagenes\/[\w./-]+\.(png|jpe?g|webp|gif)$/i.test(item[field])||item[field].includes('..')))errors.push(name+'['+i+']: ruta de imagen inválida');
  if(item.imagen&&!exists(item.imagen))warn(name+'['+i+']: imagen no encontrada '+item.imagen);
  if(item.video&&!/^https:\/\//i.test(item.video))errors.push(name+'['+i+']: vídeo debe usar HTTPS');
 }
 return ids;
}
const projectIds=checkId(projects,'proyectos'),essayIds=checkId(essays,'ensayos');
for(const [i,p]of projects.entries()){
 if(p.enlace&&!/^(https:\/\/|[a-z0-9_-]+\.html(?:[?#].*)?$)/i.test(p.enlace))errors.push('proyectos['+i+']: enlace no permitido');
 if(p.enlace&&!p.enlace.startsWith('https://')&&!exists(p.enlace.split(/[?#]/)[0]))errors.push('proyectos['+i+']: enlace interno inexistente');
 for(const id of String(p.ensayos_relacionados||'').split(',').map(x=>x.trim()).filter(Boolean))assert(essayIds.has(id),'Proyecto '+p.id+': ensayo relacionado inexistente '+id);
}
for(const e of essays)if(e.proyecto_relacionado)assert(projectIds.has(e.proyecto_relacionado),'Ensayo '+e.id+': proyecto relacionado inexistente '+e.proyecto_relacionado);
for(const [name,items]of [['articulos',articles],['entrevistas',interviews],['publicaciones',pubs]])for(const [i,item]of items.entries()){
 assert(Boolean(item.titulo),name+'['+i+']: falta título');
 assert(/^https:\/\//.test(item.url||''),name+'['+i+']: enlace debe usar HTTPS');
}
const cms=read('.pages.yml');for(const collection of ['articulos','entrevistas','publicaciones','proyectos','ensayos'])assert(cms.includes('- name: '+collection),'CMS: falta colección '+collection);
for(const w of warnings)console.warn('AVISO: '+w);
if(errors.length){for(const e of errors)console.error('ERROR: '+e);console.error('Validación fallida: '+errors.length+' error(es).');process.exitCode=1}
else console.log('Validación correcta: '+html.length+' páginas, '+articles.length+' artículos, '+interviews.length+' entrevistas, '+pubs.length+' publicaciones, '+projects.length+' proyectos, '+essays.length+' ensayos. '+warnings.length+' aviso(s).');

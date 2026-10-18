/* Galería compartida para fichas de proyectos. */
(function(){
const safeImage=s=>typeof s==='string'&&/^imagenes\/[a-z0-9_./-]+\.(png|webp|jpe?g|gif)$/i.test(s.trim())&&!s.includes('..');
function mount(p,root){
 const paths=Array.isArray(p.galeria)?p.galeria:String(p.galeria||'').split(/\r?\n/);
 const images=paths.map(s=>String(s).trim()).filter(safeImage);
 if(!images.length)return;
 const section=document.createElement('section');section.className='project-gallery';
 const title=document.createElement('h2');title.textContent='Galería del proyecto';
 const intro=document.createElement('p');intro.textContent='Capturas y materiales del desarrollo.';
 const grid=document.createElement('div');grid.className='project-gallery-grid';
 images.forEach((path,i)=>{const a=document.createElement('a');a.href=path;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label','Abrir captura '+(i+1));const img=document.createElement('img');img.src=path;img.alt=(p.titulo||'Proyecto')+' — captura '+(i+1);img.loading='lazy';a.append(img);grid.append(a)});
 section.append(title,intro,grid);root.append(section);
}
window.PortfolioGallery={mount};
})();
/* Navegación compartida y enlace de salto; sin dependencias externas. */
(()=>{'use strict';
 const main=document.querySelector('main');if(main&&!main.id)main.id='contenido-principal';
 const skip=document.createElement('a');skip.className='skip-link';skip.href='#contenido-principal';skip.textContent='Saltar al contenido';document.body.prepend(skip);
 if(document.body.dataset.nav==='none')return;
 const nav=document.createElement('nav');nav.className='site-subnav';nav.setAttribute('aria-label','Secciones del portfolio');
 const inner=document.createElement('div');inner.className='site-subnav-inner';
 const items=[['Inicio','index.html'],['Proyectos','index.html#proyectos'],['Laboratorio','game-studies.html'],['Cómo diseño','como-diseno.html'],['Publicaciones','articulos.html'],['Entrevistas','entrevistas.html'],['CV Game Design','cv-diseno.html']];
 const current=location.pathname.split('/').pop()||'index.html';
 for(const [label,href]of items){const a=document.createElement('a');a.href=href;a.textContent=label;if(href===current)a.setAttribute('aria-current','page');inner.append(a)}
 nav.append(inner);const header=document.querySelector('header');if(header)header.insertAdjacentElement('afterend',nav);else document.body.insertBefore(nav,main||document.body.firstChild);
})();

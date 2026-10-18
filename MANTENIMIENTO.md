# Mantenimiento del portfolio

Web: https://hatorrcr.github.io/portfolio/  
CMS: https://app.pagescms.org/  
Repositorio: https://github.com/HatorrCR/portfolio

## Publicar contenido

- En **Proyectos** o **Ensayos**, usa un ID único en minúsculas sin espacios (por ejemplo, `mecanica-saltos`).
- Completa título y descripción; las imágenes y vídeos son opcionales.
- Para publicar, marca `visible: true` y `publicacion: publicado`. Los registros antiguos sin `publicacion` siguen visibles para mantener la compatibilidad.
- Para relacionar un proyecto con ensayos, escribe sus IDs separados por comas en `ensayos_relacionados`. Para asociar un ensayo a un proyecto, usa `proyecto_relacionado`.
- No cambies un ID después de compartir su enlace.
- Antes de añadir capturas, súbelas en la sección Media y usa rutas del tipo `imagenes/archivo.webp`.
- Usa `plantilla-gdd.html` como guía para documentar decisiones y pruebas.

### Privacidad de borradores

**IMPORTANTE:** este repositorio es público. Los campos `visible: false`, `publicacion: borrador` y `publicacion: revision` solo ocultan entradas en la interfaz; el contenido del JSON sigue siendo accesible públicamente.

No escribas ideas inéditas confidenciales ni datos personales privados en Pages CMS. Guarda los borradores fuera de este repositorio (por ejemplo, en un documento privado) y copia aquí solo la versión lista para publicar. La comprobación automática marca como error los borradores que se intenten subir al repositorio público, pero no puede impedir que GitHub muestre un commit ya enviado.

## Comprobación automática

GitHub Actions ejecuta `node scripts/validar-sitio.mjs` en cada cambio de HTML, CSS, JS, JSON o configuración CMS. Comprueba:
- Existencia de páginas, recursos y enlaces locales.
- Etiquetas estructurales básicas, navegación y metadatos.
- Sintaxis de los JSON, IDs únicos y campos obligatorios.
- Relaciones entre proyectos y ensayos.
- Formatos básicos de URLs y rutas de imágenes.
- Presencia accidental de borradores en JSON públicos.

Se puede ejecutar también en local, desde la raíz del repositorio:

```bash
node scripts/validar-sitio.mjs
```

La validación **no** comprueba disponibilidad de enlaces externos, experiencia visual, contraste calculado, ni todos los comportamientos en navegador.

## Revisión manual recomendada

1. Abrir la portada y navegar por todas las páginas en móvil y ordenador.
2. Probar filtros y búsqueda de artículos, entrevistas y laboratorio.
3. Probar `entrevistas.html?categoria=Academia`.
4. Comprobar que las fichas dinámicas y el CMS muestran los campos correctamente con contenido real.
5. Usar teclado (Tab, Enter, Escape cuando corresponda), zoom 200 % y lector de pantalla.
6. Comprobar vista de impresión del CV y vistas previas de enlaces en plataformas externas.

## Organización

- `estilos/comun.css`: estilos transversales y accesibilidad.
- `scripts/navegacion.js`: navegación común en páginas interiores.
- `scripts/validar-sitio.mjs`: comprobaciones locales y de CI.
- `datos/*.json`: catálogos públicos.
- `.pages.yml`: campos de edición del CMS.
- `sitemap.xml`, `robots.txt`: indexación básica.

La web se mantiene íntegramente en español. No se añaden imágenes ni proyectos ficticios.

## Criterios editoriales

Consulta [GUIA_EDITORIAL.md](GUIA_EDITORIAL.md) para redactar fichas de proyectos, ensayos, análisis y entrevistas sin confundir hipótesis con resultados.

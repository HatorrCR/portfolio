# Actualización automática del portfolio

## Puesta en marcha

1. Sube **todo el contenido de esta carpeta**, incluida `.github/workflows`, a la raíz de un repositorio de GitHub.
2. Activa GitHub Pages desde la rama principal y la carpeta raíz.
3. En GitHub, abre **Actions → Actualizar publicaciones → Run workflow** para probarlo.
4. La tarea se ejecuta los lunes a las 07:17 UTC. GitHub puede retrasar ejecuciones programadas.
5. En **Settings → Actions → General → Workflow permissions**, permite escritura si el repositorio no la concede al workflow. En repositorios protegidos, configura una pull request en vez de push directo.

## Reglas

- **DevCast:** consulta https://www.devuego.es/podcast/ y añade títulos con «Entrevista» o «Conociendo a» desde el 1 de marzo de 2026. Conserva las fichas existentes y mejora sus enlaces cuando la fuente los incluye.
- **Anuarios y revistas:** detecta nuevas fichas en DeVuego y las guarda en `datos/pendientes_revision.json`. **No atribuye automáticamente una nueva obra a Cristian** sin confirmación de participación. Una vez confirmada, añádela a `datos/publicaciones.json` con portada local y descripción; el generador la publicará.
- Las imágenes existentes se conservan localmente en `imagenes/`.
- Si una fuente cambia de estructura o no responde, el workflow informa del error y no elimina los datos existentes.
- La clasificación automática de entrevistas nuevas empieza como «Profesionales» hasta su revisión en `datos/entrevistas.json`.

## Ejecutar localmente

```bash
python -m pip install -r requirements.txt
python scripts/actualizar.py
```

Requiere acceso a Internet para consultar DeVuego. La generación HTML también puede ejecutarse sin red desde los archivos JSON guardados.

# APP_Formaciones_JS

Sistema de gestión de eventos con alertas y control de equipos.

## Despliegue en Vercel

El proyecto está preparado para desplegarse en [Vercel](https://vercel.com):

1. **Conectar el repositorio**
   - En [vercel.com](https://vercel.com) → New Project → importa este repositorio.

2. **Desplegar**
   - Vercel detectará automáticamente la raíz del proyecto.
   - Las rutas bajo `/api/*` se sirven como Serverless Functions.
   - Los archivos estáticos (HTML, CSS, JS) se sirven desde la raíz.

3. **Base de datos en Vercel**
   - En Vercel la app usa SQLite en el directorio temporal (`/tmp`). Los datos **no son persistentes** entre despliegues ni entre distintas instancias de la función.
   - Para producción con datos persistentes se recomienda usar [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) o una base de datos externa y adaptar `database.js` a ese proveedor.

4. **Ejecución local**
   - `npm install`
   - `npm run dev` o `npm start`
   - La base de datos local se guarda en `events.db` en la raíz del proyecto.

## Estructura para Vercel

- `api/events/index.js` → GET/POST `/api/events`
- `api/events/[id].js` → GET/DELETE `/api/events/:id`
- `api/alerts/check.js` → GET `/api/alerts/check`
- `api/stats.js` → GET `/api/stats`
- `vercel.json` → cabeceras CORS para la API

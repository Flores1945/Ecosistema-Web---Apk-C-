# I.E. Liceo Trujillo — Sistema Web

Sistema de gestión escolar: frontend web + backend Node.js + MySQL + Firebase + n8n/WhatsApp.

## Estructura de carpetas

| Carpeta | Qué contiene |
|---|---|
| `paginas/` | Archivos HTML del sitio (login, panel, alumnos, asistencias, etc.) |
| `scripts/` | JavaScript del frontend (un `.js` por página + módulos compartidos en `vendor/`) |
| `estilos/` | Hojas de estilo CSS |
| `automatizaciones/` | Export del workflow de n8n (WhatsApp + IA) |
| `backend/` | Servidor API en Node.js/Express |
| `backend/src/` | Código del servidor (rutas en `rutas/`, middlewares en `middleware/`) |
| `backend/scripts/` | Utilidades de base de datos (`init-db`, `check-db`, `set-password`, etc.) |
| `backend/base-de-datos/` | Esquema SQL (`schema.sql`, `n8n_whatsapp.sql`) |

## Cómo encenderlo

```bash
cd backend
npm install     # solo la primera vez
npm start       # servidor en http://localhost:3000
```

Login: http://localhost:3000 → redirige a `paginas/index.html`.

## App móvil (APK)

El proyecto de la app está en `C:\Users\flore\AndroidStudioProjects\ApkAsistencia`
(proyecto Android Studio en Kotlin, fuera de este directorio — está en desarrollo).
Se comunicará por **Firestore** (Firebase); este backend hace de puente hacia MySQL.

# Backend I.E. Liceo Trujillo

API en Node.js + Express conectada a MySQL. También sirve las páginas web.

## Cómo encenderlo (una sola vez la preparación)

Abre una terminal **dentro de esta carpeta (`backend`)** y ejecuta:

```bash
npm install          # instala las dependencias
npm run init-db      # crea la base escuela_liceo y sus tablas (si ya existen, no borra nada)
npm start            # enciende el servidor
```

Luego abre en el navegador: **http://localhost:3000**

Los datos de MySQL están en el archivo `.env` (usuario, contraseña, puerto 3306).
Ese archivo **no se sube a GitHub** (está en `.gitignore`); no lo compartas.
Si no lo tienes, copia `.env.example` como `.env` y complétalo.

## Primer ingreso

Usuario: `director@liceo.edu` — Clave: `admin123`.
**Esa clave es pública. Cámbiala lo primero:**

```bash
npm run set-password -- director@liceo.edu TuNuevaClave
```

## Herramientas

| Comando | Para qué sirve |
|---|---|
| `npm start` | Enciende el servidor (puerto 3000). |
| `npm run init-db` | Crea o completa la base. Convierte claves viejas en texto plano. No borra datos. |
| `npm run check-db` | Revisa que tu base tenga todas las tablas y columnas que el backend necesita. |
| `npm run set-password -- correo NuevaClave` | Cambia la contraseña de una cuenta (o reactiva una cuenta inactiva). |

## Quién puede qué

- Las cuentas **solo las crea la directiva** (Director / Subdirector) desde "Registrar personal".
  Solo el Director puede crear cuentas de la directiva.
- Cada cargo ve y modifica lo mismo que en las páginas (las reglas están en `src/permisos.js`).
- Lo que alumnos y docentes hacen queda en Auditoría, a su nombre; solo la directiva lo consulta y nadie puede borrarlo.
- Un aula admite como máximo **28 alumnos activos**.

## Si algo falla

- *"No se pudo conectar a MySQL"*: revisa `.env` y que MySQL esté encendido.
- *"El puerto 3000 ya está en uso"*: ya tienes el backend abierto en otra ventana.
- Tu base la creó otro script: ejecuta `npm run check-db`; si marca faltantes, `npm run init-db`.

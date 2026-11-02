// Revisa que la base de datos tenga todas las tablas y columnas que usa la API.
// Uso:  npm run check-db
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const resources = require("./resources");

// Columnas que usan las rutas de login/registro/auditoría (no están en resources.js)
const EXTRA = {
    usuarios: ["id", "email", "password", "nombres", "apellidos", "cargo", "telefono", "activo", "fecha_creacion"],
    auditoria: ["id", "fecha_accion"]
};

async function run() {
    const base = process.env.DB_NAME || "escuela_liceo";
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || ""
    });

    const [filas] = await conn.query(
        "SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?",
        [base]
    );
    await conn.end();

    if (!filas.length) {
        console.error(`La base "${base}" no existe o está vacía. Ejecuta:  npm run init-db`);
        process.exit(1);
    }

    const existentes = {};
    for (const { t, c } of filas) (existentes[t] ||= new Set()).add(c);

    const esperado = { ...EXTRA };
    for (const def of Object.values(resources)) {
        esperado[def.table] = [...new Set([...(esperado[def.table] || []), "id", ...def.fields])];
    }

    let problemas = 0;
    for (const [tabla, columnas] of Object.entries(esperado).sort()) {
        if (!existentes[tabla]) {
            console.log(`❌ Falta la tabla "${tabla}"`);
            problemas++;
            continue;
        }
        const faltan = columnas.filter((c) => !existentes[tabla].has(c));
        if (faltan.length) {
            console.log(`❌ ${tabla}: faltan las columnas ${faltan.join(", ")}`);
            problemas++;
        } else {
            console.log(`✅ ${tabla}`);
        }
    }

    console.log(problemas
        ? `\n${problemas} problema(s). Si tu base la creó otro script, ejecuta  npm run init-db  (agrega lo que falte sin borrar datos) y vuelve a revisar.`
        : `\nLa base "${base}" tiene todo lo que necesita el backend.`);
    process.exit(problemas ? 1 : 0);
}

run().catch((error) => {
    console.error("No se pudo revisar la base:", error.message);
    process.exit(1);
});

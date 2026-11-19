// Migración única: MySQL local (escuela_liceo) -> PostgreSQL (Supabase).
// Uso: node scripts/migrate-mysql-a-supabase.js
// Lee credenciales MySQL de DB_* y la destino de DATABASE_URL (backend/.env).

const path = require("path");
const mysql = require("mysql2/promise");
const { Pool } = require("pg");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

// Orden por llaves foráneas. estudiante_padre se incluye porque es el vínculo
// alumno<->apoderado que usa el flujo de WhatsApp (sin él no llegan los avisos).
const TABLAS = [
    "usuarios",
    "padres",
    "estudiantes",
    "estudiante_padre",
    "asistencias",
    "justificaciones",
    "school_regulations"
];

// Columnas BOOLEAN en Postgres (en MySQL llegan como 0/1)
const BOOLEANAS = new Set(["activo", "es_demo"]);

function convertirValor(columna, valor) {
    if (valor === undefined) return null;
    if (BOOLEANAS.has(columna) && (valor === 0 || valor === 1 || valor === "0" || valor === "1")) {
        return valor === 1 || valor === "1";
    }
    if (valor instanceof Date) {
        // dateStrings no debería dar Date, pero por si acaso
        return valor.toISOString().slice(0, 10);
    }
    return valor;
}

async function main() {
    const my = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "escuela_liceo",
        dateStrings: true
    });

    const pg = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    console.log("Conectado a MySQL y Supabase. Migrando...\n");

    for (const tabla of TABLAS) {
        const [filas] = await my.query(`SELECT * FROM \`${tabla}\``);
        if (!filas.length) {
            console.log(`${tabla}: 0 filas (nada que migrar)`);
            continue;
        }

        // Columnas reales en Postgres (por si el usuario creó la tabla a mano)
        const { rows: colsPg } = await pg.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = $1",
            [tabla]
        );
        const permitidas = new Set(colsPg.map((c) => c.column_name));
        if (!permitidas.size) {
            console.log(`${tabla}: ERROR - la tabla no existe en Supabase`);
            continue;
        }

        let migradas = 0;
        let omitidas = 0;
        const client = await pg.connect();
        try {
            for (const fila of filas) {
                const entradas = Object.entries(fila).filter(([k]) => permitidas.has(k));
                if (!entradas.length) { omitidas++; continue; }
                const columnas = entradas.map(([k]) => `"${k}"`).join(", ");
                const marks = entradas.map((_, i) => `$${i + 1}`).join(", ");
                const valores = entradas.map(([k, v]) => convertirValor(k, v));

                // Conserva el id original (los QR y Firestore lo usan) y es idempotente
                await client.query(
                    `INSERT INTO "${tabla}" (${columnas}) VALUES (${marks}) ON CONFLICT (id) DO NOTHING`,
                    valores
                );
                migradas++;
            }
            // Reajusta la secuencia para que los próximos ids no choquen
            await client.query(
                `SELECT setval(pg_get_serial_sequence('"${tabla}"','id'), COALESCE((SELECT MAX(id) FROM "${tabla}"), 1))`
            );
        } finally {
            client.release();
        }
        console.log(`${tabla}: ${migradas} insertadas${omitidas ? `, ${omitidas} omitidas` : ""}`);
    }

    // Resumen final
    console.log("\nVerificación en Supabase:");
    for (const tabla of TABLAS) {
        try {
            const { rows } = await pg.query(`SELECT COUNT(*)::int AS n FROM "${tabla}"`);
            console.log(`  ${tabla}: ${rows[0].n} registros`);
        } catch (e) {
            console.log(`  ${tabla}: ERROR - ${e.message}`);
        }
    }

    await my.end();
    await pg.end();
    console.log("\nListo.");
}

main().catch((e) => {
    console.error("Error en la migración:", e.message);
    process.exit(1);
});

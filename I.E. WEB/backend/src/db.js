const { Pool, types } = require("pg");

// Las columnas DATE/TIMESTAMP llegan como texto 'YYYY-MM-DD[ HH:MM:SS]',
// igual que con mysql2 + dateStrings (así no rompe el código existente).
types.setTypeParser(1082, (v) => v); // date
types.setTypeParser(1114, (v) => v); // timestamp

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    connectionTimeoutMillis: 10000
});

// Traduce la sintaxis MySQL a PostgreSQL:
//  - placeholders ? -> $1, $2... (respetando comillas simples)
//  - CURDATE() -> CURRENT_DATE
function traducir(sql) {
    let out = "";
    let n = 0;
    let comilla = false;
    for (let i = 0; i < sql.length; i++) {
        const ch = sql[i];
        if (ch === "'") comilla = !comilla;
        if (ch === "?" && !comilla) {
            n++;
            out += "$" + n;
        } else {
            out += ch;
        }
    }
    return out.replace(/CURDATE\s*\(\s*\)/gi, "CURRENT_DATE");
}

// Ejecuta en `q` (pool o client) y devuelve las filas con la misma
// "forma" que devolvía mysql2: array de filas + .insertId/.affectedRows.
async function ejecutar(q, sql, params = []) {
    const texto = traducir(sql);
    const esInsert = /^\s*insert\b/i.test(texto) && !/\breturning\b/i.test(texto);
    const res = await q(esInsert ? `${texto} RETURNING id` : texto, params);
    const rows = res.rows;
    rows.affectedRows = res.rowCount ?? 0;
    if (esInsert) rows.insertId = rows[0] ? rows[0].id : null;
    return rows;
}

async function query(sql, params = []) {
    return ejecutar((s, p) => pool.query(s, p), sql, params);
}

// Ejecuta `fn` con un candado consultivo de Postgres (equivalente a GET_LOCK).
// Sirve para que dos altas simultáneas no se salten el límite de alumnos por aula.
// `fn` recibe una función q(sql, params) que usa la misma conexión del candado.
async function conCandado(nombre, fn) {
    const client = await pool.connect();
    try {
        await client.query("SELECT pg_advisory_lock(hashtext($1))", [nombre]);
        try {
            return await fn(async (sql, params = []) =>
                ejecutar((s, p) => client.query(s, p), sql, params)
            );
        } finally {
            await client.query("SELECT pg_advisory_unlock(hashtext($1))", [nombre]).catch(() => {});
        }
    } finally {
        client.release();
    }
}

module.exports = { pool, query, conCandado };

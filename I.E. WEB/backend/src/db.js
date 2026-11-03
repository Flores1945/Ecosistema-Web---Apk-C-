const mysql = require("mysql2/promise");
const config = require("./config");

const pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    charset: "utf8mb4_unicode_ci",
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 10000,
    dateStrings: true
});

async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

// Ejecuta `fn` con un candado de MySQL. Sirve para que dos altas simultáneas no
// se salten el límite de alumnos por aula (comprobar cupo + guardar es una sola operación).
// `fn` recibe una función q(sql, params) que usa la misma conexión del candado.
async function conCandado(nombre, fn) {
    const conn = await pool.getConnection();
    try {
        const [[fila]] = await conn.query("SELECT GET_LOCK(?, 10) AS ok", [nombre]);
        if (!fila.ok) {
            const error = new Error("El aula está ocupada con otro registro, intenta de nuevo.");
            error.status = 503;
            throw error;
        }
        try {
            return await fn(async (sql, params = []) => {
                const [rows] = await conn.execute(sql, params);
                return rows;
            });
        } finally {
            await conn.query("SELECT RELEASE_LOCK(?)", [nombre]).catch(() => {});
        }
    } finally {
        conn.release();
    }
}

module.exports = { pool, query, conCandado };

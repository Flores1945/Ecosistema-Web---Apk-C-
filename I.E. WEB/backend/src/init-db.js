const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || ""
};

async function run() {
    const schemaPath = path.join(__dirname, "..", "sql", "schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf8");

    const conn = await mysql.createConnection({
        ...dbConfig,
        multipleStatements: true
    });

    console.log("Conectado a MySQL. Creando base y tablas...");
    await conn.query(sql);
    await conn.query("USE escuela_liceo");

    await conn.query(`
        DROP PROCEDURE IF EXISTS verificar_capacidad_aula
    `);
    await conn.query(`
        CREATE PROCEDURE verificar_capacidad_aula(
            IN p_nivel VARCHAR(20),
            IN p_grado INT,
            IN p_seccion CHAR(1),
            IN p_turno VARCHAR(20),
            IN p_estudiante_id INT
        )
        BEGIN
            DECLARE cantidad_actual INT;
            DECLARE capacidad_maxima INT DEFAULT 28;

            SELECT COUNT(*) INTO cantidad_actual
            FROM estudiantes
            WHERE nivel = p_nivel
            AND grado = p_grado
            AND seccion = p_seccion
            AND turno = p_turno
            AND estado = 'Activo'
            AND (p_estudiante_id IS NULL OR id != p_estudiante_id);

            SELECT cantidad_actual, capacidad_maxima, (capacidad_maxima - cantidad_actual) AS cupos_disponibles;
        END
    `);

    try {
        await conn.query("ALTER TABLE estudiantes ADD COLUMN es_demo BOOLEAN DEFAULT FALSE");
        console.log("Columna es_demo agregada a estudiantes.");
    } catch (error) {
        if (!String(error.message).includes("Duplicate column")) {
            console.warn("es_demo:", error.message);
        }
    }

    const hash = await bcrypt.hash("admin123", 10);
    const [existentes] = await conn.query(
        "SELECT id, password FROM usuarios WHERE email = ? LIMIT 1",
        ["director@liceo.edu"]
    );

    if (!existentes.length) {
        await conn.query(
            `INSERT INTO usuarios (email, password, nombres, apellidos, cargo, telefono)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ["director@liceo.edu", hash, "Juan", "Pérez", "Director", "987654321"]
        );
        console.log("Usuario director creado: director@liceo.edu / admin123");
    } else if (!String(existentes[0].password || "").startsWith("$2")) {
        await conn.query("UPDATE usuarios SET password = ? WHERE id = ?", [hash, existentes[0].id]);
        console.log("Contraseña del director actualizada a bcrypt.");
    } else {
        console.log("El usuario director ya existía.");
    }

    await conn.end();
    console.log("Base de datos escuela_liceo lista.");
}

run().catch((error) => {
    console.error("Error al inicializar MySQL:", error.message);
    process.exit(1);
});

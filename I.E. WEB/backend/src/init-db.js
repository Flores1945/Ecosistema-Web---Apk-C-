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

    const [existentes] = await conn.query(
        "SELECT id FROM usuarios WHERE email = ? LIMIT 1",
        ["director@liceo.edu"]
    );

    if (!existentes.length) {
        const hash = await bcrypt.hash("admin123", 10);
        await conn.query(
            `INSERT INTO usuarios (email, password, nombres, apellidos, cargo, telefono)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ["director@liceo.edu", hash, "Juan", "Pérez", "Director", "987654321"]
        );
        console.log("Usuario director creado: director@liceo.edu / admin123");
        console.log("⚠ Esa clave es pública. Cámbiala ya:  npm run set-password -- director@liceo.edu TuNuevaClave");
    } else {
        console.log("El usuario director ya existía.");
    }

    // La API compara contraseñas con bcrypt. Si alguna cuenta se creó con otro script
    // y quedó en texto plano, se convierte aquí para que pueda iniciar sesión.
    const [todos] = await conn.query("SELECT id, email, password FROM usuarios");
    for (const usuario of todos) {
        const actual = String(usuario.password || "");
        if (actual.startsWith("$2")) continue;

        if (!actual || /^[0-9a-f]{64}$/i.test(actual)) {
            console.warn(
                `⚠ ${usuario.email}: su clave está en un formato que no se puede convertir. ` +
                `Asígnale una nueva:  npm run set-password -- ${usuario.email} NuevaClave`
            );
            continue;
        }

        await conn.query("UPDATE usuarios SET password = ? WHERE id = ?", [await bcrypt.hash(actual, 10), usuario.id]);
        console.log(`Clave de ${usuario.email} convertida a bcrypt (estaba en texto plano; sigue siendo la misma).`);
    }

    await conn.end();
    console.log("Base de datos escuela_liceo lista.");
}

run().catch((error) => {
    console.error("Error al inicializar MySQL:", error.message);
    process.exit(1);
});

// Cambia la contraseña de una cuenta.
// Uso:  npm run set-password -- correo@liceo.edu NuevaClave
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

async function run() {
    const [correo, clave] = process.argv.slice(2);
    if (!correo || !clave) {
        console.error("Uso:  npm run set-password -- correo@liceo.edu NuevaClave");
        process.exit(1);
    }
    if (clave.length < 6) {
        console.error("La contraseña debe tener mínimo 6 caracteres.");
        process.exit(1);
    }

    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "escuela_liceo"
    });

    const [resultado] = await conn.query(
        "UPDATE usuarios SET password = ?, activo = TRUE WHERE email = ?",
        [await bcrypt.hash(clave, 10), correo.trim().toLowerCase()]
    );
    await conn.end();

    if (!resultado.affectedRows) {
        console.error(`No existe ninguna cuenta con el correo ${correo}.`);
        process.exit(1);
    }
    console.log(`Contraseña actualizada para ${correo}.`);
}

run().catch((error) => {
    console.error("No se pudo cambiar la contraseña:", error.message);
    process.exit(1);
});

const path = require("path");

// Se lee siempre backend/.env, sin importar desde qué carpeta se arranque el servidor.
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const jwtSecret = process.env.JWT_SECRET || "";
if (jwtSecret.length < 16 || jwtSecret === "cambia-esta-clave") {
    console.error(
        "\n[config] Falta JWT_SECRET en backend/.env (mínimo 16 caracteres y distinto del ejemplo).\n" +
        "Genera uno con:\n" +
        "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n"
    );
    process.exit(1);
}

module.exports = {
    port: Number(process.env.PORT) || 3000,
    jwtSecret,
    db: {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "escuela_liceo"
    }
};

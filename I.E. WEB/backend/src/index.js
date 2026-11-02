const path = require("path");
const express = require("express");
const cors = require("cors");
const config = require("./config");
const { pool } = require("./db");
const { autenticar } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const crudRoutes = require("./routes/crud");

const app = express();
const frontendDir = path.join(__dirname, "..", "..");

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Solo se publican las carpetas del sitio web. La carpeta backend (con el .env,
// el código y el esquema de la base de datos) nunca se sirve al navegador.
for (const carpeta of ["html", "css", "js"]) {
    app.use(`/${carpeta}`, express.static(path.join(frontendDir, carpeta)));
}

app.get("/api/health", async (_req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ ok: true, db: config.db.database });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, error: "No hay conexión con la base de datos." });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api", autenticar, crudRoutes);

app.get("/", (_req, res) => {
    res.redirect("/html/index.html");
});

// Errores generales: siempre responden JSON (nunca una página con detalles internos)
app.use((error, _req, res, _next) => {
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ error: "El JSON enviado no es válido." });
    }
    if (error.type === "entity.too.large") {
        return res.status(413).json({ error: "El envío es demasiado grande." });
    }
    console.error(error);
    res.status(error.status || 500).json({ error: "Error interno del servidor." });
});

async function iniciar() {
    try {
        await pool.query("SELECT 1");
    } catch (error) {
        console.error(
            `\nNo se pudo conectar a MySQL (${config.db.host}:${config.db.port}, usuario "${config.db.user}", base "${config.db.database}").\n` +
            `Motivo: ${error.message}\n` +
            "→ Revisa backend/.env y que MySQL esté encendido.\n" +
            "→ Si la base todavía no existe, ejecuta:  npm run init-db\n"
        );
        process.exit(1);
    }

    app.listen(config.port, (error) => {
        if (error) {
            console.error(
                error.code === "EADDRINUSE"
                    ? `\nEl puerto ${config.port} ya está en uso (¿ya tienes el backend abierto en otra ventana?).\n`
                    : `\nNo se pudo iniciar el servidor: ${error.message}\n`
            );
            process.exit(1);
        }
        console.log(`Backend I.E. Liceo en http://localhost:${config.port}`);
        console.log(`Login: http://localhost:${config.port}/html/index.html`);
    });
}

iniciar();

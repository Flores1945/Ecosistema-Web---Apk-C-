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
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
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

// Endpoints públicos para el APK móvil (sin autenticación)
app.get("/api/public/estudiantes", async (_req, res) => {
    try {
        const { nivel, grado, seccion, turno } = _req.query;
        let sql = "SELECT id, nombres, apellidos, nivel, grado, seccion, turno, dni FROM estudiantes WHERE estado = 'Activo'";
        const params = [];
        
        if (nivel) {
            sql += " AND nivel = ?";
            params.push(nivel);
        }
        if (grado) {
            sql += " AND grado = ?";
            params.push(grado);
        }
        if (seccion) {
            sql += " AND seccion = ?";
            params.push(seccion);
        }
        if (turno) {
            sql += " AND turno = ?";
            params.push(turno);
        }
        
        sql += " ORDER BY id DESC";
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener estudiantes" });
    }
});

app.get("/api/public/estudiantes/:dni", async (_req, res) => {
    try {
        const { dni } = _req.params;
        const [rows] = await pool.query(
            "SELECT id, nombres, apellidos, nivel, grado, seccion, turno, dni FROM estudiantes WHERE dni = ? AND estado = 'Activo' LIMIT 1",
            [dni]
        );
        if (!rows.length) {
            return res.status(404).json({ error: "Estudiante no encontrado" });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al buscar estudiante" });
    }
});

app.post("/api/public/asistencia", async (_req, res) => {
    try {
        const { estudiante_id, estado, observacion } = _req.body;
        if (!estudiante_id || !estado) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }
        
        // Verificar si ya tiene asistencia hoy
        const [existe] = await pool.query(
            "SELECT id FROM asistencias WHERE estudiante_id = ? AND DATE(fecha) = CURDATE()",
            [estudiante_id]
        );
        
        if (existe.length > 0) {
            return res.status(409).json({ error: "Ya tiene asistencia registrada hoy" });
        }
        
        const [result] = await pool.query(
            "INSERT INTO asistencias (estudiante_id, fecha, estado, observacion, metodo_registro) VALUES (?, CURDATE(), ?, ?, 'APK Móvil')",
            [estudiante_id, estado, observacion || null]
        );
        
        res.status(201).json({ id: result.insertId, ok: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al registrar asistencia" });
    }
});

// Endpoint temporal para actualizar DNI (solo para pruebas)
app.put("/api/public/estudiantes/:id/dni", async (_req, res) => {
    try {
        const { id } = _req.params;
        const { dni } = _req.body;
        
        if (!dni || !/^\d{7}$/.test(dni)) {
            return res.status(400).json({ error: "El DNI debe tener 7 dígitos numéricos" });
        }
        
        const [result] = await pool.query(
            "UPDATE estudiantes SET dni = ? WHERE id = ?",
            [dni, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Estudiante no encontrado" });
        }
        
        res.json({ ok: true, dni });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar DNI" });
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

    app.listen(config.port, '0.0.0.0', (error) => {
        if (error) {
            console.error(
                error.code === "EADDRINUSE"
                    ? `\nEl puerto ${config.port} ya está en uso (¿ya tienes el backend abierto en otra ventana?).\n`
                    : `\nNo se pudo iniciar el servidor: ${error.message}\n`
            );
            process.exit(1);
        }
        console.log(`Backend I.E. Liceo en http://localhost:${config.port}`);
        console.log(`Backend accesible desde red: http://192.168.100.8:${config.port}`);
        console.log(`Login: http://localhost:${config.port}/html/index.html`);
    });
}

iniciar();

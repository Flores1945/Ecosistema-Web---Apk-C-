const path = require("path");
const express = require("express");
const cors = require("cors");
const config = require("./config");
const { pool, query } = require("./db");
const { autenticar } = require("./middleware/auth");
const authRoutes = require("./rutas/auth");
const demoRoutes = require("./rutas/demo");
const crudRoutes = require("./rutas/crud");
const apkRoutes = require("./rutas/apk");
const {
    normalizarEstadoAsistencia,
    notificarN8nAsistencia
} = require("./notificar-n8n");

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
for (const carpeta of ["paginas", "estilos", "scripts", "imagenes"]) {
    app.use(`/${carpeta}`, express.static(path.join(frontendDir, carpeta)));
}

app.get("/api/health", async (_req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ ok: true, db: "postgresql" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, error: "No hay conexión con la base de datos." });
    }
});

// Endpoints públicos para el APK móvil (sin autenticación)
app.get("/api/public/estudiantes", async (_req, res) => {
    try {
        const { nivel, grado, seccion, turno } = _req.query;
        let sql = `SELECT e.id, e.nombres, e.apellidos, e.nivel, e.grado, e.seccion, e.turno, e.dni,
            (SELECT p.telefono
             FROM estudiante_padre ep
             INNER JOIN padres p ON p.id = ep.padre_id
             WHERE ep.estudiante_id = e.id
             LIMIT 1) AS telefono_apoderado
            FROM estudiantes e WHERE e.estado = 'Activo'`;
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
        const rows = await query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener estudiantes" });
    }
});

app.get("/api/public/estudiantes/:dni", async (_req, res) => {
    try {
        const { dni } = _req.params;
        const rows = await query(
            `SELECT e.id, e.nombres, e.apellidos, e.nivel, e.grado, e.seccion, e.turno, e.dni,
                (SELECT p.telefono
                 FROM estudiante_padre ep
                 INNER JOIN padres p ON p.id = ep.padre_id
                 WHERE ep.estudiante_id = e.id
                 LIMIT 1) AS telefono_apoderado
             FROM estudiantes e WHERE e.dni = ? AND e.estado = 'Activo' LIMIT 1`,
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

// La APK puede mandar "Asistencia", "Presente", "Tarde", "Ausente", etc.
app.post("/api/public/asistencia", async (_req, res) => {
    try {
        const { estudiante_id, estado, observacion } = _req.body;
        if (!estudiante_id || !estado) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        const estadoNormalizado = normalizarEstadoAsistencia(estado);

        // Verificar si ya tiene asistencia hoy
        const existe = await query(
            "SELECT id FROM asistencias WHERE estudiante_id = ? AND fecha = CURDATE()",
            [estudiante_id]
        );

        if (existe.length > 0) {
            return res.status(409).json({ error: "Ya tiene asistencia registrada hoy" });
        }

        const result = await query(
            "INSERT INTO asistencias (estudiante_id, fecha, estado, observacion, metodo_registro) VALUES (?, CURDATE(), ?, ?, 'APK Móvil')",
            [estudiante_id, estadoNormalizado, observacion || null]
        );

        // Avisar a n8n para que envíe el WhatsApp al apoderado (sin bloquear la respuesta)
        notificarN8nAsistencia(estudiante_id, estadoNormalizado).catch(() => {});

        res.status(201).json({ id: result.insertId, ok: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al registrar asistencia" });
    }
});

// Reglamento escolar activo: lo consulta el agente de n8n (WhatsApp)
app.get("/api/public/reglamento", async (_req, res) => {
    try {
        const rows = await query(
            "SELECT titulo, contenido, categoria FROM school_regulations WHERE activo = TRUE ORDER BY id"
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el reglamento" });
    }
});

// Recibe la justificación que el agente de n8n validó por WhatsApp
app.post("/api/public/justificacion", async (req, res) => {
    try {
        const n8nKey = process.env.N8N_API_KEY;
        if (!n8nKey || req.headers["x-n8n-key"] !== n8nKey) {
            return res.status(401).json({ error: "No autorizado" });
        }

        const b = req.body || {};
        const codigoAlumno = String(b.codigo_alumno || "").trim();
        const telefono = String(b.telefono_apoderado || "").replace(/\D/g, "");

        // Resolver estudiante por DNI (codigo_alumno) o por nombre+grado+seccion
        let estudiante = null;
        if (/^\d{7}$/.test(codigoAlumno)) {
            const rows = await query(
                "SELECT id FROM estudiantes WHERE dni = ? LIMIT 1", [codigoAlumno]
            );
            estudiante = rows[0];
        }
        if (!estudiante && codigoAlumno && /^\d+$/.test(codigoAlumno)) {
            const rows = await query(
                "SELECT id FROM estudiantes WHERE id = ? LIMIT 1", [Number(codigoAlumno)]
            );
            estudiante = rows[0];
        }
        if (!estudiante && b.nombre_alumno) {
            const rows = await query(
                `SELECT id FROM estudiantes
                 WHERE CONCAT(nombres, ' ', apellidos) LIKE ? AND grado = ? AND seccion = ?
                 LIMIT 1`,
                [`%${b.nombre_alumno}%`, Number(b.grado) || 0, b.seccion || ""]
            );
            estudiante = rows[0];
        }
        if (!estudiante) {
            return res.status(404).json({ error: "No se encontró el estudiante" });
        }

        // Resolver padre por teléfono del apoderado
        let padre = null;
        if (telefono) {
            const rows = await query(
                "SELECT id FROM padres WHERE REPLACE(REPLACE(telefono, ' ', ''), '-', '') = ? LIMIT 1",
                [telefono]
            );
            padre = rows[0];
        }

        const fecha = String(b.fecha || new Date().toISOString().slice(0, 10));
        const dias = Math.max(1, Number(b.dias) || 1);
        const fechaFin = new Date(fecha);
        fechaFin.setDate(fechaFin.getDate() + dias - 1);
        const fechaFinStr = fechaFin.toISOString().slice(0, 10);

        const motivo = String(b.motivo_resumen || b.motivo || "Justificación enviada por WhatsApp").slice(0, 500);
        const detalle = JSON.stringify({
            tipo: b.tipo || null,
            evidencia: b.evidencia || null,
            origen: b.origen || null,
            documento_valido: b.documento_valido ?? null,
            texto_original: b.texto_original || null
        });

        const result = await query(
            `INSERT INTO justificaciones
             (estudiante_id, padre_id, fecha_inicio, fecha_fin, motivo, estado, observacion)
             VALUES (?, ?, ?, ?, ?, 'Aprobada', ?)`,
            [estudiante.id, padre?.id || null, fecha, fechaFinStr, motivo, detalle]
        );

        res.status(201).json({ ok: true, id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al registrar justificación" });
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
        
        const result = await query(
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
app.use("/api/apk", apkRoutes);
app.use("/api/demo", autenticar, demoRoutes);
app.use("/api", autenticar, crudRoutes);

app.get("/", (_req, res) => {
    res.redirect("/paginas/index.html");
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
            `\nNo se pudo conectar a PostgreSQL (Supabase).\n` +
            `Motivo: ${error.message}\n` +
            "→ Revisa que DATABASE_URL esté definida en backend/.env.\n"
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
        console.log(`Backend accesible desde la red local en el puerto ${config.port}`);
        console.log(`Login: http://localhost:${config.port}/paginas/index.html`);
    });
}

iniciar();

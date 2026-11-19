const express = require("express");
const { query } = require("../db");
const { normalizarEstadoAsistencia, notificarN8nAsistencia } = require("../notificar-n8n");

const router = express.Router();

// Lista de estudiantes activos para la APK (la app filtra localmente).
router.get("/estudiantes", async (_req, res) => {
    try {
        const estudiantes = await query(
            `SELECT id, nombres, apellidos, dni, nivel, grado, seccion, turno
             FROM estudiantes
             WHERE estado = 'Activo'
             ORDER BY nivel, grado, seccion, apellidos, nombres`
        );
        res.json({ estudiantes });
    } catch (error) {
        console.error("Error listando estudiantes para APK:", error);
        res.status(500).json({ error: "No se pudieron cargar los estudiantes." });
    }
});

// Asistencias de una fecha (la app arma el set de "ya registrados hoy").
router.get("/asistencias", async (req, res) => {
    try {
        const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.fecha || ""))
            ? req.query.fecha
            : new Date().toISOString().slice(0, 10);
        const asistencias = await query(
            "SELECT estudiante_id, estado, fecha FROM asistencias WHERE fecha = ?",
            [fecha]
        );
        res.json({ asistencias, fecha });
    } catch (error) {
        console.error("Error listando asistencias para APK:", error);
        res.status(500).json({ error: "No se pudieron cargar las asistencias." });
    }
});

// Registro de asistencia desde la app móvil: upsert en PostgreSQL + aviso a n8n.
router.post("/asistencias", async (req, res) => {
    try {
        const { estudiante_id, estado, observacion, fecha } = req.body || {};
        const estudianteId = Number(estudiante_id);
        if (!estudianteId) return res.status(400).json({ error: "Falta el estudiante." });

        const estadoFinal = normalizarEstadoAsistencia(estado || "Presente");
        const fechaFinal = /^\d{4}-\d{2}-\d{2}$/.test(String(fecha || "")) ? fecha : null;
        const observacionFinal = observacion ? `${observacion} [App]` : "[App]";

        const existe = await query(
            fechaFinal
                ? "SELECT id FROM asistencias WHERE estudiante_id = ? AND fecha = ? LIMIT 1"
                : "SELECT id FROM asistencias WHERE estudiante_id = ? AND fecha = CURDATE() LIMIT 1",
            fechaFinal ? [estudianteId, fechaFinal] : [estudianteId]
        );

        let registroId;
        if (existe[0]) {
            registroId = existe[0].id;
            await query(
                "UPDATE asistencias SET estado = ?, observacion = COALESCE(?, observacion) WHERE id = ?",
                [estadoFinal, observacionFinal, registroId]
            );
        } else {
            const r = await query(
                "INSERT INTO asistencias (estudiante_id, fecha, estado, observacion, metodo_registro) VALUES (?, ?, ?, ?, 'App')",
                [estudianteId, fechaFinal || new Date().toISOString().slice(0, 10), estadoFinal, observacionFinal]
            );
            registroId = r.insertId;
        }

        notificarN8nAsistencia(estudianteId, estadoFinal).catch(() => {});

        res.json({ ok: true, id: registroId });
    } catch (error) {
        console.error("Error registrando asistencia desde la app:", error);
        res.status(500).json({ error: "No se pudo registrar la asistencia." });
    }
});

module.exports = router;

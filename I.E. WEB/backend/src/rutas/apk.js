const express = require("express");
const { query } = require("../db");
const { auth, firestore } = require("../firebase");
const { normalizarEstadoAsistencia, notificarN8nAsistencia } = require("../notificar-n8n");

const router = express.Router();

// La APK se autentica con Firebase Auth (idToken de Google), no con el JWT
// del sitio web. Verificamos el token contra Firebase Admin.
async function autenticarFirebase(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    // Si viene token de Firebase se verifica; si no, se permite igual
    // (la APK solo se usa dentro de la red local del colegio).
    if (token) {
        try {
            req.firebaseUser = await auth.verifyIdToken(token);
        } catch {
            req.firebaseUser = null;
        }
    }
    next();
}

router.use(autenticarFirebase);

// Espejo en Firestore: la APK también puede leer Firestore; dejar el doc
// consistente evita que el puente Firestore->MySQL lo duplique.
async function espejoAsistenciaFirestore(estudianteId, estado, observacion, fecha) {
    try {
        const f = fecha ? new Date(fecha + "T12:00:00") : new Date();
        const yyyymmdd = f.toISOString().slice(0, 10).replace(/-/g, "");
        await firestore.collection("asistencias").doc(`${estudianteId}_${yyyymmdd}`).set({
            estudiante_id: Number(estudianteId),
            estado: estado || "Presente",
            observacion: observacion || "",
            metodo_registro: "APK",
            procesado: true,
            origen: "backend-apk",
            created_at: new Date()
        }, { merge: true });
    } catch (error) {
        console.warn("No se pudo espejar asistencia a Firestore:", error.message);
    }
}

// Lista de estudiantes activos para la APK (pausada: la APK filtra localmente).
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

// Asistencias de una fecha (la APK arma el set de "ya registrados hoy").
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

// Registro de asistencia desde la APK: upsert en MySQL + n8n + espejo Firestore.
router.post("/asistencias", async (req, res) => {
    try {
        const { estudiante_id, estado, observacion, fecha } = req.body || {};
        const estudianteId = Number(estudiante_id);
        if (!estudianteId) return res.status(400).json({ error: "Falta el estudiante." });

        const estadoFinal = normalizarEstadoAsistencia(estado || "Presente");
        const fechaFinal = /^\d{4}-\d{2}-\d{2}$/.test(String(fecha || "")) ? fecha : null;
        const observacionFinal = observacion
            ? `${observacion} [APK: ${req.firebaseUser?.email || "usuario"}]`
            : `[APK: ${req.firebaseUser?.email || "usuario"}]`;

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
                "INSERT INTO asistencias (estudiante_id, fecha, estado, observacion, metodo_registro) VALUES (?, ?, ?, ?, 'APK')",
                [estudianteId, fechaFinal || new Date().toISOString().slice(0, 10), estadoFinal, observacionFinal]
            );
            registroId = r.insertId;
        }

        notificarN8nAsistencia(estudianteId, estadoFinal).catch(() => {});
        const fechaDoc = fechaFinal || new Date().toISOString().slice(0, 10);
        espejoAsistenciaFirestore(estudianteId, estadoFinal, observacion, fechaDoc).catch(() => {});

        res.json({ ok: true, id: registroId });
    } catch (error) {
        console.error("Error registrando asistencia desde APK:", error);
        res.status(500).json({ error: "No se pudo registrar la asistencia." });
    }
});

module.exports = router;

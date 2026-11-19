const { firestore } = require("./firebase");
const { query } = require("./db");
const { normalizarEstadoAsistencia, notificarN8nAsistencia } = require("./notificar-n8n");

// Puente Firestore -> MySQL: la APK escribe asistencias en la colección
// "asistencias" de Firestore (funciona desde cualquier red). Este poller
// las recoge, las inserta en MySQL y dispara el webhook de n8n.
const INTERVALO_MS = 15000;

async function procesarAsistencia(doc) {
    const d = doc.data();
    const estudianteId = Number(d.estudiante_id);
    if (!estudianteId) throw new Error("Documento sin estudiante_id");

    const estado = normalizarEstadoAsistencia(d.estado);

    const [existe] = await query(
        "SELECT id FROM asistencias WHERE estudiante_id = ? AND fecha = CURDATE()",
        [estudianteId]
    );

    let asistenciaId;
    if (existe[0]) {
        asistenciaId = existe[0].id;
    } else {
        const r = await query(
            "INSERT INTO asistencias (estudiante_id, fecha, estado, observacion, metodo_registro) VALUES (?, CURDATE(), ?, ?, ?)",
            [estudianteId, estado, d.observacion || null, d.metodo_registro || "APK Móvil"]
        );
        asistenciaId = r.insertId;
    }

    await notificarN8nAsistencia(estudianteId, estado);

    await doc.ref.update({
        procesado: true,
        asistencia_id: asistenciaId,
        procesado_at: new Date()
    });
}

async function ciclo() {
    try {
        const snap = await firestore
            .collection("asistencias")
            .where("procesado", "==", false)
            .limit(50)
            .get();

        for (const doc of snap.docs) {
            try {
                await procesarAsistencia(doc);
                console.log(`Firestore->MySQL: asistencia ${doc.id} procesada`);
            } catch (error) {
                console.error(`Firestore->MySQL: error en ${doc.id}:`, error.message);
            }
        }
    } catch (error) {
        console.error("Firestore->MySQL: error en ciclo:", error.message);
    }
}

function iniciar() {
    console.log(`Puente Firestore->MySQL activo (cada ${INTERVALO_MS / 1000}s)`);
    setInterval(ciclo, INTERVALO_MS);
    ciclo();
}

module.exports = { iniciar };

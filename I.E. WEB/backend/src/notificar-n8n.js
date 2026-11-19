const { query } = require("./db");

// Se normaliza al ENUM de la tabla asistencias.
function normalizarEstadoAsistencia(estado) {
    const v = String(estado || "").trim().toLowerCase();
    if (["ausente", "falta", "falto", "faltó"].includes(v)) return "Ausente";
    if (["tarde", "tardanza"].includes(v)) return "Tarde";
    if (["justificado", "justificada"].includes(v)) return "Justificado";
    return "Presente";
}

// Estado que entiende el workflow de n8n (puntual/tardanza/falta)
function estadoParaN8n(estadoMySQL) {
    return { Presente: "puntual", Tarde: "tardanza", Ausente: "falta", Justificado: "justificado" }[estadoMySQL] || "puntual";
}

// WhatsApp/Meta exige formato internacional. Los celulares peruanos de 9
// dígitos que empiezan con 9 se completan con el código de país 51.
function telefonoWhatsapp(telefono) {
    const digitos = String(telefono || "").replace(/\D/g, "");
    if (/^9\d{8}$/.test(digitos)) return `51${digitos}`;
    return digitos;
}

// Reenvía el evento de asistencia al webhook de n8n (fire-and-forget)
async function notificarN8nAsistencia(estudianteId, estadoMySQL) {
    const webhookUrl = process.env.N8N_WEBHOOK_ASISTENCIA;
    if (!webhookUrl) return;
    try {
        const rows = await query(
            `SELECT e.id, e.nombres, e.apellidos, e.nivel, e.grado, e.seccion, e.turno, e.dni,
                (SELECT p.telefono
                 FROM estudiante_padre ep
                 INNER JOIN padres p ON p.id = ep.padre_id
                 WHERE ep.estudiante_id = e.id
                 LIMIT 1) AS telefono_apoderado
             FROM estudiantes e WHERE e.id = ? LIMIT 1`,
            [estudianteId]
        );
        const est = rows[0];
        if (!est) return;

        const ahora = new Date();
        await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                codigo_alumno: est.dni || String(est.id),
                nombre_alumno: `${est.nombres} ${est.apellidos}`.trim(),
                grado: String(est.grado),
                seccion: est.seccion,
                telefono_apoderado: telefonoWhatsapp(est.telefono_apoderado),
                fecha: ahora.toISOString().slice(0, 10),
                hora: ahora.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
                estado: estadoParaN8n(estadoMySQL)
            })
        });
    } catch (error) {
        console.error("No se pudo notificar a n8n:", error.message);
    }
}

module.exports = {
    normalizarEstadoAsistencia,
    estadoParaN8n,
    telefonoWhatsapp,
    notificarN8nAsistencia
};

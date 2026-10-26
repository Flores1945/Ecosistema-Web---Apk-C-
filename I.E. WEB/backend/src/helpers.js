function pick(body, fields) {
    const data = {};
    for (const field of fields) {
        if (body[field] !== undefined) {
            data[field] = body[field] === "" ? null : body[field];
        }
    }
    return data;
}

function splitNombreCompleto(texto) {
    const partes = String(texto || "").trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) {
        return { nombres: "Sin nombre", apellidos: "-" };
    }
    if (partes.length === 1) {
        return { nombres: partes[0], apellidos: "-" };
    }
    const mitad = Math.ceil(partes.length / 2);
    return {
        nombres: partes.slice(0, mitad).join(" "),
        apellidos: partes.slice(mitad).join(" ")
    };
}

function toJsonSafe(value) {
    if (value === undefined) return null;
    if (typeof value === "string") return value;
    return JSON.stringify(value);
}

async function registrarAuditoria(query, req, { accion, tabla, registroId, anterior, nuevo }) {
    if (!req.usuario?.id) return;
    try {
        await query(
            `INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, valores_anteriores, valores_nuevos, ip)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                req.usuario.id,
                accion,
                tabla,
                Number(registroId) || 0,
                toJsonSafe(anterior),
                toJsonSafe(nuevo),
                req.ip || null
            ]
        );
    } catch (error) {
        console.warn("No se pudo guardar auditoría:", error.message);
    }
}

module.exports = { pick, splitNombreCompleto, registrarAuditoria };

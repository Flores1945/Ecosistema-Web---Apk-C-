// Columnas JSON de la tabla auditoria
const COLUMNAS_JSON = new Set(["valores_anteriores", "valores_nuevos"]);

function pick(body, fields) {
    const origen = body && typeof body === "object" ? body : {};
    const data = {};
    for (const field of fields) {
        if (origen[field] !== undefined) {
            data[field] = origen[field] === "" ? null : origen[field];
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

function esJson(texto) {
    try {
        JSON.parse(texto);
        return true;
    } catch {
        return false;
    }
}

// Valor listo para una columna JSON: siempre texto JSON válido (o NULL)
function jsonColumna(value) {
    if (value === undefined || value === null) return null;
    if (typeof value === "string") return esJson(value) ? value : JSON.stringify(value);
    return JSON.stringify(value);
}

// Convierte lo que llega del navegador a algo que MySQL acepta:
// booleanos -> 0/1, objetos -> JSON.
function normalizarDatos(data) {
    const salida = {};
    for (const [clave, valor] of Object.entries(data)) {
        if (COLUMNAS_JSON.has(clave)) {
            salida[clave] = jsonColumna(valor);
        } else if (typeof valor === "boolean") {
            salida[clave] = valor ? 1 : 0;
        } else if (valor !== null && typeof valor === "object") {
            salida[clave] = JSON.stringify(valor);
        } else {
            salida[clave] = valor;
        }
    }
    return salida;
}

// Normaliza un celular peruano a formato internacional de solo dígitos con
// código de país 51: "969 099 187", "+51 969099187", "0969099187" -> "51969099187".
function normalizarTelefonoPe(telefono) {
    let digitos = String(telefono || "").replace(/\D/g, "");
    if (!digitos) return digitos;
    if (digitos.startsWith("0051")) digitos = digitos.slice(4);
    if (digitos.startsWith("51") && digitos.length === 11) return digitos;
    if (digitos.startsWith("0")) digitos = digitos.slice(1);
    if (/^9\d{8}$/.test(digitos)) return `51${digitos}`;
    if (/^\d{9}$/.test(digitos)) return `51${digitos}`;
    return digitos;
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
                jsonColumna(anterior),
                jsonColumna(nuevo),
                req.ip || null
            ]
        );
    } catch (error) {
        console.warn("No se pudo guardar auditoría:", error.message);
    }
}

module.exports = { pick, splitNombreCompleto, normalizarDatos, jsonColumna, registrarAuditoria, normalizarTelefonoPe };

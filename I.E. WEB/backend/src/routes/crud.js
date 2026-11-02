const express = require("express");
const { query, conCandado } = require("../db");
const resources = require("../resources");
const { pick, normalizarDatos, registrarAuditoria } = require("../helpers");
const { puede } = require("../permisos");
const { exigirDirectiva } = require("../middleware/auth");

const router = express.Router();
const CAPACIDAD_MAXIMA = 28;
const LIMITE_AUDITORIA = 2000;
const CAMPOS_AULA = ["nivel", "grado", "seccion", "turno"];
const OBLIGATORIOS_ESTUDIANTE = ["nombres", "apellidos", ...CAMPOS_AULA];

function placeholders(count) {
    return Array(count).fill("?").join(", ");
}

function claveAula({ nivel, grado, seccion, turno }) {
    return `aula:${nivel}:${grado}:${seccion}:${turno}`;
}

// Traduce los errores de MySQL a mensajes que se entienden (y al código HTTP correcto)
function responderError(res, error, mensajeGeneral) {
    if (error.status) {
        return res.status(error.status).json({ error: error.message });
    }
    switch (error.code) {
        case "ER_DUP_ENTRY":
            return res.status(409).json({ error: "Ya existe un registro con ese dato (correo, DNI, código u otro valor único)." });
        case "ER_NO_REFERENCED_ROW_2":
            return res.status(400).json({ error: "Hace referencia a algo que no existe (alumno, curso, usuario...). Revisa los datos." });
        case "ER_ROW_IS_REFERENCED_2":
            return res.status(409).json({ error: "No se puede eliminar: hay otros registros que dependen de este." });
        case "ER_BAD_NULL_ERROR":
        case "ER_NO_DEFAULT_FOR_FIELD":
        case "WARN_DATA_TRUNCATED":
        case "ER_DATA_TOO_LONG":
        case "ER_TRUNCATED_WRONG_VALUE":
        case "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD":
        case "ER_WARN_DATA_OUT_OF_RANGE":
        case "ER_WRONG_VALUE_FOR_TYPE":
            return res.status(400).json({ error: `Dato inválido o faltante: ${error.sqlMessage || error.message}` });
        default:
            console.error(error);
            return res.status(500).json({ error: mensajeGeneral });
    }
}

// Comprueba el permiso del cargo para el recurso de la URL
function recurso(accion) {
    return (req, res, next) => {
        const nombre = req.params.recurso;
        const def = resources[nombre];
        if (!def) return res.status(404).json({ error: "Recurso no encontrado." });
        if (!puede(req.usuario.cargo, nombre, accion)) {
            return res.status(403).json({ error: "No tienes permiso para esta acción." });
        }
        req.recurso = { nombre, def };
        next();
    };
}

router.param("id", (_req, res, next, id) => {
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: "El id debe ser un número." });
    next();
});

async function verificarCupoAula(q, { nivel, grado, seccion, turno, excluirId }) {
    const params = [nivel, grado, seccion, turno];
    let sql = `SELECT COUNT(*) AS total FROM estudiantes
               WHERE nivel = ? AND grado = ? AND seccion = ? AND turno = ? AND estado = 'Activo'`;
    if (excluirId) {
        sql += " AND id != ?";
        params.push(excluirId);
    }
    const rows = await q(sql, params);
    const total = Number(rows[0]?.total || 0);
    return {
        total,
        capacidad: CAPACIDAD_MAXIMA,
        cupos: CAPACIDAD_MAXIMA - total,
        valido: total < CAPACIDAD_MAXIMA
    };
}

async function insertar(q, tabla, datos) {
    const claves = Object.keys(datos);
    return q(
        `INSERT INTO \`${tabla}\` (${claves.map((k) => `\`${k}\``).join(", ")}) VALUES (${placeholders(claves.length)})`,
        claves.map((k) => datos[k])
    );
}

router.get("/estudiantes/capacidad", async (req, res) => {
    if (!puede(req.usuario.cargo, "estudiantes", "leer")) {
        return res.status(403).json({ error: "No tienes permiso para esta acción." });
    }
    try {
        const { nivel, grado, seccion, turno, excluirId } = req.query;
        if (!nivel || !grado || !seccion || !turno) {
            return res.status(400).json({ error: "Faltan nivel, grado, sección o turno." });
        }
        const cupo = await verificarCupoAula(query, {
            nivel, grado, seccion, turno,
            excluirId: /^\d+$/.test(String(excluirId || "")) ? excluirId : undefined
        });
        res.json(cupo);
    } catch (error) {
        responderError(res, error, "No se pudo verificar la capacidad.");
    }
});

router.get("/usuarios", exigirDirectiva, async (_req, res) => {
    try {
        const rows = await query(
            "SELECT id, email, nombres, apellidos, cargo, telefono, activo, fecha_creacion FROM usuarios ORDER BY id DESC"
        );
        res.json(rows);
    } catch (error) {
        responderError(res, error, "No se pudieron listar los usuarios.");
    }
});

router.get("/:recurso", recurso("leer"), async (req, res) => {
    const { nombre, def } = req.recurso;
    try {
        const limite = nombre === "auditoria" ? ` LIMIT ${LIMITE_AUDITORIA}` : "";
        const rows = await query(`SELECT * FROM \`${def.table}\` ORDER BY id DESC${limite}`);
        res.json(rows);
    } catch (error) {
        responderError(res, error, "No se pudo listar.");
    }
});

router.get("/:recurso/:id", recurso("leer"), async (req, res) => {
    const { def } = req.recurso;
    try {
        const rows = await query(`SELECT * FROM \`${def.table}\` WHERE id = ? LIMIT 1`, [req.params.id]);
        if (!rows[0]) return res.status(404).json({ error: "Registro no encontrado." });
        res.json(rows[0]);
    } catch (error) {
        responderError(res, error, "No se pudo leer el registro.");
    }
});

router.post("/:recurso", recurso("crear"), async (req, res) => {
    const { nombre, def } = req.recurso;
    try {
        const data = pick(req.body, def.fields);

        // Cada movimiento se guarda a nombre de quien lo hizo (no se puede falsificar desde el navegador)
        if (nombre === "auditoria") {
            data.usuario_id = req.usuario.id;
            data.ip = req.ip || null;
            if (data.registro_id === undefined || data.registro_id === null) data.registro_id = 0;
        }

        const datos = normalizarDatos(data);
        if (!Object.keys(datos).length) {
            return res.status(400).json({ error: "No hay datos para guardar." });
        }

        let insertId;

        if (def.table === "estudiantes") {
            const faltan = OBLIGATORIOS_ESTUDIANTE.filter((c) => datos[c] === undefined || datos[c] === null);
            if (faltan.length) {
                return res.status(400).json({ error: `Faltan datos obligatorios: ${faltan.join(", ")}.` });
            }
            // Comprobar el cupo y guardar en un solo paso protegido por candado
            const resultado = await conCandado(claveAula(datos), async (q) => {
                const cupo = await verificarCupoAula(q, datos);
                if (!cupo.valido) return { cupo };
                const insercion = await insertar(q, def.table, datos);
                return { insertId: insercion.insertId };
            });
            if (resultado.cupo) {
                return res.status(409).json({
                    error: `El aula ya tiene ${CAPACIDAD_MAXIMA} alumnos.`,
                    ...resultado.cupo
                });
            }
            insertId = resultado.insertId;
        } else {
            insertId = (await insertar(query, def.table, datos)).insertId;
        }

        // El propio registro de auditoría no genera otro registro de auditoría
        if (nombre !== "auditoria") {
            await registrarAuditoria(query, req, {
                accion: "CREAR",
                tabla: def.table,
                registroId: insertId,
                nuevo: data
            });
        }

        const creado = await query(`SELECT * FROM \`${def.table}\` WHERE id = ? LIMIT 1`, [insertId]);
        res.status(201).json(creado[0] || { id: insertId });
    } catch (error) {
        responderError(res, error, "No se pudo crear el registro.");
    }
});

router.put("/:recurso/:id", recurso("editar"), async (req, res) => {
    const { def } = req.recurso;
    try {
        const actual = await query(`SELECT * FROM \`${def.table}\` WHERE id = ? LIMIT 1`, [req.params.id]);
        if (!actual[0]) return res.status(404).json({ error: "Registro no encontrado." });

        const data = pick(req.body, def.fields);
        const datos = normalizarDatos(data);
        const claves = Object.keys(datos);
        if (!claves.length) {
            return res.status(400).json({ error: "No hay datos para actualizar." });
        }

        const sql = `UPDATE \`${def.table}\` SET ${claves.map((k) => `\`${k}\` = ?`).join(", ")} WHERE id = ?`;
        const params = [...claves.map((k) => datos[k]), req.params.id];

        const aulaNueva = {};
        let cambiaAula = false;
        if (def.table === "estudiantes") {
            for (const campo of CAMPOS_AULA) {
                aulaNueva[campo] = datos[campo] ?? actual[0][campo];
                if (String(aulaNueva[campo]) !== String(actual[0][campo])) cambiaAula = true;
            }
        }

        if (cambiaAula) {
            // Solo se exige cupo si el alumno pasa a otra aula
            const resultado = await conCandado(claveAula(aulaNueva), async (q) => {
                const cupo = await verificarCupoAula(q, { ...aulaNueva, excluirId: req.params.id });
                if (!cupo.valido) return { cupo };
                await q(sql, params);
                return {};
            });
            if (resultado.cupo) {
                return res.status(409).json({
                    error: `El aula ya tiene ${CAPACIDAD_MAXIMA} alumnos.`,
                    ...resultado.cupo
                });
            }
        } else {
            await query(sql, params);
        }

        await registrarAuditoria(query, req, {
            accion: "ACTUALIZAR",
            tabla: def.table,
            registroId: req.params.id,
            anterior: actual[0],
            nuevo: data
        });

        const actualizado = await query(`SELECT * FROM \`${def.table}\` WHERE id = ? LIMIT 1`, [req.params.id]);
        res.json(actualizado[0]);
    } catch (error) {
        responderError(res, error, "No se pudo actualizar.");
    }
});

router.delete("/:recurso/:id", recurso("eliminar"), async (req, res) => {
    const { def } = req.recurso;
    try {
        const actual = await query(`SELECT * FROM \`${def.table}\` WHERE id = ? LIMIT 1`, [req.params.id]);
        if (!actual[0]) return res.status(404).json({ error: "Registro no encontrado." });

        await query(`DELETE FROM \`${def.table}\` WHERE id = ?`, [req.params.id]);
        await registrarAuditoria(query, req, {
            accion: "ELIMINAR",
            tabla: def.table,
            registroId: req.params.id,
            anterior: actual[0]
        });
        res.json({ ok: true });
    } catch (error) {
        responderError(res, error, "No se pudo eliminar.");
    }
});

module.exports = router;

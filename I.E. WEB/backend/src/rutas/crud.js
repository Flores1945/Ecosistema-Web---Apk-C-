const express = require("express");
const { query, conCandado } = require("../db");
const resources = require("../resources");
const { pick, normalizarDatos, registrarAuditoria, normalizarTelefonoPe } = require("../helpers");
const { puede } = require("../permisos");
const { exigirDirectiva } = require("../middleware/auth");
const { normalizarEstadoAsistencia, notificarN8nAsistencia } = require("../notificar-n8n");

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

// Traduce los errores de la base de datos a mensajes que se entienden (y al código HTTP correcto)
function responderError(res, error, mensajeGeneral) {
    if (error.status) {
        return res.status(error.status).json({ error: error.message });
    }
    switch (error.code) {
        case "23505": // unique_violation
            return res.status(409).json({ error: "Ya existe un registro con ese dato (correo, DNI, código u otro valor único)." });
        case "23503": // foreign_key_violation
            return res.status(400).json({ error: "Hace referencia a algo que no existe (alumno, curso, usuario...). Revisa los datos." });
        case "23502": // not_null_violation
        case "22001": // value too long
        case "22003": // numeric out of range
        case "22P02": // invalid text representation
            return res.status(400).json({ error: `Dato inválido o faltante: ${error.message}` });
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
        `INSERT INTO "${tabla}" (${claves.map((k) => `"${k}"`).join(", ")}) VALUES (${placeholders(claves.length)})`,
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

// Teléfonos y datos de apoderados por estudiante (para el listado de alumnos)
router.get("/estudiantes/apoderados", async (req, res) => {
    if (!puede(req.usuario.cargo, "estudiantes", "leer")) {
        return res.status(403).json({ error: "No tienes permiso para esta acción." });
    }
    try {
        const rows = await query(
            `SELECT ep.estudiante_id, ep.parentesco, p.nombres, p.apellidos, p.telefono
             FROM estudiante_padre ep
             INNER JOIN padres p ON p.id = ep.padre_id`
        );
        res.json(rows);
    } catch (error) {
        responderError(res, error, "No se pudieron listar los apoderados.");
    }
});

// Crea (o reutiliza) el padre y lo vincula al estudiante. No debe tumbar la respuesta si falla.
async function registrarApoderado(queryFn, estudianteId, apoderado) {
    if (!apoderado || !apoderado.telefono) return;
    const datosPadre = {
        nombres: apoderado.nombres,
        apellidos: apoderado.apellidos || "-",
        telefono: normalizarTelefonoPe(apoderado.telefono),
        estado: "Activo"
    };
    const vinculos = await queryFn(
        "SELECT id AS vinculo_id, padre_id FROM estudiante_padre WHERE estudiante_id = ? LIMIT 1",
        [estudianteId]
    );
    if (vinculos[0]) {
        await queryFn(
            "UPDATE padres SET nombres = ?, apellidos = ?, telefono = ? WHERE id = ?",
            [datosPadre.nombres, datosPadre.apellidos, datosPadre.telefono, vinculos[0].padre_id]
        );
        return;
    }
    const padre = await insertar(queryFn, "padres", datosPadre);
    await insertar(queryFn, "estudiante_padre", {
        estudiante_id: estudianteId,
        padre_id: padre.insertId,
        parentesco: apoderado.parentesco || "Padre"
    });
}

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

// Reporte de asistencias ya cruzado con datos del estudiante y de quien registro.
// Si el cargo puede leer estudiantes, tambien devuelve el padron activo completo
// (lo usa el reporte mensual para marcar los dias de cada alumno).
router.get("/asistencias/reporte", async (req, res) => {
    if (!puede(req.usuario.cargo, "asistencias", "leer")) {
        return res.status(403).json({ error: "No tienes permiso para esta acción." });
    }
    try {
                const asistencias = await query(
            `SELECT a.id, a.estudiante_id, a.fecha, a.estado, a.observacion,
                    a.metodo_registro, a.registrado_por, a.fecha_registro,
                    e.nombres, e.apellidos, e.nivel, e.grado, e.seccion, e.turno,
                    TRIM(CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellidos, ''))) AS registrado_por_nombre
             FROM asistencias a
             INNER JOIN estudiantes e ON e.id = a.estudiante_id
             LEFT JOIN usuarios u ON u.id = a.registrado_por
             ORDER BY a.fecha DESC, e.apellidos, e.nombres`
        );

        let estudiantes = null;
        if (puede(req.usuario.cargo, "estudiantes", "leer")) {
            estudiantes = await query(
                `SELECT id, nombres, apellidos, nivel, grado, seccion, turno, estado
                 FROM estudiantes WHERE estado = 'Activo' ORDER BY nivel, grado, seccion, apellidos, nombres`
            );
        }

        res.json({ asistencias, estudiantes });
    } catch (error) {
        responderError(res, error, "No se pudo generar el reporte de asistencias.");
    }
});

router.get("/:recurso", recurso("leer"), async (req, res) => {
    const { nombre, def } = req.recurso;
    try {
        const limite = nombre === "auditoria" ? ` LIMIT ${LIMITE_AUDITORIA}` : "";
        const rows = await query(`SELECT * FROM "${def.table}" ORDER BY id DESC${limite}`);
        res.json(rows);
    } catch (error) {
        responderError(res, error, "No se pudo listar.");
    }
});

router.get("/:recurso/:id", recurso("leer"), async (req, res) => {
    const { def } = req.recurso;
    try {
        const rows = await query(`SELECT * FROM "${def.table}" WHERE id = ? LIMIT 1`, [req.params.id]);
        if (!rows[0]) return res.status(404).json({ error: "Registro no encontrado." });
        res.json(rows[0]);
    } catch (error) {
        responderError(res, error, "No se pudo leer el registro.");
    }
});

// Marca la asistencia de todo un aula (o de los alumnos que coincidan con los filtros)
// para una fecha dada. Inserta o actualiza el registro del dia y dispara n8n.
router.post("/asistencias/marcar-aula", async (req, res) => {
    if (!puede(req.usuario.cargo, "asistencias", "crear") && !puede(req.usuario.cargo, "asistencias", "editar")) {
        return res.status(403).json({ error: "No tienes permiso para registrar asistencias." });
    }
    try {
        const { nivel, grado, seccion, turno, estado, observacion, fecha } = req.body || {};
        if (!nivel || !grado || !seccion) {
            return res.status(400).json({ error: "Debes indicar nivel, grado y sección." });
        }
        const estadoFinal = normalizarEstadoAsistencia(estado || "Presente");
        const fechaFinal = /^\d{4}-\d{2}-\d{2}$/.test(String(fecha || "")) ? fecha : null;

        const params = [nivel, grado, seccion];
        let sqlEst = `SELECT id FROM estudiantes
                       WHERE nivel = ? AND grado = ? AND seccion = ? AND estado = 'Activo'`;
        if (turno) {
            sqlEst += " AND turno = ?";
            params.push(turno);
        }
        const alumnos = await query(sqlEst, params);
        if (!alumnos.length) {
            return res.status(404).json({ error: "No hay alumnos activos en esa aula." });
        }

        let insertados = 0;
        let actualizados = 0;
        const ids = [];

        for (const alu of alumnos) {
            const existe = await query(
                fechaFinal
                    ? "SELECT id FROM asistencias WHERE estudiante_id = ? AND fecha = ? LIMIT 1"
                    : "SELECT id FROM asistencias WHERE estudiante_id = ? AND fecha = CURDATE() LIMIT 1",
                fechaFinal ? [alu.id, fechaFinal] : [alu.id]
            );
            if (existe[0]) {
                await query(
                    "UPDATE asistencias SET estado = ?, observacion = COALESCE(?, observacion) WHERE id = ?",
                    [estadoFinal, observacion || null, existe[0].id]
                );
                actualizados += 1;
            } else {
                await query(
                    "INSERT INTO asistencias (estudiante_id, fecha, estado, observacion, metodo_registro) VALUES (?, ?, ?, ?, 'Web')",
                    [alu.id, fechaFinal || new Date().toISOString().slice(0, 10), estadoFinal, observacion || null]
                );
                insertados += 1;
            }
            ids.push(alu.id);
            const fechaDoc = fechaFinal || new Date().toISOString().slice(0, 10);
        }

        // Avisos a n8n (WhatsApp) por cada alumno marcado
        for (const id of ids) {
            notificarN8nAsistencia(id, estadoFinal).catch(() => {});
        }

        await registrarAuditoria(query, req, {
            accion: "marcar_aula",
            tabla: "asistencias",
            registroId: 0,
            nuevo: { nivel, grado, seccion, turno, estado: estadoFinal, fecha: fechaFinal, alumnos: ids.length }
        });

        res.json({ ok: true, total: ids.length, insertados, actualizados });
    } catch (error) {
        responderError(res, error, "No se pudo marcar la asistencia del aula.");
    }
});

// Marca la asistencia de UN estudiante (pase de lista desde la web).
router.post("/asistencias/marcar", async (req, res) => {
    if (!puede(req.usuario.cargo, "asistencias", "crear") && !puede(req.usuario.cargo, "asistencias", "editar")) {
        return res.status(403).json({ error: "No tienes permiso para registrar asistencias." });
    }
    try {
        const { estudiante_id, estado, observacion, fecha } = req.body || {};
        const estudianteId = Number(estudiante_id);
        if (!estudianteId) return res.status(400).json({ error: "Falta el estudiante." });

        const estadoFinal = normalizarEstadoAsistencia(estado || "Presente");
        const fechaFinal = /^\d{4}-\d{2}-\d{2}$/.test(String(fecha || "")) ? fecha : null;

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
                [estadoFinal, observacion || null, registroId]
            );
        } else {
            const r = await query(
                "INSERT INTO asistencias (estudiante_id, fecha, estado, observacion, metodo_registro) VALUES (?, ?, ?, ?, 'Web')",
                [estudianteId, fechaFinal || new Date().toISOString().slice(0, 10), estadoFinal, observacion || null]
            );
            registroId = r.insertId;
        }

        notificarN8nAsistencia(estudianteId, estadoFinal).catch(() => {});
            const fechaDoc = fechaFinal || new Date().toISOString().slice(0, 10);

        await registrarAuditoria(query, req, {
            accion: "marcar_asistencia",
            tabla: "asistencias",
            registroId,
            nuevo: { estudiante_id: estudianteId, estado: estadoFinal, fecha: fechaDoc }
        });

        res.json({ ok: true, id: registroId });
    } catch (error) {
        responderError(res, error, "No se pudo registrar la asistencia.");
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


        // Si el alumno se registró con datos de apoderado, se guarda el padre y el vínculo
        if (nombre === "estudiantes" && req.body?.apoderado) {
            try {
                await registrarApoderado(query, insertId, req.body.apoderado);
            } catch (error) {
                console.error("Error al registrar apoderado:", error.message);
            }
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

        const creado = await query(`SELECT * FROM "${def.table}" WHERE id = ? LIMIT 1`, [insertId]);
        res.status(201).json(creado[0] || { id: insertId });
    } catch (error) {
        responderError(res, error, "No se pudo crear el registro.");
    }
});

router.put("/:recurso/:id", recurso("editar"), async (req, res) => {
    const { def } = req.recurso;
    try {
        const actual = await query(`SELECT * FROM "${def.table}" WHERE id = ? LIMIT 1`, [req.params.id]);
        if (!actual[0]) return res.status(404).json({ error: "Registro no encontrado." });

        const data = pick(req.body, def.fields);
        const datos = normalizarDatos(data);
        const claves = Object.keys(datos);
        if (!claves.length) {
            return res.status(400).json({ error: "No hay datos para actualizar." });
        }

        const sql = `UPDATE "${def.table}" SET ${claves.map((k) => `"${k}" = ?`).join(", ")} WHERE id = ?`;
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

        // Si se enviaron datos de apoderado, se actualiza el padre vinculado (o se crea)
        if (def.table === "estudiantes" && req.body?.apoderado) {
            try {
                await registrarApoderado(query, req.params.id, req.body.apoderado);
            } catch (error) {
                console.error("Error al actualizar apoderado:", error.message);
            }
        }

        await registrarAuditoria(query, req, {
            accion: "ACTUALIZAR",
            tabla: def.table,
            registroId: req.params.id,
            anterior: actual[0],
            nuevo: data
        });

        const actualizado = await query(`SELECT * FROM "${def.table}" WHERE id = ? LIMIT 1`, [req.params.id]);

        res.json(actualizado[0]);
    } catch (error) {
        responderError(res, error, "No se pudo actualizar.");
    }
});

router.delete("/:recurso/:id", recurso("eliminar"), async (req, res) => {
    const { def } = req.recurso;
    try {
        const actual = await query(`SELECT * FROM "${def.table}" WHERE id = ? LIMIT 1`, [req.params.id]);
        if (!actual[0]) return res.status(404).json({ error: "Registro no encontrado." });

        await query(`DELETE FROM "${def.table}" WHERE id = ?`, [req.params.id]);


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

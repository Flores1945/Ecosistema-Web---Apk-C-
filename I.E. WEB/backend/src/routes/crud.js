const express = require("express");
const bcrypt = require("bcryptjs");
const { query } = require("../db");
const resources = require("../resources");
const { pick, registrarAuditoria } = require("../helpers");

const router = express.Router();
const CAPACIDAD_MAXIMA = 28;

function placeholders(count) {
    return Array(count).fill("?").join(", ");
}

async function verificarCupoAula({ nivel, grado, seccion, turno, excluirId }) {
    const params = [nivel, grado, seccion, turno];
    let sql = `SELECT COUNT(*) AS total FROM estudiantes
               WHERE nivel = ? AND grado = ? AND seccion = ? AND turno = ? AND estado = 'Activo'`;
    if (excluirId) {
        sql += " AND id != ?";
        params.push(excluirId);
    }
    const rows = await query(sql, params);
    const total = Number(rows[0]?.total || 0);
    return {
        total,
        capacidad: CAPACIDAD_MAXIMA,
        cupos: CAPACIDAD_MAXIMA - total,
        valido: total < CAPACIDAD_MAXIMA
    };
}

router.get("/estudiantes/capacidad", async (req, res) => {
    try {
        const { nivel, grado, seccion, turno, excluirId } = req.query;
        if (!nivel || !grado || !seccion || !turno) {
            return res.status(400).json({ error: "Faltan nivel, grado, sección o turno." });
        }
        const cupo = await verificarCupoAula({ nivel, grado, seccion, turno, excluirId });
        res.json(cupo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "No se pudo verificar la capacidad." });
    }
});

router.get("/usuarios", async (req, res) => {
    try {
        const rows = await query(
            "SELECT id, email, nombres, apellidos, cargo, telefono, activo, fecha_creacion FROM usuarios ORDER BY id DESC"
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "No se pudieron listar los usuarios." });
    }
});

router.get("/:recurso", async (req, res) => {
    const def = resources[req.params.recurso];
    if (!def) return res.status(404).json({ error: "Recurso no encontrado." });

    try {
        const rows = await query(`SELECT * FROM \`${def.table}\` ORDER BY id DESC`);
        if (def.table === "usuarios") {
            rows.forEach((row) => delete row.password);
        }
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "No se pudo listar." });
    }
});

router.get("/:recurso/:id", async (req, res) => {
    const def = resources[req.params.recurso];
    if (!def) return res.status(404).json({ error: "Recurso no encontrado." });

    try {
        const rows = await query(`SELECT * FROM \`${def.table}\` WHERE id = ? LIMIT 1`, [req.params.id]);
        if (!rows[0]) return res.status(404).json({ error: "Registro no encontrado." });
        delete rows[0].password;
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "No se pudo leer el registro." });
    }
});

router.post("/:recurso", async (req, res) => {
    const def = resources[req.params.recurso];
    if (!def) return res.status(404).json({ error: "Recurso no encontrado." });

    try {
        const data = pick(req.body, def.fields);

        if (def.table === "estudiantes") {
            const cupo = await verificarCupoAula({
                nivel: data.nivel,
                grado: data.grado,
                seccion: data.seccion,
                turno: data.turno
            });
            if (!cupo.valido) {
                return res.status(409).json({
                    error: `El aula ya tiene ${CAPACIDAD_MAXIMA} alumnos.`,
                    ...cupo
                });
            }
            if (data.es_demo === true) data.es_demo = 1;
            if (data.es_demo === false) data.es_demo = 0;
        }

        if (def.table === "usuarios" && data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }

        const keys = Object.keys(data);
        if (!keys.length) {
            return res.status(400).json({ error: "No hay datos para guardar." });
        }

        const result = await query(
            `INSERT INTO \`${def.table}\` (${keys.map((k) => `\`${k}\``).join(", ")}) VALUES (${placeholders(keys.length)})`,
            keys.map((k) => data[k])
        );

        await registrarAuditoria(query, req, {
            accion: "CREAR",
            tabla: def.table,
            registroId: result.insertId,
            nuevo: data
        });

        const creado = await query(`SELECT * FROM \`${def.table}\` WHERE id = ? LIMIT 1`, [result.insertId]);
        if (creado[0]) delete creado[0].password;
        res.status(201).json(creado[0] || { id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.sqlMessage || "No se pudo crear el registro." });
    }
});

router.put("/:recurso/:id", async (req, res) => {
    const def = resources[req.params.recurso];
    if (!def) return res.status(404).json({ error: "Recurso no encontrado." });

    try {
        const actual = await query(`SELECT * FROM \`${def.table}\` WHERE id = ? LIMIT 1`, [req.params.id]);
        if (!actual[0]) return res.status(404).json({ error: "Registro no encontrado." });

        const data = pick(req.body, def.fields);

        if (def.table === "estudiantes") {
            const nivel = data.nivel ?? actual[0].nivel;
            const grado = data.grado ?? actual[0].grado;
            const seccion = data.seccion ?? actual[0].seccion;
            const turno = data.turno ?? actual[0].turno;
            const cupo = await verificarCupoAula({
                nivel, grado, seccion, turno, excluirId: req.params.id
            });
            if (!cupo.valido) {
                return res.status(409).json({
                    error: `El aula ya tiene ${CAPACIDAD_MAXIMA} alumnos.`,
                    ...cupo
                });
            }
        }

        if (def.table === "usuarios" && data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }

        const keys = Object.keys(data);
        if (!keys.length) {
            return res.status(400).json({ error: "No hay datos para actualizar." });
        }

        await query(
            `UPDATE \`${def.table}\` SET ${keys.map((k) => `\`${k}\` = ?`).join(", ")} WHERE id = ?`,
            [...keys.map((k) => data[k]), req.params.id]
        );

        await registrarAuditoria(query, req, {
            accion: "ACTUALIZAR",
            tabla: def.table,
            registroId: req.params.id,
            anterior: actual[0],
            nuevo: data
        });

        const actualizado = await query(`SELECT * FROM \`${def.table}\` WHERE id = ? LIMIT 1`, [req.params.id]);
        if (actualizado[0]) delete actualizado[0].password;
        res.json(actualizado[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.sqlMessage || "No se pudo actualizar." });
    }
});

router.delete("/:recurso/:id", async (req, res) => {
    const def = resources[req.params.recurso];
    if (!def) return res.status(404).json({ error: "Recurso no encontrado." });

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
        console.error(error);
        res.status(500).json({ error: error.sqlMessage || "No se pudo eliminar." });
    }
});

module.exports = router;

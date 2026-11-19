const express = require("express");
const { query } = require("../db");
const { puede } = require("../permisos");
const { normalizarTelefonoPe } = require("../helpers");

const router = express.Router();

const POR_AULA = 20;
const SECCIONES_DEMO = ["A", "B", "C"];
const PARENTESCOS = ["Padre", "Madre", "Tutor"];

const NOMBRES = [
    "Aaron", "Adriana", "Bruno", "Camila", "Diego", "Elena", "Fabian", "Gabriela",
    "Hugo", "Irene", "Javier", "Karen", "Luis", "Mariana", "Nicolas", "Olga",
    "Pablo", "Rosa", "Samuel", "Teresa", "Ulises", "Valeria", "William", "Ximena",
    "Yahir", "Zoe", "Andrea", "Benjamin", "Cesar", "Diana", "Emilio", "Flora",
    "Gaston", "Helena", "Ivan", "Julia", "Kevin", "Lucia", "Marco", "Natalia"
];

const APELLIDOS = [
    "Quispe", "Mamani", "Rojas", "Vargas", "Torres", "Flores", "Gutierrez", "Silva",
    "Castro", "Morales", "Herrera", "Medina", "Aguilar", "Paredes", "Soto", "Ramirez",
    "Chavez", "Diaz", "Ortega", "Reyes", "Campos", "Salazar", "Nunez", "Vega",
    "Cruz", "Mendoza", "Rios", "Suarez", "Ponce", "Vasquez", "Espinoza", "Carrasco"
];

const AULAS_DEMO = [
    ...["Primaria", "Secundaria"].flatMap((nivel) =>
        (nivel === "Primaria" ? ["1", "2", "3", "4", "5", "6"] : ["1", "2", "3", "4", "5"])
            .flatMap((grado) =>
                SECCIONES_DEMO.map((seccion) => ({ nivel, grado, seccion }))
            )
    )
];

function elegir(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
}

function nombreCompleto() {
    const segundo = Math.random() > 0.4 ? ` ${elegir(APELLIDOS)}` : "";
    return `${elegir(NOMBRES)} ${elegir(APELLIDOS)}${segundo}`.trim();
}

function dniUnico(existentes) {
    let dni;
    do {
        dni = String(Math.floor(10000000 + Math.random() * 90000000));
    } while (existentes.has(dni));
    existentes.add(dni);
    return dni;
}

function celularDemo() {
    // Celular peruano de 9 dígitos que empieza con 9; el backend lo guarda con 51.
    return `9${String(Math.floor(10000000 + Math.random() * 90000000))}`;
}

function turnoDe(nivel, grado) {
    const g = parseInt(grado, 10);
    if (nivel === "Primaria") return g <= 3 ? "Mañana" : "Tarde";
    return g >= 4 ? "Mañana" : "Tarde";
}

function exigirPermisoDocente(req, res) {
    if (!req.usuario || !puede(req.usuario.cargo, "estudiantes", "crear")) {
        res.status(403).json({ error: "No tienes permiso para esta acción." });
        return false;
    }
    return true;
}

// POST /api/demo/alumnos — crea alumnos demo en todas las aulas (A, B y C).
router.post("/alumnos", async (req, res) => {
    if (!exigirPermisoDocente(req, res)) return;
    try {
        const yaHay = await query("SELECT COUNT(*) AS n FROM estudiantes WHERE es_demo = 1");
        if (yaHay[0].n > 0) {
            return res.status(409).json({ error: "Ya existen alumnos demo. Usa 'Limpiar demo' primero." });
        }

        const rowsDni = await query("SELECT dni FROM estudiantes WHERE dni IS NOT NULL");
        const dnis = new Set(rowsDni.map((r) => String(r.dni)));

        let creados = 0;

        for (const aula of AULAS_DEMO) {
            for (let i = 0; i < POR_AULA; i++) {
                const nombres = nombreCompleto().split(" ")[0];
                const apellidos = nombreCompleto().split(" ").slice(1).join(" ") || "-";
                const gradoNum = parseInt(aula.grado, 10);
                const dni = dniUnico(dnis);
                const telefonoPadre = celularDemo();
                const nombrePadre = nombreCompleto();
                const [pNombres, ...pResto] = nombrePadre.split(" ");
                const seccionReal = aula.seccion;
                const sexo = Math.random() > 0.5 ? "M" : "F";

                const est = await query(
                    `INSERT INTO estudiantes
                        (nombres, apellidos, sexo, dni, nivel, grado, seccion, turno, estado, fecha_matricula, es_demo)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Activo', CURDATE(), 1)`,
                    [nombres, apellidos, sexo, dni, aula.nivel, gradoNum, seccionReal,
                     turnoDe(aula.nivel, aula.grado)]
                );

                const padre = await query(
                    "INSERT INTO padres (nombres, apellidos, telefono, estado) VALUES (?, ?, ?, 'Activo')",
                    [pNombres, pResto.join(" ") || "-", normalizarTelefonoPe(telefonoPadre)]
                );
                await query(
                    "INSERT INTO estudiante_padre (estudiante_id, padre_id, parentesco) VALUES (?, ?, ?)",
                    [est.insertId, padre.insertId, elegir(PARENTESCOS)]
                );
                creados++;
            }
        }


        res.json({ creados, mensaje: `${creados} alumnos demo creados en ${AULAS_DEMO.length} aulas.` });
    } catch (error) {
        console.error("Error creando demo:", error);
        res.status(500).json({ error: "No se pudo crear la demo." });
    }
});

// DELETE /api/demo/alumnos — elimina todos los alumnos demo y sus vínculos.
router.delete("/alumnos", async (req, res) => {
    if (!exigirPermisoDocente(req, res)) return;
    try {
        const demos = await query("SELECT id FROM estudiantes WHERE es_demo = 1");
        if (!demos.length) {
            return res.json({ eliminados: 0, mensaje: "No hay alumnos demo." });
        }
        const ids = demos.map((d) => d.id);
        const marks = ids.map(() => "?").join(",");

        const vinculos = await query(
            `SELECT padre_id FROM estudiante_padre WHERE estudiante_id IN (${marks})`,
            ids
        );
        const padreIds = [...new Set(vinculos.map((v) => v.padre_id))];

        await query(`DELETE FROM estudiante_padre WHERE estudiante_id IN (${marks})`, ids);
        await query(`DELETE FROM estudiantes WHERE id IN (${marks})`, ids);

        // Borra padres que quedaron sin ningún estudiante vinculado
        if (padreIds.length) {
            const pMarks = padreIds.map(() => "?").join(",");
            await query(
                `DELETE p FROM padres p
                 LEFT JOIN estudiante_padre ep ON ep.padre_id = p.id
                 WHERE p.id IN (${pMarks}) AND ep.id IS NULL`,
                padreIds
            );
        }


        res.json({ eliminados: ids.length, mensaje: `${ids.length} alumnos demo eliminados.` });
    } catch (error) {
        console.error("Error limpiando demo:", error);
        res.status(500).json({ error: "No se pudo limpiar la demo." });
    }
});

module.exports = router;

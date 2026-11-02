// Qué puede hacer cada cargo en la API.
// Las reglas son las mismas que usa el frontend (js/auth-roles.js), pero aquí se
// hacen cumplir en el servidor: ocultar un botón en la página no protege los datos.

const VER = "ver";
const MOD = "modificar";
const DIRECTIVA = ["Director", "Subdirector"];

const PERMISOS_ALUMNO = {
    panel: VER, notas: VER, boletas: VER, asistencias: VER, horarios: VER,
    calendario: VER, comunicados: VER, eventos: VER, biblioteca: MOD, tareas: MOD, foro: MOD
};

const PERMISOS_PADRE = {
    panel: VER, notas: VER, boletas: VER, asistencias: VER, horarios: VER,
    calendario: VER, comunicados: VER, eventos: VER, pagos: VER, justificaciones: MOD
};

const PERMISOS_DOCENTE = {
    panel: VER, asistencias: MOD, notas: MOD, horarios: VER, calendario: VER, comunicados: VER,
    tutoria: MOD, salud: MOD, tareas: MOD, biblioteca: VER, foro: MOD, alumnos: VER,
    reportes: VER, boletas: VER, eventos: VER
};

const PERMISOS = {
    Alumno: PERMISOS_ALUMNO,
    Padre: PERMISOS_PADRE,
    Docente: PERMISOS_DOCENTE,
    "Sub Docente": PERMISOS_DOCENTE,
    Apafa: {
        ...PERMISOS_PADRE,
        reportes: VER, alumnos: MOD, padres: MOD, comunicados: MOD, eventos: VER
    }
};

// A qué página del sistema pertenece cada recurso de la API
const PAGINA_DE = {
    estudiantes: "alumnos",
    padres: "padres",
    "estudiante-padre": "padres",
    asistencias: "asistencias",
    justificaciones: "justificaciones",
    cursos: "notas",
    "docente-curso": "notas",
    notas: "notas",
    tareas: "tareas",
    "entrega-tareas": "tareas",
    pagos: "pagos",
    horarios: "horarios",
    eventos: "eventos",
    comunicados: "comunicados",
    documentos: "documentos",
    libros: "biblioteca",
    "prestamos-libros": "biblioteca",
    inventario: "inventario",
    salud: "salud",
    psicologia: "psicologia",
    tutoria: "tutoria",
    "foro-temas": "foro",
    "foro-respuestas": "foro",
    aulas: "aulas"
};

// Información general que cualquier usuario con sesión puede leer (la usa el panel)
const LECTURA_LIBRE = new Set(["aulas", "cursos"]);

// Recursos donde modificar es más restrictivo que "tener la página en modo modificar".
// La lista son los cargos que pueden escribir además de la directiva.
const ESCRITURA_SOLO = {
    tareas: ["Docente", "Sub Docente"],   // los alumnos entregan tareas, no las crean
    libros: [],
    cursos: [],
    "docente-curso": [],
    aulas: []
};

function esDirectiva(cargo) {
    return DIRECTIVA.includes(cargo);
}

function modoDe(cargo, pagina) {
    if (esDirectiva(cargo)) return MOD;
    return (PERMISOS[cargo] && PERMISOS[cargo][pagina]) || "";
}

// accion: "leer" | "crear" | "editar" | "eliminar"
function puede(cargo, recurso, accion) {
    if (recurso === "auditoria") {
        // Todos registran sus movimientos; solo la directiva los consulta; nadie edita ni borra.
        if (accion === "crear") return true;
        if (accion === "leer") return esDirectiva(cargo);
        return false;
    }

    const pagina = PAGINA_DE[recurso];
    if (!pagina) return esDirectiva(cargo);

    if (accion === "leer") {
        return LECTURA_LIBRE.has(recurso) || Boolean(modoDe(cargo, pagina));
    }

    if (modoDe(cargo, pagina) !== MOD) return false;
    const soloEstos = ESCRITURA_SOLO[recurso];
    return !soloEstos || esDirectiva(cargo) || soloEstos.includes(cargo);
}

module.exports = { puede, esDirectiva, DIRECTIVA };

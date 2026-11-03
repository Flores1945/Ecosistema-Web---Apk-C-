import { apiGet } from "./api.js";
import {
    initPaginaProtegida,
    configurarCerrarSesion,
    esAccesoTotal,
    esAlumno,
    esApoderado,
    esDocente,
    puedeAcceder,
    PAGINAS
} from "./auth-roles.js";
import { inicializarBusquedaGlobal } from "./busqueda-global.js";

const usuario = initPaginaProtegida("panel");
if (!usuario) {
    throw new Error("Sin sesion");
}

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    inicializarBusquedaGlobal();
});

const bienvenidaTexto = document.getElementById("bienvenidaTexto");
const detalleUsuario = document.getElementById("detalleUsuario");
const totalAsistenciasResumen = document.getElementById("totalAsistenciasResumen");
const aulasResumen = document.getElementById("aulasResumen");
const cargoResumen = document.getElementById("cargoResumen");

if (bienvenidaTexto) bienvenidaTexto.textContent = `Bienvenido(a), ${usuario.nombresCompletos}`;
if (detalleUsuario) detalleUsuario.textContent = `Cargo: ${usuario.cargo} | Correo: ${usuario.correo}`;
if (cargoResumen) cargoResumen.textContent = usuario.cargo;

configurarCerrarSesion();

const accesosRapidos = document.getElementById("accesosRapidos");
if (accesosRapidos) {
    const enlaces = [];
    if (puedeAcceder(usuario.cargo, PAGINAS.ALUMNOS)) {
        enlaces.push('<a class="btn-funcional" href="./alumnos.html">Registro de alumnos</a>');
    }
    if (puedeAcceder(usuario.cargo, PAGINAS.ASISTENCIAS)) {
        enlaces.push('<a class="btn-funcional" href="./asistencias.html">Asistencias</a>');
    }
    if (puedeAcceder(usuario.cargo, PAGINAS.TAREAS)) {
        enlaces.push('<a class="btn-funcional" href="./tareas.html">Tareas</a>');
    }
    if (puedeAcceder(usuario.cargo, PAGINAS.PAGOS)) {
        enlaces.push('<a class="btn-funcional" href="./pagos.html">Pagos</a>');
    }
    if (puedeAcceder(usuario.cargo, PAGINAS.JUSTIFICACIONES)) {
        enlaces.push('<a class="btn-funcional" href="./justificaciones.html">Justificaciones</a>');
    }
    if (esAccesoTotal(usuario.cargo)) {
        enlaces.push('<a class="btn-funcional" href="./registro.html">Registrar personal</a>');
    }
    if (puedeAcceder(usuario.cargo, PAGINAS.REPORTES) && esAccesoTotal(usuario.cargo)) {
        enlaces.push('<a class="btn-funcional" href="./reportes.html">Reportes y auditoria</a>');
    }
    accesosRapidos.innerHTML = enlaces.join("");
}

const resumenGrid = document.querySelector(".resumen-grid");
if (resumenGrid && (esAlumno(usuario.cargo) || esApoderado(usuario.cargo))) {
    const etiquetas = resumenGrid.querySelectorAll(".label");
    if (etiquetas[0]) {
        etiquetas[0].textContent = esAlumno(usuario.cargo) ? "Mi asistencia" : "Asistencia de hijos";
    }
    if (etiquetas[1]) {
        etiquetas[1].textContent = esDocente(usuario.cargo) ? "Aulas a cargo" : "Cursos visibles";
    }
}

async function cargarResumen() {
    const [asistencias, aulas] = await Promise.all([
        apiGet("/asistencias"),
        apiGet("/aulas")
    ]);
    if (totalAsistenciasResumen) totalAsistenciasResumen.textContent = String((asistencias || []).length);
    if (aulasResumen) aulasResumen.textContent = String((aulas || []).length);
}

cargarResumen().catch(() => {
    if (totalAsistenciasResumen) totalAsistenciasResumen.textContent = "-";
    if (aulasResumen) aulasResumen.textContent = "-";
});

import { apiGet, apiPost } from "./api.js";
import {
    initPaginaProtegida,
    configurarCerrarSesion,
    puedeExportarAsistencias,
    puedeModificar
} from "./auth-roles.js";
import { registrarMovimiento } from "./auditoria.js";
import {
    llenarOpcionesNivel,
    enlazarNivelYGrado,
    llenarOpcionesSeccion
} from "./catalogo-escolar.js";
import { inicializarBusquedaGlobal } from "./busqueda-global.js";
import { exportarReporteDiario, exportarReporteMensual } from "./reporte-asistencias.js";

const usuario = initPaginaProtegida("asistencias");
if (!usuario) {
    throw new Error("Sin sesion");
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarBusquedaGlobal();
});

configurarCerrarSesion();



if (!puedeExportarAsistencias(usuario.cargo)) {
    document.getElementById("bloqueExportacion")?.classList.add("oculto");
}

// La visibilidad del panel de pase de lista se decide al cargar (necesita el padron)
const puedeMarcar = puedeModificar(usuario.cargo, "asistencias");

const filtroNivel = document.getElementById("filtroNivel");
const filtroGrado = document.getElementById("filtroGrado");
const filtroSeccion = document.getElementById("filtroSeccion");
const filtroFechaDesde = document.getElementById("filtroFechaDesde");
const filtroFechaHasta = document.getElementById("filtroFechaHasta");
const buscarEstudiante = document.getElementById("buscarEstudiante");
const reporteDiarioBtn = document.getElementById("reporteDiarioBtn");
const reporteMensualBtn = document.getElementById("reporteMensualBtn");
const panelMarcarAula = document.getElementById("panelMarcarAula");
const marcarAulaBtn = document.getElementById("marcarAulaBtn");
const marcarEstado = document.getElementById("marcarEstado");
const marcarFecha = document.getElementById("marcarFecha");
const marcarObservacion = document.getElementById("marcarObservacion");
const estadoMarcarAula = document.getElementById("estadoMarcarAula");
const tablaPaseListaBody = document.getElementById("tablaPaseListaBody");
const statScope = document.getElementById("statScope");
const estadoAsistencia = document.getElementById("estadoAsistencia");

let asistencias = [];   // registros normalizados
let estudiantes = [];   // padron activo (para reporte mensual)
let mapaAsistencias = new Map(); // estudiante_id -> Map(fecha -> registro)

// Inicializar filtros del catalogo escolar
inicializarFiltrosAsistencias();

if (estadoAsistencia) {
    estadoAsistencia.textContent = "Cargando asistencias...";
}

function inicializarFiltrosAsistencias() {
    llenarOpcionesNivel(filtroNivel, "Todos");
    enlazarNivelYGrado(filtroNivel, filtroGrado, filtroSeccion, null);
    llenarOpcionesSeccion(filtroSeccion, "Todas");
}

function normalizarFecha(valor) {
    if (!valor) return "";
    const s = String(valor);
    const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    const local = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (local) return `${local[3]}-${local[2]}-${local[1]}`;
    return "";
}

function fechaHoyISO() {
    return new Date().toISOString().slice(0, 10);
}

function normalizarAsistencia(a) {
    return {
        id: a.id,
        estudianteId: a.estudiante_id,
        estudiante: `${a.nombres || ""} ${a.apellidos || ""}`.trim() || "Sin nombre",
        nivel: a.nivel || "",
        grado: a.grado || "",
        seccion: a.seccion || "",
        turno: a.turno || "",
        estado: a.estado || "",
        observacion: a.observacion || "",
        metodo: a.metodo_registro || "",
        registradoPor: a.registrado_por_nombre || a.metodo_registro || "Sistema",
        fecha: normalizarFecha(a.fecha),
        fechaHora: a.fecha_registro || a.fecha || ""
    };
}

function aplicarFiltros(desde, hasta) {
    const nivel = filtroNivel.value;
    const grado = filtroGrado.value;
    const seccion = filtroSeccion.value;
    const fechaDesde = desde !== undefined ? desde : filtroFechaDesde.value;
    const fechaHasta = hasta !== undefined ? hasta : filtroFechaHasta.value;
    const texto = buscarEstudiante.value.trim().toLowerCase();

    return asistencias.filter((x) => {
        if (nivel && x.nivel !== nivel) return false;
        if (grado && String(x.grado) !== String(grado)) return false;
        if (seccion && x.seccion !== seccion) return false;
        if (texto && !x.estudiante.toLowerCase().includes(texto)) return false;
        if (fechaDesde && (!x.fecha || x.fecha < fechaDesde)) return false;
        if (fechaHasta && (!x.fecha || x.fecha > fechaHasta)) return false;
        return true;
    });
}


function formatoHora(fechaHora) {
    if (!fechaHora) return "";
    const s = String(fechaHora);
    const m = s.match(/(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : "";
}


function tipoEstado(estadoRaw) {
    const estado = (estadoRaw || "").toString().trim().toLowerCase();
    if (["tarde", "tardanza", "late"].includes(estado)) return "tardanza";
    if (["inasistencia", "falto", "ausente", "f", "absent"].includes(estado)) return "inasistencia";
    if (["justificado", "justificacion", "j"].includes(estado)) return "justificado";
    return "asistencia";
}


function actualizarEstadisticas(data) {
    // Alcance: todo el colegio o solo el aula filtrada (sin fechas ni texto)
    let filtrado = asistencias;
    if (statScope && statScope.value === "aula") {
        const nivel = filtroNivel.value;
        const grado = filtroGrado.value;
        const seccion = filtroSeccion.value;
        filtrado = asistencias.filter((x) =>
            (!nivel || x.nivel === nivel) &&
            (!grado || String(x.grado) === String(grado)) &&
            (!seccion || x.seccion === seccion)
        );
    }
    const c = { asistencia: 0, tardanza: 0, inasistencia: 0 };
    filtrado.forEach((f) => { c[tipoEstado(f.estado)] += 1; });
    const elA = document.getElementById("statAsistencias");
    const elT = document.getElementById("statTardanzas");
    const elI = document.getElementById("statInasistencias");
    if (elA) elA.textContent = c.asistencia + c.justificado;
    if (elT) elT.textContent = c.tardanza;
    if (elI) elI.textContent = c.inasistencia;
}

function refrescarVista() {
    actualizarEstadisticas(aplicarFiltros());
    renderPaseLista();
}

// ---------- Pase de lista (alumnos del aula seleccionada) ----------

function fechaPaseLista() {
    return (marcarFecha && marcarFecha.value) || fechaHoyISO();
}

function estadoDeEstudiante(estudianteId, fecha) {
    const porFecha = mapaAsistencias.get(String(estudianteId));
    const reg = porFecha && porFecha.get(fecha);
    return reg ? reg.estado : "";
}

function renderPaseLista() {
    if (!tablaPaseListaBody) return;
    tablaPaseListaBody.innerHTML = "";

    if (!puedeMarcar || !panelMarcarAula) return;
    if (!estudiantes || !estudiantes.length) {
        panelMarcarAula.classList.add("oculto");
        return;
    }
    panelMarcarAula.classList.remove("oculto");

    const lista = estudiantesFiltrados();
    if (!lista.length) {
        tablaPaseListaBody.innerHTML = `<tr><td colspan="5">No hay alumnos para los filtros elegidos (Nivel + Grado + Sección).</td></tr>`;
        return;
    }

    const fecha = fechaPaseLista();
    lista.forEach((e, idx) => {
        const estadoActual = estadoDeEstudiante(e.id, fecha);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${e.nombres} ${e.apellidos}</td>
            <td>${e.turno || "-"}</td>
            <td class="estado-hoy">${estadoActual || "Sin registro"}</td>
            <td class="acciones-fila">
                <button type="button" class="btn-estado btn-verde" data-id="${e.id}" data-estado="Presente" title="Asistencia">✓</button>
                <button type="button" class="btn-estado btn-rojo" data-id="${e.id}" data-estado="Ausente" title="Falta">✕</button>
            </td>
        `;
        tablaPaseListaBody.appendChild(tr);
    });
}

// Marcar asistencia de un alumno con los botones de color
tablaPaseListaBody?.addEventListener("click", async (ev) => {
    const btn = ev.target.closest(".btn-estado");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const estado = btn.dataset.estado;
    const fecha = fechaPaseLista();
    const observacion = marcarObservacion ? marcarObservacion.value.trim() : "";

    const fila = btn.closest("tr");
    fila?.querySelectorAll(".btn-estado").forEach((b) => (b.disabled = true));
    try {
        await apiPost("/asistencias/marcar", {
            estudiante_id: id, estado, fecha,
            observacion: observacion || undefined
        });
        estadoMarcarAula.textContent = `Alumno #${id} marcado como ${estado} el ${fecha}.`;
        await cargarAsistencias();
    } catch (error) {
        estadoMarcarAula.textContent = `Error: ${error.message || "no se pudo guardar."}`;
        fila?.querySelectorAll(".btn-estado").forEach((b) => (b.disabled = false));
    }
});

async function cargarAsistencias() {
    estadoAsistencia.textContent = "Cargando asistencias...";
    try {
        const data = await apiGet("/asistencias/reporte");
        asistencias = (data.asistencias || []).map(normalizarAsistencia);
        estudiantes = data.estudiantes || [];

        // Mapa estudiante_id -> fecha -> registro (para el mensual)
        mapaAsistencias = new Map();
        asistencias.forEach((a) => {
            if (!a.fecha) return;
            const clave = String(a.estudianteId);
            if (!mapaAsistencias.has(clave)) {
                mapaAsistencias.set(clave, new Map());
            }
            mapaAsistencias.get(clave).set(a.fecha, a);
        });

        if (!asistencias.length) {
            estadoAsistencia.textContent = "No hay asistencias registradas todavía. Regístralas desde la app.";
        } else {
            estadoAsistencia.textContent = `${asistencias.length} registros de asistencia cargados.`;
        }
        refrescarVista();
    } catch (error) {
        estadoAsistencia.textContent = `Error al cargar: ${error.message || "revisa que el backend esté encendido."}`;
        console.error(error);
    }
}

// ---------- Reportes ----------

function estudiantesFiltrados() {
    const nivel = filtroNivel.value;
    const grado = filtroGrado.value;
    const seccion = filtroSeccion.value;
    const texto = buscarEstudiante.value.trim().toLowerCase();
    return estudiantes.filter((e) => {
        if (nivel && e.nivel !== nivel) return false;
        if (grado && String(e.grado) !== String(grado)) return false;
        if (seccion && e.seccion !== seccion) return false;
        if (texto && !`${e.nombres} ${e.apellidos}`.toLowerCase().includes(texto)) return false;
        return true;
    });
}

reporteDiarioBtn?.addEventListener("click", async () => {
    const fecha = filtroFechaDesde.value || fechaHoyISO();
    const filas = aplicarFiltros(fecha, fecha);
    if (!filas.length) {
        estadoAsistencia.textContent = `No hay asistencias registradas el ${fecha}.`;
        return;
    }
    estadoAsistencia.textContent = "Generando reporte diario...";
    try {
        const ok = await exportarReporteDiario(filas, fecha);
        estadoAsistencia.textContent = ok ? `Reporte diario del ${fecha} generado.` : "No se pudo generar el reporte diario.";
        if (ok) {
            registrarMovimiento("reporte_asistencias", `Exporto reporte diario de asistencia (${fecha}, ${filas.length} registros)`, { pagina: "asistencias" });
        }
    } catch (error) {
        console.error("Error generando reporte diario:", error);
        estadoAsistencia.textContent = `Error al generar el Excel: ${error.message || error}`;
    }
});

reporteMensualBtn?.addEventListener("click", async () => {
    const hoy = new Date();
    const primerDia = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const finMes = `${ultimoDia.getFullYear()}-${String(ultimoDia.getMonth() + 1).padStart(2, "0")}-${String(ultimoDia.getDate()).padStart(2, "0")}`;

    const desde = filtroFechaDesde.value || primerDia;
    const hasta = filtroFechaHasta.value || finMes;

    const lista = estudiantesFiltrados();
    if (!lista.length) {
        estadoAsistencia.textContent = "No hay estudiantes que coincidan con los filtros para el reporte mensual.";
        return;
    }
    estadoAsistencia.textContent = "Generando reporte mensual...";
    try {
        const ok = await exportarReporteMensual(lista, mapaAsistencias, desde, hasta);
        estadoAsistencia.textContent = ok
            ? `Reporte mensual ${desde} al ${hasta} generado (${lista.length} estudiantes).`
            : "No se pudo generar: revisa que la fecha desde sea anterior a la fecha hasta.";
        if (ok) {
            registrarMovimiento("reporte_asistencias", `Exporto reporte mensual de asistencia (${desde} a ${hasta}, ${lista.length} estudiantes)`, { pagina: "asistencias" });
        }
    } catch (error) {
        console.error("Error generando reporte mensual:", error);
        estadoAsistencia.textContent = `Error al generar el Excel: ${error.message || error}`;
    }
});

// ---------- Eventos de filtros ----------
filtroNivel.addEventListener("change", () => {
    // enlazarNivelYGrado ya maneja grado/seccion; solo refrescamos
    refrescarVista();
});
filtroGrado.addEventListener("change", refrescarVista);
filtroSeccion.addEventListener("change", refrescarVista);
filtroFechaDesde.addEventListener("change", refrescarVista);
filtroFechaHasta.addEventListener("change", refrescarVista);
buscarEstudiante.addEventListener("input", refrescarVista);
marcarFecha?.addEventListener("change", renderPaseLista);
statScope?.addEventListener("change", () => actualizarEstadisticas(asistencias));



// ---------- Marcado masivo por aula ----------
if (marcarFecha) marcarFecha.value = fechaHoyISO();
filtroFechaDesde.value = fechaHoyISO();
filtroFechaHasta.value = fechaHoyISO();

marcarAulaBtn?.addEventListener("click", async () => {
    const nivel = filtroNivel.value;
    const grado = filtroGrado.value;
    const seccion = filtroSeccion.value;
    if (!nivel || !grado || !seccion) {
        estadoMarcarAula.textContent = "Selecciona Nivel, Grado y Sección en los filtros de arriba para elegir el aula.";
        return;
    }
    const estado = marcarEstado.value;
    const fecha = marcarFecha.value || fechaHoyISO();
    const observacion = marcarObservacion.value.trim();

    const aula = nivel + " " + grado + "° " + seccion;
    if (!confirm("¿Marcar a TODOS los alumnos de " + aula + " como \"" + estado + "\" el " + fecha + "? Se enviara un WhatsApp a cada apoderado.")) return;

    marcarAulaBtn.disabled = true;
    estadoMarcarAula.textContent = "Guardando asistencia del aula...";
    try {
        const res = await apiPost("/asistencias/marcar-aula", {
            nivel, grado, seccion, estado, fecha,
            observacion: observacion || undefined
        });
        estadoMarcarAula.textContent = "Listo: " + res.total + " alumnos marcados (" + res.insertados + " nuevos, " + res.actualizados + " actualizados). WhatsApp en camino.";
        estadoAsistencia.textContent = "Aula " + aula + " marcada como " + estado + " el " + fecha + ".";
        registrarMovimiento("marcar_aula", "Marco aula " + aula + " como " + estado + " el " + fecha + " (" + res.total + " alumnos)", { pagina: "asistencias" });
        await cargarAsistencias();
    } catch (error) {
        estadoMarcarAula.textContent = "Error: " + (error.message || "no se pudo marcar el aula.");
    } finally {
        marcarAulaBtn.disabled = false;
    }
});

cargarAsistencias();
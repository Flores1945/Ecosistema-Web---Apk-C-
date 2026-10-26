import { initPaginaProtegida, configurarCerrarSesion, puedeModificar, esDocente, esAccesoTotal } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";
import { inicializarBusquedaGlobal } from "./busqueda-global.js";

const usuario = initPaginaProtegida("psicologia");
if (usuario) {
    document.addEventListener('DOMContentLoaded', () => {
    inicializarBusquedaGlobal();
});
    configurarCerrarSesion();
    inicializarPaginaPsicologia(usuario);
}

function inicializarPaginaPsicologia(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "psicologia");
    const esDocenteUser = esDocente(usuario.cargo);
    const esDirectivo = esAccesoTotal(usuario.cargo);

    // Event listeners para crear reporte
    const nuevoReporteBtn = document.getElementById("nuevoReporteBtn");
    if (nuevoReporteBtn && puedeMod) {
        nuevoReporteBtn.addEventListener("click", mostrarPanelCrearReporte);
    }

    const cancelarReporteBtn = document.getElementById("cancelarReporteBtn");
    if (cancelarReporteBtn) {
        cancelarReporteBtn.addEventListener("click", ocultarPanelCrearReporte);
    }

    const formReporte = document.getElementById("formReportePsico");
    if (formReporte) {
        formReporte.addEventListener("submit", manejarCrearReporte);
    }

    // Event listeners para ver reporte
    const volverReportesBtn = document.getElementById("volverReportesBtn");
    if (volverReportesBtn) {
        volverReportesBtn.addEventListener("click", volverAReportes);
    }

    // Event listeners para seguimiento
    const formSeguimiento = document.getElementById("formSeguimiento");
    if (formSeguimiento && puedeMod) {
        formSeguimiento.addEventListener("submit", manejarAgregarSeguimiento);
    }

    // Filtros
    const filtroEstudiante = document.getElementById("filtroEstudiantePsico");
    const filtroTipo = document.getElementById("filtroTipoPsico");
    const filtroEstado = document.getElementById("filtroEstadoPsico");

    if (filtroEstudiante) filtroEstudiante.addEventListener("change", () => cargarReportes(usuario));
    if (filtroTipo) filtroTipo.addEventListener("change", () => cargarReportes(usuario));
    if (filtroEstado) filtroEstado.addEventListener("change", () => cargarReportes(usuario));

    // Cargar estudiantes si es docente o directivo
    if (esDocenteUser || esDirectivo) {
        cargarEstudiantes(usuario);
    }

    // Cargar reportes
    cargarReportes(usuario);
}

function mostrarPanelCrearReporte() {
    document.getElementById("panelCrearReporte").classList.remove("oculto");
    document.getElementById("panelCrearReporte").scrollIntoView({ behavior: "smooth" });
}

function ocultarPanelCrearReporte() {
    document.getElementById("panelCrearReporte").classList.add("oculto");
    document.getElementById("formReportePsico").reset();
}

function mostrarPanelVerReporte(reporte) {
    document.getElementById("panelVerReporte").classList.remove("oculto");
    document.getElementById("panelCrearReporte").classList.add("oculto");
    document.getElementById("listaReportesPsico").classList.add("oculto");

    document.getElementById("estudianteReporteVer").textContent = reporte.estudianteNombre;
    document.getElementById("tipoReporteVer").textContent = reporte.tipo;
    document.getElementById("gravedadReporteVer").textContent = reporte.gravedad;
    document.getElementById("fechaReporteVer").textContent = new Date(reporte.fecha).toLocaleDateString();
    document.getElementById("descripcionReporteVer").textContent = reporte.descripcion;
    document.getElementById("recomendacionReporteVer").textContent = reporte.recomendacion || "Sin recomendaciones";
    document.getElementById("estadoReporteVer").textContent = reporte.estado;

    // Mostrar seguimiento si tiene seguimientos
    if (reporte.seguimientos && reporte.seguimientos.length > 0) {
        document.getElementById("seguimientoReporte").classList.remove("oculto");
        document.getElementById("listaSeguimiento").innerHTML = reporte.seguimientos.map(seg => `
            <li style="padding: 8px; border-bottom: 1px solid var(--borde);">
                <small>${new Date(seg.fecha).toLocaleString()}</small>
                <p>${seg.nota}</p>
                <small>Por: ${seg.autor}</small>
            </li>
        `).join("");
    } else {
        document.getElementById("seguimientoReporte").classList.add("oculto");
    }
}

function volverAReportes() {
    document.getElementById("panelVerReporte").classList.add("oculto");
    document.getElementById("listaReportesPsico").classList.remove("oculto");
}

async function cargarEstudiantes(usuario) {
    const selectEstudiante = document.getElementById("estudianteReporte");
    const filtroEstudiante = document.getElementById("filtroEstudiantePsico");

    try {
        // Aquí iría la integración con Firebase para obtener estudiantes
        // Simulación de datos
        const estudiantesSimulados = [
            { id: "1", nombre: "Carlos Pérez López" },
            { id: "2", nombre: "María Pérez López" },
            { id: "3", nombre: "Juan García Martínez" }
        ];

        const opciones = estudiantesSimulados.map(est => `<option value="${est.id}">${est.nombre}</option>`).join("");

        if (selectEstudiante) {
            selectEstudiante.innerHTML = `<option value="">Selecciona estudiante</option>` + opciones;
        }

        if (filtroEstudiante) {
            filtroEstudiante.innerHTML = `<option value="">Todos</option>` + opciones;
        }

    } catch (error) {
        console.error("Error al cargar estudiantes:", error);
    }
}

async function manejarCrearReporte(e) {
    e.preventDefault();
    const usuario = obtenerUsuario();
    if (!usuario) return;

    const reporte = {
        estudianteId: document.getElementById("estudianteReporte").value,
        estudianteNombre: document.getElementById("estudianteReporte").options[document.getElementById("estudianteReporte").selectedIndex].text,
        tipo: document.getElementById("tipoReporte").value,
        gravedad: document.getElementById("gravedadReporte").value,
        descripcion: document.getElementById("descripcionReporte").value,
        recomendacion: document.getElementById("recomendacionReporte").value,
        derivacion: document.getElementById("derivarReporte").value,
        autorId: usuario.id,
        autorNombre: usuario.nombres,
        fecha: new Date().toISOString(),
        estado: "activo",
        seguimientos: []
    };

    try {
        // Aquí iría la integración con Firebase
        console.log("Creando reporte:", reporte);

        // Registrar en auditoría
        await registrarAccionAuditoria("crear_reporte_psicologia", `Reporte ${reporte.tipo}: ${reporte.estudianteNombre}`);

        mostrarEstado("Reporte creado exitosamente", "ok");
        ocultarPanelCrearReporte();
        cargarReportes(usuario);
    } catch (error) {
        console.error("Error al crear reporte:", error);
        mostrarEstado("Error al crear reporte", "error");
    }
}

async function manejarAgregarSeguimiento(e) {
    e.preventDefault();
    const usuario = obtenerUsuario();
    if (!usuario) return;

    const seguimiento = {
        nota: document.getElementById("nuevoSeguimiento").value,
        autor: usuario.nombres,
        fecha: new Date().toISOString()
    };

    try {
        // Aquí iría la integración con Firebase para agregar seguimiento
        console.log("Agregando seguimiento:", seguimiento);

        // Registrar en auditoría
        await registrarAccionAuditoria("agregar_seguimiento_psicologia", "Seguimiento agregado a reporte");

        mostrarEstado("Seguimiento agregado exitosamente", "ok");
        document.getElementById("formSeguimiento").reset();
        // Recargar reporte actual
        // cargarReportes(usuario);
    } catch (error) {
        console.error("Error al agregar seguimiento:", error);
        mostrarEstado("Error al agregar seguimiento", "error");
    }
}

async function cargarReportes(usuario) {
    const listaReportes = document.getElementById("listaReportesPsico");
    const filtroEstudiante = document.getElementById("filtroEstudiantePsico")?.value || "";
    const filtroTipo = document.getElementById("filtroTipoPsico")?.value || "";
    const filtroEstado = document.getElementById("filtroEstadoPsico")?.value || "";

    try {
        // Aquí iría la integración con Firebase para obtener reportes
        // Simulación de datos
        const reportesSimulados = [
            {
                id: "1",
                estudianteNombre: "Carlos Pérez López",
                tipo: "conducta",
                gravedad: "moderado",
                descripcion: "Comportamiento disruptivo en clase, interrumpe constantemente",
                recomendacion: "Reunión con padres y posible derivación a tutoría",
                fecha: new Date(Date.now() - 86400000).toISOString(),
                estado: "activo",
                seguimientos: []
            },
            {
                id: "2",
                estudianteNombre: "María Pérez López",
                tipo: "academico",
                gravedad: "leve",
                descripcion: "Dificultad para concentrarse en evaluaciones",
                recomendacion: "Técnicas de estudio y seguimiento cercano",
                fecha: new Date(Date.now() - 172800000).toISOString(),
                estado: "seguimiento",
                seguimientos: [
                    {
                        nota: "Se observó mejora en última evaluación",
                        autor: "Prof. García",
                        fecha: new Date().toISOString()
                    }
                ]
            },
            {
                id: "3",
                estudianteNombre: "Juan García Martínez",
                tipo: "emocional",
                gravedad: "grave",
                descripcion: "Signos de ansiedad antes de presentaciones",
                recomendacion: "Derivación a profesional externo",
                fecha: new Date(Date.now() - 259200000).toISOString(),
                estado: "cerrado",
                seguimientos: []
            }
        ];

        // Filtrar reportes
        let reportesFiltrados = reportesSimulados.filter(reporte => {
            const cumpleEstudiante = !filtroEstudiante || reporte.estudianteNombre.includes(filtroEstudiante);
            const cumpleTipo = !filtroTipo || reporte.tipo === filtroTipo;
            const cumpleEstado = !filtroEstado || reporte.estado === filtroEstado;
            return cumpleEstudiante && cumpleTipo && cumpleEstado;
        });

        // Actualizar estadísticas
        const activos = reportesFiltrados.filter(r => r.estado === "activo").length;
        const seguimiento = reportesFiltrados.filter(r => r.estado === "seguimiento").length;
        const derivaciones = reportesFiltrados.filter(r => r.derivacion && r.derivacion !== "no").length;

        document.getElementById("casosActivos").textContent = activos + seguimiento;
        document.getElementById("sesionesMes").textContent = Math.floor(Math.random() * 10) + 5;
        document.getElementById("derivaciones").textContent = derivaciones;

        // Renderizar lista
        listaReportes.innerHTML = reportesFiltrados.map(reporte => `
            <li>
                <div>
                    <strong>${reporte.estudianteNombre}</strong>
                    <span>${reporte.tipo} · ${reporte.gravedad} · ${new Date(reporte.fecha).toLocaleDateString()}</span>
                </div>
                <div>
                    <span class="chip ${reporte.estado === 'activo' ? 'chip-rojo' : reporte.estado === 'cerrado' ? 'chip-verde' : ''}" style="background: rgba(37, 99, 235, 0.1); color: #1d4ed8;">${reporte.estado}</span>
                    <button class="btn-funcional-inline" onclick="verReporte('${reporte.id}')">Ver detalle</button>
                </div>
            </li>
        `).join("") || "<li><span>No hay reportes que coincidan con los filtros</span></li>";

    } catch (error) {
        console.error("Error al cargar reportes:", error);
        listaReportes.innerHTML = "<li><span>Error al cargar reportes</span></li>";
    }
}

// Función global para ver reporte
window.verReporte = function(reporteId) {
    // Cargar datos del reporte específico
    const reporte = {
        id: reporteId,
        estudianteNombre: "Carlos Pérez López",
        tipo: "conducta",
        gravedad: "moderado",
        descripcion: "Comportamiento disruptivo en clase, interrumpe constantemente",
        recomendacion: "Reunión con padres y posible derivación a tutoría",
        fecha: new Date(Date.now() - 86400000).toISOString(),
        estado: "activo",
        seguimientos: []
    };

    mostrarPanelVerReporte(reporte);
};

function mostrarEstado(mensaje, tipo) {
    const estado = document.getElementById("estadoPsicologia") || document.createElement("p");
    estado.className = tipo === "ok" ? "estado-ok" : "estado-alerta";
    estado.textContent = mensaje;
}

function obtenerUsuario() {
    try {
        return JSON.parse(sessionStorage.getItem("usuario_activo") || "null");
    } catch {
        return null;
    }
}
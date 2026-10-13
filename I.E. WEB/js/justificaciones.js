import { initPaginaProtegida, configurarCerrarSesion, puedeModificar, esApoderado } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";

const usuario = initPaginaProtegida("justificaciones");
if (usuario) {
    configurarCerrarSesion();
    inicializarPaginaJustificaciones(usuario);
}

function inicializarPaginaJustificaciones(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "justificaciones");
    const esPadreUser = esApoderado(usuario.cargo);

    // Event listeners para crear justificación
    const nuevaJustificacionBtn = document.getElementById("nuevaJustificacionBtn");
    if (nuevaJustificacionBtn && puedeMod) {
        nuevaJustificacionBtn.addEventListener("click", mostrarPanelCrearJustificacion);
    }

    const cancelarJustificacionBtn = document.getElementById("cancelarJustificacionBtn");
    if (cancelarJustificacionBtn) {
        cancelarJustificacionBtn.addEventListener("click", ocultarPanelCrearJustificacion);
    }

    const formJustificacion = document.getElementById("formJustificacion");
    if (formJustificacion) {
        formJustificacion.addEventListener("submit", manejarCrearJustificacion);
    }

    // Event listeners para ver justificación
    const volverJustificacionesBtn = document.getElementById("volverJustificacionesBtn");
    if (volverJustificacionesBtn) {
        volverJustificacionesBtn.addEventListener("click", volverAJustificaciones);
    }

    // Configurar fecha mínima como hoy
    const fechaInicio = document.getElementById("fechaInicio");
    const fechaFin = document.getElementById("fechaFin");
    if (fechaInicio) {
        const hoy = new Date().toISOString().split('T')[0];
        fechaInicio.min = hoy;
        fechaInicio.addEventListener("change", () => {
            fechaFin.min = fechaInicio.value;
        });
    }

    // Cargar estudiantes si es padre
    if (esPadreUser) {
        cargarEstudiantes(usuario);
    }

    // Cargar justificaciones
    cargarJustificaciones(usuario);
}

function mostrarPanelCrearJustificacion() {
    document.getElementById("panelCrearJustificacion").classList.remove("oculto");
    document.getElementById("panelCrearJustificacion").scrollIntoView({ behavior: "smooth" });
}

function ocultarPanelCrearJustificacion() {
    document.getElementById("panelCrearJustificacion").classList.add("oculto");
    document.getElementById("formJustificacion").reset();
}

function mostrarPanelVerJustificacion(justificacion) {
    document.getElementById("panelVerJustificacion").classList.remove("oculto");
    document.getElementById("panelCrearJustificacion").classList.add("oculto");
    document.getElementById("listaJustificaciones").classList.add("oculto");

    document.getElementById("estadoJustificacionVer").textContent = justificacion.estado;
    document.getElementById("fechaSolicitudVer").textContent = new Date(justificacion.fechaSolicitud).toLocaleDateString();
    document.getElementById("estudianteVer").textContent = justificacion.estudianteNombre;
    document.getElementById("tipoJustificacionVer").textContent = justificacion.tipo;
    document.getElementById("periodoJustificacionVer").textContent = `${justificacion.fechaInicio} - ${justificacion.fechaFin}`;
    document.getElementById("motivoJustificacionVer").textContent = justificacion.motivo;

    // Mostrar respuesta si existe
    if (justificacion.respuesta) {
        document.getElementById("respuestaJustificacion").classList.remove("oculto");
        document.getElementById("textoRespuesta").textContent = justificacion.respuesta.texto;
        document.getElementById("respondidoPor").textContent = justificacion.respuesta.respondidoPor;
        document.getElementById("fechaRespuesta").textContent = new Date(justificacion.respuesta.fecha).toLocaleString();
    } else {
        document.getElementById("respuestaJustificacion").classList.add("oculto");
    }
}

function volverAJustificaciones() {
    document.getElementById("panelVerJustificacion").classList.add("oculto");
    document.getElementById("listaJustificaciones").classList.remove("oculto");
}

async function cargarEstudiantes(usuario) {
    const selectEstudiante = document.getElementById("estudianteJustificacion");

    try {
        // Aquí iría la integración con Firebase para obtener estudiantes del padre
        // Simulación de datos
        const estudiantesSimulados = [
            { id: "1", nombre: "Carlos Pérez López" },
            { id: "2", nombre: "María Pérez López" }
        ];

        selectEstudiante.innerHTML = `<option value="">Selecciona estudiante</option>` +
            estudiantesSimulados.map(est => `<option value="${est.id}">${est.nombre}</option>`).join("");

    } catch (error) {
        console.error("Error al cargar estudiantes:", error);
    }
}

async function manejarCrearJustificacion(e) {
    e.preventDefault();
    const usuario = obtenerUsuario();
    if (!usuario) return;

    const justificacion = {
        estudianteId: document.getElementById("estudianteJustificacion").value,
        estudianteNombre: document.getElementById("estudianteJustificacion").options[document.getElementById("estudianteJustificacion").selectedIndex].text,
        tipo: document.getElementById("tipoJustificacion").value,
        fechaInicio: document.getElementById("fechaInicio").value,
        fechaFin: document.getElementById("fechaFin").value,
        motivo: document.getElementById("motivoJustificacion").value,
        archivo: document.getElementById("archivoJustificacion").files[0]?.name,
        solicitanteId: usuario.id,
        solicitanteNombre: usuario.nombres,
        fechaSolicitud: new Date().toISOString(),
        estado: "pendiente"
    };

    try {
        // Aquí iría la integración con Firebase
        console.log("Creando justificación:", justificacion);

        // Registrar en auditoría
        await registrarAccionAuditoria("crear_justificacion", `Justificación: ${justificacion.tipo} - ${justificacion.estudianteNombre}`);

        mostrarEstado("Solicitud enviada exitosamente", "ok");
        ocultarPanelCrearJustificacion();
        cargarJustificaciones(usuario);
    } catch (error) {
        console.error("Error al crear justificación:", error);
        mostrarEstado("Error al enviar solicitud", "error");
    }
}

async function cargarJustificaciones(usuario) {
    const listaJustificaciones = document.getElementById("listaJustificaciones");

    try {
        // Aquí iría la integración con Firebase para obtener justificaciones
        // Simulación de datos
        const justificacionesSimuladas = [
            {
                id: "1",
                estudianteNombre: "Carlos Pérez López",
                tipo: "medica",
                fechaInicio: "2026-09-20",
                fechaFin: "2026-09-22",
                motivo: "Gripe estacional con certificado médico",
                fechaSolicitud: new Date(Date.now() - 86400000).toISOString(),
                estado: "aprobada",
                respuesta: {
                    texto: "Justificación aprobada. Se han actualizado las asistencias.",
                    respondidoPor: "Dirección",
                    fecha: new Date().toISOString()
                }
            },
            {
                id: "2",
                estudianteNombre: "María Pérez López",
                tipo: "familiar",
                fechaInicio: "2026-10-05",
                fechaFin: "2026-10-06",
                motivo: "Viaje familiar por compromiso previo",
                fechaSolicitud: new Date().toISOString(),
                estado: "pendiente"
            }
        ];

        // Actualizar estadísticas
        const pendientes = justificacionesSimuladas.filter(j => j.estado === "pendiente").length;
        const aprobadas = justificacionesSimuladas.filter(j => j.estado === "aprobada").length;
        const rechazadas = justificacionesSimuladas.filter(j => j.estado === "rechazada").length;

        document.getElementById("solicitudesPendientes").textContent = pendientes;
        document.getElementById("solicitudesAprobadas").textContent = aprobadas;
        document.getElementById("solicitudesRechazadas").textContent = rechazadas;

        // Renderizar lista
        listaJustificaciones.innerHTML = justificacionesSimuladas.map(just => `
            <li>
                <div>
                    <strong>${just.estudianteNombre}</strong>
                    <span>${just.tipo} · ${just.fechaInicio} - ${just.fechaFin}</span>
                </div>
                <div>
                    <span class="chip ${just.estado === 'aprobada' ? 'chip-verde' : just.estado === 'rechazada' ? 'chip-rojo' : ''}" style="background: rgba(37, 99, 235, 0.1); color: #1d4ed8;">${just.estado}</span>
                    <button class="btn-funcional-inline" onclick="verJustificacion('${just.id}')">Ver detalle</button>
                </div>
            </li>
        `).join("") || "<li><span>No hay solicitudes</span></li>";

    } catch (error) {
        console.error("Error al cargar justificaciones:", error);
        listaJustificaciones.innerHTML = "<li><span>Error al cargar solicitudes</span></li>";
    }
}

// Función global para ver justificación
window.verJustificacion = function(justificacionId) {
    // Cargar datos de la justificación específica
    const justificacion = {
        id: justificacionId,
        estudianteNombre: "Carlos Pérez López",
        tipo: "medica",
        fechaInicio: "2026-09-20",
        fechaFin: "2026-09-22",
        motivo: "Gripe estacional con certificado médico",
        fechaSolicitud: new Date(Date.now() - 86400000).toISOString(),
        estado: "aprobada",
        respuesta: {
            texto: "Justificación aprobada. Se han actualizado las asistencias.",
            respondidoPor: "Dirección",
            fecha: new Date().toISOString()
        }
    };

    mostrarPanelVerJustificacion(justificacion);
};

function mostrarEstado(mensaje, tipo) {
    const estado = document.getElementById("estadoJustificaciones") || document.createElement("p");
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
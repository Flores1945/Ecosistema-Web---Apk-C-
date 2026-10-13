import { initPaginaProtegida, configurarCerrarSesion, puedeModificar, esAlumno, esDocente } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";

const usuario = initPaginaProtegida("tareas");
if (usuario) {
    configurarCerrarSesion();
    inicializarPaginaTareas(usuario);
}

function inicializarPaginaTareas(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "tareas");
    const esAlumnoUser = esAlumno(usuario.cargo);
    const esDocenteUser = esDocente(usuario.cargo);

    // Configurar título según rol
    const tituloSeccion = document.getElementById("tituloSeccionTareas");
    if (esAlumnoUser) {
        tituloSeccion.textContent = "Mis Tareas";
    } else if (esDocenteUser) {
        tituloSeccion.textContent = "Tareas de mis Cursos";
    } else {
        tituloSeccion.textContent = "Todas las Tareas";
    }

    // Event listeners para crear tarea (solo docentes)
    const crearTareaBtn = document.getElementById("crearTareaBtn");
    if (crearTareaBtn && puedeMod) {
        crearTareaBtn.addEventListener("click", mostrarPanelCrearTarea);
    }

    const cancelarTareaBtn = document.getElementById("cancelarTareaBtn");
    if (cancelarTareaBtn) {
        cancelarTareaBtn.addEventListener("click", ocultarPanelCrearTarea);
    }

    const formTarea = document.getElementById("formTarea");
    if (formTarea) {
        formTarea.addEventListener("submit", manejarCrearTarea);
    }

    // Event listeners para entregar tarea (alumnos)
    const formEntrega = document.getElementById("formEntrega");
    if (formEntrega) {
        formEntrega.addEventListener("submit", manejarEntregarTarea);
    }

    const cancelarEntregaBtn = document.getElementById("cancelarEntregaBtn");
    if (cancelarEntregaBtn) {
        cancelarEntregaBtn.addEventListener("click", ocultarPanelEntregarTarea);
    }

    // Cargar tareas
    cargarTareas(usuario);
}

function mostrarPanelCrearTarea() {
    document.getElementById("panelCrearTarea").classList.remove("oculto");
    document.getElementById("panelCrearTarea").scrollIntoView({ behavior: "smooth" });
}

function ocultarPanelCrearTarea() {
    document.getElementById("panelCrearTarea").classList.add("oculto");
    document.getElementById("formTarea").reset();
}

function mostrarPanelEntregarTarea(tareaId, titulo) {
    document.getElementById("tareaIdEntregar").value = tareaId;
    document.getElementById("tituloTareaEntregar").textContent = titulo;
    document.getElementById("panelEntregarTarea").classList.remove("oculto");
    document.getElementById("panelEntregarTarea").scrollIntoView({ behavior: "smooth" });
}

function ocultarPanelEntregarTarea() {
    document.getElementById("panelEntregarTarea").classList.add("oculto");
    document.getElementById("formEntrega").reset();
}

async function manejarCrearTarea(e) {
    e.preventDefault();
    const usuario = obtenerUsuario();
    if (!usuario) return;

    const tarea = {
        titulo: document.getElementById("tituloTarea").value,
        descripcion: document.getElementById("descripcionTarea").value,
        curso: document.getElementById("cursoTarea").value,
        fechaEntrega: document.getElementById("fechaEntrega").value,
        puntosMaximos: parseInt(document.getElementById("puntosTarea").value),
        creadorId: usuario.id,
        creadorNombre: usuario.nombres,
        fechaCreacion: new Date().toISOString(),
        estado: "activa"
    };

    try {
        // Aquí iría la integración con Firebase
        console.log("Creando tarea:", tarea);

        // Registrar en auditoría
        await registrarAccionAuditoria("crear_tarea", `Nueva tarea: ${tarea.titulo}`);

        mostrarEstado("Tarea creada exitosamente", "ok");
        ocultarPanelCrearTarea();
        cargarTareas(usuario);
    } catch (error) {
        console.error("Error al crear tarea:", error);
        mostrarEstado("Error al crear tarea", "error");
    }
}

async function manejarEntregarTarea(e) {
    e.preventDefault();
    const usuario = obtenerUsuario();
    if (!usuario) return;

    const entrega = {
        tareaId: document.getElementById("tareaIdEntregar").value,
        estudianteId: usuario.id,
        estudianteNombre: usuario.nombres,
        archivo: document.getElementById("archivoEntrega").files[0]?.name,
        comentario: document.getElementById("comentarioEntrega").value,
        fechaEntrega: new Date().toISOString(),
        estado: "entregada"
    };

    try {
        // Aquí iría la integración con Firebase
        console.log("Entregando tarea:", entrega);

        // Registrar en auditoría
        await registrarAccionAuditoria("entregar_tarea", `Entrega de tarea: ${entrega.tareaId}`);

        mostrarEstado("Tarea entregada exitosamente", "ok");
        ocultarPanelEntregarTarea();
        cargarTareas(usuario);
    } catch (error) {
        console.error("Error al entregar tarea:", error);
        mostrarEstado("Error al entregar tarea", "error");
    }
}

async function cargarTareas(usuario) {
    const listaTareas = document.getElementById("listaTareas");
    const esAlumnoUser = esAlumno(usuario.cargo);
    const esDocenteUser = esDocente(usuario.cargo);

    try {
        // Aquí iría la integración con Firebase para obtener tareas
        // Simulación de datos
        const tareasSimuladas = [
            {
                id: "1",
                titulo: "Investigación sobre ecosistemas",
                curso: "Ciencia",
                fechaEntrega: "2026-10-15",
                puntosMaximos: 20,
                estado: "activa",
                creadorNombre: "Prof. García"
            },
            {
                id: "2",
                titulo: "Resumen de libro literario",
                curso: "Comunicacion",
                fechaEntrega: "2026-10-20",
                puntosMaximos: 15,
                estado: "activa",
                creadorNombre: "Prof. Martínez"
            }
        ];

        // Filtrar según rol
        let tareasFiltradas = tareasSimuladas;
        if (esAlumnoUser) {
            // Alumnos ven todas las tareas activas
            tareasFiltradas = tareasSimuladas.filter(t => t.estado === "activa");
        } else if (esDocenteUser) {
            // Docentes ven sus tareas
            tareasFiltradas = tareasSimuladas.filter(t => t.creadorNombre === "Prof. García");
        }

        // Actualizar estadísticas
        const pendientes = tareasFiltradas.filter(t => t.estado === "activa").length;
        const entregadas = tareasFiltradas.filter(t => t.estado === "entregada").length;
        document.getElementById("tareasPendientes").textContent = pendientes;
        document.getElementById("tareasEntregadas").textContent = entregadas;
        document.getElementById("promedioTareas").textContent = esAlumnoUser ? "18.5" : "-";

        // Renderizar lista
        listaTareas.innerHTML = tareasFiltradas.map(tarea => `
            <li>
                <div>
                    <strong>${tarea.titulo}</strong>
                    <span>${tarea.curso} · ${tarea.fechaEntrega} · ${tarea.puntosMaximos} pts</span>
                </div>
                <div>
                    ${esAlumnoUser ? `<button class="btn-funcional-inline" onclick="mostrarPanelEntregarTarea('${tarea.id}', '${tarea.titulo}')">Entregar</button>` : ''}
                    ${esDocenteUser ? `<span class="chip-verde">${tarea.estado}</span>` : ''}
                </div>
            </li>
        `).join("") || "<li><span>No hay tareas disponibles</span></li>";

    } catch (error) {
        console.error("Error al cargar tareas:", error);
        listaTareas.innerHTML = "<li><span>Error al cargar tareas</span></li>";
    }
}

function mostrarEstado(mensaje, tipo) {
    const estado = document.getElementById("estadoTareas") || document.createElement("p");
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
import { initPaginaProtegida, configurarCerrarSesion, puedeModificar } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";
import { inicializarBusquedaGlobal } from "./busqueda-global.js";

const usuario = initPaginaProtegida("foro");
if (usuario) {
    document.addEventListener('DOMContentLoaded', () => {
    inicializarBusquedaGlobal();
});
    configurarCerrarSesion();
    inicializarPaginaForo(usuario);
}

function inicializarPaginaForo(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "foro");

    // Event listeners para crear tema
    const nuevoTemaBtn = document.getElementById("nuevoTemaBtn");
    if (nuevoTemaBtn && puedeMod) {
        nuevoTemaBtn.addEventListener("click", mostrarPanelCrearTema);
    }

    const cancelarTemaBtn = document.getElementById("cancelarTemaBtn");
    if (cancelarTemaBtn) {
        cancelarTemaBtn.addEventListener("click", ocultarPanelCrearTema);
    }

    const formTema = document.getElementById("formTema");
    if (formTema) {
        formTema.addEventListener("submit", manejarCrearTema);
    }

    // Event listeners para ver tema
    const formRespuesta = document.getElementById("formRespuesta");
    if (formRespuesta && puedeMod) {
        formRespuesta.addEventListener("submit", manejarResponderTema);
    }

    const volverTemasBtn = document.getElementById("volverTemasBtn");
    if (volverTemasBtn) {
        volverTemasBtn.addEventListener("click", volverATemas);
    }

    // Filtros
    const filtroCurso = document.getElementById("filtroCursoForo");
    const filtroTipo = document.getElementById("filtroTipoForo");
    const buscarForo = document.getElementById("buscarForo");

    if (filtroCurso) filtroCurso.addEventListener("change", () => cargarTemas(usuario));
    if (filtroTipo) filtroTipo.addEventListener("change", () => cargarTemas(usuario));
    if (buscarForo) buscarForo.addEventListener("input", () => cargarTemas(usuario));

    // Cargar temas iniciales
    cargarTemas(usuario);
}

function mostrarPanelCrearTema() {
    document.getElementById("panelCrearTema").classList.remove("oculto");
    document.getElementById("panelCrearTema").scrollIntoView({ behavior: "smooth" });
}

function ocultarPanelCrearTema() {
    document.getElementById("panelCrearTema").classList.add("oculto");
    document.getElementById("formTema").reset();
}

function mostrarPanelVerTema(tema) {
    document.getElementById("panelVerTema").classList.remove("oculto");
    document.getElementById("panelCrearTema").classList.add("oculto");
    document.getElementById("listaTemas").classList.add("oculto");

    document.getElementById("tituloTemaVer").textContent = tema.titulo;
    document.getElementById("infoCursoTema").textContent = tema.curso;
    document.getElementById("infoTipoTema").textContent = tema.tipo;
    document.getElementById("infoFechaTema").textContent = new Date(tema.fecha).toLocaleDateString();
    document.getElementById("infoAutorTema").textContent = tema.autor;
    document.getElementById("contenidoTemaVer").textContent = tema.contenido;

    cargarRespuestas(tema.id);
}

function volverATemas() {
    document.getElementById("panelVerTema").classList.add("oculto");
    document.getElementById("listaTemas").classList.remove("oculto");
    document.getElementById("formRespuesta").reset();
}

async function manejarCrearTema(e) {
    e.preventDefault();
    const usuario = obtenerUsuario();
    if (!usuario) return;

    const tema = {
        titulo: document.getElementById("tituloTema").value,
        curso: document.getElementById("cursoTema").value,
        tipo: document.getElementById("tipoTema").value,
        contenido: document.getElementById("contenidoTema").value,
        autorId: usuario.id,
        autor: usuario.nombres,
        fecha: new Date().toISOString(),
        respuestas: [],
        estado: "activo"
    };

    try {
        // Aquí iría la integración con Firebase
        console.log("Creando tema:", tema);

        // Registrar en auditoría
        await registrarAccionAuditoria("crear_tema_foro", `Nuevo tema: ${tema.titulo}`);

        mostrarEstado("Tema creado exitosamente", "ok");
        ocultarPanelCrearTema();
        cargarTemas(usuario);
    } catch (error) {
        console.error("Error al crear tema:", error);
        mostrarEstado("Error al crear tema", "error");
    }
}

async function manejarResponderTema(e) {
    e.preventDefault();
    const usuario = obtenerUsuario();
    if (!usuario) return;

    const respuesta = {
        temaId: document.getElementById("panelVerTema").dataset.temaId,
        contenido: document.getElementById("contenidoRespuesta").value,
        autorId: usuario.id,
        autor: usuario.nombres,
        fecha: new Date().toISOString()
    };

    try {
        // Aquí iría la integración con Firebase
        console.log("Respondiendo tema:", respuesta);

        // Registrar en auditoría
        await registrarAccionAuditoria("responder_tema_foro", `Respuesta a tema: ${respuesta.temaId}`);

        mostrarEstado("Respuesta agregada exitosamente", "ok");
        document.getElementById("formRespuesta").reset();
        // Recargar respuestas
        const temaId = document.getElementById("panelVerTema").dataset.temaId;
        cargarRespuestas(temaId);
    } catch (error) {
        console.error("Error al responder tema:", error);
        mostrarEstado("Error al responder tema", "error");
    }
}

async function cargarTemas(usuario) {
    const listaTemas = document.getElementById("listaTemas");
    const filtroCurso = document.getElementById("filtroCursoForo")?.value || "";
    const filtroTipo = document.getElementById("filtroTipoForo")?.value || "";
    const busqueda = document.getElementById("buscarForo")?.value?.toLowerCase() || "";

    try {
        // Aquí iría la integración con Firebase para obtener temas
        // Simulación de datos
        const temasSimulados = [
            {
                id: "1",
                titulo: "Duda sobre ecuaciones cuadráticas",
                curso: "Matematica",
                tipo: "consulta",
                autor: "Juan Pérez",
                fecha: new Date().toISOString(),
                respuestas: 3,
                contenido: "No entiendo cómo resolver cuando el discriminante es negativo..."
            },
            {
                id: "2",
                titulo: "Debate: ¿Tecnología en el aula?",
                curso: "Comunicacion",
                tipo: "debate",
                autor: "María López",
                fecha: new Date(Date.now() - 86400000).toISOString(),
                respuestas: 12,
                contenido: "¿Es beneficioso o distrae el aprendizaje?"
            },
            {
                id: "3",
                titulo: "Fecha examen parcial",
                curso: "Ciencia",
                tipo: "anuncio",
                autor: "Prof. García",
                fecha: new Date(Date.now() - 172800000).toISOString(),
                respuestas: 0,
                contenido: "El examen parcial será el 15 de octubre"
            }
        ];

        // Filtrar temas
        let temasFiltrados = temasSimulados.filter(tema => {
            const cumpleCurso = !filtroCurso || tema.curso === filtroCurso;
            const cumpleTipo = !filtroTipo || tema.tipo === filtroTipo;
            const cumpleBusqueda = !busqueda ||
                tema.titulo.toLowerCase().includes(busqueda) ||
                tema.contenido.toLowerCase().includes(busqueda);
            return cumpleCurso && cumpleTipo && cumpleBusqueda;
        });

        // Renderizar lista
        listaTemas.innerHTML = temasFiltrados.map(tema => `
            <div class="tema-item" style="padding: 16px; border-bottom: 1px solid var(--borde); cursor: pointer;" onclick="verTema('${tema.id}')">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <strong>${tema.titulo}</strong>
                        <div style="margin-top: 4px;">
                            <span class="chip">${tema.curso}</span>
                            <span class="chip" style="background: rgba(37, 99, 235, 0.1); color: #1d4ed8;">${tema.tipo}</span>
                        </div>
                        <small style="color: var(--texto-suave);">Por ${tema.autor} · ${new Date(tema.fecha).toLocaleDateString()}</small>
                    </div>
                    <div style="text-align: right;">
                        <span class="chip-verde">${tema.respuestas} respuestas</span>
                    </div>
                </div>
            </div>
        `).join("") || "<p>No hay temas que coincidan con los filtros.</p>";

    } catch (error) {
        console.error("Error al cargar temas:", error);
        listaTemas.innerHTML = "<p>Error al cargar temas</p>";
    }
}

async function cargarRespuestas(temaId) {
    const listaRespuestas = document.getElementById("listaRespuestas");

    try {
        // Aquí iría la integración con Firebase para obtener respuestas
        // Simulación de datos
        const respuestasSimuladas = [
            {
                id: "1",
                contenido: "Cuando el discriminante es negativo, las soluciones son números complejos",
                autor: "Prof. García",
                fecha: new Date().toISOString()
            },
            {
                id: "2",
                contenido: "Te puedo explicar después de clases si quieres",
                autor: "Ana Martínez",
                fecha: new Date(Date.now() - 3600000).toISOString()
            }
        ];

        listaRespuestas.innerHTML = respuestasSimuladas.map(resp => `
            <div style="padding: 12px; border-bottom: 1px solid var(--borde);">
                <div style="display: flex; justify-content: space-between;">
                    <strong>${resp.autor}</strong>
                    <small>${new Date(resp.fecha).toLocaleString()}</small>
                </div>
                <p style="margin-top: 8px;">${resp.contenido}</p>
            </div>
        `).join("") || "<p>No hay respuestas aún.</p>";

    } catch (error) {
        console.error("Error al cargar respuestas:", error);
        listaRespuestas.innerHTML = "<p>Error al cargar respuestas</p>";
    }
}

// Función global para ver tema
window.verTema = function(temaId) {
    // Cargar datos del tema específico
    const tema = {
        id: temaId,
        titulo: "Duda sobre ecuaciones cuadráticas",
        curso: "Matematica",
        tipo: "consulta",
        autor: "Juan Pérez",
        fecha: new Date().toISOString(),
        contenido: "No entiendo cómo resolver cuando el discriminante es negativo..."
    };

    document.getElementById("panelVerTema").dataset.temaId = temaId;
    mostrarPanelVerTema(tema);
};

function mostrarEstado(mensaje, tipo) {
    const estado = document.getElementById("estadoForo") || document.createElement("p");
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
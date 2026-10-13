import { initPaginaProtegida, configurarCerrarSesion, puedeModificar } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";

const usuario = initPaginaProtegida("documentos");
if (usuario) {
    configurarCerrarSesion();
    inicializarPaginaDocumentos(usuario);
}

function inicializarPaginaDocumentos(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "documentos");

    // Event listeners para filtros
    const categoriaDocumentos = document.getElementById("categoriaDocumentos");
    const anioDocumentos = document.getElementById("anioDocumentos");

    if (categoriaDocumentos) categoriaDocumentos.addEventListener("change", () => cargarDocumentos(usuario));
    if (anioDocumentos) anioDocumentos.addEventListener("change", () => cargarDocumentos(usuario));

    // Event listeners para exportación
    const exportarBtn = document.getElementById("exportarDocumentosBtn");
    if (exportarBtn) {
        exportarBtn.addEventListener("click", exportarDocumentosExcel);
    }

    // Event listeners para agregar/editar documentos
    const agregarDocumentoBtn = document.getElementById("agregarDocumentoBtn");
    const cancelarDocumentoBtn = document.getElementById("cancelarDocumentoBtn");
    const formDocumento = document.getElementById("formDocumento");

    if (agregarDocumentoBtn && puedeMod) {
        agregarDocumentoBtn.addEventListener("click", mostrarPanelAgregarDocumento);
    }

    if (cancelarDocumentoBtn) {
        cancelarDocumentoBtn.addEventListener("click", ocultarPanelAgregarDocumento);
    }

    if (formDocumento && puedeMod) {
        formDocumento.addEventListener("submit", manejarGuardarDocumento);
    }

    // Cargar documentos inicial
    cargarDocumentos(usuario);
}

function mostrarPanelAgregarDocumento() {
    document.getElementById("panelAgregarDocumento").classList.remove("oculto");
    document.getElementById("panelAgregarDocumento").scrollIntoView({ behavior: "smooth" });
}

function ocultarPanelAgregarDocumento() {
    document.getElementById("panelAgregarDocumento").classList.add("oculto");
    document.getElementById("formDocumento").reset();
}

async function manejarGuardarDocumento(e) {
    e.preventDefault();
    const usuario = obtenerUsuario();
    if (!usuario) return;

    const documento = {
        id: document.getElementById("documentoId").value || Date.now().toString(),
        nombre: document.getElementById("nombreDocumento").value,
        categoria: document.getElementById("categoriaDocumento").value,
        responsable: document.getElementById("responsableDocumento").value,
        archivo: document.getElementById("archivoDocumento").files[0]?.name,
        anio: document.getElementById("anioDocumentos").value,
        subidoPor: usuario.id,
        fechaSubida: new Date().toISOString()
    };

    try {
        // Aquí iría la integración con Firebase
        console.log("Guardando documento:", documento);

        // Registrar en auditoría
        await registrarAccionAuditoria("guardar_documento", `Documento: ${documento.nombre}`);

        mostrarEstado("Documento guardado exitosamente", "ok");
        ocultarPanelAgregarDocumento();
        cargarDocumentos(usuario);
    } catch (error) {
        console.error("Error al guardar documento:", error);
        mostrarEstado("Error al guardar documento", "error");
    }
}

async function cargarDocumentos(usuario) {
    const listaDocumentos = document.getElementById("listaDocumentos");
    const categoriaFiltro = document.getElementById("categoriaDocumentos")?.value || "";
    const anioFiltro = document.getElementById("anioDocumentos")?.value || "2026";

    try {
        // Aquí iría la integración con Firebase para obtener documentos
        // Simulación de datos
        const documentosSimulados = [
            { id: "1", nombre: "Reglamento interno 2026", categoria: "reglamento", responsable: "Dirección", anio: "2026" },
            { id: "2", nombre: "Plan anual de trabajo", categoria: "planificacion", responsable: "Dirección", anio: "2026" },
            { id: "3", nombre: "Ficha SIAGIE — matricula", categoria: "formatos", responsable: "Secretaría", anio: "2026" },
            { id: "4", nombre: "Acta de convivencia", categoria: "protocolos", responsable: "TOE", anio: "2026" },
            { id: "5", nombre: "Protocolo de emergencias", categoria: "protocolos", responsable: "Tópico", anio: "2026" }
        ];

        // Filtrar documentos
        let documentosFiltrados = documentosSimulados.filter(doc => {
            const cumpleCategoria = !categoriaFiltro || doc.categoria === categoriaFiltro;
            const cumpleAnio = doc.anio === anioFiltro;
            return cumpleCategoria && cumpleAnio;
        });

        // Renderizar lista
        listaDocumentos.innerHTML = documentosFiltrados.map(doc => `
            <li>
                <div>
                    <strong>${doc.nombre}</strong>
                    <span>${doc.responsable}</span>
                    <span class="chip">${doc.categoria.charAt(0).toUpperCase() + doc.categoria.slice(1)}</span>
                </div>
                <div>
                    <button class="btn-secundario" onclick="editarDocumento('${doc.id}')">Editar</button>
                    <button class="btn-funcional-inline">📄 Ver</button>
                </div>
            </li>
        `).join("") || "<li><span>No hay documentos para este filtro</span></li>";

    } catch (error) {
        console.error("Error al cargar documentos:", error);
        listaDocumentos.innerHTML = "<li><span>Error al cargar documentos</span></li>";
    }
}

async function exportarDocumentosExcel() {
    const usuario = obtenerUsuario();
    const categoriaFiltro = document.getElementById("categoriaDocumentos")?.value || "";
    const anioFiltro = document.getElementById("anioDocumentos")?.value || "2026";

    try {
        // Obtener datos actuales de documentos
        const documentosSimulados = [
            { id: "1", nombre: "Reglamento interno 2026", categoria: "reglamento", responsable: "Dirección", anio: "2026" },
            { id: "2", nombre: "Plan anual de trabajo", categoria: "planificacion", responsable: "Dirección", anio: "2026" },
            { id: "3", nombre: "Ficha SIAGIE — matricula", categoria: "formatos", responsable: "Secretaría", anio: "2026" }
        ];

        let documentosFiltrados = documentosSimulados.filter(doc => {
            const cumpleCategoria = !categoriaFiltro || doc.categoria === categoriaFiltro;
            const cumpleAnio = doc.anio === anioFiltro;
            return cumpleCategoria && cumpleAnio;
        });

        // Crear datos para Excel
        const datosExcel = documentosFiltrados.map(doc => ({
            "Documento": doc.nombre,
            "Categoría": doc.categoria,
            "Responsable": doc.responsable,
            "Año": doc.anio
        }));

        // Usar librería XLSX para exportar
        if (typeof XLSX !== 'undefined') {
            const ws = XLSX.utils.json_to_sheet(datosExcel);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Documentos");
            XLSX.writeFile(wb, `documentos_${anioFiltro}_${new Date().toISOString().split('T')[0]}.xlsx`);

            // Registrar en auditoría
            await registrarAccionAuditoria("exportar_documentos_excel", `Documentos ${anioFiltro}`);

            mostrarEstado("Documentos exportados exitosamente", "ok");
        } else {
            console.log("Exportando datos:", datosExcel);
            mostrarEstado("Librería XLSX no disponible. Ver consola para datos.", "alerta");
        }

    } catch (error) {
        console.error("Error al exportar documentos:", error);
        mostrarEstado("Error al exportar documentos", "error");
    }
}

// Función global para editar documento
window.editarDocumento = function(docId) {
    // Cargar datos del documento específico
    const documento = {
        id: docId,
        nombre: "Reglamento interno 2026",
        categoria: "reglamento",
        responsable: "Dirección"
    };

    document.getElementById("documentoId").value = documento.id;
    document.getElementById("nombreDocumento").value = documento.nombre;
    document.getElementById("categoriaDocumento").value = documento.categoria;
    document.getElementById("responsableDocumento").value = documento.responsable;

    mostrarPanelAgregarDocumento();
};

function mostrarEstado(mensaje, tipo) {
    const estado = document.getElementById("estadoDocumentos") || document.createElement("p");
    estado.className = tipo === "ok" ? "estado-ok" : tipo === "error" ? "estado-error" : "estado-alerta";
    estado.textContent = mensaje;
}

function obtenerUsuario() {
    try {
        return JSON.parse(sessionStorage.getItem("usuario_activo") || "null");
    } catch {
        return null;
    }
}

async function registrarVisitaPagina() {
    try {
        const { registrarVisitaPagina } = await import("./auditoria.js");
        await registrarVisitaPagina("documentos");
    } catch (error) {
        console.error("Error al registrar visita:", error);
    }
}
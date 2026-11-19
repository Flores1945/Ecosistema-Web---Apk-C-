import { initPaginaProtegida, configurarCerrarSesion, puedeModificar, esAccesoTotal } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";
import { inicializarBusquedaGlobal } from "./busqueda-global.js";

const usuario = initPaginaProtegida("inventario");
if (usuario) {
    document.addEventListener('DOMContentLoaded', () => {
    inicializarBusquedaGlobal();
});
    configurarCerrarSesion();
    inicializarPaginaInventario(usuario);
}

function inicializarPaginaInventario(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "inventario");
    const esDirectivo = esAccesoTotal(usuario.cargo);

    // Event listeners para filtros
    const anioInventario = document.getElementById("anioInventario");
    const categoriaInventario = document.getElementById("categoriaInventario");

    if (anioInventario) anioInventario.addEventListener("change", () => cargarInventario(usuario));
    if (categoriaInventario) categoriaInventario.addEventListener("change", () => cargarInventario(usuario));

    // Event listeners para exportación
    const exportarBtn = document.getElementById("exportarInventarioBtn");
    if (exportarBtn) {
        exportarBtn.addEventListener("click", exportarInventarioExcel);
    }

    // Event listeners para agregar/editar items
    const agregarItemBtn = document.getElementById("agregarItemBtn");
    const cancelarItemBtn = document.getElementById("cancelarItemBtn");
    const formItem = document.getElementById("formItemInventario");

    if (agregarItemBtn && puedeMod) {
        agregarItemBtn.addEventListener("click", mostrarPanelAgregarItem);
    }

    if (cancelarItemBtn) {
        cancelarItemBtn.addEventListener("click", ocultarPanelAgregarItem);
    }

    if (formItem && puedeMod) {
        formItem.addEventListener("submit", manejarGuardarItem);
    }

    // Cargar inventario inicial
    cargarInventario(usuario);
}

function mostrarPanelAgregarItem() {
    document.getElementById("panelAgregarItem").classList.remove("oculto");
    document.getElementById("panelAgregarItem").scrollIntoView({ behavior: "smooth" });
}

function ocultarPanelAgregarItem() {
    document.getElementById("panelAgregarItem").classList.add("oculto");
    document.getElementById("formItemInventario").reset();
}

async function manejarGuardarItem(e) {
    e.preventDefault();
    const usuario = obtenerUsuario();
    if (!usuario) return;

    const item = {
        id: document.getElementById("itemId").value || Date.now().toString(),
        nombre: document.getElementById("nombreItem").value,
        cantidad: parseInt(document.getElementById("cantidadItem").value),
        ubicacion: document.getElementById("ubicacionItem").value,
        categoria: document.getElementById("categoriaItem").value,
        estado: document.getElementById("estadoItem").value,
        anio: document.getElementById("anioInventario").value,
        actualizadoPor: usuario.id,
        fechaActualizacion: new Date().toISOString()
    };

    try {
        // Aquí iría la integración con Firebase
        console.log("Guardando item:", item);

        // Registrar en auditoría
        await registrarAccionAuditoria("guardar_item_inventario", `Item: ${item.nombre}`);

        mostrarEstado("Item guardado exitosamente", "ok");
        ocultarPanelAgregarItem();
        cargarInventario(usuario);
    } catch (error) {
        console.error("Error al guardar item:", error);
        mostrarEstado("Error al guardar item", "error");
    }
}

async function cargarInventario(usuario) {
    const tablaInventarioBody = document.getElementById("tablaInventarioBody");
    const anioFiltro = document.getElementById("anioInventario")?.value || "2026";
    const categoriaFiltro = document.getElementById("categoriaInventario")?.value || "";

    try {
        // Aquí iría la integración con Firebase para obtener inventario
        // Simulación de datos por año
        const inventarioSimulado = {
            "2026": [
                { id: "1", nombre: "Carpetas escolares", cantidad: 860, ubicacion: "Aulas", categoria: "material", estado: "operativo" },
                { id: "2", nombre: "Proyectores", cantidad: 18, ubicacion: "Pabellones A y B", categoria: "tecnologico", estado: "mantenimiento" },
                { id: "3", nombre: "Computadoras", cantidad: 42, ubicacion: "Aula de innovacion", categoria: "tecnologico", estado: "operativo" },
                { id: "4", nombre: "Kits de laboratorio", cantidad: 12, ubicacion: "Ciencia", categoria: "equipo", estado: "operativo" }
            ],
            "2025": [
                { id: "5", nombre: "Sillas escolares", cantidad: 120, ubicacion: "Aulas", categoria: "mobiliario", estado: "operativo" },
                { id: "6", nombre: "Pizarras blancas", cantidad: 24, ubicacion: "Aulas", categoria: "mobiliario", estado: "operativo" }
            ],
            "2024": [
                { id: "7", nombre: "Escritorios docentes", cantidad: 30, ubicacion: "Aulas", categoria: "mobiliario", estado: "danado" }
            ]
        };

        const itemsAnio = inventarioSimulado[anioFiltro] || [];

        // Filtrar por categoría
        let itemsFiltrados = itemsAnio.filter(item => {
            const cumpleCategoria = !categoriaFiltro || item.categoria === categoriaFiltro;
            return cumpleCategoria;
        });

        // Renderizar tabla
        tablaInventarioBody.innerHTML = itemsFiltrados.map(item => `
            <tr>
                <td><strong>${item.nombre}</strong></td>
                <td>${item.cantidad}</td>
                <td>${item.ubicacion}</td>
                <td>
                    <span class="estado-${item.estado === 'operativo' ? 'ok' : item.estado === 'mantenimiento' ? 'alerta' : 'error'}">
                        ${item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
                    </span>
                </td>
                <td>
                    <button class="btn-secundario" onclick="editarItem('${item.id}')">Editar</button>
                </td>
            </tr>
        `).join("") || "<tr><td colspan='5'>No hay items para este filtro</td></tr>";

    } catch (error) {
        console.error("Error al cargar inventario:", error);
        tablaInventarioBody.innerHTML = "<tr><td colspan='5'>Error al cargar inventario</td></tr>";
    }
}

async function exportarInventarioExcel() {
    const usuario = obtenerUsuario();
    const anioFiltro = document.getElementById("anioInventario")?.value || "2026";
    const categoriaFiltro = document.getElementById("categoriaInventario")?.value || "";

    try {
        // Obtener datos actuales del inventario
        const inventarioSimulado = {
            "2026": [
                { id: "1", nombre: "Carpetas escolares", cantidad: 860, ubicacion: "Aulas", categoria: "material", estado: "operativo" },
                { id: "2", nombre: "Proyectores", cantidad: 18, ubicacion: "Pabellones A y B", categoria: "tecnologico", estado: "mantenimiento" },
                { id: "3", nombre: "Computadoras", cantidad: 42, ubicacion: "Aula de innovacion", categoria: "tecnologico", estado: "operativo" },
                { id: "4", nombre: "Kits de laboratorio", cantidad: 12, ubicacion: "Ciencia", categoria: "equipo", estado: "operativo" }
            ]
        };

        const itemsAnio = inventarioSimulado[anioFiltro] || [];
        let itemsFiltrados = itemsAnio.filter(item => {
            const cumpleCategoria = !categoriaFiltro || item.categoria === categoriaFiltro;
            return cumpleCategoria;
        });

        // Crear datos para Excel
        const datosExcel = itemsFiltrados.map(item => ({
            "Bien": item.nombre,
            "Cantidad": item.cantidad,
            "Ubicación": item.ubicacion,
            "Categoría": item.categoria,
            "Estado": item.estado,
            "Año": anioFiltro
        }));

        // Usar librería XLSX para exportar
        if (typeof XLSX !== 'undefined') {
            const ws = XLSX.utils.json_to_sheet(datosExcel);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Inventario");
            XLSX.writeFile(wb, `inventario_${anioFiltro}_${new Date().toISOString().split('T')[0]}.xlsx`);

            // Registrar en auditoría
            await registrarAccionAuditoria("exportar_inventario_excel", `Inventario ${anioFiltro}`);

            mostrarEstado("Inventario exportado exitosamente", "ok");
        } else {
            // Fallback si XLSX no está disponible
            console.log("Exportando datos:", datosExcel);
            mostrarEstado("Librería XLSX no disponible. Ver consola para datos.", "alerta");
        }

    } catch (error) {
        console.error("Error al exportar inventario:", error);
        mostrarEstado("Error al exportar inventario", "error");
    }
}

// Función global para editar item
window.editarItem = function(itemId) {
    // Cargar datos del item específico
    const item = {
        id: itemId,
        nombre: "Carpetas escolares",
        cantidad: 860,
        ubicacion: "Aulas",
        categoria: "material",
        estado: "operativo"
    };

    document.getElementById("itemId").value = item.id;
    document.getElementById("nombreItem").value = item.nombre;
    document.getElementById("cantidadItem").value = item.cantidad;
    document.getElementById("ubicacionItem").value = item.ubicacion;
    document.getElementById("categoriaItem").value = item.categoria;
    document.getElementById("estadoItem").value = item.estado;

    mostrarPanelAgregarItem();
};

function mostrarEstado(mensaje, tipo) {
    const estado = document.getElementById("estadoInventario") || document.createElement("p");
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
        await registrarVisitaPagina("inventario");
    } catch (error) {
        console.error("Error al registrar visita:", error);
    }
}
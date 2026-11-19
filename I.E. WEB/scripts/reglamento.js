import { apiGet, apiPost, apiPut, apiDelete } from "./api.js";
import {
    initPaginaProtegida,
    configurarCerrarSesion,
    puedeModificar
} from "./auth-roles.js";
import { registrarMovimiento } from "./auditoria.js";
import { inicializarBusquedaGlobal } from "./busqueda-global.js";

const usuario = initPaginaProtegida("reglamento");
if (!usuario) {
    throw new Error("Sin sesion");
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarBusquedaGlobal();
});

const puedeEditar = puedeModificar(usuario.cargo, "reglamento");

const formReglamento = document.getElementById("formReglamento");
const panelFormulario = document.getElementById("panelFormulario");
const tituloFormulario = document.getElementById("tituloFormulario");
const subtituloPagina = document.getElementById("subtituloPagina");
const reglamentoIdInput = document.getElementById("reglamentoId");
const tituloInput = document.getElementById("titulo");
const categoriaInput = document.getElementById("categoria");
const contenidoInput = document.getElementById("contenido");
const activoInput = document.getElementById("activo");
const tablaReglamentoBody = document.getElementById("tablaReglamentoBody");
const estadoReglamento = document.getElementById("estadoReglamento");
const colAcciones = document.getElementById("colAcciones");
const filtroCategoria = document.getElementById("filtroCategoria");
const filtroBusqueda = document.getElementById("filtroBusqueda");
const filtroEstado = document.getElementById("filtroEstado");
const limpiarFormBtn = document.getElementById("limpiarFormBtn");
const totalReglamentos = document.getElementById("totalReglamentos");

let articulos = [];

configurarCerrarSesion();
configurarModoPorRol();
configurarFiltros();
cargarReglamentos();

function configurarModoPorRol() {
    if (!puedeEditar) {
        panelFormulario.classList.add("oculto");
        subtituloPagina.textContent = "Consulta del reglamento escolar (solo lectura).";
        if (colAcciones) colAcciones.style.display = "none";
    } else {
        subtituloPagina.textContent = "Administra las normas que responde el asistente de WhatsApp.";
    }
}

function configurarFiltros() {
    filtroBusqueda.addEventListener("input", renderTabla);
    filtroCategoria.addEventListener("change", renderTabla);
    filtroEstado.addEventListener("change", renderTabla);
}

function limpiarFormulario() {
    reglamentoIdInput.value = "";
    formReglamento.reset();
    activoInput.checked = true;
    tituloFormulario.textContent = "Nuevo artículo";
}

function cargarFormularioEdicion(articulo) {
    reglamentoIdInput.value = articulo.id;
    tituloInput.value = articulo.titulo || "";
    categoriaInput.value = articulo.categoria || "";
    contenidoInput.value = articulo.contenido || "";
    activoInput.checked = Boolean(Number(articulo.activo));
    tituloFormulario.textContent = "Modificar artículo";
    panelFormulario.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function cargarReglamentos(aviso = "") {
    estadoReglamento.textContent = "Cargando reglamento...";
    try {
        const lista = await apiGet("/reglamentos");
        articulos = lista || [];
        poblarFiltroCategorias();
        renderTabla();
        totalReglamentos.textContent = String(articulos.length);
        estadoReglamento.textContent = aviso
            ? `${aviso} Total: ${articulos.length} artículos.`
            : `Total: ${articulos.length} artículos.`;
    } catch (error) {
        estadoReglamento.textContent = error.message || "Error al cargar el reglamento.";
        console.error(error);
    }
}

function poblarFiltroCategorias() {
    const categorias = [...new Set(articulos.map((a) => a.categoria).filter(Boolean))].sort();
    const actual = filtroCategoria.value;
    filtroCategoria.innerHTML = `<option value="">Todas</option>`;
    categorias.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        filtroCategoria.appendChild(opt);
    });
    if (categorias.includes(actual)) filtroCategoria.value = actual;
}

function aplicarFiltros() {
    const categoria = filtroCategoria.value;
    const estado = filtroEstado.value;
    const busqueda = filtroBusqueda.value.trim().toLowerCase();

    return articulos.filter((a) => {
        const okCategoria = !categoria || a.categoria === categoria;
        const okEstado = estado === "" || String(Number(a.activo)) === estado;
        const okBusqueda = !busqueda ||
            `${a.titulo} ${a.contenido}`.toLowerCase().includes(busqueda);
        return okCategoria && okEstado && okBusqueda;
    });
}

function truncar(texto, max = 90) {
    const limpio = String(texto || "").replace(/\s+/g, " ").trim();
    return limpio.length > max ? `${limpio.slice(0, max)}…` : limpio;
}

function renderTabla() {
    const data = aplicarFiltros();
    tablaReglamentoBody.innerHTML = "";

    if (!data.length) {
        tablaReglamentoBody.innerHTML = `<tr><td colspan="5">No hay artículos para los filtros seleccionados.</td></tr>`;
        return;
    }

    data.forEach((articulo) => {
        const tr = document.createElement("tr");
        const activo = Boolean(Number(articulo.activo));
        const accionesHtml = puedeEditar
            ? `<td class="celda-acciones">
                <button type="button" class="btn-tabla editar" data-id="${articulo.id}">Editar</button>
                <button type="button" class="btn-tabla eliminar" data-id="${articulo.id}">Eliminar</button>
               </td>`
            : "";

        tr.innerHTML = `
            <td><strong>${articulo.titulo}</strong></td>
            <td>${articulo.categoria || "-"}</td>
            <td title="${(articulo.contenido || "").replace(/"/g, "&quot;")}">${truncar(articulo.contenido)}</td>
            <td>${activo ? "✅ Activo" : "⏸️ Inactivo"}</td>
            ${accionesHtml}
        `;
        tablaReglamentoBody.appendChild(tr);
    });

    document.querySelectorAll(".btn-tabla.editar").forEach((btn) => {
        btn.addEventListener("click", () => {
            const articulo = articulos.find((a) => String(a.id) === String(btn.dataset.id));
            if (articulo) cargarFormularioEdicion(articulo);
        });
    });

    document.querySelectorAll(".btn-tabla.eliminar").forEach((btn) => {
        btn.addEventListener("click", () => eliminarArticulo(btn.dataset.id));
    });
}

function validarFormulario() {
    if (!tituloInput.value.trim()) {
        estadoReglamento.textContent = "El título es obligatorio.";
        return false;
    }
    if (!contenidoInput.value.trim()) {
        estadoReglamento.textContent = "El contenido es obligatorio.";
        return false;
    }
    return true;
}

async function guardarArticulo(event) {
    event.preventDefault();
    if (!puedeEditar || !validarFormulario()) return;

    const id = reglamentoIdInput.value;
    const body = {
        titulo: tituloInput.value.trim(),
        contenido: contenidoInput.value.trim(),
        categoria: categoriaInput.value.trim() || "General",
        activo: activoInput.checked ? 1 : 0
    };

    try {
        let aviso = "";
        if (id) {
            await apiPut(`/reglamentos/${id}`, body);
            await registrarMovimiento(
                "modificacion_reglamento",
                `Modifico articulo del reglamento: ${body.titulo}`,
                { pagina: "reglamento" }
            );
            aviso = "Artículo actualizado correctamente.";
        } else {
            await apiPost("/reglamentos", body);
            await registrarMovimiento(
                "registro_reglamento",
                `Registro articulo del reglamento: ${body.titulo}`,
                { pagina: "reglamento" }
            );
            aviso = "Artículo registrado correctamente.";
        }
        limpiarFormulario();
        await cargarReglamentos(aviso);
    } catch (error) {
        estadoReglamento.textContent = error.message || "Error al guardar el artículo.";
        console.error(error);
    }
}

async function eliminarArticulo(id) {
    if (!puedeEditar) return;
    if (!confirm("Eliminar este artículo del reglamento?")) return;

    try {
        const articulo = articulos.find((a) => String(a.id) === String(id));
        await apiDelete(`/reglamentos/${id}`);
        await registrarMovimiento(
            "eliminacion_reglamento",
            `Elimino articulo del reglamento: ${articulo?.titulo || id}`,
            { pagina: "reglamento" }
        );
        if (reglamentoIdInput.value === id) limpiarFormulario();
        await cargarReglamentos("Artículo eliminado.");
    } catch (error) {
        estadoReglamento.textContent = "No se pudo eliminar el artículo.";
        console.error(error);
    }
}

formReglamento.addEventListener("submit", guardarArticulo);
limpiarFormBtn?.addEventListener("click", limpiarFormulario);

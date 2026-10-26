import { initPaginaProtegida, configurarCerrarSesion, puedeModificar } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";
import { inicializarBusquedaGlobal } from "./busqueda-global.js";

const usuario = initPaginaProtegida("comunicados");
if (usuario) {
    document.addEventListener('DOMContentLoaded', () => {
    inicializarBusquedaGlobal();
});
    configurarCerrarSesion();
    inicializarPaginaComunicados(usuario);
}

function inicializarPaginaComunicados(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "comunicados");

    // Si puede modificar, agregar funcionalidad para crear comunicados
    if (puedeMod) {
        configurarBotonNuevoComunicado();
    }

    // Registrar visita
    registrarVisitaPagina();
}

function configurarBotonNuevoComunicado() {
    // Aquí se podría agregar un botón para crear nuevos comunicados
    // Por ahora es una página de visualización
}

async function registrarVisitaPagina() {
    try {
        const { registrarVisitaPagina } = await import("./auditoria.js");
        await registrarVisitaPagina("comunicados");
    } catch (error) {
        console.error("Error al registrar visita:", error);
    }
}
import { initPaginaProtegida, configurarCerrarSesion, puedeModificar } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";
import { inicializarBusquedaGlobal } from "./busqueda-global.js";

const usuario = initPaginaProtegida("padres");
if (usuario) {
    document.addEventListener('DOMContentLoaded', () => {
    inicializarBusquedaGlobal();
});
    configurarCerrarSesion();
    inicializarPaginaPadres(usuario);
}

function inicializarPaginaPadres(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "padres");

    // Si puede modificar, agregar funcionalidad para gestionar APAFA
    if (puedeMod) {
        configurarGestionPadres();
    }

    // Registrar visita
    registrarVisitaPagina();
}

function configurarGestionPadres() {
    // Aquí se podría agregar funcionalidad para gestionar comités y encuestas
    // Por ahora es una página de visualización
}

async function registrarVisitaPagina() {
    try {
        const { registrarVisitaPagina } = await import("./auditoria.js");
        await registrarVisitaPagina("padres");
    } catch (error) {
        console.error("Error al registrar visita:", error);
    }
}
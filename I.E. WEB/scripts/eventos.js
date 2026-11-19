import { initPaginaProtegida, configurarCerrarSesion, puedeModificar } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";
import { inicializarBusquedaGlobal } from "./busqueda-global.js";

const usuario = initPaginaProtegida("eventos");
if (usuario) {
    document.addEventListener('DOMContentLoaded', () => {
    inicializarBusquedaGlobal();
});
    configurarCerrarSesion();
    inicializarPaginaEventos(usuario);
}

function inicializarPaginaEventos(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "eventos");

    // Si puede modificar, agregar funcionalidad para gestionar eventos
    if (puedeMod) {
        configurarGestionEventos();
    }

    // Registrar visita
    registrarVisitaPagina();
}

function configurarGestionEventos() {
    // Aquí se podría agregar funcionalidad para crear/editar eventos
    // Por ahora es una página de visualización
}

async function registrarVisitaPagina() {
    try {
        const { registrarVisitaPagina } = await import("./auditoria.js");
        await registrarVisitaPagina("eventos");
    } catch (error) {
        console.error("Error al registrar visita:", error);
    }
}
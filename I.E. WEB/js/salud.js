import { initPaginaProtegida, configurarCerrarSesion, puedeModificar } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";

const usuario = initPaginaProtegida("salud");
if (usuario) {
    configurarCerrarSesion();
    inicializarPaginaSalud(usuario);
}

function inicializarPaginaSalud(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "salud");

    // Si puede modificar, agregar funcionalidad para gestionar salud
    if (puedeMod) {
        configurarGestionSalud();
    }

    // Registrar visita
    registrarVisitaPagina();
}

function configurarGestionSalud() {
    // Aquí se podría agregar funcionalidad para registrar atenciones y campañas
    // Por ahora es una página de visualización
}

async function registrarVisitaPagina() {
    try {
        const { registrarVisitaPagina } = await import("./auditoria.js");
        await registrarVisitaPagina("salud");
    } catch (error) {
        console.error("Error al registrar visita:", error);
    }
}
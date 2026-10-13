import { initPaginaProtegida, configurarCerrarSesion, puedeModificar } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";

const usuario = initPaginaProtegida("aulas");
if (usuario) {
    configurarCerrarSesion();
    inicializarPaginaAulas(usuario);
}

function inicializarPaginaAulas(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "aulas");

    // Si puede modificar, agregar funcionalidad para gestionar aulas
    if (puedeMod) {
        configurarGestionAulas();
    }

    // Registrar visita
    registrarVisitaPagina();
}

function configurarGestionAulas() {
    // Aquí se podría agregar funcionalidad para agregar/editar aulas
    // Por ahora es una página de visualización
}

async function registrarVisitaPagina() {
    try {
        const { registrarVisitaPagina } = await import("./auditoria.js");
        await registrarVisitaPagina("aulas");
    } catch (error) {
        console.error("Error al registrar visita:", error);
    }
}
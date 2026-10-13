import { initPaginaProtegida, configurarCerrarSesion, puedeModificar } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";

const usuario = initPaginaProtegida("tutoria");
if (usuario) {
    configurarCerrarSesion();
    inicializarPaginaTutoria(usuario);
}

function inicializarPaginaTutoria(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "tutoria");

    // Si puede modificar, agregar funcionalidad para gestionar tutoría
    if (puedeMod) {
        configurarGestionTutoria();
    }

    // Registrar visita
    registrarVisitaPagina();
}

function configurarGestionTutoria() {
    // Aquí se podría agregar funcionalidad para gestionar casos de tutoría
    // Por ahora es una página de visualización
}

async function registrarVisitaPagina() {
    try {
        const { registrarVisitaPagina } = await import("./auditoria.js");
        await registrarVisitaPagina("tutoria");
    } catch (error) {
        console.error("Error al registrar visita:", error);
    }
}
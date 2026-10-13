import { initPaginaProtegida, configurarCerrarSesion, puedeModificar } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";

const usuario = initPaginaProtegida("notas");
if (usuario) {
    configurarCerrarSesion();
    inicializarPaginaNotas(usuario);
}

function inicializarPaginaNotas(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "notas");

    // Si puede modificar, agregar funcionalidad para gestionar notas
    if (puedeMod) {
        configurarGestionNotas();
    }

    // Registrar visita
    registrarVisitaPagina();
}

function configurarGestionNotas() {
    // Aquí se podría agregar funcionalidad para registrar/editar notas
    // Por ahora es una página de visualización
}

async function registrarVisitaPagina() {
    try {
        const { registrarVisitaPagina } = await import("./auditoria.js");
        await registrarVisitaPagina("notas");
    } catch (error) {
        console.error("Error al registrar visita:", error);
    }
}
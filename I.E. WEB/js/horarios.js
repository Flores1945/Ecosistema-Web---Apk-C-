import { initPaginaProtegida, configurarCerrarSesion } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";

const usuario = initPaginaProtegida("horarios");
if (usuario) {
    configurarCerrarSesion();
    inicializarPaginaHorarios(usuario);
}

function inicializarPaginaHorarios(usuario) {
    // Los horarios son principalmente de visualización
    // Se puede agregar funcionalidad según el rol para modificar horarios

    // Registrar visita
    registrarVisitaPagina();
}

async function registrarVisitaPagina() {
    try {
        const { registrarVisitaPagina } = await import("./auditoria.js");
        await registrarVisitaPagina("horarios");
    } catch (error) {
        console.error("Error al registrar visita:", error);
    }
}
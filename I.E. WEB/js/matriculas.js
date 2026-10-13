import { initPaginaProtegida, configurarCerrarSesion, puedeModificar } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";

const usuario = initPaginaProtegida("matriculas");
if (usuario) {
    configurarCerrarSesion();
    inicializarPaginaMatriculas(usuario);
}

function inicializarPaginaMatriculas(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "matriculas");

    // Si puede modificar, agregar funcionalidad para gestionar matrículas
    if (puedeMod) {
        configurarGestionMatriculas();
    }

    // Registrar visita
    registrarVisitaPagina();
}

function configurarGestionMatriculas() {
    // Aquí se podría agregar funcionalidad para procesar matrículas
    // Por ahora es una página de visualización
}

async function registrarVisitaPagina() {
    try {
        const { registrarVisitaPagina } = await import("./auditoria.js");
        await registrarVisitaPagina("matriculas");
    } catch (error) {
        console.error("Error al registrar visita:", error);
    }
}
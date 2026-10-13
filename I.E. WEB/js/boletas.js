import { initPaginaProtegida, configurarCerrarSesion, puedeModificar } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";

const usuario = initPaginaProtegida("boletas");
if (usuario) {
    configurarCerrarSesion();
    inicializarPaginaBoletas(usuario);
}

function inicializarPaginaBoletas(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "boletas");

    // Si puede modificar, agregar funcionalidad para gestionar boletas
    if (puedeMod) {
        configurarGestionBoletas();
    }

    // Registrar visita
    registrarVisitaPagina();
}

function configurarGestionBoletas() {
    // Aquí se podría agregar funcionalidad para generar/editar boletas
    // Por ahora es una página de visualización
}

async function registrarVisitaPagina() {
    try {
        const { registrarVisitaPagina } = await import("./auditoria.js");
        await registrarVisitaPagina("boletas");
    } catch (error) {
        console.error("Error al registrar visita:", error);
    }
}
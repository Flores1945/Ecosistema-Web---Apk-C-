import { initPaginaProtegida, configurarCerrarSesion } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";
import { inicializarBusquedaGlobal } from "./busqueda-global.js";

const usuario = initPaginaProtegida("calendario");
if (usuario) {
    document.addEventListener('DOMContentLoaded', () => {
    inicializarBusquedaGlobal();
});
    configurarCerrarSesion();
    inicializarPaginaCalendario(usuario);
}

function inicializarPaginaCalendario(usuario) {
    // El calendario es principalmente de visualización
    // Pero podemos agregar interactividad según el rol

    // Registrar visita
    registrarVisitaPagina();
}

async function registrarVisitaPagina() {
    try {
        const { registrarVisitaPagina } = await import("./auditoria.js");
        await registrarVisitaPagina("calendario");
    } catch (error) {
        console.error("Error al registrar visita:", error);
    }
}
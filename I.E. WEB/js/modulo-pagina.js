import { initPaginaProtegida, configurarCerrarSesion } from "./auth-roles.js";

const pagina = document.body.dataset.pagina;
if (pagina) {
    const usuario = initPaginaProtegida(pagina);
    if (usuario) {
        configurarCerrarSesion();
    }
}

import { apiPost, guardarSesion } from "./api.js";
import { rutaInicioPorCargo } from "./auth-roles.js";
import { registrarInicioSesion } from "./auditoria.js";

const loginForm = document.getElementById("loginForm");
const estadoLogin = document.getElementById("estadoLogin");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const correo = document.getElementById("correo").value.trim().toLowerCase();
    const clave = document.getElementById("clave").value;

    if (!correo || !clave) {
        estadoLogin.textContent = "Completa todos los campos.";
        return;
    }

    try {
        estadoLogin.textContent = "Verificando...";

        const { token, usuario } = await apiPost("/auth/login", {
            email: correo,
            password: clave
        });

        guardarSesion(token, usuario);
        await registrarInicioSesion(usuario);

        estadoLogin.textContent = `Bienvenido(a), ${usuario.nombresCompletos}.`;
        window.location.href = rutaInicioPorCargo(usuario.cargo);
    } catch (error) {
        estadoLogin.textContent = error.message || "No se pudo validar el acceso. ¿Está encendido el backend?";
        console.error(error);
    }
});

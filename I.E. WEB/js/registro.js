import { apiPost } from "./api.js";
import { obtenerUsuario, esAccesoTotal, rutaInicioPorCargo } from "./auth-roles.js";
import { registrarMovimiento } from "./auditoria.js";
import { inicializarBusquedaGlobal } from "./busqueda-global.js";

const sesion = obtenerUsuario();
if (sesion && !esAccesoTotal(sesion.cargo)) {
    window.location.href = rutaInicioPorCargo(sesion.cargo);
}

document.addEventListener("DOMContentLoaded", () => {
    inicializarBusquedaGlobal();
});

const registroForm = document.getElementById("registroForm");
const estadoRegistro = document.getElementById("estadoRegistro");
const dniInput = document.getElementById("dni");
const celularInput = document.getElementById("celular");
const notificacionRegistro = document.getElementById("notificacionRegistro");
let temporizadorNotificacion;

function soloDigitos(valor) {
    return /^\d+$/.test(valor);
}

function sanitizarNumeros(input, maximo) {
    input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "").slice(0, maximo);
    });
}

function mostrarNotificacion(mensaje, tipo) {
    if (!notificacionRegistro) {
        return;
    }
    clearTimeout(temporizadorNotificacion);
    notificacionRegistro.textContent = mensaje;
    notificacionRegistro.className = `notificacion mostrar ${tipo}`;
    temporizadorNotificacion = setTimeout(() => {
        notificacionRegistro.className = "notificacion";
    }, 3200);
}

function normalizarDni(dni) {
    const solo = dni.replace(/\D/g, "");
    if (solo.length >= 8) {
        return solo.slice(0, 8);
    }
    return solo.padStart(8, "0");
}

sanitizarNumeros(dniInput, 8);
sanitizarNumeros(celularInput, 9);

document.getElementById("btnRegresar")?.addEventListener("click", () => {
    if (sesion && esAccesoTotal(sesion.cargo)) {
        window.location.href = "./panel.html";
        return;
    }
    if (window.history.length > 1) {
        window.history.back();
        return;
    }
    window.location.href = "./index.html";
});

registroForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nombresCompletos = document.getElementById("nombresCompletos").value.trim();
    const dniRaw = dniInput.value.trim();
    const dni = normalizarDni(dniRaw);
    const correo = document.getElementById("correo").value.trim().toLowerCase();
    const celular = celularInput.value.trim();
    const cargo = document.getElementById("cargo").value;
    const clave = document.getElementById("clave").value;

    if (!soloDigitos(dniRaw) || dniRaw.length < 1 || dniRaw.length > 8) {
        estadoRegistro.textContent = "El DNI debe tener solo numeros y exactamente 8 digitos.";
        mostrarNotificacion("Registro erroneo: DNI invalido.", "error");
        return;
    }

    if (!soloDigitos(celular) || celular.length !== 9) {
        estadoRegistro.textContent = "El numero de celular debe tener exactamente 9 digitos.";
        mostrarNotificacion("Registro erroneo: celular invalido.", "error");
        return;
    }

    if (clave.length < 6) {
        estadoRegistro.textContent = "La contrasena debe tener minimo 6 caracteres.";
        mostrarNotificacion("Registro erroneo: contrasena invalida.", "error");
        return;
    }

    try {
        estadoRegistro.textContent = "Registrando...";

        await apiPost("/auth/register", {
            email: correo,
            password: clave,
            nombresCompletos,
            cargo,
            telefono: celular,
            dni
        });

        if (sesion) {
            await registrarMovimiento(
                "registro_personal",
                `Registro de personal: ${nombresCompletos} (${cargo})`,
                { pagina: "registro", registrado: nombresCompletos, cargoRegistrado: cargo }
            );
        }

        estadoRegistro.textContent = "Registro exitoso. Ya puedes iniciar sesion.";
        mostrarNotificacion("Usuario registrado correctamente.", "ok");
        registroForm.reset();
    } catch (error) {
        const mensaje = error.message || "Registro erroneo.";
        estadoRegistro.textContent = mensaje;
        mostrarNotificacion(mensaje, "error");
        console.error(error);
    }
});

const API_BASE = window.location.port === "3000"
    ? "/api"
    : "http://localhost:3000/api";

export function obtenerToken() {
    return sessionStorage.getItem("token") || "";
}

export function guardarSesion(token, usuario) {
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("usuario_activo", JSON.stringify(usuario));
}

export function limpiarSesion() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario_activo");
}

export async function api(ruta, opciones = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(opciones.headers || {})
    };

    const token = obtenerToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const respuesta = await fetch(`${API_BASE}${ruta}`, {
        ...opciones,
        headers,
        body: opciones.body && typeof opciones.body !== "string"
            ? JSON.stringify(opciones.body)
            : opciones.body
    });

    const data = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
        const error = new Error(data.error || "Error en el servidor.");
        error.status = respuesta.status;
        error.data = data;
        throw error;
    }
    return data;
}

export const apiGet = (ruta) => api(ruta);
export const apiPost = (ruta, body) => api(ruta, { method: "POST", body });
export const apiPut = (ruta, body) => api(ruta, { method: "PUT", body });
export const apiDelete = (ruta) => api(ruta, { method: "DELETE" });

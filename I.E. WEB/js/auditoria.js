import { apiGet, apiPost } from "./api.js";
import { CARGOS, obtenerUsuario } from "./auth-roles.js";

export const NODO_MOVIMIENTOS = "movimientos";
export const NODO_ACTIVIDAD = "movimientos_actividad";

export const ESTILO_CARGO = {
    [CARGOS.DIRECTOR]: { clase: "cargo-director", etiqueta: "Director", color: "#f59e0b" },
    [CARGOS.SUBDIRECTOR]: { clase: "cargo-subdirector", etiqueta: "Subdirector", color: "#3b82f6" },
    [CARGOS.APAFA]: { clase: "cargo-apafa", etiqueta: "Apafa", color: "#22c55e" },
    [CARGOS.DOCENTE]: { clase: "cargo-docente", etiqueta: "Docente", color: "#a855f7" },
    [CARGOS.SUB_DOCENTE]: { clase: "cargo-sub-docente", etiqueta: "Sub Docente", color: "#06b6d4" },
    [CARGOS.ALUMNO]: { clase: "cargo-alumno", etiqueta: "Alumno", color: "#0ea5e9" },
    [CARGOS.PADRE]: { clase: "cargo-padre", etiqueta: "Padre", color: "#f97316" }
};

export function debeRegistrarAuditoria(cargo) {
    return cargo !== CARGOS.DIRECTOR;
}

const NOMBRES_PAGINA = {
    panel: "Panel principal",
    asistencias: "Registro de asistencias",
    reportes: "Reportes",
    alumnos: "Registro de alumnos",
    registro: "Registro de personal",
    login: "Inicio de sesion"
};

function nombrePagina(paginaId) {
    return NOMBRES_PAGINA[paginaId] || paginaId;
}

function parseJson(valor) {
    if (!valor) return {};
    if (typeof valor === "object") return valor;
    try {
        return JSON.parse(valor);
    } catch {
        return { detalle: String(valor) };
    }
}

async function guardarEvento(usuario, accion, detalle, extra = {}) {
    if (!usuario || !debeRegistrarAuditoria(usuario.cargo)) return;
    try {
        await apiPost("/auditoria", {
            usuario_id: Number(usuario.id || usuario.uid) || 0,
            accion,
            tabla_afectada: extra.pagina || extra.tabla || "sesion",
            registro_id: Number(extra.registro_id) || 0,
            valores_nuevos: {
                detalle,
                nombresCompletos: usuario.nombresCompletos,
                correo: usuario.correo || "",
                cargo: usuario.cargo,
                pagina: extra.pagina || ""
            }
        });
    } catch (error) {
        console.warn("Auditoria:", error);
    }
}

export async function registrarMovimiento(accion, detalle, extra = {}) {
    const usuario = obtenerUsuario();
    if (!usuario) return;
    await guardarEvento(usuario, accion, detalle, extra);
}

export function registrarVisitaPagina(paginaId) {
    const usuario = obtenerUsuario();
    if (!usuario) return Promise.resolve();
    return guardarEvento(usuario, "en_pagina", `En ${nombrePagina(paginaId)}`, { pagina: paginaId });
}

export async function registrarInicioSesion(usuario) {
    await guardarEvento(usuario, "inicio_sesion", "Inicio de sesion en el portal web", { pagina: "login" });
}

export async function registrarCierreSesion(usuario) {
    await guardarEvento(usuario, "cierre_sesion", "Cerro sesion en el portal web", { pagina: "login" });
}

export async function cargarMovimientos() {
    const filasApi = await apiGet("/auditoria");
    return (filasApi || []).map((row) => {
        const extra = parseJson(row.valores_nuevos);
        return {
            id: row.id,
            tipo: "evento",
            uid: String(row.usuario_id || ""),
            nombresCompletos: extra.nombresCompletos || "Sin nombre",
            correo: extra.correo || "",
            cargo: extra.cargo || "Desconocido",
            accion: row.accion,
            detalle: extra.detalle || "",
            pagina: extra.pagina || row.tabla_afectada || "",
            fechaHora: row.fecha_accion || ""
        };
    }).sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));
}

export function cargosVisiblesEnReportes(cargoVisor) {
    if (cargoVisor === CARGOS.DIRECTOR) {
        return [CARGOS.SUBDIRECTOR, CARGOS.APAFA, CARGOS.DOCENTE, CARGOS.SUB_DOCENTE];
    }
    if (cargoVisor === CARGOS.SUBDIRECTOR) {
        return [CARGOS.APAFA, CARGOS.DOCENTE, CARGOS.SUB_DOCENTE];
    }
    return [];
}

export function filtrarMovimientosPorVisor(movimientos, cargoVisor, uidVisor = "") {
    const sinDirector = movimientos.filter((m) => m.cargo !== CARGOS.DIRECTOR);
    const permitidos = cargosVisiblesEnReportes(cargoVisor);

    if (cargoVisor === CARGOS.DIRECTOR) {
        return sinDirector.filter((m) => permitidos.includes(m.cargo));
    }
    if (cargoVisor === CARGOS.SUBDIRECTOR) {
        return sinDirector.filter(
            (m) => permitidos.includes(m.cargo) && m.uid !== uidVisor
        );
    }
    return [];
}

export function puedeVerRegistroAuditoria(cargo) {
    return cargo === CARGOS.DIRECTOR || cargo === CARGOS.SUBDIRECTOR;
}

export function formatearFechaHora(iso) {
    if (!iso) return "-";
    try {
        return new Date(iso).toLocaleString("es-PE", {
            dateStyle: "short",
            timeStyle: "medium"
        });
    } catch {
        return iso;
    }
}

export function textoAccion(accion) {
    const mapa = {
        inicio_sesion: "Inicio de sesion",
        cierre_sesion: "Cierre de sesion",
        en_pagina: "En pagina",
        sesion_activa: "Sesion activa",
        visita_pagina: "En pagina",
        registro_alumno: "Registro de alumno",
        modificacion_alumno: "Modificacion de alumno",
        eliminacion_alumno: "Eliminacion de alumno",
        exportacion_alumnos: "Exportacion Excel (alumnos)",
        exportacion_asistencias: "Exportacion Excel (asistencias)",
        datos_demo: "Datos de prueba",
        limpiar_demo: "Limpieza de demo",
        registro_personal: "Alta de personal",
        CREAR: "Crear",
        ACTUALIZAR: "Actualizar",
        ELIMINAR: "Eliminar"
    };
    return mapa[accion] || String(accion).replace(/_/g, " ");
}

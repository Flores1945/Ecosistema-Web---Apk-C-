import { initPaginaProtegida, configurarCerrarSesion, puedeModificar, esApoderado } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";

const usuario = initPaginaProtegida("pagos");
if (usuario) {
    configurarCerrarSesion();
    inicializarPaginaPagos(usuario);
}

function inicializarPaginaPagos(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "pagos");
    const esPadreUser = esApoderado(usuario.cargo);

    // Event listeners para ver detalle de pago
    const volverPagosBtn = document.getElementById("volverPagosBtn");
    if (volverPagosBtn) {
        volverPagosBtn.addEventListener("click", volverAPagos);
    }

    // Event listeners para filtros
    const estudiantePagos = document.getElementById("estudiantePagos");
    const anioPagos = document.getElementById("anioPagos");

    if (estudiantePagos) estudiantePagos.addEventListener("change", () => cargarPagos(usuario));
    if (anioPagos) anioPagos.addEventListener("change", () => cargarPagos(usuario));

    // Event listeners para acciones
    const generarReporteBtn = document.getElementById("generarReporteBtn");
    if (generarReporteBtn) {
        generarReporteBtn.addEventListener("click", generarReportePDF);
    }

    // Cargar estudiantes si es padre
    if (esPadreUser) {
        cargarEstudiantes(usuario);
    }

    // Cargar pagos
    cargarPagos(usuario);
}

function mostrarPanelVerPago(pago) {
    document.getElementById("panelDetallePago").classList.remove("oculto");
    document.getElementById("panelDetallePago").classList.add("oculto");

    document.getElementById("mesPagoVer").textContent = pago.mes;
    document.getElementById("montoPagoVer").textContent = `S/ ${pago.monto.toFixed(2)}`;
    document.getElementById("estadoPagoVer").textContent = pago.estado;
    document.getElementById("conceptoPagoVer").textContent = pago.concepto;
    document.getElementById("fechaPagoVer").textContent = pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString() : "No pagado";
    document.getElementById("metodoPagoVer").textContent = pago.metodoPago || "-";
    document.getElementById("reciboPagoVer").textContent = pago.recibo || "-";

    // Mostrar descuento si aplica
    if (pago.descuento) {
        document.getElementById("descuentoInfo").classList.remove("oculto");
        document.getElementById("descuentoPagoVer").textContent = `S/ ${pago.descuento.toFixed(2)} (${pago.porcentajeDescuento}%)`;
    } else {
        document.getElementById("descuentoInfo").classList.add("oculto");
    }
}

function volverAPagos() {
    document.getElementById("panelDetallePago").classList.add("oculto");
}

async function cargarEstudiantes(usuario) {
    const selectEstudiante = document.getElementById("estudiantePagos");

    try {
        // Aquí iría la integración con Firebase para obtener estudiantes del padre
        // Simulación de datos
        const estudiantesSimulados = [
            { id: "1", nombre: "Carlos Pérez López" },
            { id: "2", nombre: "María Pérez López" }
        ];

        selectEstudiante.innerHTML = `<option value="">Todos mis estudiantes</option>` +
            estudiantesSimulados.map(est => `<option value="${est.id}">${est.nombre}</option>`).join("");

    } catch (error) {
        console.error("Error al cargar estudiantes:", error);
    }
}

async function cargarPagos(usuario) {
    const tablaPagosBody = document.getElementById("tablaPagosBody");
    const estudianteFiltro = document.getElementById("estudiantePagos")?.value || "";
    const anioFiltro = document.getElementById("anioPagos")?.value || "2026";

    try {
        // Aquí iría la integración con Firebase para obtener pagos
        // Simulación de datos
        const pagosSimulados = [
            {
                id: "1",
                mes: "Marzo 2026",
                concepto: "Mensualidad ordinaria",
                monto: 150.00,
                estado: "pagado",
                fechaPago: "2026-03-05",
                metodoPago: "Transferencia",
                recibo: "REC-2026-001",
                descuento: 7.50,
                porcentajeDescuento: "5%"
            },
            {
                id: "2",
                mes: "Abril 2026",
                concepto: "Mensualidad ordinaria",
                monto: 150.00,
                estado: "pagado",
                fechaPago: "2026-04-03",
                metodoPago: "Yape",
                recibo: "REC-2026-002",
                descuento: 7.50,
                porcentajeDescuento: "5%"
            },
            {
                id: "3",
                mes: "Mayo 2026",
                concepto: "Mensualidad ordinaria",
                monto: 150.00,
                estado: "pendiente",
                fechaPago: null,
                metodoPago: null,
                recibo: null,
                descuento: null
            },
            {
                id: "4",
                mes: "Junio 2026",
                concepto: "Mensualidad ordinaria",
                monto: 150.00,
                estado: "pendiente",
                fechaPago: null,
                metodoPago: null,
                recibo: null,
                descuento: null
            }
        ];

        // Filtrar pagos por año
        let pagosFiltrados = pagosSimulados.filter(pago => pago.mes.includes(anioFiltro));

        // Calcular estadísticas
        const mensualidadActual = pagosFiltrados.find(p => p.mes.includes("Septiembre") || p.mes.includes("Mayo"))?.monto || 150.00;
        const totalPendiente = pagosFiltrados.filter(p => p.estado === "pendiente").reduce((sum, p) => sum + p.monto, 0);
        const ultimoPago = pagosFiltrados.filter(p => p.estado === "pagado").sort((a, b) => new Date(b.fechaPago) - new Date(a.fechaPago))[0];

        document.getElementById("mensualidadActual").textContent = `S/ ${mensualidadActual.toFixed(2)}`;
        document.getElementById("totalPendiente").textContent = `S/ ${totalPendiente.toFixed(2)}`;
        document.getElementById("ultimoPago").textContent = ultimoPago ? `S/ ${ultimoPago.monto.toFixed(2)} (${ultimoPago.mes})` : "-";

        // Renderizar tabla
        tablaPagosBody.innerHTML = pagosFiltrados.map(pago => `
            <tr>
                <td>${pago.mes}</td>
                <td>${pago.concepto}</td>
                <td>S/ ${pago.monto.toFixed(2)}</td>
                <td>
                    <span class="chip ${pago.estado === 'pagado' ? 'chip-verde' : 'chip-rojo'}" style="background: ${pago.estado === 'pagado' ? 'rgba(22, 163, 74, 0.14)' : 'rgba(220, 38, 38, 0.12)'}; color: ${pago.estado === 'pagado' ? '#15803d' : '#b91c1c'};">
                        ${pago.estado.charAt(0).toUpperCase() + pago.estado.slice(1)}
                    </span>
                </td>
                <td>${pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString() : "-"}</td>
                <td>
                    ${pago.recibo ? `<button class="btn-funcional-inline" onclick="verPago('${pago.id}')">${pago.recibo}</button>` : "-"}
                </td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Error al cargar pagos:", error);
        tablaPagosBody.innerHTML = "<tr><td colspan='6'>Error al cargar estado de cuenta</td></tr>";
    }
}

async function generarReportePDF() {
    try {
        // Aquí iría la generación del PDF
        console.log("Generando reporte PDF...");

        // Registrar en auditoría
        await registrarAccionAuditoria("generar_reporte_pagos", "Reporte de estado de cuenta");

        mostrarEstado("Reporte generado exitosamente", "ok");
    } catch (error) {
        console.error("Error al generar reporte:", error);
        mostrarEstado("Error al generar reporte", "error");
    }
}

// Función global para ver pago
window.verPago = function(pagoId) {
    // Cargar datos del pago específico
    const pago = {
        id: pagoId,
        mes: "Marzo 2026",
        concepto: "Mensualidad ordinaria",
        monto: 150.00,
        estado: "pagado",
        fechaPago: "2026-03-05",
        metodoPago: "Transferencia",
        recibo: "REC-2026-001",
        descuento: 7.50,
        porcentajeDescuento: "5%"
    };

    mostrarPanelVerPago(pago);
};

function mostrarEstado(mensaje, tipo) {
    const estado = document.getElementById("estadoPagos") || document.createElement("p");
    estado.className = tipo === "ok" ? "estado-ok" : "estado-alerta";
    estado.textContent = mensaje;
}

function obtenerUsuario() {
    try {
        return JSON.parse(sessionStorage.getItem("usuario_activo") || "null");
    } catch {
        return null;
    }
}
import { apiGet, apiPost, apiPut, apiDelete } from "./api.js";
import {
    initPaginaProtegida,
    configurarCerrarSesion,
    puedeGestionarAlumnos,
    esSoloLecturaAlumnos
} from "./auth-roles.js";
import { registrarMovimiento } from "./auditoria.js";
import {
    NIVEL_PRIMARIA,
    NIVEL_SECUNDARIA,
    SECCIONES,
    gradosPorNivel,
    llenarOpcionesNivel,
    llenarOpcionesGrado,
    llenarOpcionesSeccion,
    enlazarNivelYGrado,
    MAX_ALUMNOS_POR_AULA
} from "./catalogo-escolar.js";
import { inicializarBusquedaGlobal } from "./busqueda-global.js";

const usuario = initPaginaProtegida("alumnos");
if (!usuario) {
    throw new Error("Sin sesion");
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarBusquedaGlobal();
});

const soloLectura = esSoloLecturaAlumnos(usuario.cargo);
const puedeEditar = puedeGestionarAlumnos(usuario.cargo);

const formAlumno = document.getElementById("formAlumno");
const panelFormulario = document.getElementById("panelFormulario");
const tituloFormulario = document.getElementById("tituloFormulario");
const subtituloPagina = document.getElementById("subtituloPagina");
const alumnoIdInput = document.getElementById("alumnoId");
const nombresInput = document.getElementById("nombres");
const apellidosInput = document.getElementById("apellidos");
const sexoInput = document.getElementById("sexo");
const dniInput = document.getElementById("dni");
const selectNivel = document.getElementById("nivel");
const selectGrado = document.getElementById("grado");
const selectSeccion = document.getElementById("seccion");
const selectTurno = document.getElementById("turno");
const apoderadoNombresInput = document.getElementById("apoderadoNombres");
const apoderadoApellidosInput = document.getElementById("apoderadoApellidos");
const apoderadoTelefonoInput = document.getElementById("apoderadoTelefono");
const apoderadoParentescoInput = document.getElementById("apoderadoParentesco");
const filtroNivel = document.getElementById("filtroNivel");
const filtroGrado = document.getElementById("filtroGrado");
const filtroSeccion = document.getElementById("filtroSeccion");
const filtroBusqueda = document.getElementById("filtroBusqueda");
const tablaAlumnosBody = document.getElementById("tablaAlumnosBody");
const estadoAlumnos = document.getElementById("estadoAlumnos");
const accionesLista = document.getElementById("accionesLista");
const colAcciones = document.getElementById("colAcciones");
const exportarListaBtn = document.getElementById("exportarListaBtn");
const limpiarFormBtn = document.getElementById("limpiarFormBtn");
const cargarDemoAlumnosBtn = document.getElementById("cargarDemoAlumnosBtn");
const limpiarDemoAlumnosBtn = document.getElementById("limpiarDemoAlumnosBtn");
const totalAlumnos = document.getElementById("totalAlumnos");

let alumnos = [];

configurarCerrarSesion();
inicializarFormularioEscolar();
configurarModoPorRol();
configurarFiltros();

function inicializarFormularioEscolar() {
    llenarOpcionesNivel(selectNivel);
    llenarOpcionesSeccion(selectSeccion);
    enlazarNivelYGrado(selectNivel, selectGrado, selectSeccion, selectTurno);

    llenarSelect(filtroSeccion, [...SECCIONES], "Todas");
}

function configurarModoPorRol() {
    const layoutAlumnos = document.querySelector(".layout-alumnos");
    if (soloLectura) {
        panelFormulario.classList.add("oculto");
        if (layoutAlumnos) layoutAlumnos.classList.add("sin-formulario");
        subtituloPagina.textContent =
            "Consulta de alumnos por nivel, grado, seccion y turno (solo lectura).";
        if (accionesLista) accionesLista.style.display = "none";
    } else {
        subtituloPagina.textContent = "Registro, modificacion y listado de alumnos.";
    }
}

function configurarFiltros() {
    // Búsqueda en tiempo real
    filtroBusqueda.addEventListener("input", () => {
        renderTabla();
    });

    // Actualizar total de alumnos
    function actualizarTotal() {
        totalAlumnos.textContent = alumnos.length;
    }

    // Actualizar cuando carguen alumnos
    const observer = new MutationObserver(() => {
        actualizarTotal();
    });

    if (estadoAlumnos) {
        observer.observe(estadoAlumnos, { childList: true, characterData: true });
    }

    actualizarTotal();
}

function limpiarFormulario() {
    alumnoIdInput.value = "";
    formAlumno.reset();
    selectGrado.disabled = true;
    selectGrado.innerHTML = `<option value="">Selecciona nivel primero</option>`;
    tituloFormulario.textContent = "Nuevo alumno";
}

function cargarFormularioEdicion(alumno) {
    alumnoIdInput.value = alumno.id;
    nombresInput.value = alumno.nombres || "";
    apellidosInput.value = alumno.apellidos || "";
    sexoInput.value = alumno.sexo || "";
    dniInput.value = alumno.dni || "";
    selectNivel.value = alumno.nivel || "";
    // Asignar el nivel por codigo no dispara "change": hay que rellenar
    // las opciones de grado y seccion manualmente y habilitar los selects.
    llenarOpcionesGrado(selectGrado, selectNivel.value, "Selecciona", String(alumno.grado));
    llenarOpcionesSeccion(selectSeccion, "Selecciona", alumno.seccion);
    selectGrado.disabled = false;
    selectSeccion.disabled = false;
    selectTurno.value = alumno.turno;
    apoderadoNombresInput.value = alumno.apoderadoNombres || "";
    apoderadoApellidosInput.value = alumno.apoderadoApellidos || "";
    apoderadoTelefonoInput.value = (alumno.telefonoApoderado || "").split(",")[0].trim();
    apoderadoParentescoInput.value = alumno.apoderadoParentesco || "Padre";
    tituloFormulario.textContent = "Modificar alumno";
    panelFormulario.scrollIntoView({ behavior: "smooth", block: "start" });
}

function mapearAlumno(data) {
    return {
        id: data.id,
        nombres: data.nombres || "",
        apellidos: data.apellidos || "",
        sexo: data.sexo || "",
        nombresCompletos: `${data.nombres || ""} ${data.apellidos || ""}`.trim(),
        dni: data.dni || "",
        nivel: data.nivel || "",
        grado: data.grado ?? "",
        seccion: data.seccion || "",
        turno: data.turno === "Noche" ? "Tarde" : data.turno || "",
        demo: Boolean(data.es_demo)
    };
}

async function cargarAlumnos(aviso = "") {
    estadoAlumnos.textContent = "Cargando alumnos...";
    const [lista, vinculosPadres] = await Promise.all([
        apiGet("/estudiantes"),
        apiGet("/estudiantes/apoderados").catch(() => [])
    ]);

    const apoderadosPorEstudiante = new Map();
    (vinculosPadres || []).forEach((v) => {
        if (!apoderadosPorEstudiante.has(v.estudiante_id)) {
            apoderadosPorEstudiante.set(v.estudiante_id, []);
        }
        apoderadosPorEstudiante.get(v.estudiante_id).push(v);
    });

    alumnos = (lista || []).map((data) => {
        const alumno = mapearAlumno(data);
        const padresAlumno = apoderadosPorEstudiante.get(data.id) || [];
        alumno.telefonoApoderado = padresAlumno.map((p) => p.telefono).filter(Boolean).join(", ");
        alumno.apoderadoNombres = padresAlumno[0]?.nombres || "";
        alumno.apoderadoApellidos = padresAlumno[0]?.apellidos || "";
        alumno.apoderadoParentesco = padresAlumno[0]?.parentesco || "";
        return alumno;
    });

    poblarFiltros();
    renderTabla();
    const total = `Total en base de datos: ${alumnos.length} alumnos.`;
    estadoAlumnos.textContent = aviso ? `${aviso} ${total}` : total;
}

function poblarFiltros() {
    const grados = [...new Set(alumnos.map((a) => a.grado).filter(Boolean))].sort(ordenarGrado);
    const secciones = [...new Set(alumnos.map((a) => a.seccion).filter(Boolean))].sort();

    llenarSelect(filtroGrado, grados, "Todos");
    if (secciones.length) {
        llenarSelect(filtroSeccion, secciones, "Todas");
    }
}

function ordenarGrado(a, b) {
    const na = parseInt(String(a).replace(/\D/g, ""), 10) || 99;
    const nb = parseInt(String(b).replace(/\D/g, ""), 10) || 99;
    return na - nb;
}

function llenarSelect(select, valores, textoDefault) {
    const actual = select.value;
    select.innerHTML = `<option value="">${textoDefault}</option>`;
    valores.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
    });
    if ([...select.options].some((o) => o.value === actual)) {
        select.value = actual;
    }
}

function aplicarFiltros() {
    const nivel = filtroNivel.value;
    const grado = filtroGrado.value;
    const seccion = filtroSeccion.value;
    const busqueda = filtroBusqueda.value.trim().toLowerCase();

    return alumnos.filter((a) => {
        const okNivel = !nivel || a.nivel === nivel;
        const okGrado = !grado || String(a.grado) === String(grado);
        const okSeccion = !seccion || a.seccion === seccion;
        
        let okBusqueda = true;
        if (busqueda.length >= 2) {
            const nombreCompleto = `${a.nombres} ${a.apellidos}`.toLowerCase();
            okBusqueda = nombreCompleto.includes(busqueda);
        }
        
        return okNivel && okGrado && okSeccion && okBusqueda;
    });
}

function renderTabla() {
    const data = aplicarFiltros();
    tablaAlumnosBody.innerHTML = "";

    if (!data.length) {
        const cols = soloLectura ? 7 : 8;
        tablaAlumnosBody.innerHTML = `<tr><td colspan="${cols}">No hay alumnos para los filtros seleccionados.</td></tr>`;
        return;
    }

    data.forEach((alumno) => {
        const tr = document.createElement("tr");
        const accionesHtml = puedeEditar
            ? `<td class="celda-acciones">
                <button type="button" class="btn-tabla qr" data-id="${alumno.id}">📱 QR</button>
                <button type="button" class="btn-tabla editar" data-id="${alumno.id}">Editar</button>
                <button type="button" class="btn-tabla eliminar" data-id="${alumno.id}">Eliminar</button>
               </td>`
            : "";

        tr.innerHTML = `
            <td>${alumno.nombres}</td>
            <td>${alumno.apellidos}</td>
            <td>${alumno.nivel || "-"}</td>
            <td>${alumno.grado}°</td>
            <td>${alumno.seccion}</td>
            <td>${alumno.turno}</td>
            <td>${alumno.telefonoApoderado || "-"}</td>
            ${accionesHtml}
        `;
        tablaAlumnosBody.appendChild(tr);
    });

    if (!puedeEditar && colAcciones) {
        colAcciones.style.display = "none";
    }

    document.querySelectorAll(".btn-tabla.editar").forEach((btn) => {
        btn.addEventListener("click", () => {
            const alumno = alumnos.find((a) => String(a.id) === String(btn.dataset.id));
            if (alumno) cargarFormularioEdicion(alumno);
        });
    });

    document.querySelectorAll(".btn-tabla.eliminar").forEach((btn) => {
        btn.addEventListener("click", () => eliminarAlumno(btn.dataset.id));
    });

    document.querySelectorAll(".btn-tabla.qr").forEach((btn) => {
        btn.addEventListener("click", () => {
            const alumno = alumnos.find((a) => String(a.id) === String(btn.dataset.id));
            if (alumno) mostrarQRAlumno(alumno);
        });
    });
}

// Funciones para QR
const modalQR = document.getElementById("modalQR");
const cerrarModalQR = document.getElementById("cerrarModalQR");
const codigoQR = document.getElementById("codigoQR");
const infoAlumnoQR = document.getElementById("infoAlumnoQR");
const descargarQRBtn = document.getElementById("descargarQRBtn");
let alumnoActualQR = null;

function mostrarQRAlumno(alumno) {
    alumnoActualQR = alumno;
    
    // Mostrar información del alumno
    infoAlumnoQR.innerHTML = `
        <strong>${alumno.nombres} ${alumno.apellidos}</strong><br>
        ${alumno.nivel} - ${alumno.grado}° "${alumno.seccion}" - ${alumno.turno}
    `;
    
    // Generar datos del QR (formato JSON para la APK)
    const datosQR = JSON.stringify({
        id: alumno.id,
        dni: alumno.dni || "",
        nombres: alumno.nombres,
        apellidos: alumno.apellidos,
        nivel: alumno.nivel,
        grado: alumno.grado,
        seccion: alumno.seccion,
        turno: alumno.turno
    });
    
    // Limpiar QR anterior y abrir la ventana primero (así siempre se ve algo)
    codigoQR.innerHTML = "";
    modalQR.style.display = "flex";

    if (typeof QRCode === "undefined" || !QRCode.toCanvas) {
        codigoQR.innerHTML = "<p>No se pudo cargar la librería de QR.</p>";
        return;
    }

    // Generar QR
    QRCode.toCanvas(datosQR, { 
        width: 250,
        margin: 2,
        color: {
            dark: "#0284c7",
            light: "#ffffff"
        }
    }, function(error, canvas) {
        if (error) {
            console.error(error);
            codigoQR.innerHTML = "<p>Error al generar QR</p>";
            return;
        }
        codigoQR.appendChild(canvas);
    });

}

cerrarModalQR.addEventListener("click", () => {
    modalQR.style.display = "none";
});

modalQR.addEventListener("click", (e) => {
    if (e.target === modalQR) {
        modalQR.style.display = "none";
    }
});

descargarQRBtn.addEventListener("click", () => {
    if (!alumnoActualQR) return;
    
    const canvas = codigoQR.querySelector("canvas");
    if (!canvas) return;
    
    // Crear imagen para descargar
    const link = document.createElement("a");
    link.download = `QR_${alumnoActualQR.nombres}_${alumnoActualQR.apellidos}_${alumnoActualQR.nivel}_${alumnoActualQR.grado}${alumnoActualQR.seccion}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
});

function validarFormularioAlumno() {
    const nivel = selectNivel.value;
    const grado = selectGrado.value;
    const gradosValidos = gradosPorNivel(nivel);
    const dni = dniInput.value.trim();

    if (!nivel || !gradosValidos.includes(grado)) {
        estadoAlumnos.textContent = "Selecciona nivel y un grado valido para ese nivel.";
        return false;
    }

    if (!nombresInput.value.trim()) {
        estadoAlumnos.textContent = "El nombre es obligatorio.";
        return false;
    }

    if (!apellidosInput.value.trim()) {
        estadoAlumnos.textContent = "Los apellidos son obligatorios.";
        return false;
    }

    if (!dni) {
        estadoAlumnos.textContent = "El DNI es obligatorio.";
        return false;
    }

    if (!/^\d{7}$/.test(dni)) {
        estadoAlumnos.textContent = "El DNI debe tener exactamente 7 dígitos numéricos.";
        return false;
    }

    if (!apoderadoNombresInput.value.trim() || !apoderadoApellidosInput.value.trim()) {
        estadoAlumnos.textContent = "Los nombres y apellidos del apoderado son obligatorios.";
        return false;
    }

    const telefonoApoderado = apoderadoTelefonoInput.value.replace(/\D/g, "");
    if (telefonoApoderado.length < 7 || telefonoApoderado.length > 15) {
        estadoAlumnos.textContent = "Ingresa un teléfono de apoderado válido (7 a 15 dígitos).";
        return false;
    }

    return true;
}

async function verificarCapacidadAula(nivel, grado, seccion, turno, alumnoIdExcluir = null) {
    const alumnosEnAula = alumnos.filter(a => {
        if (a.nivel !== nivel || a.grado !== grado || a.seccion !== seccion || a.turno !== turno) {
            return false;
        }
        if (alumnoIdExcluir && a.id === alumnoIdExcluir) {
            return false; // Excluir el alumno que se está editando
        }
        return true;
    });

    if (alumnosEnAula.length >= MAX_ALUMNOS_POR_AULA) {
        return {
            valido: false,
            mensaje: `Esta aula (${nivel} ${grado}° - Sección ${seccion} - ${turno}) ya tiene ${MAX_ALUMNOS_POR_AULA} alumnos. Capacidad máxima alcanzada.`
        };
    }

    return {
        valido: true,
        mensaje: `Capacidad disponible: ${MAX_ALUMNOS_POR_AULA - alumnosEnAula.length} lugares en esta aula.`
    };
}

async function guardarAlumno(event) {
    event.preventDefault();
    if (!puedeEditar || !validarFormularioAlumno()) return;

    const payload = {
        nombres: nombresInput.value.trim(),
        apellidos: apellidosInput.value.trim(),
        sexo: sexoInput.value,
        dni: dniInput.value.trim(),
        nivel: selectNivel.value,
        grado: selectGrado.value,
        seccion: selectSeccion.value,
        turno: selectTurno.value,
        fechaActualizacion: new Date().toISOString()
    };

    // Verificar capacidad del aula
    const verificacion = await verificarCapacidadAula(
        payload.nivel,
        payload.grado,
        payload.seccion,
        payload.turno,
        alumnoIdInput.value || null
    );

    if (!verificacion.valido) {
        estadoAlumnos.textContent = verificacion.mensaje;
        return;
    }

    try {
        const id = alumnoIdInput.value;
        let aviso = "";
        const body = {
            nombres: payload.nombres,
            apellidos: payload.apellidos,
            sexo: payload.sexo,
            dni: payload.dni,
            nivel: payload.nivel,
            grado: Number(payload.grado),
            seccion: payload.seccion,
            turno: payload.turno,
            estado: "Activo"
        };
        body.apoderado = {
            nombres: apoderadoNombresInput.value.trim(),
            apellidos: apoderadoApellidosInput.value.trim(),
            telefono: apoderadoTelefonoInput.value.replace(/\D/g, ""),
            parentesco: apoderadoParentescoInput.value || "Padre"
        };
        if (id) {
            await apiPut(`/estudiantes/${id}`, body);
            await registrarMovimiento(
                "modificacion_alumno",
                `Modifico alumno: ${payload.nombres} ${payload.apellidos} (${payload.nivel} ${payload.grado}° ${payload.seccion}, ${payload.turno})`,
                { pagina: "alumnos" }
            );
            aviso = "Alumno actualizado correctamente.";
        } else {
            body.fecha_matricula = new Date().toISOString().slice(0, 10);
            await apiPost("/estudiantes", body);
            await registrarMovimiento(
                "registro_alumno",
                `Registro alumno: ${payload.nombres} ${payload.apellidos} (${payload.nivel} ${payload.grado}° ${payload.seccion}, ${payload.turno})`,
                { pagina: "alumnos" }
            );
            aviso = "Alumno registrado correctamente.";
        }
        limpiarFormulario();
        await cargarAlumnos(aviso);
    } catch (error) {
        estadoAlumnos.textContent = error.message || "Error al guardar el alumno en MySQL.";
        console.error(error);
    }
}

async function eliminarAlumno(id) {
    if (!puedeEditar) return;
    if (!confirm("Eliminar este alumno?")) return;

    try {
        const alumno = alumnos.find((a) => String(a.id) === String(id));
        await apiDelete(`/estudiantes/${id}`);
        await registrarMovimiento(
            "eliminacion_alumno",
            `Elimino alumno: ${alumno?.nombres} ${alumno?.apellidos || id}`,
            { pagina: "alumnos" }
        );
        if (alumnoIdInput.value === id) limpiarFormulario();
        await cargarAlumnos("Alumno eliminado.");
    } catch (error) {
        estadoAlumnos.textContent = "No se pudo eliminar el alumno.";
        console.error(error);
    }
}

async function cargarDemoAlumnos() {
    if (!puedeEditar) return;

    const confirmar = window.confirm(
        "Se crearán 20 alumnos demo por cada aula (Primaria y Secundaria, secciones A, B y C) con sus apoderados. ¿Continuar?"
    );
    if (!confirmar) return;

    try {
        estadoAlumnos.textContent = "Generando alumnos demo... puede tardar un momento.";
        const data = await apiPost("/demo/alumnos", {});
        await registrarMovimiento("datos_demo", data?.mensaje || "Creo alumnos demo", { pagina: "alumnos" });
        estadoAlumnos.textContent = data?.mensaje || "Demo creada.";
        await cargarAlumnos();
    } catch (error) {
        estadoAlumnos.textContent = error?.message || "No se pudo cargar la demo.";
        console.error(error);
    }
}

async function limpiarDemoAlumnos() {
    if (!puedeEditar) return;

    const confirmar = window.confirm("¿Eliminar todos los alumnos demo y sus apoderados?");
    if (!confirmar) return;

    try {
        estadoAlumnos.textContent = "Limpiando alumnos demo...";
        const data = await apiDelete("/demo/alumnos");
        await registrarMovimiento("limpiar_demo", data?.mensaje || "Limpio alumnos demo", { pagina: "alumnos" });
        estadoAlumnos.textContent = data?.mensaje || "Demo eliminada.";
        await cargarAlumnos();
    } catch (error) {
        estadoAlumnos.textContent = error?.message || "No se pudo limpiar la demo.";
        console.error(error);
    }
}

// ---------- Exportación profesional a Excel (ExcelJS) ----------

const EXCEL_COLORES = {
    primario: "FF1E3A8A",
    primarioClaro: "FFEFF6FF",
    encabezado: "FF1E3A8A",
    encabezadoTexto: "FFFFFFFF",
    tituloAula: "FF0F172A",
    borde: "FFCBD5E1",
    zebra: "FFF8FAFC",
    hombres: "FF2563EB",
    mujeres: "FFEC4899",
    texto: "FF0F172A"
};

function sexoTexto(sexo) {
    if (sexo === "M") return "Masculino";
    if (sexo === "F") return "Femenino";
    return "-";
}

function apoderadoCompleto(a) {
    return `${a.apoderadoNombres || ""} ${a.apoderadoApellidos || ""}`.trim() || "-";
}

// Dibuja un gráfico de barras Hombres/Mujeres en canvas y devuelve base64 PNG
function graficoGeneroBase64(hombres, mujeres) {
    const W = 520, H = 240;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);

    const total = hombres + mujeres || 1;
    const max = Math.max(hombres, mujeres, 1);
    const baseX = 70, baseY = 190, barW = 90, gap = 70;
    const chartH = 140;

    // Título
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Distribución por sexo", W / 2, 28);

    // Eje Y
    ctx.strokeStyle = "#94A3B8";
    ctx.beginPath();
    ctx.moveTo(baseX, 40);
    ctx.lineTo(baseX, baseY);
    ctx.lineTo(W - 30, baseY);
    ctx.stroke();

    const barras = [
        { label: "Hombres", valor: hombres, color: EXCEL_COLORES.hombres.slice(2), x: baseX + gap },
        { label: "Mujeres", valor: mujeres, color: EXCEL_COLORES.mujeres.slice(2), x: baseX + gap + barW + gap }
    ];

    for (const b of barras) {
        const h = (b.valor / max) * chartH;
        const y = baseY - h;

        // Barra
        ctx.fillStyle = `#${b.color}`;
        ctx.fillRect(b.x, y, barW, h);

        // Valor encima
        ctx.fillStyle = "#0F172A";
        ctx.font = "bold 14px Arial";
        ctx.fillText(String(b.valor), b.x + barW / 2, y - 8);

        // Porcentaje
        ctx.font = "11px Arial";
        ctx.fillStyle = "#64748B";
        const pct = Math.round((b.valor / total) * 100);
        ctx.fillText(`${pct}%`, b.x + barW / 2, baseY + 18);

        // Etiqueta
        ctx.fillStyle = "#0F172A";
        ctx.font = "bold 12px Arial";
        ctx.fillText(b.label, b.x + barW / 2, baseY + 36);
    }

    return canvas.toDataURL("image/png").split(",")[1];
}

function aplicarEstiloEncabezado(ws, fila, numCols, color = EXCEL_COLORES.encabezado) {
    const row = ws.getRow(fila);
    row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
        cell.font = { bold: true, color: { argb: EXCEL_COLORES.encabezadoTexto }, size: 11 };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
            top: { style: "thin", color: { argb: EXCEL_COLORES.borde } },
            bottom: { style: "thin", color: { argb: EXCEL_COLORES.borde } },
            left: { style: "thin", color: { argb: EXCEL_COLORES.borde } },
            right: { style: "thin", color: { argb: EXCEL_COLORES.borde } }
        };
    });
    row.height = 22;
}

function aplicarBordeFila(ws, fila, numCols, zebra = false) {
    const row = ws.getRow(fila);
    for (let c = 1; c <= numCols; c++) {
        const cell = row.getCell(c);
        cell.border = {
            top: { style: "thin", color: { argb: EXCEL_COLORES.borde } },
            bottom: { style: "thin", color: { argb: EXCEL_COLORES.borde } },
            left: { style: "thin", color: { argb: EXCEL_COLORES.borde } },
            right: { style: "thin", color: { argb: EXCEL_COLORES.borde } }
        };
        if (zebra) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORES.zebra } };
        }
        cell.font = { size: 11, color: { argb: EXCEL_COLORES.texto } };
        cell.alignment = { vertical: "middle" };
    }
}

async function exportarListaExcel() {
    const data = aplicarFiltros();
    if (!data.length) {
        estadoAlumnos.textContent = "No hay datos para exportar.";
        return;
    }

    estadoAlumnos.textContent = "Generando Excel profesional...";

    const wb = new ExcelJS.Workbook();
    wb.creator = "I.E. Liceo Trujillo";
    wb.created = new Date();

    // ============ Conteos para el gráfico ============
    const hombres = data.filter((a) => a.sexo === "M").length;
    const mujeres = data.filter((a) => a.sexo === "F").length;
    const sinDato = data.length - hombres - mujeres;

    // ============ Hoja única: tabla completa ordenada por aula ============
    const ws = wb.addWorksheet("Alumnos");
    const TOTAL_COLS = 10;
    ws.columns = [
        { width: 6 },   // N°
        { width: 11 },  // Nivel
        { width: 7 },   // Grado
        { width: 9 },   // Sección
        { width: 20 },  // Nombres
        { width: 24 },  // Apellidos
        { width: 11 },  // Sexo
        { width: 28 },  // Apoderado
        { width: 15 },  // Celular
        { width: 10 }   // Turno
    ];

    // Título
    ws.mergeCells(1, 1, 1, TOTAL_COLS);
    const titulo = ws.getCell(1, 1);
    titulo.value = "LISTADO DE ESTUDIANTES — I.E. LICEO TRUJILLO";
    titulo.font = { bold: true, size: 15, color: { argb: EXCEL_COLORES.encabezadoTexto } };
    titulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORES.encabezado } };
    titulo.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 30;

    // Subtítulo
    ws.mergeCells(2, 1, 2, TOTAL_COLS);
    const subt = ws.getCell(2, 1);
    subt.value = `Generado el ${new Date().toLocaleDateString("es-PE")} — Total: ${data.length} estudiantes`;
    subt.font = { size: 10, italic: true, color: { argb: "FF64748B" } };
    subt.alignment = { horizontal: "center" };

    // Encabezados de la tabla
    let fila = 3;
    const encabezados = ["N°", "Nivel", "Grado", "Sección", "Nombres", "Apellidos", "Sexo", "Apoderado", "Celular", "Turno"];
    encabezados.forEach((h, i) => {
        ws.getCell(fila, i + 1).value = h;
    });
    aplicarEstiloEncabezado(ws, fila, TOTAL_COLS);
    ws.getRow(fila).height = 22;
    fila++;

    // Ordenar por aula: nivel → grado → sección → apellidos
    const nivelOrd = { Primaria: 0, Secundaria: 1 };
    const ordenados = [...data].sort((a, b) => {
        const na = nivelOrd[a.nivel] ?? 9;
        const nb = nivelOrd[b.nivel] ?? 9;
        if (na !== nb) return na - nb;
        const ga = Number(a.grado) || 0;
        const gb = Number(b.grado) || 0;
        if (ga !== gb) return ga - gb;
        const sa = String(a.seccion || "");
        const sb = String(b.seccion || "");
        if (sa !== sb) return sa.localeCompare(sb);
        return String(a.apellidos || "").localeCompare(String(b.apellidos || ""));
    });

    let aulaActual = null;
    ordenados.forEach((a, idx) => {
        const aulaKey = `${a.nivel}|${a.grado}|${a.seccion}`;
        if (aulaKey !== aulaActual) {
            aulaActual = aulaKey;
            // Fila separadora sutil entre aulas
            ws.mergeCells(fila, 1, fila, TOTAL_COLS);
            const sep = ws.getCell(fila, 1);
            sep.value = `AULA: ${a.nivel} — ${a.grado}° Grado — Sección ${a.seccion || "-"}`;
            sep.font = { bold: true, size: 9, color: { argb: EXCEL_COLORES.encabezado } };
            sep.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
            sep.alignment = { horizontal: "left", indent: 1 };
            ws.getRow(fila).height = 16;
            for (let c = 1; c <= TOTAL_COLS; c++) {
                ws.getCell(fila, c).border = {
                    top: { style: "thin", color: { argb: EXCEL_COLORES.borde } },
                    bottom: { style: "thin", color: { argb: EXCEL_COLORES.borde } }
                };
            }
            fila++;
        }
        const valores = [
            idx + 1,
            a.nivel || "-",
            a.grado ?? "-",
            a.seccion || "-",
            a.nombres || "-",
            a.apellidos || "-",
            sexoTexto(a.sexo),
            apoderadoCompleto(a),
            a.telefonoApoderado || "-",
            a.turno || "-"
        ];
        valores.forEach((v, i) => {
            const cell = ws.getCell(fila, i + 1);
            cell.value = v;
            if (i === 0 || i === 2 || i === 3) cell.alignment = { horizontal: "center" };
        });
        aplicarBordeFila(ws, fila, TOTAL_COLS, idx % 2 === 1);
        fila++;
    });

    // ============ Al final: resumen por sexo + gráfico ============
    fila += 2;

    ws.mergeCells(fila, 1, fila, 4);
    const tituloResumen = ws.getCell(fila, 1);
    tituloResumen.value = "RESUMEN POR SEXO";
    tituloResumen.font = { bold: true, size: 13, color: { argb: EXCEL_COLORES.encabezadoTexto } };
    tituloResumen.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORES.tituloAula } };
    tituloResumen.alignment = { horizontal: "left", indent: 1 };
    ws.getRow(fila).height = 24;
    fila++;

    const filasResumen = [
        ["Sexo", "Cantidad", "% del total"],
        ["Hombres", hombres, totalPct(hombres, data.length)],
        ["Mujeres", mujeres, totalPct(mujeres, data.length)]
    ];
    if (sinDato > 0) {
        filasResumen.push(["Sin dato", sinDato, totalPct(sinDato, data.length)]);
    }
    filasResumen.push(["TOTAL", data.length, "100%"]);

    const colResumen = [1, 4, 6]; // columnas A, D, F para la mini tabla
    filasResumen.forEach((vals, ri) => {
        vals.forEach((v, ci) => {
            const cell = ws.getCell(fila, colResumen[ci]);
            cell.value = v;
            cell.border = {
                top: { style: "thin", color: { argb: EXCEL_COLORES.borde } },
                bottom: { style: "thin", color: { argb: EXCEL_COLORES.borde } },
                left: { style: "thin", color: { argb: EXCEL_COLORES.borde } },
                right: { style: "thin", color: { argb: EXCEL_COLORES.borde } }
            };
            if (ri === 0) {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORES.encabezado } };
                cell.font = { bold: true, color: { argb: EXCEL_COLORES.encabezadoTexto } };
            } else {
                cell.font = { size: 11 };
                if (ri === filasResumen.length - 1) cell.font.bold = true;
            }
            cell.alignment = { horizontal: ci === 0 ? "left" : "center", vertical: "middle" };
        });
        ws.getRow(fila).height = 20;
        fila++;
    });

    // Gráfico debajo del resumen
    const b64 = graficoGeneroBase64(hombres, mujeres);
    const imageId = wb.addImage({ base64: b64, extension: "png" });
    ws.addImage(imageId, `A${fila + 1}:F${fila + 16}`);

    // ============ Descargar ============
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fecha = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `lista_alumnos_${fecha}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);

    estadoAlumnos.textContent = `Excel generado: ${data.length} estudiantes.`;
    registrarMovimiento("exportacion_alumnos", `Exporto lista de alumnos (${data.length} filas)`, {
        pagina: "alumnos"
    });
}

function totalPct(parte, total) {
    return total ? `${Math.round((parte / total) * 100)}%` : "0%";
}

formAlumno.addEventListener("submit", guardarAlumno);
limpiarFormBtn?.addEventListener("click", limpiarFormulario);
filtroNivel?.addEventListener("change", renderTabla);
filtroGrado.addEventListener("change", renderTabla);
filtroSeccion.addEventListener("change", renderTabla);
exportarListaBtn?.addEventListener("click", exportarListaExcel);
cargarDemoAlumnosBtn?.addEventListener("click", cargarDemoAlumnos);
limpiarDemoAlumnosBtn?.addEventListener("click", limpiarDemoAlumnos);

cargarAlumnos().catch((error) => {
    estadoAlumnos.textContent = "Error al cargar estudiantes. ¿Está encendido el backend?";
    console.error(error);
});

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
    generarAlumnoDemoAleatorio,
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
const selectNivel = document.getElementById("nivel");
const selectGrado = document.getElementById("grado");
const selectSeccion = document.getElementById("seccion");
const selectTurno = document.getElementById("turno");
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
    selectNivel.value = alumno.nivel || "";
    llenarOpcionesGrado(selectGrado, selectNivel.value, "Selecciona", alumno.grado);
    selectSeccion.value = alumno.seccion;
    document.getElementById("turno").value = alumno.turno;
    tituloFormulario.textContent = "Modificar alumno";
    panelFormulario.scrollIntoView({ behavior: "smooth", block: "start" });
}

function mapearAlumno(data) {
    return {
        id: data.id,
        nombres: data.nombres || "",
        apellidos: data.apellidos || "",
        nombresCompletos: `${data.nombres || ""} ${data.apellidos || ""}`.trim(),
        dni: data.dni || "",
        nivel: data.nivel || "",
        grado: data.grado ?? "",
        seccion: data.seccion || "",
        turno: data.turno === "Noche" ? "Tarde" : data.turno || "",
        demo: Boolean(data.es_demo)
    };
}

async function cargarAlumnos() {
    estadoAlumnos.textContent = "Cargando alumnos...";
    const lista = await apiGet("/estudiantes");
    alumnos = (lista || []).map(mapearAlumno);

    poblarFiltros();
    renderTabla();
    estadoAlumnos.textContent = `Total en base de datos: ${alumnos.length} alumnos.`;
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
        const cols = soloLectura ? 5 : 6;
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
    
    // Limpiar QR anterior
    codigoQR.innerHTML = "";
    
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
    
    // Mostrar modal
    modalQR.style.display = "flex";
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
        const body = {
            nombres: payload.nombres,
            apellidos: payload.apellidos,
            nivel: payload.nivel,
            grado: Number(payload.grado),
            seccion: payload.seccion,
            turno: payload.turno,
            estado: "Activo"
        };
        if (id) {
            await apiPut(`/estudiantes/${id}`, body);
            await registrarMovimiento(
                "modificacion_alumno",
                `Modifico alumno: ${payload.nombres} ${payload.apellidos} (${payload.nivel} ${payload.grado}° ${payload.seccion}, ${payload.turno})`,
                { pagina: "alumnos" }
            );
            estadoAlumnos.textContent = "Alumno actualizado correctamente.";
        } else {
            body.fecha_matricula = new Date().toISOString().slice(0, 10);
            await apiPost("/estudiantes", body);
            await registrarMovimiento(
                "registro_alumno",
                `Registro alumno: ${payload.nombres} ${payload.apellidos} (${payload.nivel} ${payload.grado}° ${payload.seccion}, ${payload.turno})`,
                { pagina: "alumnos" }
            );
            estadoAlumnos.textContent = "Alumno registrado correctamente.";
        }
        limpiarFormulario();
        await cargarAlumnos();
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
        estadoAlumnos.textContent = "Alumno eliminado.";
        if (alumnoIdInput.value === id) limpiarFormulario();
        await cargarAlumnos();
    } catch (error) {
        estadoAlumnos.textContent = "No se pudo eliminar el alumno.";
        console.error(error);
    }
}

async function cargarDemoAlumnos() {
    if (!puedeEditar) return;

    try {
        estadoAlumnos.textContent = "Cargando 60 alumnos demo...";
        await Promise.all(
            Array.from({ length: 60 }, () => {
                const alumno = generarAlumnoDemoAleatorio();
                return apiPost("/estudiantes", {
                    nombres: alumno.nombres,
                    apellidos: alumno.apellidos,
                    nivel: alumno.nivel,
                    grado: Number(alumno.grado),
                    seccion: alumno.seccion,
                    turno: alumno.turno,
                    estado: "Activo",
                    es_demo: 1,
                    fecha_matricula: new Date().toISOString().slice(0, 10)
                }).catch(() => null);
            })
        );

        await registrarMovimiento("datos_demo", "Creo 60 alumnos demo en registro de alumnos", {
            pagina: "alumnos"
        });
        estadoAlumnos.textContent = "60 alumnos demo registrados con datos variados.";
        await cargarAlumnos();
    } catch (error) {
        estadoAlumnos.textContent = "No se pudo cargar la demo (revisa capacidad de aulas o el backend).";
        console.error(error);
    }
}

async function limpiarDemoAlumnos() {
    if (!puedeEditar) return;

    try {
        estadoAlumnos.textContent = "Limpiando alumnos demo...";
        const lista = await apiGet("/estudiantes");
        const demos = (lista || []).filter((item) => Boolean(item.es_demo));
        if (!demos.length) {
            estadoAlumnos.textContent = "No se encontraron alumnos demo.";
            return;
        }

        await Promise.all(demos.map((item) => apiDelete(`/estudiantes/${item.id}`)));
        const eliminados = demos.length;
        await registrarMovimiento("limpiar_demo", `Limpio ${eliminados} alumnos demo`, { pagina: "alumnos" });
        estadoAlumnos.textContent = `Demo limpiada: ${eliminados} alumnos eliminados.`;
        await cargarAlumnos();
    } catch (error) {
        estadoAlumnos.textContent = "No se pudo limpiar la demo de alumnos.";
        console.error(error);
    }
}

function exportarListaExcel() {
    const data = aplicarFiltros();
    if (!data.length) {
        estadoAlumnos.textContent = "No hay datos para exportar.";
        return;
    }

    const filas = data.map((a) => ({
        "Nombres completos": a.nombresCompletos,
        Nivel: a.nivel || "-",
        Grado: a.grado,
        Seccion: a.seccion,
        Turno: a.turno
    }));

    const hoja = XLSX.utils.json_to_sheet(filas);
    hoja["!cols"] = [{ wch: 38 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 12 }];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Alumnos");
    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(libro, `lista_alumnos_${fecha}.xlsx`);
    registrarMovimiento("exportacion_alumnos", `Exporto lista de alumnos (${data.length} filas)`, {
        pagina: "alumnos"
    });
}

formAlumno.addEventListener("submit", guardarAlumno);
limpiarFormBtn?.addEventListener("click", limpiarFormulario);
filtroNivel?.addEventListener("change", renderTabla);
filtroGrado.addEventListener("change", renderTabla);
filtroSeccion.addEventListener("change", renderTabla);
filtroTurno.addEventListener("change", renderTabla);
exportarListaBtn?.addEventListener("click", exportarListaExcel);
cargarDemoAlumnosBtn?.addEventListener("click", cargarDemoAlumnos);
limpiarDemoAlumnosBtn?.addEventListener("click", limpiarDemoAlumnos);

cargarAlumnos().catch((error) => {
    estadoAlumnos.textContent = "Error al cargar estudiantes. ¿Está encendido el backend?";
    console.error(error);
});

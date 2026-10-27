export const CARGOS = {
    DIRECTOR: "Director",
    SUBDIRECTOR: "Subdirector",
    APAFA: "Apafa",
    DOCENTE: "Docente",
    SUB_DOCENTE: "Sub Docente",
    ALUMNO: "Alumno",
    PADRE: "Padre"
};

export const MODO = {
    VER: "ver",
    MODIFICAR: "modificar"
};

export const PAGINAS = {
    PANEL: "panel",
    ASISTENCIAS: "asistencias",
    REPORTES: "reportes",
    ALUMNOS: "alumnos",
    REGISTRO_PERSONAL: "registro",
    NOTAS: "notas",
    BOLETAS: "boletas",
    HORARIOS: "horarios",
    CALENDARIO: "calendario",
    COMUNICADOS: "comunicados",
    EVENTOS: "eventos",
    BIBLIOTECA: "biblioteca",
    TAREAS: "tareas",
    FORO: "foro",
    JUSTIFICACIONES: "justificaciones",
    PAGOS: "pagos",
    PSICOLOGIA: "psicologia",
    TUTORIA: "tutoria",
    SALUD: "salud",
    PADRES: "padres",
    AULAS: "aulas",
    MATRICULAS: "matriculas",
    INVENTARIO: "inventario",
    DOCUMENTOS: "documentos"
};

const VER = MODO.VER;
const MOD = MODO.MODIFICAR;

const PERMISOS_ALUMNO = {
    [PAGINAS.PANEL]: VER,
    [PAGINAS.NOTAS]: VER,
    [PAGINAS.BOLETAS]: VER,
    [PAGINAS.ASISTENCIAS]: VER,
    [PAGINAS.HORARIOS]: VER,
    [PAGINAS.CALENDARIO]: VER,
    [PAGINAS.COMUNICADOS]: VER,
    [PAGINAS.EVENTOS]: VER,
    [PAGINAS.BIBLIOTECA]: MOD,
    [PAGINAS.TAREAS]: MOD,
    [PAGINAS.FORO]: MOD
};

const PERMISOS_PADRE = {
    [PAGINAS.PANEL]: VER,
    [PAGINAS.NOTAS]: VER,
    [PAGINAS.BOLETAS]: VER,
    [PAGINAS.ASISTENCIAS]: VER,
    [PAGINAS.HORARIOS]: VER,
    [PAGINAS.CALENDARIO]: VER,
    [PAGINAS.COMUNICADOS]: VER,
    [PAGINAS.EVENTOS]: VER,
    [PAGINAS.PAGOS]: VER,
    [PAGINAS.JUSTIFICACIONES]: MOD
};

const PERMISOS_DOCENTE = {
    [PAGINAS.PANEL]: VER,
    [PAGINAS.ASISTENCIAS]: MOD,
    [PAGINAS.NOTAS]: MOD,
    [PAGINAS.HORARIOS]: VER,
    [PAGINAS.CALENDARIO]: VER,
    [PAGINAS.COMUNICADOS]: VER,
    [PAGINAS.TUTORIA]: MOD,
    [PAGINAS.SALUD]: MOD,
    [PAGINAS.TAREAS]: MOD,
    [PAGINAS.BIBLIOTECA]: VER,
    [PAGINAS.FORO]: MOD,
    [PAGINAS.ALUMNOS]: VER,
    [PAGINAS.REPORTES]: VER,
    [PAGINAS.BOLETAS]: VER,
    [PAGINAS.EVENTOS]: VER
};

const PAGINAS_DIRECTIVA = Object.values(PAGINAS);
const PERMISOS_DIRECTIVA = Object.fromEntries(PAGINAS_DIRECTIVA.map((pagina) => [pagina, MOD]));

const PERMISOS_POR_CARGO = {
    [CARGOS.DIRECTOR]: PERMISOS_DIRECTIVA,
    [CARGOS.SUBDIRECTOR]: PERMISOS_DIRECTIVA,
    [CARGOS.DOCENTE]: PERMISOS_DOCENTE,
    [CARGOS.SUB_DOCENTE]: PERMISOS_DOCENTE,
    [CARGOS.ALUMNO]: PERMISOS_ALUMNO,
    [CARGOS.PADRE]: PERMISOS_PADRE,
    [CARGOS.APAFA]: {
        ...PERMISOS_PADRE,
        [PAGINAS.REPORTES]: VER,
        [PAGINAS.ALUMNOS]: MOD,
        [PAGINAS.PADRES]: MOD,
        [PAGINAS.COMUNICADOS]: MOD,
        [PAGINAS.EVENTOS]: VER
    }
};

const ACCESO_POR_CARGO = Object.fromEntries(
    Object.entries(PERMISOS_POR_CARGO).map(([cargo, mapa]) => [cargo, Object.keys(mapa)])
);

const RUTA_INICIO = {
    [CARGOS.DIRECTOR]: "./panel.html",
    [CARGOS.SUBDIRECTOR]: "./panel.html",
    [CARGOS.APAFA]: "./panel.html",
    [CARGOS.DOCENTE]: "./panel.html",
    [CARGOS.SUB_DOCENTE]: "./panel.html",
    [CARGOS.ALUMNO]: "./panel.html",
    [CARGOS.PADRE]: "./panel.html"
};

const MENU_ITEMS = [
    // Navegación Principal
    { id: PAGINAS.PANEL, label: "🏠 Inicio", href: "./panel.html", grupo: "principal" },
    { id: PAGINAS.ASISTENCIAS, label: "📋 Asistencias", href: "./asistencias.html", grupo: "principal" },
    { id: PAGINAS.ALUMNOS, label: "🎓 Alumnos", href: "./alumnos.html", grupo: "principal" },
    { id: PAGINAS.REPORTES, label: "📊 Reportes", href: "./reportes.html", grupo: "principal" },
    { id: PAGINAS.REGISTRO_PERSONAL, label: "⚙️ Registro Personal", href: "./registro.html", grupo: "principal" },
    
    // Académico
    { id: PAGINAS.NOTAS, label: "📝 Notas", href: "./notas.html", grupo: "academico" },
    { id: PAGINAS.BOLETAS, label: "📈 Boletas", href: "./boletas.html", grupo: "academico" },
    { id: PAGINAS.TAREAS, label: "📚 Tareas", href: "./tareas.html", grupo: "academico" },
    { id: PAGINAS.TUTORIA, label: "🧠 Tutoría", href: "./tutoria.html", grupo: "academico" },
    
    // Institucional
    { id: PAGINAS.CALENDARIO, label: "📅 Calendario", href: "./calendario.html", grupo: "institucional" },
    { id: PAGINAS.HORARIOS, label: "⏰ Horarios", href: "./horarios.html", grupo: "institucional" },
    { id: PAGINAS.EVENTOS, label: "🎉 Eventos", href: "./eventos.html", grupo: "institucional" },
    { id: PAGINAS.COMUNICADOS, label: "📢 Comunicados", href: "./comunicados.html", grupo: "institucional" },
    
    // Administrativo
    { id: PAGINAS.MATRICULAS, label: "🎓 Matrículas", href: "./matriculas.html", grupo: "administrativo" },
    { id: PAGINAS.PAGOS, label: "💳 Pagos", href: "./pagos.html", grupo: "administrativo" },
    { id: PAGINAS.INVENTARIO, label: "📦 Inventario", href: "./inventario.html", grupo: "administrativo" },
    { id: PAGINAS.DOCUMENTOS, label: "📄 Documentos", href: "./documentos.html", grupo: "administrativo" },
    
    // Servicios
    { id: PAGINAS.BIBLIOTECA, label: "📖 Biblioteca", href: "./biblioteca.html", grupo: "servicios" },
    { id: PAGINAS.SALUD, label: "🩹 Salud", href: "./salud.html", grupo: "servicios" },
    { id: PAGINAS.PSICOLOGIA, label: "🧠 Psicología", href: "./psicologia.html", grupo: "servicios" },
    { id: PAGINAS.AULAS, label: "🏫 Aulas", href: "./aulas.html", grupo: "servicios" },
    
    // Comunidad
    { id: PAGINAS.PADRES, label: "👨‍👩‍👧 Padres (APAFA)", href: "./padres.html", grupo: "comunidad" },
    { id: PAGINAS.JUSTIFICACIONES, label: "📋 Justificaciones", href: "./justificaciones.html", grupo: "comunidad" },
    { id: PAGINAS.FORO, label: "💬 Foro", href: "./foro.html", grupo: "comunidad" }
];

const GRUPOS_MENU = {
    principal: { label: "Navegación Principal", icon: "📍" },
    academico: { label: "Académico", icon: "📚" },
    institucional: { label: "Institucional", icon: "🏛️" },
    administrativo: { label: "Administrativo", icon: "💼" },
    servicios: { label: "Servicios", icon: "🛠️" },
    comunidad: { label: "Comunidad", icon: "👥" }
};

export function obtenerUsuario() {
    try {
        return JSON.parse(sessionStorage.getItem("usuario_activo") || "null");
    } catch {
        return null;
    }
}

export function idPaginaDesdeHref(href) {
    if (!href) return "";
    const archivo = href.split("/").pop().split("?")[0];
    return archivo.replace(".html", "");
}

export function modoPagina(cargo, pagina) {
    return PERMISOS_POR_CARGO[cargo]?.[pagina] || "";
}

export function puedeAcceder(cargo, pagina) {
    return Boolean(modoPagina(cargo, pagina));
}

export function puedeModificar(cargo, pagina) {
    return modoPagina(cargo, pagina) === MODO.MODIFICAR;
}

export function esSoloLecturaPagina(cargo, pagina) {
    return modoPagina(cargo, pagina) === MODO.VER;
}

export function rutaInicioPorCargo(cargo) {
    return RUTA_INICIO[cargo] || "./index.html";
}

export function esAccesoTotal(cargo) {
    return cargo === CARGOS.DIRECTOR || cargo === CARGOS.SUBDIRECTOR;
}

export function esAlumno(cargo) {
    return cargo === CARGOS.ALUMNO;
}

export function esApoderado(cargo) {
    return cargo === CARGOS.PADRE || cargo === CARGOS.APAFA;
}

export function esDocente(cargo) {
    return cargo === CARGOS.DOCENTE || cargo === CARGOS.SUB_DOCENTE;
}

export function puedeGestionarAlumnos(cargo) {
    return [CARGOS.DIRECTOR, CARGOS.SUBDIRECTOR, CARGOS.APAFA].includes(cargo);
}

export function esSoloLecturaAlumnos(cargo) {
    return cargo === CARGOS.DOCENTE || cargo === CARGOS.SUB_DOCENTE;
}

export function puedeExportarAsistencias(cargo) {
    return esAccesoTotal(cargo);
}

export function aplicarModoEnDocumento(cargo, pagina) {
    const modo = modoPagina(cargo, pagina) || MODO.VER;
    document.body.dataset.modo = modo;
    document.body.dataset.cargo = cargo;
    document.body.classList.toggle("modo-ver", modo === MODO.VER);
    document.body.classList.toggle("modo-modificar", modo === MODO.MODIFICAR);
}

export function filtrarEnlacesPorPermiso(cargo, raiz = document) {
    raiz.querySelectorAll("a[href]").forEach((enlace) => {
        const href = enlace.getAttribute("href") || "";
        if (!href.endsWith(".html") && !href.includes(".html?")) return;
        const pagina = idPaginaDesdeHref(href);
        if (!pagina || pagina === "index") return;
        if (!Object.values(PAGINAS).includes(pagina)) return;
        enlace.hidden = !puedeAcceder(cargo, pagina);
    });
}

export function initPaginaProtegida(paginaActual) {
    const usuario = obtenerUsuario();

    if (!usuario) {
        window.location.href = "./index.html";
        return null;
    }
    if (!puedeAcceder(usuario.cargo, paginaActual)) {
        window.location.href = rutaInicioPorCargo(usuario.cargo);
        return null;
    }
    aplicarModoEnDocumento(usuario.cargo, paginaActual);
    renderMenuNavegacion(usuario.cargo, paginaActual);
    filtrarEnlacesPorPermiso(usuario.cargo);
    import("./auditoria.js").then(({ registrarVisitaPagina }) => {
        registrarVisitaPagina(paginaActual);
    });
    configurarScrollBarraUtilidad();
    return usuario;
}

export function renderMenuNavegacion(cargo, paginaActiva) {
    const contenedor = document.getElementById("menuNavegacion");
    if (!contenedor) return;

    const permitidos = ACCESO_POR_CARGO[cargo] || [];
    const itemsPermitidos = MENU_ITEMS.filter((item) => permitidos.includes(item.id));
    
    // Agrupar items por categoría
    const itemsPorGrupo = {};
    itemsPermitidos.forEach((item) => {
        const grupo = item.grupo || "principal";
        if (!itemsPorGrupo[grupo]) {
            itemsPorGrupo[grupo] = [];
        }
        itemsPorGrupo[grupo].push(item);
    });

    // Generar HTML agrupado
    let html = "";
    const ordenGrupos = ["principal", "academico", "institucional", "administrativo", "servicios", "comunidad"];
    let primerGrupo = true;
    
    ordenGrupos.forEach((grupoKey) => {
        const items = itemsPorGrupo[grupoKey];
        if (!items || items.length === 0) return;
        
        const grupoInfo = GRUPOS_MENU[grupoKey];
        
        // Solo mostrar título si no es el primer grupo principal
        if (!primerGrupo || grupoKey !== "principal") {
            html += `<h2 class="barra-subtitulo">${grupoInfo.icon} ${grupoInfo.label}</h2>`;
        }
        
        html += `<div style="display: flex; flex-direction: column; gap: 8px;">`;
        
        items.forEach((item) => {
            const activo = item.id === paginaActiva ? " activo" : "";
            const btnClass = grupoKey === "principal" ? "btn-funcional" : "btn-modulo";
            html += `<a class="${btnClass}${activo}" href="${item.href}">${item.label}</a>`;
        });
        
        html += `</div>`;
        primerGrupo = false;
    });

    contenedor.innerHTML = html;
}

export function configurarCerrarSesion() {
    const btn = document.getElementById("cerrarSesionBtn");
    if (!btn || btn.dataset.configurado === "1") return;

    btn.dataset.configurado = "1";
    btn.addEventListener("click", async () => {
        const usuario = obtenerUsuario();
        if (usuario) {
            const { registrarCierreSesion } = await import("./auditoria.js");
            await registrarCierreSesion(usuario);
        }
        const { limpiarSesion } = await import("./api.js");
        limpiarSesion();
        window.location.href = "./index.html";
    });
}

// Guardar y restaurar posición de scroll de la barra izquierda
export function configurarScrollBarraUtilidad() {
    const barraIzquierda = document.querySelector('.barra-izquierda');
    const STORAGE_KEY = 'panel-izquierda-scroll';

    // Restaurar scroll al cargar la página
    if (barraIzquierda) {
        const savedScroll = localStorage.getItem(STORAGE_KEY);
        if (savedScroll) {
            barraIzquierda.scrollTop = parseInt(savedScroll, 10);
        }

        // Guardar scroll antes de navegar
        const enlacesBarra = barraIzquierda.querySelectorAll('a');
        enlacesBarra.forEach(enlace => {
            enlace.addEventListener('click', () => {
                localStorage.setItem(STORAGE_KEY, barraIzquierda.scrollTop);
            });
        });

        // Guardar scroll mientras se hace scroll
        barraIzquierda.addEventListener('scroll', () => {
            localStorage.setItem(STORAGE_KEY, barraIzquierda.scrollTop);
        });
    }
}

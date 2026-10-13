import { initPaginaProtegida, configurarCerrarSesion, puedeModificar, esAlumno, esDocente } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";

const usuario = initPaginaProtegida("biblioteca");
if (usuario) {
    configurarCerrarSesion();
    inicializarPaginaBiblioteca(usuario);
}

function inicializarPaginaBiblioteca(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "biblioteca");
    const esAlumnoUser = esAlumno(usuario.cargo);
    const esDocenteUser = esDocente(usuario.cargo);

    // Event listeners para agregar libro
    const agregarLibroBtn = document.getElementById("agregarLibroBtn");
    if (agregarLibroBtn && puedeMod) {
        agregarLibroBtn.addEventListener("click", mostrarPanelAgregarLibro);
    }

    const cancelarLibroBtn = document.getElementById("cancelarLibroBtn");
    if (cancelarLibroBtn) {
        cancelarLibroBtn.addEventListener("click", ocultarPanelAgregarLibro);
    }

    const formLibro = document.getElementById("formLibro");
    if (formLibro) {
        formLibro.addEventListener("submit", manejarAgregarLibro);
    }

    // Event listeners para reservar libro
    const formReserva = document.getElementById("formReserva");
    if (formReserva) {
        formReserva.addEventListener("submit", manejarReservarLibro);
    }

    const cancelarReservaBtn = document.getElementById("cancelarReservaBtn");
    if (cancelarReservaBtn) {
        cancelarReservaBtn.addEventListener("click", ocultarPanelReservarLibro);
    }

    // Filtros
    const buscarLibro = document.getElementById("buscarLibro");
    const categoriaLibro = document.getElementById("categoriaLibro");
    const disponibilidadLibro = document.getElementById("disponibilidadLibro");

    if (buscarLibro) buscarLibro.addEventListener("input", () => cargarCatalogo(usuario));
    if (categoriaLibro) categoriaLibro.addEventListener("change", () => cargarCatalogo(usuario));
    if (disponibilidadLibro) disponibilidadLibro.addEventListener("change", () => cargarCatalogo(usuario));

    // Cargar catálogo y préstamos
    cargarCatalogo(usuario);
    cargarPrestamos(usuario);
}

function mostrarPanelAgregarLibro() {
    document.getElementById("panelAgregarLibro").classList.remove("oculto");
    document.getElementById("panelAgregarLibro").scrollIntoView({ behavior: "smooth" });
}

function ocultarPanelAgregarLibro() {
    document.getElementById("panelAgregarLibro").classList.add("oculto");
    document.getElementById("formLibro").reset();
}

function mostrarPanelReservarLibro(libro) {
    document.getElementById("panelReservarLibro").classList.remove("oculto");
    document.getElementById("libroIdReserva").value = libro.id;
    document.getElementById("tituloLibroReserva").textContent = libro.titulo;
    document.getElementById("autorLibroReserva").textContent = libro.autor;
    document.getElementById("disponibilidadLibroReserva").textContent = libro.disponibilidad;

    // Configurar fecha mínima de devolución (7 días)
    const fechaDevolucion = document.getElementById("fechaDevolucion");
    const fechaMinima = new Date();
    fechaMinima.setDate(fechaMinima.getDate() + 7);
    fechaDevolucion.min = fechaMinima.toISOString().split('T')[0];
    fechaDevolucion.value = fechaMinima.toISOString().split('T')[0];

    document.getElementById("panelReservarLibro").scrollIntoView({ behavior: "smooth" });
}

function ocultarPanelReservarLibro() {
    document.getElementById("panelReservarLibro").classList.add("oculto");
    document.getElementById("formReserva").reset();
}

async function manejarAgregarLibro(e) {
    e.preventDefault();
    const usuario = obtenerUsuario();
    if (!usuario) return;

    const libro = {
        titulo: document.getElementById("tituloLibro").value,
        autor: document.getElementById("autorLibro").value,
        isbn: document.getElementById("isbnLibro").value,
        categoria: document.getElementById("categoriaLibroForm").value,
        anio: parseInt(document.getElementById("anioLibro").value),
        ejemplares: parseInt(document.getElementById("ejemplaresLibro").value),
        disponible: parseInt(document.getElementById("ejemplaresLibro").value),
        agregadoPor: usuario.id,
        fechaAgregado: new Date().toISOString()
    };

    try {
        // Aquí iría la integración con Firebase
        console.log("Agregando libro:", libro);

        // Registrar en auditoría
        await registrarAccionAuditoria("agregar_libro", `Nuevo libro: ${libro.titulo}`);

        mostrarEstado("Libro agregado exitosamente", "ok");
        ocultarPanelAgregarLibro();
        cargarCatalogo(usuario);
    } catch (error) {
        console.error("Error al agregar libro:", error);
        mostrarEstado("Error al agregar libro", "error");
    }
}

async function manejarReservarLibro(e) {
    e.preventDefault();
    const usuario = obtenerUsuario();
    if (!usuario) return;

    const reserva = {
        libroId: document.getElementById("libroIdReserva").value,
        usuarioId: usuario.id,
        usuarioNombre: usuario.nombres,
        fechaDevolucion: document.getElementById("fechaDevolucion").value,
        observaciones: document.getElementById("observacionesReserva").value,
        fechaReserva: new Date().toISOString(),
        estado: "activo"
    };

    try {
        // Aquí iría la integración con Firebase
        console.log("Reservando libro:", reserva);

        // Registrar en auditoría
        await registrarAccionAuditoria("reservar_libro", `Reserva de libro: ${reserva.libroId}`);

        mostrarEstado("Libro reservado exitosamente", "ok");
        ocultarPanelReservarLibro();
        cargarCatalogo(usuario);
        cargarPrestamos(usuario);
    } catch (error) {
        console.error("Error al reservar libro:", error);
        mostrarEstado("Error al reservar libro", "error");
    }
}

async function cargarCatalogo(usuario) {
    const tablaLibrosBody = document.getElementById("tablaLibrosBody");
    const buscar = document.getElementById("buscarLibro")?.value?.toLowerCase() || "";
    const categoria = document.getElementById("categoriaLibro")?.value || "";
    const disponibilidad = document.getElementById("disponibilidadLibro")?.value || "";

    try {
        // Aquí iría la integración con Firebase para obtener catálogo
        // Simulación de datos
        const librosSimulados = [
            {
                id: "1",
                titulo: "Cien años de soledad",
                autor: "Gabriel García Márquez",
                isbn: "978-0307474728",
                categoria: "literatura",
                anio: 1967,
                ejemplares: 3,
                disponible: 2
            },
            {
                id: "2",
                titulo: "El origen de las especies",
                autor: "Charles Darwin",
                isbn: "978-0140432050",
                categoria: "ciencia",
                anio: 1859,
                ejemplares: 2,
                disponible: 0
            },
            {
                id: "3",
                titulo: "Historia del tiempo",
                autor: "Stephen Hawking",
                isbn: "978-0553380163",
                categoria: "ciencia",
                anio: 1988,
                ejemplares: 4,
                disponible: 3
            },
            {
                id: "4",
                titulo: "Los juegos del hambre",
                autor: "Suzanne Collins",
                isbn: "978-0439023528",
                categoria: "literatura",
                anio: 2008,
                ejemplares: 5,
                disponible: 4
            }
        ];

        // Filtrar libros
        let librosFiltrados = librosSimulados.filter(libro => {
            const cumpleBusqueda = !buscar ||
                libro.titulo.toLowerCase().includes(buscar) ||
                libro.autor.toLowerCase().includes(buscar) ||
                libro.isbn.includes(buscar);
            const cumpleCategoria = !categoria || libro.categoria === categoria;
            const cumpleDisponibilidad = !disponibilidad ||
                (disponibilidad === "disponible" && libro.disponible > 0) ||
                (disponibilidad === "prestado" && libro.disponible === 0);
            return cumpleBusqueda && cumpleCategoria && cumpleDisponibilidad;
        });

        // Renderizar tabla
        tablaLibrosBody.innerHTML = librosFiltrados.map(libro => `
            <tr>
                <td><strong>${libro.titulo}</strong></td>
                <td>${libro.autor}</td>
                <td>${libro.categoria}</td>
                <td>
                    <span class="chip ${libro.disponible > 0 ? 'chip-verde' : 'chip-rojo'}" style="background: ${libro.disponible > 0 ? 'rgba(22, 163, 74, 0.14)' : 'rgba(220, 38, 38, 0.12)'}; color: ${libro.disponible > 0 ? '#15803d' : '#b91c1c'};">
                        ${libro.disponible > 0 ? `Disponible (${libro.disponible}/${libro.ejemplares})` : 'Agotado'}
                    </span>
                </td>
                <td>
                    ${libro.disponible > 0 ? `<button class="btn-funcional-inline" onclick="reservarLibro('${libro.id}')">Reservar</button>` : '<span class="chip-rojo">No disponible</span>'}
                </td>
            </tr>
        `).join("") || "<tr><td colspan='5'>No hay libros que coincidan con los filtros</td></tr>";

    } catch (error) {
        console.error("Error al cargar catálogo:", error);
        tablaLibrosBody.innerHTML = "<tr><td colspan='5'>Error al cargar catálogo</td></tr>";
    }
}

async function cargarPrestamos(usuario) {
    const listaPrestamos = document.getElementById("listaPrestamos");

    try {
        // Aquí iría la integración con Firebase para obtener préstamos
        // Simulación de datos
        const prestamosSimulados = [
            {
                id: "1",
                libroTitulo: "Cien años de soledad",
                libroAutor: "Gabriel García Márquez",
                fechaReserva: new Date(Date.now() - 86400000).toISOString(),
                fechaDevolucion: "2026-10-15",
                estado: "activo"
            },
            {
                id: "2",
                libroTitulo: "Historia del tiempo",
                libroAutor: "Stephen Hawking",
                fechaReserva: new Date(Date.now() - 172800000).toISOString(),
                fechaDevolucion: "2026-10-10",
                estado: "devuelto"
            }
        ];

        // Actualizar estadísticas
        const activos = prestamosSimulados.filter(p => p.estado === "activo").length;
        const devolucionesPendientes = prestamosSimulados.filter(p => {
            const fechaDevolucion = new Date(p.fechaDevolucion);
            const hoy = new Date();
            return p.estado === "activo" && fechaDevolucion < hoy;
        }).length;

        document.getElementById("prestamosActivos").textContent = activos;
        document.getElementById("devolucionesPendientes").textContent = devolucionesPendientes;
        document.getElementById("totalPrestamos").textContent = prestamosSimulados.length;

        // Renderizar lista
        listaPrestamos.innerHTML = prestamosSimulados.map(prestamo => `
            <li>
                <div>
                    <strong>${prestamo.libroTitulo}</strong>
                    <span>${prestamo.libroAutor} · Dev: ${prestamo.fechaDevolucion}</span>
                </div>
                <div>
                    <span class="chip ${prestamo.estado === 'activo' ? 'chip-verde' : 'chip-rojo'}" style="background: ${prestamo.estado === 'activo' ? 'rgba(22, 163, 74, 0.14)' : 'rgba(220, 38, 38, 0.12)'}; color: ${prestamo.estado === 'activo' ? '#15803d' : '#b91c1c'};">
                        ${prestamo.estado === 'activo' ? 'Activo' : 'Devuelto'}
                    </span>
                </div>
            </li>
        `).join("") || "<li><span>No hay préstamos registrados</span></li>";

    } catch (error) {
        console.error("Error al cargar préstamos:", error);
        listaPrestamos.innerHTML = "<li><span>Error al cargar préstamos</span></li>";
    }
}

// Función global para reservar libro
window.reservarLibro = function(libroId) {
    // Cargar datos del libro específico
    const libro = {
        id: libroId,
        titulo: "Cien años de soledad",
        autor: "Gabriel García Márquez",
        disponibilidad: "Disponible (2/3)"
    };

    mostrarPanelReservarLibro(libro);
};

function mostrarEstado(mensaje, tipo) {
    const estado = document.getElementById("estadoBiblioteca") || document.createElement("p");
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
import { initPaginaProtegida, configurarCerrarSesion, puedeModificar } from "./auth-roles.js";
import { registrarAccionAuditoria } from "./auditoria.js";
import { inicializarBusquedaGlobal, inicializarFiltrosAvanzados } from "./busqueda-global.js";

const usuario = initPaginaProtegida("notas");
if (usuario) {
    document.addEventListener('DOMContentLoaded', () => {
        inicializarBusquedaGlobal();
    });
    configurarCerrarSesion();
    inicializarPaginaNotas(usuario);
}

function inicializarPaginaNotas(usuario) {
    const puedeMod = puedeModificar(usuario.cargo, "notas");

    // Configurar filtros avanzados para notas
    inicializarFiltrosAvanzados({
        campos: [
            { id: 'estudiante', label: 'Nombre del Estudiante', tipo: 'texto', placeholder: 'Buscar por nombre...' },
            { id: 'curso', label: 'Curso', tipo: 'texto', placeholder: 'Nombre del curso...' },
            { id: 'grado', label: 'Grado', tipo: 'select', opciones: [
                { valor: '1', label: '1° Grado' },
                { valor: '2', label: '2° Grado' },
                { valor: '3', label: '3° Grado' },
                { valor: '4', label: '4° Grado' },
                { valor: '5', label: '5° Grado' },
                { valor: '6', label: '6° Grado' }
            ]},
            { id: 'nota_min', label: 'Nota Mínima', tipo: 'numero', placeholder: '0-20' },
            { id: 'nota_max', label: 'Nota Máxima', tipo: 'numero', placeholder: '0-20' }
        ],
        onAplicar: (valores) => {
            console.log('Filtros de notas aplicados:', valores);
        },
        onLimpiar: () => {
            console.log('Filtros de notas limpiados');
        }
    });

    // Si puede modificar, agregar funcionalidad para gestionar notas
    if (puedeMod) {
        configurarGestionNotas();
    }

    // Registrar visita
    registrarVisitaPagina();
}

function configurarGestionNotas() {
    // Aquí se podría agregar funcionalidad para registrar/editar notas
    // Por ahora es una página de visualización
}

async function registrarVisitaPagina() {
    try {
        const { registrarVisitaPagina } = await import("./auditoria.js");
        await registrarVisitaPagina("notas");
    } catch (error) {
        console.error("Error al registrar visita:", error);
    }
}
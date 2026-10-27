import { get, ref } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js";
import { db } from "./firebase-config.js";

// Búsqueda global
export function inicializarBusquedaGlobal() {
    const contenedor = document.querySelector('.contenido');
    if (!contenedor) {
        console.warn('No se encontró contenedor .contenido');
        return;
    }

    // Crear barra de búsqueda si no existe
    if (!document.querySelector('.barra-busqueda-global')) {
        const barraBusqueda = document.createElement('div');
        barraBusqueda.className = 'barra-busqueda-global';
        barraBusqueda.innerHTML = `
            <div class="busqueda-container">
                <span class="busqueda-icon">🔍</span>
                <input type="text" class="busqueda-input" placeholder="Buscar alumnos, docentes, pagos..." id="busquedaGlobalInput">
            </div>
        `;

        // Insertar al inicio del contenido
        contenedor.insertBefore(barraBusqueda, contenedor.firstChild);

        const input = document.getElementById('busquedaGlobalInput');
        let timeout = null;

        input.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const termino = e.target.value.trim().toLowerCase();
                if (termino.length >= 2) {
                    realizarBusquedaGlobal(termino);
                } else {
                    limpiarResultadosBusqueda();
                }
            }, 300);
        });
    }
}

async function realizarBusquedaGlobal(termino) {
    const resultados = [];
    const paginas = ['alumnos', 'asistencias', 'pagos', 'notas', 'tareas'];

    for (const pagina of paginas) {
        try {
            const snapshot = await get(ref(db, pagina));
            if (snapshot.exists()) {
                const datos = snapshot.val();
                buscarEnObjeto(datos, termino, pagina, resultados);
            }
        } catch (error) {
            console.error(`Error buscando en ${pagina}:`, error);
        }
    }

    mostrarResultadosBusqueda(resultados, termino);
}

function buscarEnObjeto(obj, termino, categoria, resultados) {
    if (!obj || typeof obj !== 'object') return;

    Object.entries(obj).forEach(([id, valor]) => {
        if (typeof valor === 'object' && valor !== null) {
            buscarEnObjeto(valor, termino, categoria, resultados);
        } else if (typeof valor === 'string' && valor.toLowerCase().includes(termino)) {
            resultados.push({
                categoria,
                id,
                valor,
                textoEncontrado: valor
            });
        }
    });
}

function mostrarResultadosBusqueda(resultados, termino) {
    let contenedorResultados = document.getElementById('resultadosBusqueda');
    if (!contenedorResultados) {
        contenedorResultados = document.createElement('div');
        contenedorResultados.id = 'resultadosBusqueda';
        contenedorResultados.style.cssText = `
            margin-top: 15px;
            padding: 15px;
            background: white;
            border-radius: 12px;
            border: 1px solid var(--border-color);
            box-shadow: var(--sombra-md);
        `;
        document.querySelector('.barra-busqueda-global').appendChild(contenedorResultados);
    }

    if (resultados.length === 0) {
        contenedorResultados.innerHTML = `
            <p style="color: var(--text-muted); text-align: center; margin: 0;">
                No se encontraron resultados para "${termino}"
            </p>
        `;
        return;
    }

    const resultadosPorCategoria = agruparPorCategoria(resultados);
    let html = `<h4 style="color: var(--primary-dark); margin-bottom: 10px;">${resultados.length} resultados encontrados</h4>`;

    Object.entries(resultadosPorCategoria).forEach(([categoria, items]) => {
        html += `
            <div style="margin-bottom: 12px;">
                <strong style="color: var(--primary-sky); display: block; margin-bottom: 5px;">${categoria.toUpperCase()}</strong>
                ${items.slice(0, 5).map(item => `
                    <div style="padding: 8px; background: var(--sky-light); border-radius: 6px; margin-bottom: 4px; font-size: 0.85rem;">
                        ${item.textoEncontrado}
                    </div>
                `).join('')}
                ${items.length > 5 ? `<small style="color: var(--text-muted);">...y ${items.length - 5} más</small>` : ''}
            </div>
        `;
    });

    contenedorResultados.innerHTML = html;
}

function agruparPorCategoria(resultados) {
    return resultados.reduce((acc, item) => {
        if (!acc[item.categoria]) {
            acc[item.categoria] = [];
        }
        acc[item.categoria].push(item);
        return acc;
    }, {});
}

function limpiarResultadosBusqueda() {
    const contenedor = document.getElementById('resultadosBusqueda');
    if (contenedor) {
        contenedor.remove();
    }
}

// Filtros avanzados
export function inicializarFiltrosAvanzados(config) {
    const contenedor = document.querySelector('.contenido');
    if (!contenedor) return;

    const filtrosExistente = document.querySelector('.filtros-avanzados');
    if (filtrosExistente) return;

    const filtrosDiv = document.createElement('div');
    filtrosDiv.className = 'filtros-avanzados';
    filtrosDiv.innerHTML = `
        <div class="filtros-contenido" id="filtrosContenido">
            ${generarCamposFiltros(config)}
            <div class="filtros-botones">
                <button class="btn-funcional-inline btn-exito" id="aplicarFiltros">Aplicar Filtros</button>
                <button class="btn-funcional-inline btn-secundario" id="limpiarFiltros">Limpiar</button>
            </div>
        </div>
    `;

    contenedor.insertBefore(filtrosDiv, contenedor.children[1]);

    // Toggle para expandir/colapsar
    const header = document.getElementById('filtrosHeader');
    const toggle = document.getElementById('filtrosToggle');
    const contenido = document.getElementById('filtrosContenido');

    header.addEventListener('click', () => {
        toggle.classList.toggle('expandido');
        contenido.classList.toggle('expandido');
    });

    // Event listeners para botones
    document.getElementById('aplicarFiltros').addEventListener('click', () => {
        if (config.onAplicar) {
            const valores = obtenerValoresFiltros(config);
            config.onAplicar(valores);
        }
    });

    document.getElementById('limpiarFiltros').addEventListener('click', () => {
        limpiarCamposFiltros(config);
        if (config.onLimpiar) {
            config.onLimpiar();
        }
    });
}

function generarCamposFiltros(config) {
    let html = '';
    config.campos.forEach(campo => {
        html += `<div class="filtro-avanzado">`;
        html += `<label>${campo.label}</label>`;

        if (campo.tipo === 'texto') {
            html += `<input type="text" id="filtro_${campo.id}" placeholder="${campo.placeholder || ''}">`;
        } else if (campo.tipo === 'select') {
            html += `<select id="filtro_${campo.id}">`;
            html += `<option value="">Todos</option>`;
            campo.opciones.forEach(opcion => {
                html += `<option value="${opcion.valor}">${opcion.label}</option>`;
            });
            html += `</select>`;
        } else if (campo.tipo === 'fecha') {
            html += `<div class="filtro-avanzado-date">`;
            html += `<input type="date" id="filtro_${campo.id}_inicio" placeholder="Desde">`;
            html += `<input type="date" id="filtro_${campo.id}_fin" placeholder="Hasta">`;
            html += `</div>`;
        } else if (campo.tipo === 'numero') {
            html += `<input type="number" id="filtro_${campo.id}" placeholder="${campo.placeholder || ''}">`;
        }

        html += `</div>`;
    });
    return html;
}

function obtenerValoresFiltros(config) {
    const valores = {};
    config.campos.forEach(campo => {
        if (campo.tipo === 'fecha') {
            valores[`${campo.id}_inicio`] = document.getElementById(`filtro_${campo.id}_inicio`).value;
            valores[`${campo.id}_fin`] = document.getElementById(`filtro_${campo.id}_fin`).value;
        } else {
            valores[campo.id] = document.getElementById(`filtro_${campo.id}`).value;
        }
    });
    return valores;
}

function limpiarCamposFiltros(config) {
    config.campos.forEach(campo => {
        if (campo.tipo === 'fecha') {
            document.getElementById(`filtro_${campo.id}_inicio`).value = '';
            document.getElementById(`filtro_${campo.id}_fin`).value = '';
        } else {
            document.getElementById(`filtro_${campo.id}`).value = '';
        }
    });
}

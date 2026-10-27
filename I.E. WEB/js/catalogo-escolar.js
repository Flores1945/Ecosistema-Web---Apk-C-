export const NIVEL_PRIMARIA = "Primaria";
export const NIVEL_SECUNDARIA = "Secundaria";

export const SECCIONES = "ABCDEFGHIJKLMNO".split("");

const GRADOS_PRIMARIA = ["1", "2", "3", "4", "5", "6"];
const GRADOS_SECUNDARIA = ["1", "2", "3", "4", "5"];

export const MAX_ALUMNOS_POR_AULA = 28;

export function gradosPorNivel(nivel) {
    if (nivel === NIVEL_PRIMARIA) return [...GRADOS_PRIMARIA];
    if (nivel === NIVEL_SECUNDARIA) return [...GRADOS_SECUNDARIA];
    return [];
}

export function llenarOpcionesNivel(select, textoDefault = "Selecciona") {
    if (!select) return;
    const actual = select.value;
    select.innerHTML = `
        <option value="">${textoDefault}</option>
        <option value="${NIVEL_PRIMARIA}">${NIVEL_PRIMARIA}</option>
        <option value="${NIVEL_SECUNDARIA}">${NIVEL_SECUNDARIA}</option>
    `;
    if (actual) select.value = actual;
}

export function llenarOpcionesGrado(select, nivel, textoDefault = "Selecciona", valorPreferido = "") {
    if (!select) return;
    const grados = gradosPorNivel(nivel);
    console.log('Grados para nivel', nivel, ':', grados);
    select.innerHTML = `<option value="">${textoDefault}</option>`;
    
    // Solo deshabilitar si no hay grados disponibles
    if (!grados.length) {
        select.disabled = true;
    } else {
        select.disabled = false;
    }

    grados.forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = `${g}° Grado`;
        select.appendChild(opt);
    });

    if (valorPreferido && grados.includes(valorPreferido)) {
        select.value = valorPreferido;
    }
}

export function llenarOpcionesSeccion(select, textoDefault = "Selecciona", valorPreferido = "") {
    if (!select) return;
    select.innerHTML = `<option value="">${textoDefault}</option>`;
    SECCIONES.forEach((letra) => {
        const opt = document.createElement("option");
        opt.value = letra;
        opt.textContent = `Sección ${letra}`;
        select.appendChild(opt);
    });
    if (valorPreferido && SECCIONES.includes(valorPreferido)) {
        select.value = valorPreferido;
    }
}

export function enlazarNivelYGrado(selectNivel, selectGrado, selectSeccion, selectTurno) {
    if (!selectNivel || !selectGrado) return;

    // Estado inicial: grado y sección deshabilitados
    selectGrado.disabled = true;
    selectSeccion.disabled = true;
    selectTurno.value = "";

    selectNivel.addEventListener("change", () => {
        const nivel = selectNivel.value;
        console.log('Nivel seleccionado:', nivel);
        llenarOpcionesGrado(selectGrado, nivel);
        llenarOpcionesSeccion(selectSeccion);
        
        if (nivel) {
            selectGrado.disabled = false;
            selectSeccion.disabled = true;
            selectTurno.value = "";
        } else {
            selectGrado.disabled = true;
            selectSeccion.disabled = true;
            selectTurno.value = "";
        }
    });

    selectGrado.addEventListener("change", () => {
        const nivel = selectNivel.value;
        const grado = selectGrado.value;
        if (nivel && grado) {
            llenarOpcionesSeccion(selectSeccion);
            selectSeccion.disabled = false;
            configurarTurnoSegunGrado(nivel, grado, selectTurno);
        } else {
            selectSeccion.disabled = true;
            selectTurno.value = "";
        }
    });
}

function configurarTurnoSegunGrado(nivel, grado, selectTurno) {
    if (!nivel || !grado) {
        selectTurno.value = "";
        return;
    }

    const gradoNum = parseInt(grado);

    // Lógica de turnos:
    // Primaria 1,2,3 + Secundaria 4,5 = Mañana
    // Primaria 4,5,6 + Secundaria 1,2,3 = Tarde
    let turnoPorDefecto = "";

    if (nivel === NIVEL_PRIMARIA) {
        if (gradoNum <= 3) {
            turnoPorDefecto = "Mañana";
        } else {
            turnoPorDefecto = "Tarde";
        }
    } else if (nivel === NIVEL_SECUNDARIA) {
        if (gradoNum >= 4) {
            turnoPorDefecto = "Mañana";
        } else {
            turnoPorDefecto = "Tarde";
        }
    }

    selectTurno.value = turnoPorDefecto;
}

const NOMBRES = [
    "Aaron", "Adriana", "Bruno", "Camila", "Diego", "Elena", "Fabian", "Gabriela",
    "Hugo", "Irene", "Javier", "Karen", "Luis", "Mariana", "Nicolas", "Olga",
    "Pablo", "Rosa", "Samuel", "Teresa", "Ulises", "Valeria", "William", "Ximena",
    "Yahir", "Zoe", "Andrea", "Benjamin", "Cesar", "Diana", "Emilio", "Flora"
];

const APELLIDOS = [
    "Quispe", "Mamani", "Rojas", "Vargas", "Torres", "Flores", "Gutierrez", "Silva",
    "Castro", "Morales", "Herrera", "Medina", "Aguilar", "Paredes", "Soto", "Ramirez",
    "Chavez", "Diaz", "Ortega", "Reyes", "Campos", "Salazar", "Nunez", "Vega"
];

function elegir(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
}

export function generarNombreCompletoAleatorio() {
    const segundoApellido = Math.random() > 0.35 ? ` ${elegir(APELLIDOS)}` : "";
    return `${elegir(NOMBRES)} ${elegir(APELLIDOS)}${segundoApellido}`;
}

export function generarAlumnoDemoAleatorio() {
    const nivel = Math.random() > 0.48 ? NIVEL_PRIMARIA : NIVEL_SECUNDARIA;
    const grados = gradosPorNivel(nivel);
    const grado = elegir(grados);
    const gradoNum = parseInt(grado);

    // Determinar turno según la lógica
    let turno;
    if (nivel === NIVEL_PRIMARIA) {
        turno = gradoNum <= 3 ? "Mañana" : "Tarde";
    } else {
        turno = gradoNum >= 4 ? "Mañana" : "Tarde";
    }

    return {
        nombres: elegir(NOMBRES),
        apellidos: `${elegir(APELLIDOS)} ${Math.random() > 0.35 ? elegir(APELLIDOS) : ""}`,
        nivel,
        grado,
        seccion: elegir(SECCIONES),
        turno
    };
}

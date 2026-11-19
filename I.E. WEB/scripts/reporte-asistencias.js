// Generacion de reportes de asistencia en Excel (ExcelJS).
// Dos formatos:
//  - Reporte diario: tabla detalle del dia elegido.
//  - Reporte mensual: matriz alumnos x dias del rango, agrupada por aula.

const COLORES = {
    encabezado: "FF1E3A8A",
    encabezadoTexto: "FFFFFFFF",
    tituloAula: "FF0F172A",
    bandaAula: "FFEFF6FF",
    borde: "FFCBD5E1",
    zebra: "FFF8FAFC",
    texto: "FF0F172A",
    presente: "FF16A34A",
    tardanza: "FFCA8A04",
    falta: "FFDC2626",
    justificado: "FF2563EB"
};

function estadoACodigo(estadoRaw) {
    const e = (estadoRaw || "").toString().trim().toLowerCase();
    if (e.includes("justif") || e === "j") return "J";
    if (e.includes("tard") || e === "tarde" || e === "t") return "T";
    if (e.includes("inasist") || e.includes("falta") || e.includes("ausent") || e === "f") return "F";
    if (e.includes("asist") || e.includes("present") || e === "v" || e === "p") return "V";
    return (estadoRaw || "").toString().charAt(0).toUpperCase() || "-";
}

function tipoEstado(estadoRaw) {
    const c = estadoACodigo(estadoRaw);
    if (c === "T") return "tardanza";
    if (c === "F") return "inasistencia";
    if (c === "J") return "justificado";
    return "asistencia";
}

function colorCodigo(codigo) {
    if (codigo === "V") return COLORES.presente;
    if (codigo === "T") return COLORES.tardanza;
    if (codigo === "F") return COLORES.falta;
    if (codigo === "J") return COLORES.justificado;
    return null;
}

function nombreArchivo(prefijo) {
    return `${prefijo}_${new Date().toISOString().slice(0, 10)}.xlsx`;
}

async function descargarWorkbook(wb, archivo) {
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = archivo;
    link.click();
    URL.revokeObjectURL(url);
}

function nuevoWorkbook(titulo) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "I.E. Liceo Trujillo";
    wb.created = new Date();
    return wb;
}

function tituloInstitucional(ws, texto, numCols) {
    ws.mergeCells(1, 1, 1, numCols);
    const c = ws.getCell(1, 1);
    c.value = texto;
    c.font = { bold: true, size: 14, color: { argb: COLORES.encabezadoTexto } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORES.encabezado } };
    c.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 28;
}

function subtitulo(ws, texto, numCols, fila = 2) {
    ws.mergeCells(fila, 1, fila, numCols);
    const c = ws.getCell(fila, 1);
    c.value = texto;
    c.font = { size: 10, italic: true, color: { argb: "FF64748B" } };
    c.alignment = { horizontal: "center" };
}

function estiloEncabezado(ws, fila, numCols) {
    for (let c = 1; c <= numCols; c++) {
        const cell = ws.getCell(fila, c);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORES.encabezado } };
        cell.font = { bold: true, color: { argb: COLORES.encabezadoTexto }, size: 10 };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
            top: { style: "thin", color: { argb: COLORES.borde } },
            bottom: { style: "thin", color: { argb: COLORES.borde } },
            left: { style: "thin", color: { argb: COLORES.borde } },
            right: { style: "thin", color: { argb: COLORES.borde } }
        };
    }
    ws.getRow(fila).height = 20;
}

function bordeCompleto(ws, fila, numCols) {
    for (let c = 1; c <= numCols; c++) {
        ws.getCell(fila, c).border = {
            top: { style: "thin", color: { argb: COLORES.borde } },
            bottom: { style: "thin", color: { argb: COLORES.borde } },
            left: { style: "thin", color: { argb: COLORES.borde } },
            right: { style: "thin", color: { argb: COLORES.borde } }
        };
    }
}

function bandaAula(ws, fila, numCols, texto) {
    ws.mergeCells(fila, 1, fila, numCols);
    const c = ws.getCell(fila, 1);
    c.value = texto;
    c.font = { bold: true, size: 10, color: { argb: COLORES.tituloAula } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORES.bandaAula } };
    c.alignment = { horizontal: "left", indent: 1 };
    ws.getRow(fila).height = 18;
    bordeCompleto(ws, fila, numCols);
}

function ordenGrado(grado) {
    const m = String(grado || "").match(/(\d+)/);
    if (m) return parseInt(m[1], 10);
    const mapa = { primero: 1, segundo: 2, tercero: 3, cuarto: 4, quinto: 5, sexto: 6 };
    for (const [n, v] of Object.entries(mapa)) {
        if (String(grado).toLowerCase().includes(n)) return v;
    }
    return 99;
}

function ordenNivel(nivel) {
    const n = String(nivel || "").toLowerCase();
    if (n.includes("prim")) return 0;
    if (n.includes("sec")) return 1;
    return 9;
}

function nombreCompleto(e) {
    return `${e.nombres || ""} ${e.apellidos || ""}`.trim() || "Sin nombre";
}

function claveAulaDe(f) {
    return `${f.nivel || ""}|${f.grado}|${f.seccion}|${f.turno || ""}`;
}

function textoAula(f) {
    const nivel = f.nivel ? `${f.nivel} — ` : "";
    const turno = f.turno ? ` — Turno ${f.turno}` : "";
    return `AULA: ${nivel}${f.grado}° Grado — Sección ${f.seccion || "-"}${turno}`;
}

function fechaLegible(iso) {
    const [a, m, d] = iso.split("-");
    return `${d}/${m}/${a}`;
}

function formatoHora(fechaHora) {
    if (!fechaHora) return "-";
    const s = String(fechaHora);
    const m = s.match(/(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : s.slice(11, 16) || s;
}

// ==================== REPORTE DIARIO ====================
export async function exportarReporteDiario(filas, fechaISO) {
    if (!filas.length) return false;

    const wb = nuevoWorkbook();
    const ws = wb.addWorksheet("Diario");
    const TOTAL_COLS = 10;
    ws.columns = [
        { width: 6 }, { width: 30 }, { width: 11 }, { width: 7 }, { width: 9 },
        { width: 10 }, { width: 12 }, { width: 24 }, { width: 20 }, { width: 12 }
    ];

    tituloInstitucional(ws, "I.E. LICEO TRUJILLO — REPORTE DIARIO DE ASISTENCIA", TOTAL_COLS);
    subtitulo(ws, `Fecha: ${fechaLegible(fechaISO)} — Generado el ${new Date().toLocaleDateString("es-PE")}`, TOTAL_COLS);

    // Resumen de estados
    const conteo = { asistencia: 0, tardanza: 0, inasistencia: 0, justificado: 0 };
    filas.forEach((f) => { conteo[tipoEstado(f.estado)] += 1; });

    let fila = 4;
    const resumen = [
        ["Presentes", conteo.asistencia],
        ["Tardanzas", conteo.tardanza],
        ["Faltas", conteo.inasistencia],
        ["Justificados", conteo.justificado],
        ["TOTAL", filas.length]
    ];
    resumen.forEach(([label, valor], i) => {
        const c1 = ws.getCell(fila, 1 + i * 2);
        const c2 = ws.getCell(fila, 2 + i * 2);
        c1.value = label;
        c2.value = valor;
        c1.font = { bold: true, size: 10 };
        c2.font = { bold: true, size: 11, color: { argb: COLORES.encabezado } };
        c1.alignment = { horizontal: "right" };
        c2.alignment = { horizontal: "center" };
        c2.border = {
            bottom: { style: "medium", color: { argb: COLORES.encabezado } }
        };
    });
    fila += 2;

    const encabezados = ["N°", "Estudiante", "Nivel", "Grado", "Sección", "Turno", "Estado", "Observación", "Registrado por", "Hora"];
    encabezados.forEach((h, i) => { ws.getCell(fila, i + 1).value = h; });
    estiloEncabezado(ws, fila, TOTAL_COLS);
    fila++;

    const ordenados = [...filas].sort((a, b) => {
        const ka = claveAulaDe(a), kb = claveAulaDe(b);
        if (ka !== kb) {
            const [na, ga, sa] = ka.split("|");
            const [nb, gb, sb] = kb.split("|");
            const d = ordenNivel(na) - ordenNivel(nb) || ordenGrado(ga) - ordenGrado(gb) || String(sa).localeCompare(String(sb));
            if (d !== 0) return d;
        }
        return a.estudiante.localeCompare(b.estudiante, "es");
    });

    let aulaActual = null;
    let num = 0;
    ordenados.forEach((f, idx) => {
        const ka = claveAulaDe(f);
        if (ka !== aulaActual) {
            aulaActual = ka;
            bandaAula(ws, fila, TOTAL_COLS, textoAula(f));
            fila++;
        }
        num++;
        const valores = [
            num, f.estudiante, f.nivel || "-", f.grado || "-", f.seccion || "-",
            f.turno || "-", f.estado || "-", f.observacion || "-",
            f.registradoPor || "-", formatoHora(f.fechaHora)
        ];
        valores.forEach((v, i) => {
            const cell = ws.getCell(fila, i + 1);
            cell.value = v;
            cell.font = { size: 10 };
            if (i === 0 || i === 2 || i === 3 || i === 4 || i === 5) cell.alignment = { horizontal: "center" };
        });
        const colorEstado = colorCodigo(estadoACodigo(f.estado));
        if (colorEstado) {
            ws.getCell(fila, 7).font = { bold: true, size: 10, color: { argb: colorEstado } };
        }
        if (idx % 2 === 1) {
            for (let c = 1; c <= TOTAL_COLS; c++) {
                ws.getCell(fila, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORES.zebra } };
            }
        }
        bordeCompleto(ws, fila, TOTAL_COLS);
        fila++;
    });

    ws.views = [{ state: "frozen", ySplit: 6 }];
    await descargarWorkbook(wb, nombreArchivo("reporte_diario_asistencia"));
    return true;
}

// ==================== REPORTE MENSUAL ====================
// Cuadricula grande: una fila por alumno, una columna por dia del mes.
// Cada celda lleva la letra del estado: A (asistencia), F (falta), T (tarde), J (justificado).

const MESES_ES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];

function nombreMesAnio(iso) {
    const [a, m] = iso.split("-").map(Number);
    return `${MESES_ES[m - 1]} ${a}`;
}

export async function exportarReporteMensual(estudiantes, mapaAsistencias, desde, hasta) {
    if (!estudiantes || !estudiantes.length) return false;

    // Todas las fechas del rango
    const fechas = [];
    const d = new Date(`${desde}T00:00:00`);
    const fin = new Date(`${hasta}T00:00:00`);
    while (d <= fin) {
        fechas.push(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
    }
    if (!fechas.length) return false;

    const unSoloMes = fechas.every((f) => f.slice(0, 7) === fechas[0].slice(0, 7));
    const TOTAL_COLS = 2 + fechas.length;

    const wb = nuevoWorkbook();
    const ws = wb.addWorksheet("Mensual");
    ws.columns = [{ width: 8 }, { width: 34 }];
    for (let i = 0; i < fechas.length; i++) ws.columns.push({ width: 5 });

    tituloInstitucional(
        ws,
        `I.E. LICEO TRUJILLO — ASISTENCIA MENSUAL — ${unSoloMes ? nombreMesAnio(desde) : `${fechaLegible(desde)} al ${fechaLegible(hasta)}`}`,
        TOTAL_COLS
    );
    subtitulo(ws, `Periodo: ${fechaLegible(desde)} al ${fechaLegible(hasta)} — ${estudiantes.length} alumnos — Generado el ${new Date().toLocaleDateString("es-PE")}`, TOTAL_COLS);

    let fila = 4;

    // Encabezados: N°, Estudiante, dias
    ws.getCell(fila, 1).value = "N°";
    ws.getCell(fila, 2).value = "Estudiante";
    fechas.forEach((f, i) => {
        const [a, m, dd] = f.split("-");
        ws.getCell(fila, 3 + i).value = unSoloMes ? Number(dd) : `${dd}/${m}`;
    });
    estiloEncabezado(ws, fila, TOTAL_COLS);
    ws.getRow(fila).height = 22;
    fila++;

    // Ordenar por aula
    const ordenados = [...estudiantes].sort((a, b) => {
        const dOrd = ordenNivel(a.nivel) - ordenNivel(b.nivel)
            || ordenGrado(a.grado) - ordenGrado(b.grado)
            || String(a.seccion || "").localeCompare(String(b.seccion || ""));
        if (dOrd !== 0) return dOrd;
        return `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, "es");
    });

    let aulaActual = null;
    let num = 0;
    ordenados.forEach((est, idx) => {
        const ka = `${est.nivel}|${est.grado}|${est.seccion}|${est.turno || ""}`;
        if (ka !== aulaActual) {
            aulaActual = ka;
            bandaAula(ws, fila, TOTAL_COLS, textoAula(est));
            fila++;
        }

        num++;
        ws.getCell(fila, 1).value = num;
        ws.getCell(fila, 2).value = nombreCompleto(est);
        ws.getCell(fila, 1).alignment = { horizontal: "center" };

        const porFecha = mapaAsistencias.get(String(est.id)) || new Map();
        fechas.forEach((f, i) => {
            const reg = porFecha.get(f);
            const cod = reg ? estadoACodigo(reg.estado) : "";
            const cell = ws.getCell(fila, 3 + i);
            cell.value = cod === "V" ? "A" : cod === "F" ? "F" : cod === "T" ? "T" : cod === "J" ? "J" : "";
            cell.alignment = { horizontal: "center" };
            cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
            const color = colorCodigo(cod);
            if (color) {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
            }
        });

        // Zebra suave solo en columnas de texto (las celdas de estado ya tienen color)
        if (idx % 2 === 1) {
            ws.getCell(fila, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORES.zebra } };
            ws.getCell(fila, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORES.zebra } };
        }
        bordeCompleto(ws, fila, TOTAL_COLS);
        ws.getRow(fila).height = 15;
        fila++;
    });

    ws.views = [{ state: "frozen", ySplit: 4, xSplit: 2 }];
    await descargarWorkbook(wb, nombreArchivo("reporte_mensual_asistencia"));
    return true;
}

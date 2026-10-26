module.exports = {
    aulas: {
        table: "aulas",
        fields: ["nombre", "capacidad", "nivel", "estado", "descripcion"]
    },
    estudiantes: {
        table: "estudiantes",
        fields: [
            "usuario_id", "nombres", "apellidos", "dni", "fecha_nacimiento",
            "nivel", "grado", "seccion", "turno", "direccion", "telefono",
            "email", "foto_url", "estado", "fecha_matricula", "es_demo"
        ]
    },
    padres: {
        table: "padres",
        fields: ["usuario_id", "nombres", "apellidos", "dni", "telefono", "email", "direccion", "estado"]
    },
    "estudiante-padre": {
        table: "estudiante_padre",
        fields: ["estudiante_id", "padre_id", "parentesco"]
    },
    asistencias: {
        table: "asistencias",
        fields: ["estudiante_id", "fecha", "estado", "observacion", "registrado_por"]
    },
    justificaciones: {
        table: "justificaciones",
        fields: [
            "estudiante_id", "padre_id", "fecha_inicio", "fecha_fin", "motivo",
            "estado", "observacion", "solicitado_por", "aprobado_por", "fecha_aprobacion"
        ]
    },
    cursos: {
        table: "cursos",
        fields: ["nombre", "codigo", "nivel", "grado", "horas_semanales", "descripcion"]
    },
    "docente-curso": {
        table: "docente_curso",
        fields: ["docente_id", "curso_id", "seccion", "anio_lectivo"]
    },
    notas: {
        table: "notas",
        fields: ["estudiante_id", "curso_id", "periodo", "nota", "tipo_nota", "observacion", "registrado_por"]
    },
    tareas: {
        table: "tareas",
        fields: ["curso_id", "titulo", "descripcion", "fecha_asignacion", "fecha_entrega", "puntos_maximos", "archivo_url", "creado_por"]
    },
    "entrega-tareas": {
        table: "entrega_tareas",
        fields: ["tarea_id", "estudiante_id", "nota", "observacion", "archivo_url", "estado"]
    },
    pagos: {
        table: "pagos",
        fields: [
            "estudiante_id", "concepto", "monto", "fecha_pago", "fecha_vencimiento",
            "estado", "metodo_pago", "recibo_numero", "observacion", "registrado_por"
        ]
    },
    horarios: {
        table: "horarios",
        fields: ["curso_id", "aula_id", "dia_semana", "hora_inicio", "hora_fin", "seccion", "anio_lectivo"]
    },
    eventos: {
        table: "eventos",
        fields: ["titulo", "descripcion", "fecha_inicio", "fecha_fin", "tipo", "ubicacion", "creado_por", "estado"]
    },
    comunicados: {
        table: "comunicados",
        fields: ["titulo", "contenido", "tipo", "publicado_por", "archivo_url", "prioridad"]
    },
    documentos: {
        table: "documentos",
        fields: ["titulo", "descripcion", "categoria", "archivo_url", "subido_por", "anio"]
    },
    libros: {
        table: "libros",
        fields: [
            "titulo", "autor", "isbn", "editorial", "anio_publicacion", "categoria",
            "cantidad_total", "cantidad_disponible", "ubicacion", "estado"
        ]
    },
    "prestamos-libros": {
        table: "prestamos_libros",
        fields: [
            "libro_id", "estudiante_id", "fecha_prestamo", "fecha_devolucion_prevista",
            "fecha_devolucion_real", "estado", "observacion"
        ]
    },
    inventario: {
        table: "inventario",
        fields: [
            "nombre", "descripcion", "categoria", "cantidad", "unidad_medida",
            "estado", "ubicacion", "fecha_adquisicion", "valor_unitario", "anio_registro"
        ]
    },
    salud: {
        table: "salud_registros",
        fields: [
            "estudiante_id", "fecha", "tipo_atencion", "sintomas", "tratamiento",
            "medicamento_administrado", "atendido_por", "observacion"
        ]
    },
    psicologia: {
        table: "psicologia_registros",
        fields: [
            "estudiante_id", "fecha", "tipo_atencion", "motivo", "observacion",
            "recomendaciones", "atendido_por", "estado"
        ]
    },
    tutoria: {
        table: "tutoria_registros",
        fields: ["estudiante_id", "docente_id", "fecha", "tipo", "descripcion", "seguimiento", "estado"]
    },
    "foro-temas": {
        table: "foro_temas",
        fields: ["titulo", "contenido", "categoria", "creado_por", "estado"]
    },
    "foro-respuestas": {
        table: "foro_respuestas",
        fields: ["tema_id", "contenido", "creado_por"]
    },
    auditoria: {
        table: "auditoria",
        fields: ["usuario_id", "accion", "tabla_afectada", "registro_id", "valores_anteriores", "valores_nuevos", "ip"],
        readOnly: false
    }
};

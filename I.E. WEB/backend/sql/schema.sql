CREATE DATABASE IF NOT EXISTS escuela_liceo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE escuela_liceo;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    cargo ENUM('Director', 'Subdirector', 'Docente', 'Sub Docente', 'Alumno', 'Padre', 'Apafa') NOT NULL,
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_cargo (cargo)
);

CREATE TABLE IF NOT EXISTS aulas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    capacidad INT DEFAULT 28,
    nivel ENUM('Primaria', 'Secundaria') NOT NULL,
    estado ENUM('Operativo', 'Mantenimiento', 'Inactivo') DEFAULT 'Operativo',
    descripcion TEXT,
    INDEX idx_nivel (nivel)
);

CREATE TABLE IF NOT EXISTS estudiantes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    dni VARCHAR(20) UNIQUE,
    fecha_nacimiento DATE,
    nivel ENUM('Primaria', 'Secundaria') NOT NULL,
    grado INT NOT NULL,
    seccion ENUM('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O') NOT NULL,
    turno ENUM('Mañana', 'Tarde') NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    foto_url VARCHAR(255),
    estado ENUM('Activo', 'Retirado', 'Egresado') DEFAULT 'Activo',
    fecha_matricula DATE,
    es_demo BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_nivel_grado (nivel, grado),
    INDEX idx_seccion (seccion),
    INDEX idx_turno (turno),
    INDEX idx_aula (nivel, grado, seccion, turno)
);

CREATE TABLE IF NOT EXISTS padres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    dni VARCHAR(20) UNIQUE,
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT,
    estado ENUM('Activo', 'Inactivo') DEFAULT 'Activo',
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_dni (dni)
);

CREATE TABLE IF NOT EXISTS estudiante_padre (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id INT NOT NULL,
    padre_id INT NOT NULL,
    parentesco ENUM('Padre', 'Madre', 'Tutor', 'Abuelo') NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
    FOREIGN KEY (padre_id) REFERENCES padres(id) ON DELETE CASCADE,
    UNIQUE KEY unique_relacion (estudiante_id, padre_id)
);

CREATE TABLE IF NOT EXISTS asistencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id INT NOT NULL,
    fecha DATE NOT NULL,
    estado ENUM('Presente', 'Ausente', 'Tarde', 'Justificado') NOT NULL,
    observacion TEXT,
    registrado_por INT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
    FOREIGN KEY (registrado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_estudiante_fecha (estudiante_id, fecha),
    INDEX idx_fecha (fecha)
);

CREATE TABLE IF NOT EXISTS justificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id INT NOT NULL,
    padre_id INT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    motivo TEXT NOT NULL,
    estado ENUM('Pendiente', 'Aprobada', 'Rechazada') DEFAULT 'Pendiente',
    observacion TEXT,
    solicitado_por INT,
    aprobado_por INT,
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_aprobacion TIMESTAMP NULL,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
    FOREIGN KEY (padre_id) REFERENCES padres(id) ON DELETE SET NULL,
    FOREIGN KEY (solicitado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (aprobado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_estudiante (estudiante_id),
    INDEX idx_estado (estado)
);

CREATE TABLE IF NOT EXISTS cursos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nivel ENUM('Primaria', 'Secundaria') NOT NULL,
    grado INT NOT NULL,
    horas_semanales INT DEFAULT 4,
    descripcion TEXT,
    INDEX idx_grado (grado)
);

CREATE TABLE IF NOT EXISTS docente_curso (
    id INT AUTO_INCREMENT PRIMARY KEY,
    docente_id INT NOT NULL,
    curso_id INT NOT NULL,
    seccion ENUM('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O') NOT NULL,
    anio_lectivo YEAR NOT NULL,
    FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_asignacion (docente_id, curso_id, seccion, anio_lectivo)
);

CREATE TABLE IF NOT EXISTS notas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id INT NOT NULL,
    curso_id INT NOT NULL,
    periodo ENUM('Bimestre 1', 'Bimestre 2', 'Bimestre 3', 'Bimestre 4', 'Final') NOT NULL,
    nota DECIMAL(4,2) NOT NULL,
    tipo_nota ENUM('Examen', 'Tarea', 'Práctica', 'Participación') NOT NULL,
    observacion TEXT,
    registrado_por INT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (registrado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_estudiante_curso (estudiante_id, curso_id),
    INDEX idx_periodo (periodo)
);

CREATE TABLE IF NOT EXISTS tareas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    curso_id INT NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_asignacion DATE NOT NULL,
    fecha_entrega DATE NOT NULL,
    puntos_maximos INT DEFAULT 20,
    archivo_url VARCHAR(255),
    creado_por INT,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_curso (curso_id),
    INDEX idx_fecha_entrega (fecha_entrega)
);

CREATE TABLE IF NOT EXISTS entrega_tareas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tarea_id INT NOT NULL,
    estudiante_id INT NOT NULL,
    fecha_entrega TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nota DECIMAL(4,2),
    observacion TEXT,
    archivo_url VARCHAR(255),
    estado ENUM('Pendiente', 'Entregado', 'Calificado') DEFAULT 'Pendiente',
    FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_entrega (tarea_id, estudiante_id)
);

CREATE TABLE IF NOT EXISTS pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id INT NOT NULL,
    concepto ENUM('Matrícula', 'Pensión', 'Material', 'Actividad Extra', 'Otro') NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha_pago DATE,
    fecha_vencimiento DATE,
    estado ENUM('Pagado', 'Pendiente', 'Vencido', 'Anulado') DEFAULT 'Pendiente',
    metodo_pago ENUM('Efectivo', 'Transferencia', 'Tarjeta', 'Cheque'),
    recibo_numero VARCHAR(50),
    observacion TEXT,
    registrado_por INT,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
    FOREIGN KEY (registrado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_estudiante (estudiante_id),
    INDEX idx_estado (estado),
    INDEX idx_fecha_vencimiento (fecha_vencimiento)
);

CREATE TABLE IF NOT EXISTS horarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    curso_id INT NOT NULL,
    aula_id INT,
    dia_semana ENUM('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado') NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    seccion ENUM('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O') NOT NULL,
    anio_lectivo YEAR NOT NULL,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (aula_id) REFERENCES aulas(id) ON DELETE SET NULL,
    INDEX idx_dia_hora (dia_semana, hora_inicio)
);

CREATE TABLE IF NOT EXISTS eventos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME,
    tipo ENUM('Académico', 'Cívico', 'Deportivo', 'Cultural', 'Otro') NOT NULL,
    ubicacion VARCHAR(100),
    creado_por INT,
    estado ENUM('Programado', 'Completado', 'Cancelado') DEFAULT 'Programado',
    FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_fecha (fecha_inicio),
    INDEX idx_tipo (tipo)
);

CREATE TABLE IF NOT EXISTS comunicados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    contenido TEXT NOT NULL,
    tipo ENUM('General', 'Padres', 'Docentes', 'Alumnos', 'Directiva') NOT NULL,
    fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    publicado_por INT,
    archivo_url VARCHAR(255),
    prioridad ENUM('Baja', 'Media', 'Alta', 'Urgente') DEFAULT 'Media',
    FOREIGN KEY (publicado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_fecha (fecha_publicacion),
    INDEX idx_tipo (tipo)
);

CREATE TABLE IF NOT EXISTS documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria ENUM('Reglamento', 'Actas', 'Certificados', 'Formularios', 'Otro') NOT NULL,
    archivo_url VARCHAR(255) NOT NULL,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subido_por INT,
    anio YEAR,
    FOREIGN KEY (subido_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_categoria (categoria),
    INDEX idx_anio (anio)
);

CREATE TABLE IF NOT EXISTS libros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    autor VARCHAR(100) NOT NULL,
    isbn VARCHAR(20) UNIQUE,
    editorial VARCHAR(100),
    anio_publicacion YEAR,
    categoria ENUM('Ficción', 'Ciencia', 'Historia', 'Matemáticas', 'Lenguaje', 'Otro') NOT NULL,
    cantidad_total INT DEFAULT 1,
    cantidad_disponible INT DEFAULT 1,
    ubicacion VARCHAR(50),
    estado ENUM('Disponible', 'Prestado', 'En reparación', 'Perdido') DEFAULT 'Disponible',
    INDEX isbn_idx (isbn),
    INDEX idx_categoria (categoria)
);

CREATE TABLE IF NOT EXISTS prestamos_libros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    libro_id INT NOT NULL,
    estudiante_id INT NOT NULL,
    fecha_prestamo DATE NOT NULL,
    fecha_devolucion_prevista DATE NOT NULL,
    fecha_devolucion_real DATE,
    estado ENUM('Activo', 'Devuelto', 'Vencido', 'Perdido') DEFAULT 'Activo',
    observacion TEXT,
    FOREIGN KEY (libro_id) REFERENCES libros(id) ON DELETE CASCADE,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
    INDEX idx_estudiante (estudiante_id),
    INDEX idx_estado (estado)
);

CREATE TABLE IF NOT EXISTS inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria ENUM('Mobiliario', 'Tecnología', 'Material', 'Equipo', 'Otro') NOT NULL,
    cantidad INT DEFAULT 1,
    unidad_medida VARCHAR(20),
    estado ENUM('Bueno', 'Regular', 'Malo', 'En reparación', 'Perdido') DEFAULT 'Bueno',
    ubicacion VARCHAR(100),
    fecha_adquisicion DATE,
    valor_unitario DECIMAL(10,2),
    anio_registro YEAR,
    INDEX idx_categoria (categoria),
    INDEX idx_estado (estado)
);

CREATE TABLE IF NOT EXISTS salud_registros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id INT NOT NULL,
    fecha DATE NOT NULL,
    tipo_atencion ENUM('Consulta', 'Curación', 'Medicación', 'Derivación', 'Otro') NOT NULL,
    sintomas TEXT,
    tratamiento TEXT,
    medicamento_administrado VARCHAR(100),
    atendido_por INT,
    observacion TEXT,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
    FOREIGN KEY (atendido_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_estudiante (estudiante_id),
    INDEX idx_fecha (fecha)
);

CREATE TABLE IF NOT EXISTS psicologia_registros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id INT NOT NULL,
    fecha DATE NOT NULL,
    tipo_atencion ENUM('Orientación', 'Evaluación', 'Seguimiento', 'Intervención', 'Otro') NOT NULL,
    motivo TEXT NOT NULL,
    observacion TEXT,
    recomendaciones TEXT,
    atendido_por INT,
    estado ENUM('En proceso', 'Cerrado', 'Derivado') DEFAULT 'En proceso',
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
    FOREIGN KEY (atendido_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_estudiante (estudiante_id),
    INDEX idx_estado (estado)
);

CREATE TABLE IF NOT EXISTS tutoria_registros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id INT NOT NULL,
    docente_id INT NOT NULL,
    fecha DATE NOT NULL,
    tipo ENUM('Académico', 'Conductual', 'Social', 'Familiar', 'Otro') NOT NULL,
    descripcion TEXT NOT NULL,
    seguimiento TEXT,
    estado ENUM('Activo', 'Cerrado') DEFAULT 'Activo',
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
    FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_estudiante (estudiante_id),
    INDEX idx_docente (docente_id)
);

CREATE TABLE IF NOT EXISTS foro_temas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    contenido TEXT NOT NULL,
    categoria ENUM('Académico', 'Administrativo', 'General', 'Otro') NOT NULL,
    creado_por INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('Abierto', 'Cerrado', 'Resuelto') DEFAULT 'Abierto',
    FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_categoria (categoria),
    INDEX idx_fecha (fecha_creacion)
);

CREATE TABLE IF NOT EXISTS foro_respuestas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tema_id INT NOT NULL,
    contenido TEXT NOT NULL,
    creado_por INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tema_id) REFERENCES foro_temas(id) ON DELETE CASCADE,
    FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_tema (tema_id)
);

CREATE TABLE IF NOT EXISTS auditoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    accion VARCHAR(50) NOT NULL,
    tabla_afectada VARCHAR(50) NOT NULL,
    registro_id INT NOT NULL,
    valores_anteriores JSON,
    valores_nuevos JSON,
    fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip VARCHAR(45),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id),
    INDEX idx_fecha (fecha_accion),
    INDEX idx_tabla (tabla_afectada)
);

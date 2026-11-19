-- ============================================================
-- SCRIPT UNIFICADO: Sistema n8n + Agente IA + WhatsApp
-- Base de datos: escuela_liceo
-- Contenido:
--   1. Base de datos escuela_liceo
--   2. Tablas n8n_chat_histories, whatsapp_notifications, school_regulations
--   3. Datos semilla del reglamento (INSERT IGNORE, idempotente)
--   4. Opciones de borrado manual de sesiones (comentadas)
--   5. Procedimiento almacenado limpiar_historial_chat
--   6. Evento programado ev_limpieza_chat_historial (diario 2:00 AM)
-- ============================================================

CREATE DATABASE IF NOT EXISTS escuela_liceo
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE escuela_liceo;

-- ============================================================
-- 1. MEMORIA DE CHAT PARA n8n (Agente IA + WhatsApp)
-- ============================================================
CREATE TABLE IF NOT EXISTS n8n_chat_histories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    message JSON NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session_id (session_id),
    INDEX idx_fecha (fecha_creacion)
) ENGINE=InnoDB;

-- ============================================================
-- 2. CONTROL DE NOTIFICACIONES WHATSAPP (anti-duplicados)
--    UNIQUE KEY: 1 sola notificacion por estudiante/tipo/dia
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id INT NOT NULL,
    padre_id INT NULL,
    tipo_notificacion ENUM('Falta', 'Tardanza', 'Justificacion', 'General') NOT NULL,
    fecha DATE NOT NULL,
    fecha_envio DATETIME NULL,
    estado ENUM('Pendiente', 'Enviado', 'Fallido') DEFAULT 'Pendiente',
    error_detalle VARCHAR(255) NULL,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
    FOREIGN KEY (padre_id) REFERENCES padres(id) ON DELETE SET NULL,
    UNIQUE KEY unique_notificacion_dia (estudiante_id, tipo_notificacion, fecha),
    INDEX idx_fecha (fecha),
    INDEX idx_estado (estado)
) ENGINE=InnoDB;

-- ============================================================
-- 3. REGLAMENTO ESCOLAR (alimentacion del RAG de la IA)
-- ============================================================
CREATE TABLE IF NOT EXISTS school_regulations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    contenido TEXT NOT NULL,
    categoria VARCHAR(50) DEFAULT 'General',
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_titulo (titulo),
    INDEX idx_categoria (categoria)
) ENGINE=InnoDB;

-- ============================================================
-- 4. DATOS SEMILLA DEL REGLAMENTO (idempotente, seguro re-ejecutar)
-- ============================================================
INSERT IGNORE INTO school_regulations (titulo, contenido, categoria) VALUES
('Tolerancia de tardanzas', 'Se considera tardanza cuando el estudiante ingresa al plantel despues de las 8:00 a.m. (turno manana) o 1:00 p.m. (turno tarde). Se toleran hasta 3 tardanzas en el bimestre sin sancion. A partir de la cuarta tardanza se citara al padre de familia y se registrara una amonestacion verbal.', 'Disciplina'),
('Justificacion de faltas', 'Toda falta debe ser justificada por el padre de familia dentro de las 48 horas siguientes, mediante certificado medico o comunicacion escrita dirigida a la Direccion. Las faltas injustificadas se reportaran automaticamente al padre via WhatsApp por el sistema de asistencia.', 'Asistencia'),
('Uso del uniforme', 'El uso del uniforme completo (polo institucional, pantalon o falda reglamentaria y zapatos negros) es obligatorio de lunes a viernes. El uso de prendas de vestir ajenas al reglamento o el no usar el uniforme completo sera motivo de amonestacion y posible suspension de 1 dia a partir de la tercera reincidencia.', 'Presentacion'),
('Presentacion personal', 'Los estudiantes deben mantener el cabello corto y limpio, las unas recortadas y el uso de accesorios moderado. Esta prohibido el uso de tatuajes visibles, piercings en la cara y el uso de celular durante el horario de clase (solo se permite en el recreo bajo supervision del docente).', 'Presentacion'),
('Proceso de suspension', 'Las faltas graves (agresion fisica, consumo de sustancias, dano a infraestructura) ameritan suspension inmediata de 1 a 5 dias habiles segun la gravedad, con citacion obligatoria al padre de familia. Las sanciones se registran en el libro de ocurrencias y se notifican via WhatsApp.', 'Sanciones');

-- ============================================================
-- 5. BORRADO MANUAL DE SESIONES (opciones de prueba)
--    Descomenta y ajusta el bloque que necesites:
-- ============================================================

-- Opcion A: borrar UNA sesion especifica (session_id = telefono
-- del remitente en WhatsApp, ej. '51987654321')
-- DELETE FROM n8n_chat_histories WHERE session_id = '51987654321';

-- Opcion B: borrar TODAS las sesiones de un dia especifico
-- DELETE FROM n8n_chat_histories WHERE DATE(fecha_creacion) = '2026-11-07';

-- ============================================================
-- 6. PROCEDIMIENTO ALMACENADO: limpieza manual con retencion
--    Uso: CALL limpiar_historial_chat(30);  -- borra >30 dias
-- ============================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS limpiar_historial_chat$$

CREATE PROCEDURE limpiar_historial_chat(IN dias_retencion INT)
BEGIN
    DELETE FROM n8n_chat_histories
    WHERE fecha_creacion < (NOW() - INTERVAL dias_retencion DAY);
END$$

DELIMITER ;

-- ============================================================
-- 7. EVENTO PROGRAMADO: limpieza automatica diaria 2:00 AM
--    Borra mensajes con mas de 1 dia de antiguedad
-- ============================================================

-- Activar el planificador de eventos
SET GLOBAL event_scheduler = ON;

-- Verificar: SHOW VARIABLES LIKE 'event_scheduler';  -- debe dar 'ON'

-- Crear el evento con inicio fijo (mañana 08/11/2026 02:00 AM)
DROP EVENT IF EXISTS ev_limpieza_chat_historial;

CREATE EVENT ev_limpieza_chat_historial
ON SCHEDULE EVERY 1 DAY
STARTS '2026-11-08 02:00:00'
DO
    DELETE FROM n8n_chat_histories
    WHERE fecha_creacion < (NOW() - INTERVAL 1 DAY);

-- ============================================================
-- VERIFICACION POST-EJECUCION
-- ============================================================
-- Ver tablas creadas:
--   SHOW TABLES;
--
-- Ver seed insertado:
--   SELECT COUNT(*) AS total_articulos FROM school_regulations;
--
-- Ver evento registrado:
--   SHOW EVENTS;
--   SELECT EVENT_NAME, STATUS, LAST_EXECUTED, NEXT_EXECUTION
--   FROM information_schema.events
--   WHERE EVENT_SCHEMA = 'escuela_liceo';
--
-- Probar el procedimiento manualmente:
--   CALL limpiar_historial_chat(1);
--
-- Administracion del evento:
--   ALTER EVENT ev_limpieza_chat_historial DISABLE;  -- pausar
--   ALTER EVENT ev_limpieza_chat_historial ENABLE;   -- reanudar
--   DROP EVENT IF EXISTS ev_limpieza_chat_historial; -- eliminar
-- ============================================================

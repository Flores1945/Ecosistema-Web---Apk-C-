const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../db");
const config = require("../config");
const { autenticar, exigirDirectiva, nombresCompletos } = require("../middleware/auth");
const { splitNombreCompleto, registrarAuditoria } = require("../helpers");

const router = express.Router();
const CARGOS = ["Director", "Subdirector", "Docente", "Sub Docente", "Alumno", "Padre", "Apafa"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Hash de relleno: así tardar lo mismo si el correo no existe (no revela qué correos hay registrados)
const HASH_FALSO = bcrypt.hashSync("relleno-para-igualar-tiempos", 10);

// Límite de intentos de login: 10 fallos por correo+IP cada 15 minutos
const VENTANA_MS = 15 * 60 * 1000;
const MAX_FALLOS = 10;
const fallos = new Map();

function bloqueado(clave) {
    const registro = fallos.get(clave);
    if (!registro) return false;
    if (Date.now() - registro.desde > VENTANA_MS) {
        fallos.delete(clave);
        return false;
    }
    return registro.n >= MAX_FALLOS;
}

function anotarFallo(clave) {
    const registro = fallos.get(clave);
    if (!registro || Date.now() - registro.desde > VENTANA_MS) {
        fallos.set(clave, { n: 1, desde: Date.now() });
    } else {
        registro.n += 1;
    }
}

function tokenDe(usuario) {
    return jwt.sign(
        {
            id: usuario.id,
            email: usuario.email,
            cargo: usuario.cargo,
            nombres: usuario.nombres,
            apellidos: usuario.apellidos
        },
        config.jwtSecret,
        { expiresIn: "12h", algorithm: "HS256" }
    );
}

function perfilPublico(usuario) {
    return {
        uid: String(usuario.id),
        id: usuario.id,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        nombresCompletos: nombresCompletos(usuario),
        correo: usuario.email,
        cargo: usuario.cargo,
        telefono: usuario.telefono,
        activo: Boolean(usuario.activo)
    };
}

router.post("/login", async (req, res) => {
    try {
        const body = req.body || {};
        const email = String(body.email || body.correo || "").trim().toLowerCase();
        const password = String(body.password || body.clave || "");

        if (!email || !password) {
            return res.status(400).json({ error: "Completa correo y contraseña." });
        }

        const clave = `${req.ip}|${email}`;
        if (bloqueado(clave)) {
            return res.status(429).json({ error: "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo." });
        }

        const rows = await query("SELECT * FROM usuarios WHERE email = ? LIMIT 1", [email]);
        const usuario = rows[0];

        const ok = await bcrypt.compare(password, usuario ? String(usuario.password) : HASH_FALSO);
        if (!usuario || !ok) {
            anotarFallo(clave);
            return res.status(401).json({ error: "Correo o contraseña incorrectos." });
        }

        if (!usuario.activo) {
            return res.status(403).json({ error: "La cuenta está inactiva." });
        }

        fallos.delete(clave);
        res.json({
            token: tokenDe(usuario),
            usuario: perfilPublico(usuario)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "No se pudo iniciar sesión." });
    }
});

// Solo la directiva puede dar de alta personal. (Antes cualquiera podía crear una cuenta de Director.)
router.post("/register", autenticar, exigirDirectiva, async (req, res) => {
    try {
        const body = req.body || {};
        const email = String(body.email || body.correo || "").trim().toLowerCase();
        const password = String(body.password || body.clave || "");
        const cargo = body.cargo;
        const telefono = body.telefono || body.celular || null;
        const dni = body.dni || null;

        let nombres = body.nombres;
        let apellidos = body.apellidos;
        if (!nombres && body.nombresCompletos) {
            const partido = splitNombreCompleto(body.nombresCompletos);
            nombres = partido.nombres;
            apellidos = partido.apellidos;
        }

        if (!email || !password || !nombres || !apellidos || !cargo) {
            return res.status(400).json({ error: "Faltan datos obligatorios." });
        }
        if (!EMAIL.test(email)) {
            return res.status(400).json({ error: "El correo no es válido." });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "La contraseña debe tener mínimo 6 caracteres." });
        }
        if (!CARGOS.includes(cargo)) {
            return res.status(400).json({ error: "Cargo no válido." });
        }
        // Un Subdirector no puede crear cuentas con más poder que él
        if (req.usuario.cargo !== "Director" && ["Director", "Subdirector"].includes(cargo)) {
            return res.status(403).json({ error: "Solo el Director puede crear cuentas de la directiva." });
        }

        const existe = await query("SELECT id FROM usuarios WHERE email = ? LIMIT 1", [email]);
        if (existe.length) {
            return res.status(409).json({ error: "Ese correo ya existe." });
        }

        const hash = await bcrypt.hash(password, 10);
        const result = await query(
            `INSERT INTO usuarios (email, password, nombres, apellidos, cargo, telefono)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [email, hash, nombres, apellidos, cargo, telefono]
        );

        const creado = {
            id: result.insertId,
            email,
            nombres,
            apellidos,
            cargo,
            telefono,
            activo: 1
        };

        await registrarAuditoria(query, req, {
            accion: "CREAR",
            tabla: "usuarios",
            registroId: creado.id,
            nuevo: { email, nombres, apellidos, cargo, dni }
        });

        res.status(201).json({ usuario: perfilPublico(creado) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "No se pudo registrar el usuario." });
    }
});

router.get("/me", autenticar, async (req, res) => {
    try {
        const rows = await query(
            "SELECT id, email, nombres, apellidos, cargo, telefono, activo FROM usuarios WHERE id = ? LIMIT 1",
            [req.usuario.id]
        );
        if (!rows[0]) {
            return res.status(404).json({ error: "Usuario no encontrado." });
        }
        res.json({ usuario: perfilPublico(rows[0]) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "No se pudo leer el perfil." });
    }
});

module.exports = router;

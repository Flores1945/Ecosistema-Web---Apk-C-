const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../db");
const config = require("../config");
const { autenticar, nombresCompletos } = require("../middleware/auth");
const { splitNombreCompleto, registrarAuditoria } = require("../helpers");

const router = express.Router();
const CARGOS = ["Director", "Subdirector", "Docente", "Sub Docente", "Alumno", "Padre", "Apafa"];

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
        { expiresIn: "12h" }
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
        const email = String(req.body.email || req.body.correo || "").trim().toLowerCase();
        const password = req.body.password || req.body.clave || "";

        if (!email || !password) {
            return res.status(400).json({ error: "Completa correo y contraseña." });
        }

        const rows = await query("SELECT * FROM usuarios WHERE email = ? LIMIT 1", [email]);
        const usuario = rows[0];

        if (!usuario) {
            return res.status(401).json({ error: "Correo o contraseña incorrectos." });
        }

        if (!usuario.activo) {
            return res.status(403).json({ error: "La cuenta está inactiva." });
        }

        const ok = await bcrypt.compare(password, usuario.password);
        if (!ok) {
            return res.status(401).json({ error: "Correo o contraseña incorrectos." });
        }

        res.json({
            token: tokenDe(usuario),
            usuario: perfilPublico(usuario)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "No se pudo iniciar sesión." });
    }
});

router.post("/register", async (req, res) => {
    try {
        const email = String(req.body.email || req.body.correo || "").trim().toLowerCase();
        const password = req.body.password || req.body.clave || "";
        const cargo = req.body.cargo;
        const telefono = req.body.telefono || req.body.celular || null;
        const dni = req.body.dni || null;

        let nombres = req.body.nombres;
        let apellidos = req.body.apellidos;
        if (!nombres && req.body.nombresCompletos) {
            const partido = splitNombreCompleto(req.body.nombresCompletos);
            nombres = partido.nombres;
            apellidos = partido.apellidos;
        }

        if (!email || !password || !nombres || !apellidos || !cargo) {
            return res.status(400).json({ error: "Faltan datos obligatorios." });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "La contraseña debe tener mínimo 6 caracteres." });
        }
        if (!CARGOS.includes(cargo)) {
            return res.status(400).json({ error: "Cargo no válido." });
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

        if (req.usuario) {
            await registrarAuditoria(query, req, {
                accion: "CREAR",
                tabla: "usuarios",
                registroId: creado.id,
                nuevo: { email, nombres, apellidos, cargo, dni }
            });
        }

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

const jwt = require("jsonwebtoken");
const config = require("../config");
const { esDirectiva } = require("../permisos");

function autenticar(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!token) {
        return res.status(401).json({ error: "Sesión no iniciada." });
    }

    try {
        req.usuario = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
        next();
    } catch {
        return res.status(401).json({ error: "Token inválido o vencido." });
    }
}

function exigirDirectiva(req, res, next) {
    if (!esDirectiva(req.usuario?.cargo)) {
        return res.status(403).json({ error: "Solo la directiva puede hacer esto." });
    }
    next();
}

function nombresCompletos(usuario) {
    return `${usuario.nombres || ""} ${usuario.apellidos || ""}`.trim();
}

module.exports = { autenticar, exigirDirectiva, nombresCompletos };

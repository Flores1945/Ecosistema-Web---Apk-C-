const jwt = require("jsonwebtoken");
const config = require("../config");

function autenticar(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!token) {
        return res.status(401).json({ error: "Sesión no iniciada." });
    }

    try {
        req.usuario = jwt.verify(token, config.jwtSecret);
        next();
    } catch {
        return res.status(401).json({ error: "Token inválido o vencido." });
    }
}

function nombresCompletos(usuario) {
    return `${usuario.nombres || ""} ${usuario.apellidos || ""}`.trim();
}

module.exports = { autenticar, nombresCompletos };

const path = require("path");
const express = require("express");
const cors = require("cors");
const config = require("./config");
const { pool } = require("./db");
const { autenticar } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const crudRoutes = require("./routes/crud");

const app = express();
const frontendDir = path.join(__dirname, "..", "..");

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(frontendDir));

app.get("/api/health", async (_req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ ok: true, db: "escuela_liceo" });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api", autenticar, crudRoutes);

app.get("/", (_req, res) => {
    res.redirect("/html/index.html");
});

app.listen(config.port, () => {
    console.log(`Backend I.E. Liceo en http://localhost:${config.port}`);
    console.log(`Login: http://localhost:${config.port}/html/index.html`);
});

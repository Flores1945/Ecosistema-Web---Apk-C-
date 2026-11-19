// Migración única: copia todos los usuarios de MySQL (tabla usuarios)
// a Firebase Authentication conservando su contraseña (hash bcrypt).
// Uso:  npm run migrate-firebase

const { query, pool } = require("../src/db");
const { auth } = require("../src/firebase");

const LOTE = 500; // importUsers admite hasta 1000 por llamada

async function main() {
    console.log("Leyendo usuarios desde MySQL...");
    const usuarios = await query(
        "SELECT id, email, password, nombres, apellidos, cargo, activo FROM usuarios ORDER BY id"
    );
    console.log(`${usuarios.length} usuarios encontrados.`);

    if (!usuarios.length) {
        console.log("No hay nada que migrar.");
        await pool.end();
        return;
    }

    let creados = 0;
    let omitidos = 0;
    let fallidos = 0;

    for (let i = 0; i < usuarios.length; i += LOTE) {
        const lote = usuarios.slice(i, i + LOTE);

        const resultados = await auth.importUsers(
            lote.map((u) => ({
                uid: String(u.id),
                email: u.email,
                // La contraseña ya viene hasheada con bcrypt desde MySQL;
                // Firebase la verifica directamente sin conocer el texto plano.
                passwordHash: Buffer.from(String(u.password), "utf8"),
                displayName: `${u.nombres || ""} ${u.apellidos || ""}`.trim() || undefined,
                disabled: !u.activo
            })),
            { hash: { algorithm: "BCRYPT" } }
        );

        resultados.errors.forEach((error, indice) => {
            const usuario = lote[indice];
            if (error.reason === "invalid") {
                fallidos += 1;
                console.error(`  ✗ ${usuario.email}: ${error.message}`);
            } else {
                // Errores como EMAIL_EXISTS / UID_EXISTS: ya estaba migrado
                omitidos += 1;
            }
        });

        creados += lote.length - resultados.errors.length;
        console.log(`Lote ${Math.floor(i / LOTE) + 1}: ${creados} migrados hasta ahora.`);
    }

    console.log(`\nListo: ${creados} creados, ${omitidos} ya existían, ${fallidos} con error.`);
    await pool.end();
}

main().catch(async (error) => {
    console.error("Error en la migración:", error);
    await pool.end().catch(() => {});
    process.exit(1);
});

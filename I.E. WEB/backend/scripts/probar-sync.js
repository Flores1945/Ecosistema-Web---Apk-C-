const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("../firebase-key.json");
const { pool } = require("../src/db"); // Usa la misma conexión que tu backend

// Inicializar Firebase
initializeApp({
  credential: cert(serviceAccount)
});

const dbFirestore = getFirestore();

async function probarSincronizacion() {
  try {
    console.log("1. Conectando a MySQL (Local instance MySQL96)...");
    const [estudiantes] = await pool.query("SELECT id, nombres, apellidos, nivel, grado, seccion, dni FROM estudiantes LIMIT 5");

    if (estudiantes.length === 0) {
      console.log("No se encontraron estudiantes en MySQL.");
      process.exit(0);
    }

    console.log(`¡Conexión exitosa! Se encontraron ${estudiantes.length} alumnos. Subiendo a Firebase...`);

    for (const est of estudiantes) {
      await dbFirestore.collection('estudiantes').doc(String(est.id)).set({
        nombres: est.nombres,
        apellidos: est.apellidos,
        nivel: est.nivel,
        grado: est.grado,
        seccion: est.seccion,
        dni: est.dni,
        sincronizado_desde: "Local instance MySQL96"
      });
      console.log(` -> Sincronizado: ${est.nombres} ${est.apellidos}`);
    }

    console.log("\n¡Prueba terminada con éxito! Revisa tu consola de Firebase Firestore.");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error durante la prueba:", error);
    process.exit(1);
  }
}

probarSincronizacion();
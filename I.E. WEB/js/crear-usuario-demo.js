// Script para crear usuario demo de prueba
// Ejecutar solo una vez en la consola del navegador

import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js";
import { auth, db } from "./firebase-config.js";

const WEB_USERS_NODE = "usuarios_web";

async function crearUsuarioDemo() {
    const correoDemo = "admin@liceo.edu";
    const claveDemo = "admin123";
    
    try {
        console.log("Creando usuario demo...");
        
        // Crear usuario en Firebase Authentication
        const credencial = await createUserWithEmailAndPassword(auth, correoDemo, claveDemo);
        const { uid } = credencial.user;
        
        console.log("Usuario creado en Firebase Auth. UID:", uid);
        
        // Crear perfil en Realtime Database
        await set(ref(db, `${WEB_USERS_NODE}/${uid}`), {
            uid,
            nombresCompletos: "Director Demo",
            dni: "12345678",
            correo: correoDemo,
            celular: "987654321",
            cargo: "Director",
            fechaRegistro: new Date().toISOString()
        });
        
        console.log("✅ Usuario demo creado exitosamente");
        console.log("Correo:", correoDemo);
        console.log("Contraseña:", claveDemo);
        console.log("Cargo: Director");
        console.log("====================================");
        console.log("Ya puedes iniciar sesión con estas credenciales.");
        
    } catch (error) {
        if (error.code === "auth/email-already-in-use") {
            console.log("⚠️ El usuario demo ya existe");
            console.log("Puedes usar las credenciales existentes:");
            console.log("Correo:", correoDemo);
            console.log("Contraseña:", claveDemo);
        } else {
            console.error("❌ Error al crear usuario demo:", error);
        }
    }
}

// Ejecutar automáticamente si se importa este archivo
crearUsuarioDemo();

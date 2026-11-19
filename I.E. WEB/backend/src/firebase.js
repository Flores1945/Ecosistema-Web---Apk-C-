const path = require("path");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

// La clave de servicio nunca se sube a git. En Render se pasa en la variable
// de entorno FIREBASE_SERVICE_ACCOUNT (JSON en base64); en local se usa el
// archivo firebase-key.json (ignorado por .gitignore).
function cargarServiceAccount() {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        return JSON.parse(
            Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8")
        );
    }
    try {
        return require(path.join(__dirname, "..", "firebase-key.json"));
    } catch {
        return null;
    }
}

const serviceAccount = cargarServiceAccount();
let firestore = null;
let auth = null;

if (serviceAccount) {
    if (!getApps().length) {
        initializeApp({ credential: cert(serviceAccount) });
    }
    firestore = getFirestore();
    auth = getAuth();
} else {
    console.warn(
        "[firebase] Sin credenciales (FIREBASE_SERVICE_ACCOUNT o firebase-key.json): " +
        "los espejos a Firestore quedan desactivados."
    );
}

module.exports = { firestore, auth };

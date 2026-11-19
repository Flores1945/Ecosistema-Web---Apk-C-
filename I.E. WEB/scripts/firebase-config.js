import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAxVHP1-7rtzB-4V2AhXb4wKNIw-0N3f8E",
    authDomain: "apk-asistencia-7be25.firebaseapp.com",
    projectId: "apk-asistencia-7be25",
    storageBucket: "apk-asistencia-7be25.firebasestorage.app",
    messagingSenderId: "1093344381400",
    appId: "1:1093344381400:web:59df70793cf83fbe540aad",
    measurementId: "G-BJH6CQTV0S"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { auth, db };
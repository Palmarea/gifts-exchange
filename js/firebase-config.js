/* ═══════════════════════════════════════════════════════════
   NIKOLAUS - Firebase Configuration
   ═══════════════════════════════════════════════════════════ */

const firebaseConfig = {
  apiKey: "AIzaSyCgEgMZFBNDroezKODD7816IPsuPK41VdA",
  authDomain: "nikolaus-santa.firebaseapp.com",
  projectId: "nikolaus-santa",
  storageBucket: "nikolaus-santa.firebasestorage.app",
  messagingSenderId: "975712333894",
  appId: "1:975712333894:web:564d8928f19e3397ef9a47"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencia a Firestore
const db = firebase.firestore();
// =====================================================================
// Gezinsmenu – instellingen
// =====================================================================
// Zolang FIREBASE_CONFIG op null staat, werkt de app "Alleen op dit toestel".
// Vervang null door het configuratieblok uit Firebase (zie README.md, stap 9).
// Laat de rest van dit bestand ongewijzigd.

window.FIREBASE_CONFIG = null;

// Voorbeeld van hoe het er na het plakken uitziet:
// window.FIREBASE_CONFIG = {
//     apiKey: "AIza...",
//     authDomain: "gezinsmenu-xxxxx.firebaseapp.com",
//     projectId: "gezinsmenu-xxxxx",
//     storageBucket: "gezinsmenu-xxxxx.firebasestorage.app",
//     messagingSenderId: "123456789",
//     appId: "1:123456789:web:abc123"
// };

// Naam van jullie gezinsmap in de databank. Niet meer wijzigen na de eerste ingebruikname.
window.FAMILY_ID = "ons-gezin";

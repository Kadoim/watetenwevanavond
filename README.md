# Gezinsmenu – online zetten (gratis, zonder abonnement)

Deze map is een volledige webapp. Ze draait gratis op **GitHub Pages** (de website) met **Firebase** (login met Google + gedeelde databank). Je hebt geen betaalkaart en geen abonnement nodig.

Reken op **30 à 45 minuten**, eenmalig. Daarna heb je een vaste link, bv. `https://jouwnaam.github.io/gezinsmenu/`, die het hele gezin op gsm en computer kan openen.

---

## Wat je nodig hebt

| Wat | Waarom | Kost |
|---|---|---|
| Een Google-account voor elk gezinslid | Om in te loggen | gratis |
| Een GitHub-account (alleen voor jou) | Daar staat de website | gratis |
| Een Firebase-project (met jouw Google-account) | Daar staan weekmenu, boodschappenlijst en eigen recepten | gratis (Spark-plan) |

**Eerst even uitproberen?** Open `index.html` gewoon op je computer. Zonder Firebase werkt alles, maar alleen op dat toestel (rechtsboven staat dan "Alleen op dit toestel").

---

## Deel A – De website op GitHub zetten

**Stap 1. GitHub-account maken**
Ga naar <https://github.com/signup> en maak een account. Je gebruikersnaam komt in de link van de website, dus kies iets korts (bv. `mietw`).

**Stap 2. Een repository maken**
1. Klik rechtsboven op **+** → **New repository**.
2. Naam: `gezinsmenu`.
3. Kies **Public**. Op een gratis account werkt GitHub Pages alleen voor publieke repositories. Dat is veilig: alleen de app en de standaardrecepten zijn zichtbaar. Jullie weekmenu, boodschappen en eigen recepten staan in Firebase en zijn afgeschermd.
4. Klik op **Create repository**.

**Stap 3. De bestanden uploaden**
1. Klik op de link **uploading an existing file**.
2. Sleep **alle bestanden uit deze map** in het venster: `index.html`, `app.js`, `styles.css`, `data.js`, `firebase-config.js`, `firestore.rules` en `README.md`. Sleep de bestanden zelf, niet de map.
3. Klik onderaan op **Commit changes**.

**Stap 4. GitHub Pages aanzetten**
1. Ga in je repository naar **Settings** → **Pages** (in de linkerkolom).
2. Bij *Source*: kies **Deploy from a branch**.
3. Bij *Branch*: kies **main** en **/ (root)** en klik op **Save**.
4. Wacht 1 à 2 minuten en vernieuw de pagina. Bovenaan verschijnt: *Your site is live at `https://jouwnaam.github.io/gezinsmenu/`*.

Noteer die link. Je kan hem nu al openen; hij werkt voorlopig "Alleen op dit toestel".

---

## Deel B – Firebase instellen

**Stap 5. Project maken**
1. Ga naar <https://console.firebase.google.com> en log in met **jouw** Google-account.
2. Klik op **Create a project** (of *Get started with a Firebase project*).
3. Naam: `gezinsmenu`. Ga verder.
4. Google Analytics: **uitzetten** (niet nodig). Klik op **Create project**.

Je zit nu automatisch op het gratis **Spark**-plan. Ga daar niet op "Upgrade" klikken.

**Stap 6. Inloggen met Google aanzetten**
1. Links in het menu: **Build** (of *Security*) → **Authentication** → **Get started**.
2. Tabblad **Sign-in method** → kies **Google** → zet de schakelaar op **Enable**.
3. Kies bij *Project support email* je eigen adres en klik op **Save**.

**Stap 7. Je website toelaten**
1. Nog steeds in Authentication: tabblad **Settings** → **Authorized domains**.
2. Klik op **Add domain** en vul in: `jouwnaam.github.io`. Alleen dat stuk, zonder `https://` en zonder `/gezinsmenu`.
3. Klik op **Add**.

**Stap 8. De databank maken en afschermen**
1. Links: **Build** → **Firestore Database** → **Create database**.
2. Vraagt Firebase om een *edition*, kies dan **Standard**.
3. Locatie: kies een Europese, bv. **eur3 (europe-west)** of **europe-west1 (Belgium)**. Die kan je later niet meer wijzigen.
4. Kies **Start in production mode** en klik op **Create**.
5. Ga naar het tabblad **Rules**. Wis alles wat er staat.
6. Open het bestand `firestore.rules` uit deze map, kopieer de volledige inhoud en plak die in Firebase.
7. Vervang de drie `VERVANG-…`-adressen door de Gmail-adressen van je man en de kinderen. Schrijf ze in kleine letters, tussen aanhalingstekens, gescheiden door komma's. Je eigen adres staat er al. Heeft iemand (nog) geen account, verwijder dan die regel en let op dat er na het laatste adres **geen komma** staat.
8. Klik op **Publish**.

**Stap 9. De app aan Firebase koppelen**
1. Klik linksboven op het tandwiel ⚙ → **Project settings**.
2. Scroll naar *Your apps* en klik op het **`</>`**-icoon (Web).
3. Bijnaam: `Gezinsmenu`. Vink **Firebase Hosting niet** aan. Klik op **Register app**.
4. Je ziet nu een codeblok met `const firebaseConfig = { apiKey: "...", ... };`. Kopieer **alleen het deel tussen de accolades, inclusief de accolades** `{ ... }`.
5. Ga naar je repository op GitHub, open `firebase-config.js` en klik op het potloodje (✏ *Edit this file*).
6. Vervang `null` in de regel `window.FIREBASE_CONFIG = null;` door wat je kopieerde. Dan ziet het er zo uit:
   ```js
   window.FIREBASE_CONFIG = {
       apiKey: "AIza...",
       authDomain: "gezinsmenu-xxxxx.firebaseapp.com",
       projectId: "gezinsmenu-xxxxx",
       storageBucket: "gezinsmenu-xxxxx.firebasestorage.app",
       messagingSenderId: "123456789",
       appId: "1:123456789:web:abc123"
   };
   ```
7. Klik op **Commit changes** (twee keer).

De `apiKey` is geen geheim wachtwoord; hij mag in een publiek bestand staan. De beveiliging zit in de regels van stap 8.

---

## Deel C – Testen en in gebruik nemen

**Stap 10. Eerste keer inloggen**
1. Wacht 1 à 2 minuten na stap 9 en open je link (`https://jouwnaam.github.io/gezinsmenu/`). Vernieuw eventueel met Ctrl+F5.
2. Klik op **Inloggen met Google** en kies je account.
3. Rechtsboven staat nu **Gedeeld met het gezin** en je e-mailadres.
4. Klik op **Stel 5 avondmalen voor** → **Zet op maandag–vrijdag**.
5. Open de link op je gsm, log in, en controleer dat je hetzelfde weekmenu ziet.

**Stap 11. Gezin uitnodigen**
Stuur de link door. Iedereen logt in met het Google-account dat jij in stap 8 hebt ingevuld. Wie een ander account gebruikt, krijgt de melding dat hij geen toegang heeft.

**Stap 12. Op het beginscherm van de gsm zetten**
- **Android (Chrome):** menu ⋮ → **Toevoegen aan startscherm**.
- **iPhone (Safari):** deelknop → **Zet op beginscherm**.

---

## Later

**Een gezinslid toevoegen of verwijderen.** Firebase → Firestore Database → Rules → pas de lijst aan → **Publish**.

**Recepten toevoegen.** Tab **+ Toevoegen**:
1. Plak een link of recepttekst (of laat leeg en voeg in de chat een foto/PDF toe).
2. Klik op **Kopieer opdracht** en plak die in ChatGPT, Claude of Gemini. De gratis versie volstaat. Jullie smaakprofiel zit in de opdracht, dus het werkt ook in een nieuw gesprek.
3. Kopieer het volledige antwoord, plak het in **Plak het antwoord**, klik op **Controleer** en daarna op **Toevoegen**.

**Back-up.** Tab **+ Toevoegen** → **Download back-up**. Doe dat af en toe, bv. na het toevoegen van een reeks eigen recepten. Met **Back-up terugzetten** zet je ze terug, ook in een andere versie van de app. Bewaar in de huidige Claude-versie al eigen recepten? Maak er in de nieuwe versie een back-up van zodra je hem gebruikt, of voeg ze opnieuw toe.

**Gratis grenzen.** Het Spark-plan laat per dag 50.000 keer lezen en 20.000 keer schrijven toe, en 1 GB opslag. Een gezin van vier gebruikt daar een fractie van. Wordt een grens ooit bereikt, dan stopt het opslaan tot de volgende dag; er wordt nooit iets aangerekend zonder dat je zelf een betaalplan kiest.

**Iets loopt mis?**

| Wat je ziet | Oplossing |
|---|---|
| Loginvenster opent niet of sluit meteen | Controleer stap 7 (domein toegevoegd, zonder `https://`). Sta pop-ups toe voor de site. |
| "Dit account heeft (nog) geen toegang" | Het adres staat niet (juist) in de regels van stap 8. Kleine letters, aanhalingstekens, komma's. Daarna **Publish**. |
| Rechtsboven blijft "Alleen op dit toestel" staan | `firebase-config.js` bevat nog `null`, of er zit een tikfout in. Vergelijk met het voorbeeld in stap 9. |
| Wijziging niet zichtbaar | GitHub Pages heeft 1 à 2 minuten nodig. Vernieuw met Ctrl+F5. |

---

## Bestanden in deze map

| Bestand | Inhoud |
|---|---|
| `index.html` | De pagina |
| `app.js` | Alle werking: planner, boodschappenlijst, filters, login, opslag |
| `styles.css` | Opmaak (licht en donker) |
| `data.js` | De 107 avondrecepten, 61 lunches en 12 ontbijtideeën |
| `firebase-config.js` | Jouw Firebase-instellingen (stap 9) |
| `firestore.rules` | Wie toegang heeft (stap 8). Wordt niet door de website gebruikt; je plakt het in Firebase. |

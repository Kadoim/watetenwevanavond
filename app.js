(() => {
    "use strict";
    const SEED = window.APP_DATA;
    const DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
    const LIBS = { dinner: "Avondeten", lunch: "Lunch", breakfast: "Ontbijt" };
    const PREFIX = { dinner: "d", lunch: "l", breakfast: "b" };

    const PROFILE = [
        "Gezin van 4 met tieners (zoon en dochter). Gezond en voedzaam, veel groenten (ook warme), normale supermarktingrediënten, toegankelijk.",
        "Grote favorieten: kip, scampi, zalm, avocado, broccoli, paprika, prei en champignons.",
        "Heel geliefd: Italiaanse pasta met veel groenten, Aziatische rijstbowls, zelf-vul-wraps, poke bowls, Mexicaans, ovenschotels, pizza/flatbread, Thaise kip met cashewnoten.",
        "Romige/smeuïge kip- en scampigerechten met veel groenten en een goede saus vallen bijzonder goed.",
        "Poke/bowls: met rijst, mango als zoete component, zonder wortel.",
        "Curry is geliefd bij 3 van de 4; de zoon houdt niet van de currysmaak zelf. Curry mag, zonder het aan te passen.",
        "Feta is geliefd bij 3 van de 4; liefst koemelkvrij en apart serveren.",
        "Af en toe: aubergine, courgette, kikkererwten, linzen, bonen, maïs, stoofpotjes, maaltijdsalades, klassiek aardappel-groente-vlees.",
        "Heel af en toe: zoete aardappel (dochter geen fan), tofu (alleen als echt lekker bereid), ei of soep als avondmaal (voelt als lunch).",
        "Witte vis alleen in heel toegankelijke gerechten. Vegetarisch alleen als je het vlees niet mist.",
        "Liever niet: couscous/bulgur en gelijkaardige korrels (kinderen eten wel graag rijst), kipgehakt, herkenbare stukken varkensvlees. Gemengd rund-varkensgehakt is wél prima (lasagne, bolognaise). Rundvlees af en toe, zonder vettige stukjes.",
        "Koemelkvrij waar het kan zonder kwaliteitsverlies (plantaardige room/yoghurt, edelgist).",
        "Thermomix (met groentenrasp/Cutter) waar nuttig. Lage actieve werktijd is belangrijker dan totale tijd; oven/Thermomix mag lang bezig zijn. Shortcuts (diepvries, passata, blik, pesto) zijn prima.",
        "Verborgen groenten in sauzen zijn heel welkom. Dubbel koken voor 2 dagen, invriezen en restjes hergebruiken (wrap, bowl, pasta) ook.",
        "Traybakes: graag, maar met heel concrete uitleg (snijgrootte, volgorde, temperatuur, wanneer wat erbij).",
    ];

    /* ---------- state ---------- */
    const S = {
        tab: "week",
        week: { days: Array(7).fill(null), extras: [] },
        prefs: { fav: [], no: SEED.hiddenByDefault.slice() },
        shop: { checked: {}, extra: [] },
        own: [],
        suggestion: null,
        pickDay: null,
        filters: {
            dinner: { q: "", ing: "", chips: new Set(), showNo: false },
            lunch: { q: "", ing: "", chips: new Set(), showNo: false },
            breakfast: { q: "", ing: "", chips: new Set(), showNo: false },
        },
        mode: "loading",
        readOnly: false,
    };

    /* ---------- helpers ---------- */
    const $ = (s) => document.querySelector(s);
    const esc = (s) =>
        String(s ?? "").replace(
            /[&<>"']/g,
            (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
        );
    const norm = (s) =>
        String(s || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "");
    function toast(msg) {
        const t = $("#toast");
        t.textContent = msg;
        t.hidden = false;
        clearTimeout(toast.t);
        toast.t = setTimeout(() => (t.hidden = true), 2600);
    }
    function lsGet(k, d) {
        try {
            const v = localStorage.getItem("gm_" + k);
            return v ? JSON.parse(v) : d;
        } catch (e) {
            return d;
        }
    }
    function lsSet(k, v) {
        try {
            localStorage.setItem("gm_" + k, JSON.stringify(v));
        } catch (e) {}
    }

    /* recipes */
    function builtIn(lib) {
        return SEED[lib].map((r) => ({ ...r, lib, key: PREFIX[lib] + ":" + r.id, own: false }));
    }
    const BUILTIN = { dinner: builtIn("dinner"), lunch: builtIn("lunch"), breakfast: builtIn("breakfast") };
    function lib(l) {
        return BUILTIN[l].concat(S.own.filter((r) => r.lib === l));
    }
    function byKey(k) {
        if (!k) return null;
        if (k.startsWith("o:")) return S.own.find((r) => r.key === k) || null;
        const [p, id] = k.split(":");
        const l = Object.keys(PREFIX).find((x) => PREFIX[x] === p);
        return l ? BUILTIN[l].find((r) => String(r.id) === id) || null : null;
    }
    const isFav = (k) => S.prefs.fav.includes(k);
    const isNo = (k) => S.prefs.no.includes(k);
    function hay(r) {
        return norm(r.name + " " + (r.tags || []).join(" ") + " " + (r.ingredients || []).join(" "));
    }

    /* ---------- smaakscore & classificatie ---------- */
    function carb(r) {
        const h = hay(r);
        if (/lasagne|pasta|penne|spaghetti|gnocchi|orzo|macaroni|tortellini|cannelloni|noedel/.test(h))
            return "pasta";
        if (/wrap|taco|tortilla|pizza|flatbread|pita|burrito|quesadilla|enchilada|nacho/.test(h))
            return "wrap";
        if (/rijst|poke|risotto/.test(h)) return "rijst";
        if (/aardappel|krieltjes|puree|wedges/.test(h)) return "aardappel";
        return "anders";
    }
    function protein(r) {
        const h = hay(r);
        if (/scampi|zalm|garnal|kabeljauw|vis\b|vissticks|tonijn/.test(h)) return "vis";
        if ((r.tags || []).includes("vegetarisch")) return "vegetarisch";
        if (/\bkip/.test(h)) return "kip";
        if (/gehakt|rund|ham|spek/.test(h)) return "vlees";
        return "vegetarisch";
    }
    function score(r) {
        if (isNo(r.key)) return 0;
        let s = 2;
        const h = hay(r);
        [
            "kip",
            "scampi",
            "zalm",
            "avocado",
            "broccoli",
            "paprika",
            "prei",
            "champignon",
            "mango",
            "pesto",
            "oven",
            "wrap",
            "taco",
            "poke",
            "pizza",
            "bowl",
            "cashew",
            "mexica",
            "verborgen",
        ].forEach((x) => {
            if (h.includes(x)) s += 1;
        });
        if ((r.tags || []).includes("topmatch")) s += 6;
        if (isFav(r.key)) s += 8;
        if (r.own) s += 3;
        if (/couscous|bulgur/.test(h)) s -= 8;
        if (/zoete aardappel|aubergine|tofu/.test(h)) s -= 2;
        if (/\bsoep\b|shakshuka|omelet|tortilla met aardappel/.test(h)) s -= 2;
        return Math.max(0.2, s);
    }

    /* ---------- hoeveelheden ---------- */
    const UNIT =
        "kg|g|ml|cl|dl|l|el|tl|stuks?|blikjes?|blikken|blik|bakjes?|zakjes?|zak|potjes?|pot|teentjes?|takjes?|bosjes?|bosje|plakjes?|snufje|scheutje|handjes?|handvol|kopjes?|bollen?|stengels?|stronken?|vellen?|bladen|blaadjes"
            .split("|")
            .sort((a, b) => b.length - a.length)
            .join("|");
    const QRE = new RegExp(
        "^\\s*(\\d+(?:[.,]\\d+)?(?:\\/\\d+)?|½|¼|¾)(?:\\s*[–-]\\s*(\\d+(?:[.,]\\d+)?))?\\s*(?:(" +
            UNIT +
            ")\\.?(?=\\s|$))?\\s*(.*)$",
        "i",
    );
    function num(s) {
        if (s === "½") return 0.5;
        if (s === "¼") return 0.25;
        if (s === "¾") return 0.75;
        if (s.includes("/")) {
            const [a, b] = s.split("/");
            return +a / +b;
        }
        return parseFloat(s.replace(",", "."));
    }
    function parseIng(line) {
        const m = String(line).match(QRE);
        if (!m || !m[4]) return { q: null, unit: "", name: String(line).trim() };
        return {
            q: num(m[1]),
            q2: m[2] ? num(m[2]) : null,
            unit: (m[3] || "").toLowerCase(),
            name: m[4].trim(),
        };
    }
    function roundQ(q, unit) {
        if (["g", "ml"].includes(unit)) {
            if (q >= 100) return Math.round(q / 10) * 10;
            if (q >= 20) return Math.round(q / 5) * 5;
            return Math.round(q);
        }
        return Math.round(q * 2) / 2;
    }
    function fmtQ(q) {
        return String(q).replace(".", ",");
    }
    function scaledLine(line, f) {
        const p = parseIng(line);
        if (p.q == null || f === 1)
            return {
                qty:
                    p.q == null
                        ? ""
                        : fmtQ(p.q) + (p.q2 != null ? "–" + fmtQ(p.q2) : "") + (p.unit ? " " + p.unit : ""),
                name: p.q == null ? line : p.name,
            };
        const q = roundQ(p.q * f, p.unit),
            q2 = p.q2 != null ? roundQ(p.q2 * f, p.unit) : null;
        return {
            qty: fmtQ(q) + (q2 != null ? "–" + fmtQ(q2) : "") + (p.unit ? " " + p.unit : ""),
            name: p.name,
        };
    }

    const CATS = [
        [
            "Groenten & fruit",
            /(broccoli|paprika|courgette|prei|ui\b|uien|sjalot|knoflook|tomaat|tomaten|spinazie|sla\b|komkommer|wortel|avocado|mango|citroen|limoen|appel|peer|banaan|bessen|aardbei|champignon|aubergine|bloemkool|kool|boontjes|erwt|edamame|lente-ui|gember|peterselie|koriander|basilicum|dille|bieslook|munt|rucola|biet|selder|venkel|asperge|pompoen|radijs|druiven|granaatappel|perzik|watermeloen|sinaasappel|witlof|zoete aardappel|sugarsnap|peultjes|ijsbergsla|romaine|chili|peper(?!\s*en)|aardappel|krieltjes|maïs|mais|fruit|kers)/,
        ],
        [
            "Vlees, vis & kip",
            /(kip|gehakt|rund|varken|spek|ham|bacon|kalkoen|zalm|scampi|garnal|vis(?!saus)|kabeljauw|tonijn|makreel|sardine|rosbief|worst|chorizo)/,
        ],
        [
            "Blik, pot & sauzen",
            /(blik|passata|tomatenpuree|pesto|saus|bouillon|kokosmelk|bonen|kikkererwt|linzen|mosterd|azijn|honing|olie|mayonaise|hummus|tahin|pindakaas|ketchup|salsa|curry|harissa|vissaus|oestersaus|pasta\b)/,
        ],
        [
            "Pasta, rijst & brood",
            /(pasta|penne|spaghetti|lasagne|gnocchi|orzo|macaroni|tortellini|cannelloni|noedel|rijst|couscous|bulgur|quinoa|wrap|tortilla|pita|naan|flatbread|brood|haver|granola|bloem\b|paneermeel|panko)/,
        ],
        [
            "Zuivel, alternatieven & eieren",
            /(yoghurt|skyr|kwark|melk|room|kaas|feta|mozzarella|ricotta|burrata|halloumi|parmezaan|boter|ei\b|eieren|kefir|cottage|plantaardig|soja(?!saus))/,
        ],
        [
            "Kruiden & voorraad",
            /(zout|peper|kruiden|paprikapoeder|komijn|kaneel|oregano|kerrie|garam|tandoori|nootmuskaat|tijm|rozemarijn|edelgist|noten|cashew|walnoot|amandel|zaden|sesam|chia|suiker|bakpoeder|maizena)/,
        ],
    ];
    function cat(name) {
        const n = norm(name);
        for (const [c, re] of CATS) if (re.test(n)) return c;
        return "Overig";
    }

    function singular(n) {
        return n
            .replace(/'s\b/g, "")
            .split(" ")
            .map((w) => (w.length > 4 ? w.replace(/(en|s)$/, "") : w.replace(/^uien$/, "ui")))
            .join(" ");
    }
    function shoppingItems() {
        const map = new Map();
        const add = (r, portions) => {
            if (!r) return;
            const f = portions / (r.servings || 4);
            (r.ingredients || []).forEach((line) => {
                const p = parseIng(line);
                const name = p.name.replace(/\s*\(.*?\)\s*/g, " ").trim();
                const key = singular(norm(name)) + "|" + (p.q == null ? "" : p.unit);
                const cur = map.get(key) || { name, unit: p.unit, q: 0, hasQ: p.q != null, from: new Set() };
                if (p.q != null) cur.q += p.q * f;
                cur.from.add(r.name);
                map.set(key, cur);
            });
        };
        S.week.days.forEach((d) => {
            if (d && d.kind === "recipe") add(byKey(d.key), d.portions || 4);
        });
        S.week.extras.forEach((x) => add(byKey(x.key), x.portions || 1));
        const items = [...map.entries()].map(([key, v]) => ({
            key,
            name: v.name,
            cat: cat(v.name),
            qty: v.hasQ && v.q ? fmtQ(roundQ(v.q, v.unit)) + (v.unit ? " " + v.unit : "") : "",
            from: [...v.from],
        }));
        S.shop.extra.forEach((t, i) =>
            items.push({ key: "x|" + norm(t), name: t, cat: "Extra", qty: "", extraIndex: i }),
        );
        return items;
    }

    /* ---------- opslag (Firebase of lokaal) ---------- */
    const CFG = window.FIREBASE_CONFIG || null;
    const FAMILY = window.FAMILY_ID || "ons-gezin";
    let fs = null,
        auth = null,
        unsubs = [];
    const queues = {};
    function fdoc(path) {
        return fs.doc("families/" + FAMILY + "/" + path);
    }
    function fcol(path) {
        return fs.collection("families/" + FAMILY + "/" + path);
    }
    function persist(name) {
        const data = name === "week" ? S.week : name === "prefs" ? S.prefs : S.shop;
        lsSet(name, data);
        if (S.mode !== "live") return;
        const body = JSON.parse(JSON.stringify(data));
        queues[name] = (queues[name] || Promise.resolve())
            .then(() => fdoc("shared/" + name).set(body))
            .catch((e) => onWriteError(e));
    }
    function onWriteError(e) {
        if (e && e.code === "permission-denied") {
            denied();
        } else toast("Opslaan lukte even niet. Controleer je internet en probeer opnieuw.");
    }
    function setSync() {
        const el = $("#sync");
        if (S.mode === "live") {
            el.className = "sync live";
            el.textContent = "Gedeeld met het gezin";
        } else if (S.mode === "local") {
            el.className = "sync";
            el.textContent = "Alleen op dit toestel";
        } else if (S.mode === "login") {
            el.className = "sync";
            el.textContent = "Niet ingelogd";
        } else {
            el.className = "sync";
            el.textContent = "Even laden…";
        }
    }
    function loadLocal() {
        S.week = sanitizeWeek(lsGet("week", S.week));
        S.prefs = Object.assign({ fav: [], no: SEED.hiddenByDefault.slice() }, lsGet("prefs", {}));
        S.shop = Object.assign({ checked: {}, extra: [] }, lsGet("shop", {}));
        S.own = lsGet("own", []);
    }
    function sanitizeWeek(w) {
        w = w || {};
        const days = Array.isArray(w.days) ? w.days.slice(0, 7) : [];
        while (days.length < 7) days.push(null);
        return { days, extras: Array.isArray(w.extras) ? w.extras : [] };
    }

    function showLogin(msg, isErr) {
        $("#login").hidden = false;
        $("#loginMsg").textContent = msg || "";
        $("#loginMsg").className = isErr ? "status err" : "status";
        $("#btnLogin").hidden = !!(auth && auth.currentUser);
        $("#btnLoginOther").hidden = !(auth && auth.currentUser);
    }
    function hideLogin() {
        $("#login").hidden = true;
    }
    function denied() {
        unsubs.forEach((u) => u());
        unsubs = [];
        S.mode = "login";
        setSync();
        const email = auth && auth.currentUser ? auth.currentUser.email : "";
        showLogin(
            `Het account ${email} heeft (nog) geen toegang. Vraag de beheerder om dit e-mailadres toe te voegen.`,
            true,
        );
    }
    async function login() {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        try {
            await auth.signInWithPopup(provider);
        } catch (e) {
            if (
                e &&
                (e.code === "auth/popup-blocked" ||
                    e.code === "auth/operation-not-supported-in-this-environment")
            ) {
                await auth.signInWithRedirect(provider);
                return;
            }
            if (e && e.code === "auth/popup-closed-by-user") return;
            showLogin("Inloggen lukte niet: " + ((e && e.message) || e), true);
        }
    }
    function initStore() {
        loadLocal();
        renderAll();
        if (!CFG || !window.firebase) {
            S.mode = "local";
            setSync();
            $("#who").hidden = true;
            $("#btnLogout").hidden = true;
            return;
        }
        firebase.initializeApp(CFG);
        auth = firebase.auth();
        fs = firebase.firestore();
        fs.enablePersistence({ synchronizeTabs: true }).catch(() => {});
        auth.getRedirectResult().catch((e) =>
            showLogin("Inloggen lukte niet: " + ((e && e.message) || e), true),
        );
        $("#btnLogin").addEventListener("click", login);
        $("#btnLoginOther").addEventListener("click", async () => {
            await auth.signOut();
            login();
        });
        $("#btnLogout").addEventListener("click", () => auth.signOut());
        auth.onAuthStateChanged((user) => {
            unsubs.forEach((u) => u());
            unsubs = [];
            if (!user) {
                S.mode = "login";
                setSync();
                $("#who").hidden = true;
                $("#btnLogout").hidden = true;
                showLogin("");
                return;
            }
            $("#who").hidden = false;
            $("#who").textContent = user.email;
            $("#btnLogout").hidden = false;
            hideLogin();
            S.mode = "live";
            setSync();
            subscribe();
        });
    }
    function subscribe() {
        const onErr = (e) => {
            if (e && e.code === "permission-denied") denied();
        };
        const sub = (name, apply) =>
            unsubs.push(
                fdoc("shared/" + name).onSnapshot((snap) => {
                    if (snap.exists) {
                        apply(snap.data());
                        lsSet(name, snap.data());
                    }
                    renderAll();
                }, onErr),
            );
        sub("week", (v) => (S.week = sanitizeWeek(JSON.parse(JSON.stringify(v)))));
        sub(
            "prefs",
            (v) =>
                (S.prefs = {
                    fav: Array.isArray(v.fav) ? v.fav.slice() : [],
                    no: Array.isArray(v.no) ? v.no.slice() : [],
                }),
        );
        sub(
            "shop",
            (v) =>
                (S.shop = {
                    checked: Object.assign({}, v.checked || {}),
                    extra: Array.isArray(v.extra) ? v.extra.slice() : [],
                }),
        );
        unsubs.push(
            fcol("recipes").onSnapshot((snap) => {
                S.own = snap.docs.map((d) => {
                    const r = Object.assign({}, d.data());
                    r.id = d.id;
                    r.key = "o:" + d.id;
                    r.own = true;
                    return r;
                });
                lsSet("own", S.own);
                renderAll();
            }, onErr),
        );
    }
    function cleanRecipe(r) {
        return {
            name: String(r.name).slice(0, 200),
            lib: LIBS[r.lib] ? r.lib : "dinner",
            servings: Number(r.servings) || 4,
            time: Number(r.time) || 0,
            tags: (Array.isArray(r.tags) ? r.tags : []).map(String).slice(0, 15),
            ingredients: (r.ingredients || []).map(String),
            steps: (r.steps || []).map(String),
            thermomix: (Array.isArray(r.thermomix) ? r.thermomix : []).map(String),
            prep: String(r.prep || ""),
            day2: String(r.day2 || ""),
            cowmilk_note: String(r.cowmilk_note || ""),
            added: Number(r.added) || Date.now(),
        };
    }
    async function saveOwn(r) {
        const body = cleanRecipe(r);
        if (S.mode === "live") {
            try {
                await fcol("recipes").add(body);
            } catch (e) {
                onWriteError(e);
                throw e;
            }
        } else {
            const id = "loc" + Date.now() + Math.random().toString(36).slice(2, 6);
            S.own.push({ ...body, id, key: "o:" + id, own: true });
            lsSet("own", S.own);
            renderAll();
        }
    }
    async function deleteOwn(r) {
        if (S.mode === "live") {
            try {
                await fcol("recipes").doc(r.id).delete();
            } catch (e) {
                onWriteError(e);
                return;
            }
        } else {
            S.own = S.own.filter((x) => x.key !== r.key);
            lsSet("own", S.own);
        }
        S.week.days = S.week.days.map((d) => (d && d.key === r.key ? null : d));
        S.week.extras = S.week.extras.filter((x) => x.key !== r.key);
        persist("week");
        renderAll();
        toast("Recept verwijderd");
    }
    function similar(name, l) {
        const t = new Set(
            norm(name)
                .split(/[^a-z0-9]+/)
                .filter((w) => w.length > 2),
        );
        if (!t.size) return null;
        let best = null,
            bs = 0;
        lib(l).forEach((r) => {
            const u = new Set(
                norm(r.name)
                    .split(/[^a-z0-9]+/)
                    .filter((w) => w.length > 2),
            );
            let i = 0;
            t.forEach((w) => {
                if (u.has(w)) i++;
            });
            const j = i / (t.size + u.size - i);
            if (j > bs) {
                bs = j;
                best = r;
            }
        });
        return bs >= 0.6 ? best : null;
    }

    /* ---------- tabs ---------- */
    function setTab(t) {
        S.tab = t;
        document
            .querySelectorAll("nav.tabs button")
            .forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === t)));
        ["week", "dinner", "lunch", "breakfast", "add"].forEach((x) => ($("#p-" + x).hidden = x !== t));
        if (t !== "dinner") S.pickDay = null;
        renderAll();
        window.scrollTo({ top: 0 });
    }
    document
        .querySelectorAll("nav.tabs button")
        .forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));

    /* ---------- week render ---------- */
    function stepper(val, min, max, attr) {
        return `<span class="stepper"><button type="button" ${attr} data-step="-1" aria-label="Minder porties">−</button><span>${val} ${val === 1 ? "portie" : "porties"}</span><button type="button" ${attr} data-step="1" aria-label="Meer porties">+</button></span>`;
    }
    function renderWeek() {
        const box = $("#days");
        box.innerHTML = S.week.days
            .map((d, i) => {
                let inner = "";
                if (!d) {
                    inner = `<div class="empty-actions">
        <button class="btn sm" data-act="pick" data-i="${i}">Kies gerecht</button>
        ${i > 0 && S.week.days[i - 1] ? `<button class="btn sm" data-act="left" data-i="${i}">Restjes van ${DAYS[i - 1].toLowerCase()}</button>` : ""}
        <button class="btn sm" data-act="text" data-i="${i}">Iets anders…</button></div>
        <form class="textin" data-textform="${i}" hidden><input type="text" placeholder="bv. frietjes, eten bij oma" aria-label="Eigen invulling ${DAYS[i]}"><button class="btn sm" type="submit">OK</button></form>`;
                } else if (d.kind === "recipe") {
                    const r = byKey(d.key);
                    if (!r)
                        inner = `<span class="note">Dit recept bestaat niet meer.</span> <button class="icon-btn" data-act="clear" data-i="${i}" aria-label="Wis">✕</button>`;
                    else
                        inner = `<span class="title" data-open="${esc(r.key)}" data-portions="${d.portions || 4}">${esc(r.name)}</span>
        <div class="row">${stepper(d.portions || 4, 1, 8, `data-act="por" data-i="${i}"`)}
        <span class="pill">${r.time || "?"} min</span>
        ${i < 6 && !S.week.days[i + 1] ? `<button class="btn sm ghost" data-act="double" data-i="${i}" title="Kook 8 porties en eet morgen restjes">×2 → ook morgen</button>` : ""}
        <button class="icon-btn" data-act="pick" data-i="${i}" aria-label="Ander gerecht kiezen" title="Ander gerecht">⇄</button>
        <button class="icon-btn" data-act="clear" data-i="${i}" aria-label="Wis ${DAYS[i]}" title="Wis">✕</button></div>`;
                } else if (d.kind === "left") {
                    const prev = S.week.days[i - 1];
                    const r = prev && prev.kind === "recipe" ? byKey(prev.key) : null;
                    inner = `<span class="note">Restjes${r ? ": " + esc(r.name) : ""}</span>${r && r.day2 ? `<span class="small muted">${esc(r.day2)}</span>` : ""}<div class="row"><button class="icon-btn" data-act="clear" data-i="${i}" aria-label="Wis">✕</button></div>`;
                } else {
                    inner = `<span class="note">${esc(d.text)}</span><div class="row"><button class="icon-btn" data-act="clear" data-i="${i}" aria-label="Wis">✕</button></div>`;
                }
                return `<div class="day"><div class="dayname">${DAYS[i]}</div><div class="meal">${inner}</div></div>`;
            })
            .join("");
        // extras
        const ex = $("#extras");
        ex.innerHTML = S.week.extras.length
            ? S.week.extras
                  .map((x, j) => {
                      const r = byKey(x.key);
                      if (!r) return "";
                      return `<li><span class="pill">${LIBS[r.lib]}</span><span class="nm" data-open="${esc(r.key)}" data-portions="${x.portions || 1}">${esc(r.name)}</span>${stepper(x.portions || 1, 1, 12, `data-act="xpor" data-j="${j}"`)}<button class="icon-btn" data-act="xdel" data-j="${j}" aria-label="Verwijder">✕</button></li>`;
                  })
                  .join("")
            : `<li class="muted small">Nog niets gekozen.</li>`;
        renderShop();
        renderSuggest();
    }
    function renderSuggest() {
        const b = $("#suggestBox");
        if (!S.suggestion) {
            b.hidden = true;
            b.innerHTML = "";
            return;
        }
        b.hidden = false;
        const empty = S.week.days.map((d, i) => (d ? null : i)).filter((i) => i !== null);
        b.innerHTML = `<div class="suggest"><div class="head" style="margin:0"><h3>Voorstel voor deze week</h3><span class="small muted">mix van pasta, rijst, wraps/aardappel, vis en kip</span></div>
    <ol>${S.suggestion
        .map((k, i) => {
            const r = byKey(k);
            return `<li><span class="pill">${["MA", "DI", "WO", "DO", "VR"][i]}</span><span class="nm" data-open="${esc(k)}">${esc(r.name)}</span>${isFav(k) ? '<span class="pill fav">♥</span>' : ""}<span class="pill">${carb(r)} · ${protein(r)}</span><button class="icon-btn" data-sact="reroll" data-i="${i}" title="Ander gerecht" aria-label="Ander gerecht">↻</button></li>`;
        })
        .join("")}</ol>
    <div class="row"><button class="btn primary sm" data-sact="apply">Zet op maandag–vrijdag</button>${empty.length && empty.length < 7 ? `<button class="btn sm" data-sact="fill">Vul de ${empty.length} lege dagen</button>` : ""}<button class="btn sm" data-sact="again">Alles opnieuw</button><button class="btn sm ghost" data-sact="close">Sluiten</button></div></div>`;
    }
    function renderShop() {
        const items = shoppingItems();
        const el = $("#shop");
        if (!items.length) {
            el.innerHTML = '<p class="shop-empty">Plan een gerecht en de lijst vult zich vanzelf.</p>';
            $("#shopCount").textContent = "";
            return;
        }
        const groups = {};
        items.forEach((it) => (groups[it.cat] = groups[it.cat] || []).push(it));
        const order = CATS.map((c) => c[0]).concat(["Overig", "Extra"]);
        let done = 0;
        el.innerHTML = order
            .filter((c) => groups[c])
            .map(
                (c) =>
                    `<h4>${c}</h4><ul>${groups[c]
                        .sort((a, b) => a.name.localeCompare(b.name, "nl"))
                        .map((it) => {
                            const ck = !!S.shop.checked[it.key];
                            if (ck) done++;
                            return `<li class="${ck ? "done" : ""}"><label title="${esc(it.from ? it.from.join(", ") : "")}"><input type="checkbox" data-ck="${esc(it.key)}" ${ck ? "checked" : ""}><span>${esc(it.name)}</span><span class="q">${esc(it.qty)}</span></label>${it.extraIndex != null ? `` : ""}</li>`;
                        })
                        .join("")}</ul>`,
            )
            .join("");
        $("#shopCount").textContent = `${done}/${items.length} in huis`;
    }

    /* ---------- week acties ---------- */
    $("#days").addEventListener("click", (e) => {
        const t = e.target.closest("[data-act],[data-open]");
        if (!t) return;
        if (t.dataset.open) {
            openRecipe(t.dataset.open, +t.dataset.portions || null);
            return;
        }
        if (S.readOnly) return toast("Je kunt hier alleen meekijken.");
        const i = +t.dataset.i,
            a = t.dataset.act;
        if (a === "pick") {
            S.pickDay = i;
            setTab("dinner");
            return;
        }
        if (a === "left") {
            S.week.days[i] = { kind: "left" };
        }
        if (a === "text") {
            const f = document.querySelector(`[data-textform="${i}"]`);
            f.hidden = false;
            f.querySelector("input").focus();
            return;
        }
        if (a === "clear") {
            S.week.days[i] = null;
            if (S.week.days[i + 1] && S.week.days[i + 1].kind === "left") S.week.days[i + 1] = null;
        }
        if (a === "por") {
            const d = S.week.days[i];
            d.portions = Math.min(8, Math.max(1, (d.portions || 4) + +t.dataset.step));
        }
        if (a === "double") {
            S.week.days[i].portions = 8;
            S.week.days[i + 1] = { kind: "left" };
        }
        persist("week");
        renderAll();
    });
    $("#days").addEventListener("submit", (e) => {
        e.preventDefault();
        const f = e.target;
        const i = +f.dataset.textform;
        const v = f.querySelector("input").value.trim();
        if (!v) return;
        S.week.days[i] = { kind: "text", text: v.slice(0, 120) };
        persist("week");
        renderAll();
    });
    $("#extras").addEventListener("click", (e) => {
        const t = e.target.closest("[data-act],[data-open]");
        if (!t) return;
        if (t.dataset.open) return openRecipe(t.dataset.open, +t.dataset.portions || null);
        if (S.readOnly) return;
        const j = +t.dataset.j;
        if (t.dataset.act === "xdel") S.week.extras.splice(j, 1);
        if (t.dataset.act === "xpor") {
            const x = S.week.extras[j];
            x.portions = Math.min(12, Math.max(1, (x.portions || 1) + +t.dataset.step));
        }
        persist("week");
        renderAll();
    });
    $("#shop").addEventListener("change", (e) => {
        const k = e.target.dataset.ck;
        if (!k || S.readOnly) return;
        if (e.target.checked) S.shop.checked[k] = true;
        else delete S.shop.checked[k];
        persist("shop");
        renderShop();
    });
    $("#extraItemForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const v = $("#extraItem").value.trim();
        if (!v || S.readOnly) return;
        S.shop.extra.push(v.slice(0, 80));
        $("#extraItem").value = "";
        persist("shop");
        renderShop();
    });
    $("#resetChecks").addEventListener("click", () => {
        if (S.readOnly) return;
        S.shop.checked = {};
        S.shop.extra = [];
        persist("shop");
        renderShop();
        toast("Vinkjes en extra items gewist");
    });
    function copyText(txt, msg) {
        const fb = $(S.tab === "add" ? "#copyFallbackAdd" : "#copyFallback");
        const done = () => toast(msg || "Gekopieerd");
        const fail = () => {
            fb.hidden = false;
            fb.value = txt;
            fb.focus();
            fb.select();
            toast("Selecteer en kopieer de tekst in het tekstvak");
        };
        try {
            navigator.clipboard.writeText(txt).then(done, fail);
        } catch (e) {
            fail();
        }
    }
    $("#copyShop").addEventListener("click", () => {
        const items = shoppingItems().filter((it) => !S.shop.checked[it.key]);
        const g = {};
        items.forEach((it) => (g[it.cat] = g[it.cat] || []).push(it));
        copyText(
            Object.keys(g)
                .map(
                    (c) =>
                        c.toUpperCase() +
                        "\n" +
                        g[c].map((it) => "☐ " + it.name + (it.qty ? " – " + it.qty : "")).join("\n"),
                )
                .join("\n\n"),
        );
    });
    $("#copyXtra").addEventListener("click", () => {
        const items = shoppingItems().filter(
            (it) => !S.shop.checked[it.key] && it.cat !== "Kruiden & voorraad",
        );
        copyText(items.map((it) => it.name + (it.qty ? " " + it.qty : "")).join("\n"));
    });
    $("#btnClearWeek").addEventListener("click", () => {
        $("#clearConfirm").hidden = false;
    });
    $("#btnClearNo").addEventListener("click", () => {
        $("#clearConfirm").hidden = true;
    });
    $("#btnClearYes").addEventListener("click", () => {
        if (S.readOnly) return;
        S.week = { days: Array(7).fill(null), extras: [] };
        S.shop = { checked: {}, extra: [] };
        persist("week");
        persist("shop");
        $("#clearConfirm").hidden = true;
        renderAll();
        toast("Nieuwe week, lege lijst");
    });

    /* ---------- weekvoorstel ---------- */
    function weighted(arr) {
        const ws = arr.map(score),
            t = ws.reduce((a, b) => a + b, 0);
        let x = Math.random() * t;
        for (let i = 0; i < arr.length; i++) {
            x -= ws[i];
            if (x <= 0) return arr[i];
        }
        return arr[arr.length - 1];
    }
    function propose() {
        const used = new Set(S.week.days.filter((d) => d && d.kind === "recipe").map((d) => d.key));
        const pool = lib("dinner").filter((r) => !isNo(r.key) && !used.has(r.key));
        const c = [];
        const fam = (r) => {
            const h = norm(r.name);
            return (
                [
                    "poke",
                    "poké",
                    "curry",
                    "lasagne",
                    "taco",
                    "wrap",
                    "pizza",
                    "soep",
                    "pesto",
                    "traybake",
                    "ovenschotel",
                    "bowl",
                    "gnocchi",
                    "risotto",
                ].find((w) => h.includes(norm(w))) || r.key
            );
        };
        const ok = (r) =>
            !c.includes(r) &&
            !c.some((x) => fam(x) === fam(r)) &&
            c.filter((x) => protein(x) === "kip").length < (protein(r) === "kip" ? 3 : 9) &&
            c.filter((x) => carb(x) === carb(r)).length < 2;
        const add = (test) => {
            const a = pool.filter((r) => ok(r) && test(r));
            if (a.length) c.push(weighted(a));
        };
        add((r) => carb(r) === "pasta");
        add((r) => carb(r) === "rijst");
        add((r) => carb(r) === "wrap");
        add((r) => protein(r) === "vis");
        if (Math.random() < 0.5) add((r) => protein(r) === "vegetarisch");
        else add((r) => ["aardappel", "anders"].includes(carb(r)));
        let guard = 0;
        while (c.length < 5 && guard++ < 50) {
            const a = pool.filter(ok);
            if (!a.length) break;
            c.push(weighted(a));
        }
        return c.sort(() => Math.random() - 0.5).map((r) => r.key);
    }
    $("#btnSuggest").addEventListener("click", () => {
        S.suggestion = propose();
        renderSuggest();
    });
    $("#suggestBox").addEventListener("click", (e) => {
        const o = e.target.closest("[data-open]");
        if (o) return openRecipe(o.dataset.open);
        const t = e.target.closest("[data-sact]");
        if (!t) return;
        const a = t.dataset.sact;
        if (a === "close") {
            S.suggestion = null;
        }
        if (a === "again") {
            S.suggestion = propose();
        }
        if (a === "reroll") {
            const i = +t.dataset.i;
            const cur = S.suggestion;
            const r0 = byKey(cur[i]);
            const pool = lib("dinner").filter(
                (r) => !isNo(r.key) && !cur.includes(r.key) && carb(r) === carb(r0),
            );
            const alt = pool.length
                ? weighted(pool)
                : weighted(lib("dinner").filter((r) => !isNo(r.key) && !cur.includes(r.key)));
            cur[i] = alt.key;
        }
        if (a === "apply" || a === "fill") {
            if (S.readOnly) return toast("Je kunt hier alleen meekijken.");
            if (a === "apply")
                S.suggestion.forEach((k, i) => (S.week.days[i] = { kind: "recipe", key: k, portions: 4 }));
            else {
                let j = 0;
                S.week.days.forEach((d, i) => {
                    if (!d && j < S.suggestion.length)
                        S.week.days[i] = { kind: "recipe", key: S.suggestion[j++], portions: 4 };
                });
            }
            S.suggestion = null;
            persist("week");
            toast("Weekmenu staat klaar");
        }
        renderAll();
    });

    /* ---------- bibliotheken ---------- */
    const CHIPS = {
        dinner: [
            ["fav", "♥ Favorieten"],
            ["snel", "Snel (≤ 25 min)"],
            ["koemelkvrij", "Koemelkvrij"],
            ["oven", "Oven / traybake"],
            ["thermomix", "Thermomix"],
            ["kip", "Kip"],
            ["vis", "Vis & scampi"],
            ["vegetarisch", "Vegetarisch"],
            ["pasta", "Pasta"],
            ["rijst", "Rijst & bowls"],
            ["wrap", "Wraps & pizza"],
            ["mealprep", "Vooraf maken"],
            ["mine", "Mijn recepten"],
        ],
        lunch: [
            ["fav", "♥ Favorieten"],
            ["vegetarisch", "Vegetarisch"],
            ["kip", "Kip"],
            ["vis", "Vis"],
            ["koud", "Koud"],
            ["warm", "Warm"],
            ["mealprep", "Mealprep"],
            ["mine", "Mijn recepten"],
        ],
        breakfast: [
            ["fav", "♥ Favorieten"],
            ["snel", "Snel"],
            ["koemelkvrij", "Koemelkvrij (optie)"],
            ["eiwitrijk", "Eiwitrijk"],
            ["mine", "Mijn recepten"],
        ],
    };
    const INTRO = {
        dinner: ["Avondeten", "Kies een gerecht", "Gesorteerd op wat het best bij jullie past."],
        lunch: [
            "Lunch",
            "Lunches zonder brood",
            "Recepten voor 1 persoon; kies het aantal porties in je week.",
        ],
        breakfast: ["Ontbijt", "Ontbijtideeën", "Recepten voor 1 persoon."],
    };
    function chipTest(r, c) {
        const h = hay(r),
            t = r.tags || [];
        switch (c) {
            case "fav":
                return isFav(r.key);
            case "snel":
                return t.includes("snel") || (r.time && r.time <= 25);
            case "koemelkvrij":
                return t.some((x) => x.startsWith("koemelkvrij"));
            case "oven":
                return t.includes("oven") || /traybake|oven/.test(h);
            case "vis":
                return protein(r) === "vis";
            case "kip":
                return protein(r) === "kip";
            case "vegetarisch":
                return t.includes("vegetarisch") || t.includes("vegan");
            case "pasta":
                return carb(r) === "pasta";
            case "rijst":
                return carb(r) === "rijst";
            case "wrap":
                return carb(r) === "wrap";
            case "mine":
                return r.own;
            default:
                return t.includes(c) || h.includes(c);
        }
    }
    function libShell(l) {
        const el = $("#p-" + l);
        if (el.dataset.ready) return;
        el.dataset.ready = "1";
        const [eb, h, sub] = INTRO[l];
        el.innerHTML = `<div class="head"><div><p class="eyebrow">${eb}</p><h2>${h}</h2></div><p class="muted small" style="margin:0">${sub}</p></div>
  <div class="pickbar" data-pickbar hidden></div>
  <div class="toolbar"><div class="search">
    <input type="search" data-f="q" placeholder="Zoek op naam…" aria-label="Zoek op naam">
    <input type="search" data-f="ing" placeholder="Met ingrediënt(en): bv. mango, prei" aria-label="Zoek op ingrediënt">
  </div><div class="chips">${CHIPS[l].map(([k, v]) => `<button class="chip" data-chip="${k}" aria-pressed="false">${v}</button>`).join("")}
  <button class="chip" data-chip="__no" aria-pressed="false">Toon ‘niet voor ons’</button></div></div>
  <div class="count" data-count></div><div class="grid" data-grid></div>`;
        el.addEventListener("input", (e) => {
            const f = e.target.dataset.f;
            if (!f) return;
            S.filters[l][f] = e.target.value;
            renderLib(l);
        });
        el.addEventListener("click", (e) => {
            const ch = e.target.closest("[data-chip]");
            if (ch) {
                const k = ch.dataset.chip,
                    F = S.filters[l];
                if (k === "__no") F.showNo = !F.showNo;
                else F.chips.has(k) ? F.chips.delete(k) : F.chips.add(k);
                renderLib(l);
                return;
            }
            if (e.target.closest("[data-cancelpick]")) {
                S.pickDay = null;
                setTab("week");
                return;
            }
            const q = e.target.closest("[data-quick]");
            if (q) {
                e.stopPropagation();
                quick(q.dataset.quick, q.dataset.key);
                return;
            }
            const c = e.target.closest("[data-open]");
            if (c) openRecipe(c.dataset.open);
        });
        el.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const c = e.target.closest(".card[data-open]");
                if (c) openRecipe(c.dataset.open);
            }
        });
    }
    function renderLib(l) {
        libShell(l);
        const el = $("#p-" + l),
            F = S.filters[l];
        el.querySelectorAll("[data-chip]").forEach((b) =>
            b.setAttribute(
                "aria-pressed",
                String(b.dataset.chip === "__no" ? F.showNo : F.chips.has(b.dataset.chip)),
            ),
        );
        const pb = el.querySelector("[data-pickbar]");
        if (l === "dinner" && S.pickDay != null) {
            pb.hidden = false;
            pb.innerHTML = `<strong>Kies een gerecht voor ${DAYS[S.pickDay].toLowerCase()}</strong><button class="btn sm" data-cancelpick>Annuleer</button>`;
        } else pb.hidden = true;
        const q = norm(F.q).trim(),
            ings = norm(F.ing)
                .split(/[,;]+/)
                .map((s) => s.trim())
                .filter(Boolean);
        let list = lib(l).filter(
            (r) =>
                (F.showNo || !isNo(r.key)) &&
                (!q || norm(r.name).includes(q)) &&
                ings.every((i) => norm((r.ingredients || []).join(" ") + " " + r.name).includes(i)) &&
                [...F.chips].every((c) => chipTest(r, c)),
        );
        list.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name, "nl"));
        el.querySelector("[data-count]").textContent = `${list.length} recepten`;
        const picking = l === "dinner" && S.pickDay != null;
        el.querySelector("[data-grid]").innerHTML =
            list
                .map(
                    (
                        r,
                    ) => `<article class="card ${isNo(r.key) ? "no" : ""}" data-open="${esc(r.key)}" tabindex="0">
    <h3>${esc(r.name)}</h3>
    <div class="meta"><span class="time">${r.time ? r.time + " min" : ""}</span>${isFav(r.key) ? '<span class="pill fav">♥ favoriet</span>' : ""}${(r.tags || []).includes("topmatch") ? '<span class="pill ok">voor jullie</span>' : ""}${r.own ? '<span class="pill ok">eigen</span>' : ""}${(r.tags || []).some((t) => t.startsWith("koemelkvrij")) ? '<span class="pill">koemelkvrij</span>' : ""}${isNo(r.key) ? '<span class="pill">niet voor ons</span>' : ""}
    ${picking ? `<button class="btn sm primary" data-quick="pick" data-key="${esc(r.key)}" style="margin-left:auto">Kies</button>` : l !== "dinner" ? `<button class="btn sm" data-quick="extra" data-key="${esc(r.key)}" style="margin-left:auto">+ Deze week</button>` : ""}</div></article>`,
                )
                .join("") || '<p class="muted">Geen recepten gevonden. Probeer minder filters.</p>';
    }
    function quick(a, k) {
        if (S.readOnly) return toast("Je kunt hier alleen meekijken.");
        if (a === "pick") {
            const i = S.pickDay;
            S.week.days[i] = { kind: "recipe", key: k, portions: 4 };
            S.pickDay = null;
            persist("week");
            toast(`${byKey(k).name} staat op ${DAYS[i].toLowerCase()}`);
            setTab("week");
        }
        if (a === "extra") {
            S.week.extras.push({ key: k, portions: 1 });
            persist("week");
            toast("Toegevoegd aan deze week");
            renderAll();
        }
    }

    /* ---------- recept detail ---------- */
    let detail = null;
    function openRecipe(k, portions) {
        const r = byKey(k);
        if (!r) return;
        detail = { r, portions: portions || (r.lib === "dinner" ? 4 : 1), view: "normal", confirmDel: false };
        renderDetail();
        $("#overlay").hidden = false;
        document.body.style.overflow = "hidden";
    }
    function closeDetail() {
        $("#overlay").hidden = true;
        $("#overlay").innerHTML = "";
        detail = null;
        document.body.style.overflow = "";
    }
    function renderDetail() {
        const { r, portions, view } = detail;
        const f = portions / (r.servings || 4);
        const tmx = (r.thermomix || []).length > 0;
        const steps = view === "tmx" && tmx ? r.thermomix : r.steps;
        $("#overlay").innerHTML =
            `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(r.name)}">
    <button class="icon-btn close" data-d="close" aria-label="Sluiten">✕</button>
    <p class="eyebrow">${LIBS[r.lib]}${r.own ? " · eigen recept" : ""}</p>
    <h2>${esc(r.name)}</h2>
    <div class="row" style="margin-top:10px">
      <span class="pill">${r.time || "?"} min</span>${(r.tags || [])
          .slice(0, 6)
          .map((t) => `<span class="pill">${esc(t)}</span>`)
          .join("")}
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn sm ${isFav(r.key) ? "primary" : ""}" data-d="fav">${isFav(r.key) ? "♥ Favoriet" : "♡ Favoriet"}</button>
      <button class="btn sm ${isNo(r.key) ? "danger" : ""}" data-d="no">${isNo(r.key) ? "Toch weer tonen" : "Niet voor ons"}</button>
      ${r.own ? `<button class="btn sm danger" data-d="del">Verwijderen</button>` : ""}
    </div>
    ${detail.confirmDel ? `<div class="confirm" style="margin-top:10px"><span>Dit eigen recept definitief verwijderen?</span><button class="btn sm danger" data-d="delyes">Verwijder</button><button class="btn sm" data-d="delno">Annuleer</button></div>` : ""}
    <div class="box"><strong>${r.lib === "dinner" ? "Plan op" : "Deze week"}</strong>
      ${
          r.lib === "dinner"
              ? `<div class="daypick" style="margin-top:6px">${DAYS.map((d, i) => `<button class="btn sm ${S.week.days[i] && S.week.days[i].key === r.key ? "primary" : ""}" data-d="plan" data-i="${i}">${d.slice(0, 2)}${S.week.days[i] && !(S.week.days[i].key === r.key) ? " •" : ""}</button>`).join("")}</div><p class="small muted" style="margin:6px 0 0">• = er staat al iets; dat wordt vervangen.</p>`
              : `<div class="row" style="margin-top:6px"><button class="btn sm" data-d="extra">+ Zet bij lunch &amp; ontbijt (${portions} ${portions > 1 ? "porties" : "portie"})</button></div>`
      }
    </div>
    <div class="cols">
      <div><h3>Ingrediënten</h3>
        <div class="row" style="margin-top:6px">${stepper(portions, 1, 12, 'data-d="por"')}</div>
        <ul class="ing">${(r.ingredients || [])
            .map((l) => {
                const s = scaledLine(l, f);
                return `<li>${s.qty ? `<b>${esc(s.qty)}</b> ` : ""}${esc(s.name)}</li>`;
            })
            .join("")}</ul>
        ${r.cowmilk_note ? `<div class="box"><strong>Koemelk</strong>${esc(r.cowmilk_note)}</div>` : ""}
      </div>
      <div><h3>Zo maak je het</h3>
        ${tmx ? `<div class="segmented" role="group" aria-label="Bereidingswijze"><button data-d="view" data-v="normal" aria-pressed="${view !== "tmx"}">Gewoon</button><button data-d="view" data-v="tmx" aria-pressed="${view === "tmx"}">Thermomix</button></div>` : ""}
        <ol class="steps">${(steps || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
        ${f !== 1 ? `<p class="small muted">De hoeveelheden zijn aangepast naar ${portions} porties; tijden in de stappen gelden voor het originele recept.</p>` : ""}
        ${r.prep ? `<div class="box"><strong>Vooraf / slim voorbereiden</strong>${esc(r.prep)}</div>` : ""}
        ${r.day2 ? `<div class="box"><strong>Restjes & dag 2</strong>${esc(r.day2)}</div>` : ""}
      </div>
    </div></div>`;
    }
    $("#overlay").addEventListener("click", (e) => {
        if (e.target.id === "overlay") return closeDetail();
        const t = e.target.closest("[data-d]");
        if (!t || !detail) return;
        const a = t.dataset.d,
            r = detail.r;
        if (a === "close") return closeDetail();
        if (a === "view") {
            detail.view = t.dataset.v;
            return renderDetail();
        }
        if (a === "por") {
            detail.portions = Math.min(12, Math.max(1, detail.portions + +t.dataset.step));
            return renderDetail();
        }
        if (S.readOnly) return toast("Je kunt hier alleen meekijken.");
        if (a === "fav") {
            S.prefs.fav = isFav(r.key) ? S.prefs.fav.filter((x) => x !== r.key) : S.prefs.fav.concat(r.key);
            if (isFav(r.key)) S.prefs.no = S.prefs.no.filter((x) => x !== r.key);
            persist("prefs");
        }
        if (a === "no") {
            S.prefs.no = isNo(r.key) ? S.prefs.no.filter((x) => x !== r.key) : S.prefs.no.concat(r.key);
            if (isNo(r.key)) S.prefs.fav = S.prefs.fav.filter((x) => x !== r.key);
            persist("prefs");
        }
        if (a === "del") {
            detail.confirmDel = true;
        }
        if (a === "delno") {
            detail.confirmDel = false;
        }
        if (a === "delyes") {
            closeDetail();
            deleteOwn(r);
            return;
        }
        if (a === "plan") {
            const i = +t.dataset.i;
            S.week.days[i] = { kind: "recipe", key: r.key, portions: Math.min(8, detail.portions) };
            persist("week");
            toast(`Gepland op ${DAYS[i].toLowerCase()}`);
        }
        if (a === "extra") {
            S.week.extras.push({ key: r.key, portions: detail.portions });
            persist("week");
            toast("Toegevoegd aan deze week");
        }
        renderDetail();
        renderAll();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && detail) closeDetail();
    });

    /* ---------- toevoegen via een chatbot naar keuze ---------- */
    const FIELDS =
        'name (tekst), time (getal, minuten), servings (getal), tags (array van korte labels; voeg "koemelkvrij" toe als het recept koemelkvrij is), ingredients (array van strings, elk beginnend met hoeveelheid en eenheid zoals "600 g kipfilet" of "2 paprika\'s"), steps (array van duidelijke stappen), thermomix (array met Thermomix/Cutter-stappen; leeg als niet nuttig), prep (tekst: wat kan vooraf), day2 (tekst: restjes/dag 2-tip), cowmilk_note (tekst: wat werd koemelkvrij gemaakt, of leeg)';
    function servingsFor(t) {
        return t === "dinner"
            ? "4 porties (de website schaalt zelf naar 1–8)"
            : "1 portie (lunch/ontbijt voor één persoon)";
    }
    function profileText() {
        return PROFILE.map((p) => "- " + p).join("\n");
    }
    function noNames(l) {
        return (
            S.prefs.no
                .map(byKey)
                .filter((r) => r && r.lib === l)
                .slice(0, 25)
                .map((r) => r.name)
                .join(" | ") || "geen"
        );
    }
    function validRecipe(o) {
        return (
            o &&
            typeof o === "object" &&
            typeof o.name === "string" &&
            o.name.trim() &&
            Array.isArray(o.ingredients) &&
            o.ingredients.length &&
            Array.isArray(o.steps) &&
            o.steps.length
        );
    }
    function convertPrompt(type, source, wish) {
        return `Zet het recept hieronder om naar het formaat van onze gezinsreceptenwebsite (${LIBS[type].toLowerCase()}).
Is het een link, open dan de pagina en gebruik dat recept. Is er een foto of PDF bijgevoegd, lees het recept daaruit.
Behoud het gerecht zelf; pas alleen aan waar het logisch is volgens ons smaakprofiel. Schrijf in standaard Nederlands.
Hoeveelheden voor ${servingsFor(type)}. Maak het koemelkvrij waar dat zonder kwaliteitsverlies kan en zeg dat in cowmilk_note. Voeg Thermomix-stappen toe waar nuttig. Bij een traybake: heel concreet (snijgrootte, volgorde, temperatuur, wanneer wat erbij).
${wish ? "Extra wens: " + wish + "\n" : ""}
Ons smaakprofiel:
${profileText()}

Antwoord met uitsluitend één JSON-object (geen uitleg, geen codeblok) met deze velden: ${FIELDS}.

RECEPT:
${source || "(zie bijgevoegde foto of PDF)"}`;
    }
    function ideasPrompt(type, n, wish) {
        return `Bedenk ${n} nieuwe, originele recepten (${LIBS[type].toLowerCase()}) voor onze gezinsreceptenwebsite. Schrijf in standaard Nederlands.
Hoeveelheden voor ${servingsFor(type)}. Normale supermarktingrediënten, veel groenten, duidelijke stappen. Koemelkvrij waar het zonder kwaliteitsverlies kan. Thermomix-stappen waar nuttig.
${wish ? "Waar we nu zin in hebben: " + wish + "\n" : ""}
Ons smaakprofiel:
${profileText()}

Vonden we niet lekker: ${noNames(type)}
Deze hebben we al (maak iets anders): ${lib(type)
            .map((r) => r.name)
            .join(" | ")
            .slice(0, 6000)}

Antwoord met uitsluitend een JSON-array (geen uitleg, geen codeblok) van ${n} objecten met deze velden: ${FIELDS}.`;
    }
    function parseLoose(t) {
        t = String(t || "")
            .trim()
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/```\s*$/, "")
            .trim();
        try {
            return JSON.parse(t);
        } catch (e) {}
        const starts = [t.indexOf("["), t.indexOf("{")].filter((i) => i >= 0);
        if (!starts.length) return null;
        const a = Math.min(...starts),
            b = Math.max(t.lastIndexOf("]"), t.lastIndexOf("}"));
        try {
            return JSON.parse(t.slice(a, b + 1));
        } catch (e) {
            return null;
        }
    }
    function previewHtml(r, idx) {
        const dup = similar(r.name, r.lib);
        return `<div class="preview"><strong>${esc(r.name)}</strong><span class="small muted">${LIBS[r.lib]} · ${r.time || "?"} min · ${r.servings || "?"} porties · ${(r.tags || []).map(esc).join(", ")}</span>
    <ul>${r.ingredients
        .slice(0, 6)
        .map((i) => `<li>${esc(i)}</li>`)
        .join("")}${r.ingredients.length > 6 ? `<li>… en ${r.ingredients.length - 6} meer</li>` : ""}</ul>
    ${dup ? `<span class="small" style="color:var(--tomato)">Lijkt op een bestaand recept: “${esc(dup.name)}”.</span>` : ""}
    <div class="row"><button class="btn sm primary" data-addprev="${idx}">${dup ? "Toch toevoegen" : "Toevoegen aan mijn recepten"}</button></div></div>`;
    }
    let pending = [];
    $("#cpConvert").addEventListener("click", () => {
        const src = $("#srcText").value.trim(),
            st = $("#cpStatus");
        copyText(
            convertPrompt($("#srcType").value, src, $("#srcWish").value.trim()),
            "Opdracht gekopieerd. Plak ze in ChatGPT, Claude of Gemini.",
        );
        st.textContent = src ? "" : "Geen link of tekst ingevuld: voeg in de chat zelf een foto of PDF toe.";
    });
    $("#cpIdeas").addEventListener("click", () => {
        copyText(
            ideasPrompt($("#idType").value, +$("#idN").value, $("#idWish").value.trim()),
            "Opdracht gekopieerd. Plak ze in ChatGPT, Claude of Gemini.",
        );
    });
    $("#ansGo").addEventListener("click", () => {
        const st = $("#ansStatus");
        st.className = "status";
        const o = parseLoose($("#ansIn").value);
        if (o == null) {
            st.className = "status err";
            st.textContent = "Dit lijkt geen geldig antwoord. Kopieer het volledige antwoord van de chatbot.";
            return;
        }
        const list = (Array.isArray(o) ? o : [o]).filter(validRecipe);
        if (!list.length) {
            st.className = "status err";
            st.textContent = "Geen recept gevonden met naam, ingrediënten en stappen.";
            return;
        }
        const type = $("#ansType").value;
        list.forEach((r) => {
            r.lib = type;
            r.servings = r.servings || (type === "dinner" ? 4 : 1);
        });
        pending = list;
        st.textContent = list.length === 1 ? "Controleer en voeg toe:" : "Kies wat je wilt bewaren:";
        $("#ansResult").innerHTML = list.map(previewHtml).join("");
    });
    $("#ansResult").addEventListener("click", async (e) => {
        const b = e.target.closest("[data-addprev]");
        if (!b) return;
        b.disabled = true;
        try {
            await saveOwn(pending[+b.dataset.addprev]);
            b.textContent = "✓ Toegevoegd";
        } catch (err) {
            b.disabled = false;
        }
    });

    $("#mType").addEventListener("change", () => {
        $("#mServ").value = $("#mType").value === "dinner" ? 4 : 1;
    });
    $("#manual").addEventListener("submit", async (e) => {
        e.preventDefault();
        const lines = (id) =>
            $(id)
                .value.split("\n")
                .map((s) => s.trim())
                .filter(Boolean);
        const r = {
            name: $("#mName").value.trim(),
            lib: $("#mType").value,
            servings: +$("#mServ").value || 4,
            time: +$("#mTime").value || 0,
            tags: $("#mTags")
                .value.split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            ingredients: lines("#mIng"),
            steps: lines("#mSteps"),
            thermomix: lines("#mTmx"),
            day2: $("#mDay2").value.trim(),
        };
        const st = $("#mStatus");
        st.className = "status";
        if (!validRecipe(r)) {
            st.className = "status err";
            st.textContent = "Vul minstens een naam, één ingrediënt en één stap in.";
            return;
        }
        const dup = similar(r.name, r.lib);
        if (dup && !(e.submitter && e.submitter.dataset.force)) {
            st.className = "status err";
            st.innerHTML = `Lijkt op “${esc(dup.name)}”. <button class="btn sm" type="submit" data-force="1">Toch opslaan</button>`;
            return;
        }
        try {
            await saveOwn(r);
            e.target.reset();
            $("#mServ").value = 4;
            st.textContent = "Opgeslagen.";
        } catch (err) {}
    });

    /* back-up */
    $("#btnBackup").addEventListener("click", () => {
        const data = {
            app: "gezinsmenu",
            version: 1,
            exported: new Date().toISOString(),
            week: S.week,
            prefs: S.prefs,
            shop: S.shop,
            recipes: S.own.map(cleanRecipe),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "gezinsmenu-backup-" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            URL.revokeObjectURL(a.href);
            a.remove();
        }, 500);
    });
    $("#restoreFile").addEventListener("change", async (e) => {
        const f = e.target.files[0];
        const st = $("#backupStatus");
        st.className = "status";
        if (!f) return;
        let d;
        try {
            d = JSON.parse(await f.text());
        } catch (err) {
            st.className = "status err";
            st.textContent = "Dit bestand is geen geldige back-up.";
            return;
        }
        if (!d || d.app !== "gezinsmenu") {
            st.className = "status err";
            st.textContent = "Dit bestand is geen Gezinsmenu-back-up.";
            return;
        }
        const have = new Set(S.own.map((r) => norm(r.name) + "|" + r.lib));
        let n = 0;
        for (const r of (d.recipes || []).filter(validRecipe)) {
            if (have.has(norm(r.name) + "|" + r.lib)) continue;
            try {
                await saveOwn(r);
                n++;
            } catch (err) {
                break;
            }
        }
        if (d.prefs) {
            S.prefs = {
                fav: [...new Set(S.prefs.fav.concat(d.prefs.fav || []))],
                no: [...new Set(S.prefs.no.concat(d.prefs.no || []))],
            };
            persist("prefs");
        }
        if (d.week && S.week.days.every((x) => !x)) {
            S.week = sanitizeWeek(d.week);
            persist("week");
        }
        e.target.value = "";
        renderAll();
        st.textContent = `Teruggezet: ${n} recept${n === 1 ? "" : "en"}, favorieten en ‘niet voor ons’.`;
    });

    function renderAdd() {
        $("#mine").innerHTML = S.own.length
            ? S.own
                  .slice()
                  .sort((a, b) => (b.added || 0) - (a.added || 0))
                  .map(
                      (r) =>
                          `<li><span class="pill">${LIBS[r.lib]}</span><span class="nm" data-open="${esc(r.key)}">${esc(r.name)}</span></li>`,
                  )
                  .join("")
            : '<li class="muted small">Nog geen eigen recepten. Voeg er hierboven een toe.</li>';
        if (!$("#profileList").children.length)
            $("#profileList").innerHTML = PROFILE.map((p) => `<li>${esc(p)}</li>`).join("");
    }
    $("#mine").addEventListener("click", (e) => {
        const t = e.target.closest("[data-open]");
        if (t) openRecipe(t.dataset.open);
    });

    /* ---------- render ---------- */
    function renderAll() {
        if (S.tab === "week") renderWeek();
        else if (S.tab === "add") renderAdd();
        else renderLib(S.tab);
        if (detail) {
            const k = detail.r.key;
            const r = byKey(k);
            if (r) {
                detail.r = r;
                renderDetail();
            } else closeDetail();
        }
    }
    setSync();
    initStore();
})();

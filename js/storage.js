export function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function load(key) {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
}

// Merkt sich pro Browser, fuer welche Listen ein Bearbeitungs-Token bekannt
// ist (weil man die Liste selbst erstellt oder einen Bearbeitungslink
// geoeffnet hat). Nur dafuer zeigt die Hauptseite Bearbeiten-Funktionen an.
const KNOWN_LISTS_KEY = "qr-code-franken:known-lists";

export function rememberList(id, titel, editToken) {
    const known = getKnownLists();
    known[id] = { titel, editToken };
    save(KNOWN_LISTS_KEY, known);
}

export function forgetList(id) {
    const known = getKnownLists();
    delete known[id];
    save(KNOWN_LISTS_KEY, known);
}

export function getKnownLists() {
    return load(KNOWN_LISTS_KEY) || {};
}
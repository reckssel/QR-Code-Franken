import {
    getAllLists,
    getAllTags,
    updateList,
    deleteList,
    addTagToList,
    removeTagFromList,
} from "./supabase.js";
import { signIn, signUp, signOut, getSession, onAuthChange } from "./auth.js";
import { makeSortable } from "./drag-reorder.js";

const authForm = document.getElementById("login-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authStatus = document.getElementById("auth-status");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");

const dashboardSection = document.getElementById("dashboard");
const container = document.getElementById("lists-container");
const emptyState = document.getElementById("lists-empty");
const tagSuggestions = document.getElementById("tag-suggestions");

// Da dieser Bereich ohnehin nur mit einem Account erreichbar ist, braucht
// es hier keinen Bearbeitungs-Token mehr pro Liste – die Datenbank-Funktionen
// (update_list, delete_list, add_tag_to_list, remove_tag_from_list) lassen
// jeden eingeloggten Account unabhängig vom Token zugreifen.
const NO_TOKEN = null;

function fillTagSuggestions(tags) {
    tagSuggestions.innerHTML = "";
    tags.forEach(tag => addTagSuggestion(tag.name));
}

function addTagSuggestion(name) {
    const exists = Array.from(tagSuggestions.options).some(o => o.value === name);
    if (exists) return;

    const option = document.createElement("option");
    option.value = name;
    tagSuggestions.appendChild(option);
}

function updateEmptyState() {
    emptyState.classList.toggle("hidden", container.children.length > 0);
}

function appendItemRow(itemsContainer, text, state, scheduleSave) {

    const row = document.createElement("div");
    row.className = "item-row";

    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.textContent = "⠿";
    row.appendChild(handle);

    const span = document.createElement("span");
    span.className = "item-text";
    span.textContent = text;
    row.appendChild(span);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-item";
    removeBtn.setAttribute("aria-label", "Eintrag entfernen");
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
        const index = Array.from(itemsContainer.children).indexOf(row);
        if (index > -1) state.daten.splice(index, 1);
        row.remove();
        scheduleSave();
    });
    row.appendChild(removeBtn);

    itemsContainer.appendChild(row);
    return row;
}

function renderTagChip(tag, list, state, tagInput) {

    const chip = document.createElement("span");
    chip.className = "tag-chip";

    const label = document.createElement("span");
    label.textContent = tag.name;
    chip.appendChild(label);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "tag-remove";
    removeBtn.setAttribute("aria-label", `Tag ${tag.name} entfernen`);
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", async () => {
        const ok = await removeTagFromList(list.id, NO_TOKEN, tag.id);
        if (!ok) return;
        state.tags = state.tags.filter(t => t.id !== tag.id);
        chip.remove();
    });
    chip.appendChild(removeBtn);

    if (tagInput) {
        tagInput.before(chip);
    }

    return chip;
}

function renderListCard(list) {

    const card = document.createElement("article");
    card.className = "list-card";
    card.dataset.listId = list.id;

    const state = {
        daten: [...list.daten],
        tags: [...(list.tags || [])],
    };

    let saveTimeout = null;
    function scheduleSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            updateList(list.id, NO_TOKEN, list.titel, state.daten);
        }, 400);
    }

    // --- Kopf: Titel + Löschen ---
    const header = document.createElement("header");
    header.className = "list-card-header";

    const title = document.createElement("h3");
    title.textContent = list.titel;
    header.appendChild(title);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-danger delete-list-btn";
    deleteBtn.textContent = "Löschen";
    deleteBtn.addEventListener("click", async () => {
        if (!confirm(`"${list.titel}" wirklich unwiderruflich löschen?`)) return;

        const ok = await deleteList(list.id, NO_TOKEN);
        if (!ok) {
            alert("Liste konnte nicht gelöscht werden.");
            return;
        }

        card.remove();
        updateEmptyState();
    });
    header.appendChild(deleteBtn);

    card.appendChild(header);

    // --- Tags ---
    const tagRow = document.createElement("div");
    tagRow.className = "tag-row";

    const tagInput = document.createElement("input");
    tagInput.type = "text";
    tagInput.className = "tag-input";
    tagInput.placeholder = "+ Tag";
    tagInput.setAttribute("list", "tag-suggestions");

    state.tags.forEach(tag => tagRow.appendChild(renderTagChip(tag, list, state, null)));
    tagRow.appendChild(tagInput);

    tagInput.addEventListener("keydown", async (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();

        const name = tagInput.value.trim();
        if (!name) return;

        if (state.tags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
            tagInput.value = "";
            return;
        }

        const tag = await addTagToList(list.id, NO_TOKEN, name);
        if (!tag) {
            alert("Tag konnte nicht hinzugefügt werden.");
            return;
        }

        state.tags.push(tag);
        renderTagChip(tag, list, state, tagInput);
        addTagSuggestion(tag.name);
        tagInput.value = "";
    });

    card.appendChild(tagRow);

    // --- Einträge ---
    const itemsContainer = document.createElement("div");
    itemsContainer.className = "items sortable-items";

    state.daten.forEach(text => appendItemRow(itemsContainer, text, state, scheduleSave));

    card.appendChild(itemsContainer);

    makeSortable(itemsContainer, () => {
        state.daten = Array.from(itemsContainer.querySelectorAll(".item-text"))
            .map(el => el.textContent);
        scheduleSave();
    });

    const addRow = document.createElement("div");
    addRow.className = "add-item-row";

    const addInput = document.createElement("input");
    addInput.type = "text";
    addInput.placeholder = "Eintrag hinzufügen...";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn-secondary";
    addBtn.textContent = "+";

    function addItem() {
        const value = addInput.value.trim();
        if (!value) return;

        state.daten.push(value);
        appendItemRow(itemsContainer, value, state, scheduleSave);
        addInput.value = "";
        scheduleSave();
    }

    addBtn.addEventListener("click", addItem);
    addInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            addItem();
        }
    });

    addRow.append(addInput, addBtn);
    card.appendChild(addRow);

    return card;
}

async function refreshDashboard() {

    const [lists, tags] = await Promise.all([getAllLists(), getAllTags()]);

    fillTagSuggestions(tags);

    container.innerHTML = "";
    lists.forEach(list => container.appendChild(renderListCard(list)));

    updateEmptyState();
}

function showDashboard() {
    authForm.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    refreshDashboard();
}

function showLogin() {
    dashboardSection.classList.add("hidden");
    authForm.classList.remove("hidden");
    authStatus.textContent = "";
}

export async function initDashboardPage() {

    const session = await getSession();
    if (session) {
        showDashboard();
    } else {
        showLogin();
    }

    onAuthChange((session) => {
        if (session) {
            showDashboard();
        } else {
            showLogin();
        }
    });

    authForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        authStatus.textContent = "Anmelden...";
        const error = await signIn(authEmail.value.trim(), authPassword.value);

        authStatus.textContent = error || "";
    });

    signupBtn.addEventListener("click", async () => {
        if (!authEmail.value.trim() || !authPassword.value) {
            authStatus.textContent = "Bitte E-Mail und Passwort eingeben.";
            return;
        }

        authStatus.textContent = "Registrieren...";
        const error = await signUp(authEmail.value.trim(), authPassword.value);

        authStatus.textContent = error
            || "Konto erstellt. Falls E-Mail-Bestätigung aktiv ist, bitte Posteingang prüfen und danach anmelden.";
    });

    logoutBtn.addEventListener("click", async () => {
        await signOut();
    });
}

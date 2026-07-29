import { getList, updateList } from "./supabase.js";
import { rememberList } from "./storage.js";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const token = params.get("token");

const titelEl = document.getElementById("titel");
const listeEl = document.getElementById("liste");

const editControls = document.getElementById("edit-controls");
const editBtn = document.getElementById("edit-btn");

const editForm = document.getElementById("edit-form");
const editTitleInput = document.getElementById("edit-title");
const editItemsContainer = document.getElementById("edit-items");
const editAddItemBtn = document.getElementById("edit-add-item-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const saveStatus = document.getElementById("save-status");

let currentTitel = "";
let currentDaten = [];

function renderView(titel, daten) {

    titelEl.textContent = titel;
    listeEl.innerHTML = "";

    daten.forEach(punkt => {
        const li = document.createElement("li");
        li.textContent = punkt;
        listeEl.appendChild(li);
    });
}

function addEditItemRow(value = "") {

    const row = document.createElement("div");
    row.className = "item-row";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "item-input";
    input.value = value;
    input.required = true;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-item";
    removeBtn.setAttribute("aria-label", "Eintrag entfernen");
    removeBtn.textContent = "✕";

    removeBtn.addEventListener("click", () => {
        if (editItemsContainer.children.length > 1) {
            row.remove();
        }
    });

    row.append(input, removeBtn);
    editItemsContainer.appendChild(row);
}

function openEditForm() {

    editTitleInput.value = currentTitel;
    editItemsContainer.innerHTML = "";
    currentDaten.forEach(item => addEditItemRow(item));

    editForm.classList.remove("hidden");
    editControls.classList.add("hidden");
    saveStatus.textContent = "";
}

function closeEditForm() {
    editForm.classList.add("hidden");
    editControls.classList.remove("hidden");
}

async function init() {

    if (!id) {
        document.body.innerHTML = "<h1>Kein gültiger Link.</h1>";
        return;
    }

    const { data, error } = await getList(id);

    if (error || !data) {
        document.body.innerHTML = "<h1>Liste nicht gefunden.</h1>";
        return;
    }

    currentTitel = data.titel;
    currentDaten = data.daten || [];

    renderView(currentTitel, currentDaten);

    if (token) {
        editControls.classList.remove("hidden");
        rememberList(id, currentTitel, token);
    }
}

editBtn.addEventListener("click", openEditForm);
editAddItemBtn.addEventListener("click", () => addEditItemRow());
cancelEditBtn.addEventListener("click", closeEditForm);

editForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const titel = editTitleInput.value.trim();

    const daten = Array.from(editItemsContainer.querySelectorAll(".item-input"))
        .map(input => input.value.trim())
        .filter(Boolean);

    if (!titel || daten.length === 0) return;

    saveStatus.textContent = "Speichern...";

    const ok = await updateList(id, token, titel, daten);

    if (!ok) {
        saveStatus.textContent = "Fehler beim Speichern. Ungültiger Bearbeitungs-Link?";
        return;
    }

    currentTitel = titel;
    currentDaten = daten;

    renderView(currentTitel, currentDaten);
    closeEditForm();
    saveStatus.textContent = "";
});

init();

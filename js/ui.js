import { generateQRCode } from "./qr-generator.js";
import { saveList } from "./supabase.js";

export function initUI() {

    const form = document.getElementById("list-form");
    const titleInput = document.getElementById("list-title");
    const itemsContainer = document.getElementById("items");
    const addItemBtn = document.getElementById("add-item-btn");
    const generateBtn = document.getElementById("generate-btn");

    const result = document.getElementById("result");
    const qrCode = document.getElementById("qr-code");
    const viewLink = document.getElementById("view-link");
    const editLink = document.getElementById("edit-link");

    function addItemRow(value = "") {

        const row = document.createElement("div");
        row.className = "item-row";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "item-input";
        input.placeholder = "Eintrag";
        input.value = value;
        input.required = true;

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "remove-item";
        removeBtn.setAttribute("aria-label", "Eintrag entfernen");
        removeBtn.textContent = "✕";

        removeBtn.addEventListener("click", () => {
            if (itemsContainer.children.length > 1) {
                row.remove();
            }
        });

        row.append(input, removeBtn);
        itemsContainer.appendChild(row);
    }

    addItemBtn.addEventListener("click", () => addItemRow());

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        const titel = titleInput.value.trim();

        const daten = Array.from(itemsContainer.querySelectorAll(".item-input"))
            .map(input => input.value.trim())
            .filter(Boolean);

        if (!titel || daten.length === 0) return;

        generateBtn.disabled = true;
        generateBtn.textContent = "Wird erstellt...";

        const liste = await saveList(titel, daten);

        generateBtn.disabled = false;
        generateBtn.textContent = "QR-Code erzeugen";

        if (!liste) {
            alert("Liste konnte nicht gespeichert werden.");
            return;
        }

        const viewUrl = new URL(
            `view.html?id=${liste.id}`,
            window.location.href
        ).toString();

        const editUrl = new URL(
            `view.html?id=${liste.id}&token=${liste.edit_token}`,
            window.location.href
        ).toString();

        generateQRCode(viewUrl, qrCode);

        viewLink.href = viewUrl;
        viewLink.textContent = viewUrl;

        editLink.href = editUrl;
        editLink.textContent = editUrl;

        result.classList.remove("hidden");
    });

}

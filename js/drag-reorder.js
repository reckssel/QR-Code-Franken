// Macht die direkten .item-row-Kinder eines Containers per Ziehpunkt
// (.drag-handle) neu anordenbar – per Maus und per Touch, ohne Bibliothek.
export function makeSortable(container, onReorder) {

    let draggingRow = null;
    let placeholder = null;

    function getRows() {
        return Array.from(container.children)
            .filter(el => el.classList.contains("item-row") && el !== draggingRow);
    }

    function moveDraggingRowTo(clientY) {
        const rect = draggingRow.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        draggingRow.style.top = `${clientY - rect.height / 2}px`;
        draggingRow.style.left = `${containerRect.left}px`;
        draggingRow.style.width = `${containerRect.width}px`;
    }

    function onPointerMove(event) {
        if (!draggingRow) return;

        moveDraggingRowTo(event.clientY);

        const after = getRows().find(row => {
            const rect = row.getBoundingClientRect();
            return event.clientY < rect.top + rect.height / 2;
        });

        if (after) {
            container.insertBefore(placeholder, after);
        } else {
            container.appendChild(placeholder);
        }
    }

    function onPointerUp() {
        if (!draggingRow) return;

        placeholder.replaceWith(draggingRow);
        draggingRow.classList.remove("dragging");
        draggingRow.style.position = "";
        draggingRow.style.top = "";
        draggingRow.style.left = "";
        draggingRow.style.width = "";

        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);

        draggingRow = null;
        placeholder = null;

        onReorder();
    }

    container.addEventListener("pointerdown", (event) => {
        const handle = event.target.closest(".drag-handle");
        if (!handle) return;

        const row = handle.closest(".item-row");
        if (!row || row.parentElement !== container) return;

        event.preventDefault();
        draggingRow = row;

        placeholder = document.createElement("div");
        placeholder.className = "item-row-placeholder";
        placeholder.style.height = `${row.offsetHeight}px`;
        row.after(placeholder);

        row.classList.add("dragging");
        row.style.position = "fixed";
        moveDraggingRowTo(event.clientY);

        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
    });
}

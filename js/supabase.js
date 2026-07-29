const supabaseUrl = "https://hgmetiaknofkdhmvhwke.supabase.co";
const supabaseKey = "sb_publishable_VUDA2q33YS7ZQF4GeePvgw_okWD02jY";

export const supabase = window.supabase.createClient(
    supabaseUrl,
    supabaseKey
);

// Legt eine neue Liste an und gibt sie inkl. edit_token zurück.
// Läuft über die DB-Funktion create_list (siehe datenbank.txt),
// damit der Bearbeitungs-Token nicht per normalem SELECT auslesbar ist.
export async function saveList(titel, daten) {

    const { data, error } = await supabase
        .rpc("create_list", {
            p_titel: titel,
            p_daten: daten
        });

    if (error) {
        console.error(error);
        return null;
    }

    return data;
}

// Lädt eine Liste zum Anzeigen (ohne edit_token).
export async function getList(id) {

    const { data, error } = await supabase
        .from("listen")
        .select("id, titel, daten, created_at")
        .eq("id", id)
        .single();

    return { data, error };
}

// Aktualisiert eine Liste. Läuft über die DB-Funktion update_list,
// die id + edit_token serverseitig prüft, bevor etwas geändert wird.
export async function updateList(id, token, titel, daten) {

    const { error } = await supabase
        .rpc("update_list", {
            p_id: id,
            p_token: token,
            p_titel: titel,
            p_daten: daten
        });

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}

// Lädt alle Listen inkl. ihrer zugewiesenen Tags für die Hauptseite.
export async function getAllLists() {

    const { data, error } = await supabase
        .from("listen_public")
        .select("id, titel, daten, tags, created_at")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return [];
    }

    return data;
}

// Löscht eine Liste vollständig. Läuft über die DB-Funktion delete_list,
// die wie update_list id + edit_token prüft.
export async function deleteList(id, token) {

    const { error } = await supabase
        .rpc("delete_list", {
            p_id: id,
            p_token: token
        });

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}

// Lädt alle bereits existierenden Tags (für Vorschläge/Autovervollständigung).
export async function getAllTags() {

    const { data, error } = await supabase
        .from("tags")
        .select("id, name")
        .order("name");

    if (error) {
        console.error(error);
        return [];
    }

    return data;
}

// Weist einer Liste einen Tag zu (legt ihn bei Bedarf an).
export async function addTagToList(listId, token, tagName) {

    const { data, error } = await supabase
        .rpc("add_tag_to_list", {
            p_list_id: listId,
            p_token: token,
            p_tag_name: tagName
        });

    if (error) {
        console.error(error);
        return null;
    }

    return data;
}

// Entfernt die Zuweisung eines Tags von einer Liste (der Tag bleibt
// für andere Listen erhalten).
export async function removeTagFromList(listId, token, tagId) {

    const { error } = await supabase
        .rpc("remove_tag_from_list", {
            p_list_id: listId,
            p_token: token,
            p_tag_id: tagId
        });

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}

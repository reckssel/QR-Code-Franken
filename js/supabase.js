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

import { supabase } from "./supabase.js";

export async function signIn(email, password) {

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    return error ? error.message : null;
}

export async function signUp(email, password) {

    const { error } = await supabase.auth.signUp({ email, password });

    return error ? error.message : null;
}

export async function signOut() {
    await supabase.auth.signOut();
}

export async function getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
}

export function onAuthChange(callback) {
    supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

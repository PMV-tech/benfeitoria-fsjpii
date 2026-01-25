// supabaseClient.js
// Coloque aqui a URL do projeto e a PUBLISHABLE KEY COMPLETA (não pode estar cortada)
const SUPABASE_URL = "https://jephlkjpliduxfdkcoge.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_rIl81hftaIjqsg1zCs8Fpg_G8gBr0td";

window.supa = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

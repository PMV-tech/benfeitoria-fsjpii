// supabaseClient.js
(() => {
  const SUPABASE_URL = "https://jephlkjpliduxfdkcoge.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_rIl81hftaIjqsg1zCs8Fpg_G8gBr0td";

  // Garantia: a lib do supabase precisa estar carregada
  if (!window.supabase) {
    console.error("Supabase lib não carregou (CDN).");
    return;
  }

  window.supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();

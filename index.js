const supa = window.supabaseClient;

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const btn = document.getElementById("btnEntrar");

// Se já estiver logado, vai direto pro feed
(async function autoRedirectIfLogged() {
  const { data: { user } } = await supa.auth.getUser();
  if (user) window.location.href = "feed.html";
})();

btn.addEventListener("click", entrar);

async function entrar() {
  const email = emailEl.value.trim();
  const password = passEl.value;

  if (!email || !password) {
    alert("Preencha email e senha.");
    return;
  }

  btn.disabled = true;
  btn.classList.add("loading");

  try {
    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Se confirm-email está habilitado e o usuário não confirmou, pode dar erro tipo "Email not confirmed"
    // Se entrou, redireciona:
    window.location.href = "feed.html";
  } catch (e) {
    console.error(e);
    alert(e?.message || "Erro ao entrar.");
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
  }
}

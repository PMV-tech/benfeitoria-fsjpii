// index.js
const supa = window.supa;

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const btn = document.getElementById("btnEntrar");

// se já estiver logado, vai direto pro feed
(async function autoRedirectIfLogged() {
  const { data: { session } } = await supa.auth.getSession();
  if (session) window.location.href = "feed.html";
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
    const { error } = await supa.auth.signInWithPassword({ email, password });
    if (error) throw error;

    window.location.href = "feed.html";
  } catch (e) {
    console.error(e);
    alert(e?.message || "Erro ao entrar.");
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
  }
}

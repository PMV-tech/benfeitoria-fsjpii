const supa = window.supabaseClient;

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const nameEl = document.getElementById("fullName");
const btn = document.getElementById("btnCadastrar");

btn.addEventListener("click", cadastrar);

async function cadastrar() {
  const email = emailEl.value.trim();
  const password = passEl.value;
  const fullName = nameEl.value.trim();

  if (!email || !password || !fullName) {
    alert("Preencha email, senha e nome.");
    return;
  }

  btn.disabled = true;
  btn.classList.add("loading");

  try {
    const basePath = window.location.pathname.replace(/\/[^/]*$/, "");
    const redirectTo = `${window.location.origin}${basePath}/index.html`;

    const { data, error } = await supa.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo
      }
    });

    if (error) throw error;

    // Com confirm-email ligado: normalmente user não entra automaticamente.
    alert("Cadastro criado! Confirme seu email para fazer login.");
    window.location.href = "index.html";
  } catch (e) {
    console.error(e);
    alert(e?.message || "Erro ao cadastrar.");
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
  }
}

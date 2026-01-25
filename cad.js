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
    // 1) cria conta no Auth
    const { data, error } = await supa.auth.signUp({
      email,
      password,
      options: {
        // em alguns projetos, isso ajuda com redirecionamento pós signup
        emailRedirectTo: `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, "")}/feed.html`,
      }
    });

    if (error) throw error;

    // Se o Supabase estiver com "Confirm email" ligado, user pode vir null
    // Aí ele precisa confirmar no email antes de logar.
    if (!data.user) {
      alert("Conta criada! Agora confirme o email para entrar.");
      window.location.href = "login.html";
      return;
    }

    // 2) Atualiza o profile (trigger já criou a linha em profiles)
    // Espera um pouquinho porque às vezes o trigger demora milissegundos
    await new Promise(r => setTimeout(r, 300));

    const { error: upErr } = await supa
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", data.user.id);

    if (upErr) {
      // se falhar, ainda deixa entrar (mas avisa)
      console.warn("Falhou update full_name:", upErr);
    }

    alert("Cadastro concluído! Bem-vindo(a).");
    window.location.href = "feed.html";
  } catch (e) {
    console.error(e);
    alert(e?.message || "Erro ao cadastrar.");
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
  }
}

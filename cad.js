// cad.js
const supa = window.supa;

const emailEl = document.getElementById("cadEmail");
const passEl = document.getElementById("cadPass");
const nameEl = document.getElementById("cadName");
const btn = document.getElementById("btnCadastrar");

btn.addEventListener("click", cadastrar);

async function cadastrar() {
  const email = emailEl.value.trim();
  const password = passEl.value;
  const full_name = nameEl.value.trim();

  if (!email || !password || !full_name) {
    alert("Preencha email, senha e nome.");
    return;
  }

  btn.disabled = true;
  btn.classList.add("loading");

  try {
    const { data, error } = await supa.auth.signUp({
      email,
      password,
      options: {
        data: { full_name } // opcional: fica no user_metadata
      }
    });

    if (error) throw error;

    // Se o Supabase exigir confirmação por email, session pode vir null
    if (!data.session) {
      alert("Cadastro criado! Agora confirme seu email e depois faça login.");
      window.location.href = "index.html";
      return;
    }

    // Se já logou, atualiza o profile (caso o trigger já tenha criado)
    const userId = data.user?.id || data.session.user.id;

    const { error: upErr } = await supa
      .from("profiles")
      .update({ full_name })
      .eq("id", userId);

    // Se der erro aqui, normalmente é RLS/policy. Mas não impede o cadastro.
    if (upErr) console.warn("Não consegui atualizar profiles:", upErr);

    alert("Cadastrado com sucesso!");
    window.location.href = "feed.html";
  } catch (e) {
    console.error(e);
    alert(e?.message || "Erro ao cadastrar.");
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
  }
}

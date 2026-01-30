// cad.js
const supa = window.supa;

// ===== CONFIG =====
const EMAIL_REDIRECT_TO = "https://pmv-tech.github.io/benfeitoria-fsjpii/index.html"; // AJUSTE

// Elementos do DOM
const emailEl = document.getElementById("cadEmail");
const passEl = document.getElementById("cadPass");
const nameEl = document.getElementById("cadName");
const btn = document.getElementById("btnCadastrar");
const togglePasswordBtn = document.getElementById("togglePassword");
const passwordInput = document.getElementById("cadPass");

// Configurar botões e eventos
function setupEventListeners() {
  btn.addEventListener("click", cadastrar);

  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", togglePasswordVisibility);
    togglePasswordBtn.querySelector("i").className = "fas fa-eye-slash";
    togglePasswordBtn.setAttribute("aria-label", "Mostrar senha");
  }

  emailEl.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (passEl.value.trim() && nameEl.value.trim()) {
        cadastrar();
      } else if (passEl.value.trim()) {
        passEl.focus();
      } else {
        nameEl.focus();
      }
    }
  });

  passEl.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nameEl.value.trim()) {
        cadastrar();
      } else {
        nameEl.focus();
      }
    }
  });

  nameEl.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      cadastrar();
    }
  });

  emailEl.addEventListener("input", validateEmail);
  passEl.addEventListener("input", validatePassword);
  nameEl.addEventListener("input", validateName);
}

function togglePasswordVisibility() {
  const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);

  const icon = togglePasswordBtn.querySelector("i");
  if (type === "text") {
    icon.className = "fas fa-eye";
    togglePasswordBtn.setAttribute("aria-label", "Esconder senha");
  } else {
    icon.className = "fas fa-eye-slash";
    togglePasswordBtn.setAttribute("aria-label", "Mostrar senha");
  }
}

function validateEmail() {
  const email = emailEl.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (email === "") {
    emailEl.classList.remove("input-error", "input-success");
    return false;
  }

  if (emailRegex.test(email)) {
    emailEl.classList.remove("input-error");
    emailEl.classList.add("input-success");
    return true;
  } else {
    emailEl.classList.remove("input-success");
    emailEl.classList.add("input-error");
    return false;
  }
}

function validatePassword() {
  const password = passEl.value;

  if (password === "") {
    passEl.classList.remove("input-error", "input-success");
    return false;
  }

  if (password.length >= 6) {
    passEl.classList.remove("input-error");
    passEl.classList.add("input-success");
    return true;
  } else {
    passEl.classList.remove("input-success");
    passEl.classList.add("input-error");
    return false;
  }
}

function validateName() {
  const name = nameEl.value.trim();

  if (name === "") {
    nameEl.classList.remove("input-error", "input-success");
    return false;
  }

  if (name.length >= 2) {
    nameEl.classList.remove("input-error");
    nameEl.classList.add("input-success");
    return true;
  } else {
    nameEl.classList.remove("input-success");
    nameEl.classList.add("input-error");
    return false;
  }
}

// ===== RPC: checa se nome está disponível =====
async function isFullNameAvailable(full_name) {
  const { data, error } = await supa.rpc("is_full_name_available", {
    p_full_name: full_name,
  });

  if (error) throw error;

  // data é boolean
  return data === true;
}

// Função de cadastro
async function cadastrar() {
  const email = emailEl.value.trim();
  const password = passEl.value;
  const full_name = nameEl.value.trim();

  if (!email) {
    emailEl.focus();
    emailEl.classList.add("input-error");
    alert("Por favor, preencha o email.");
    return;
  }

  if (!password) {
    passEl.focus();
    passEl.classList.add("input-error");
    alert("Por favor, preencha a senha.");
    return;
  }

  if (!full_name) {
    nameEl.focus();
    nameEl.classList.add("input-error");
    alert("Por favor, preencha seu nome.");
    return;
  }

  if (!validateEmail()) {
    alert("Por favor, insira um email válido.");
    return;
  }

  if (!validatePassword()) {
    alert("A senha deve ter pelo menos 6 caracteres.");
    return;
  }

  if (!validateName()) {
    alert("O nome deve ter pelo menos 2 caracteres.");
    return;
  }

  btn.disabled = true;
  btn.classList.add("loading");
  btn.setAttribute("aria-label", "Cadastrando...");

  try {
      // ============================
  // VALIDAÇÃO NO BANCO (EMAIL + NOME)
  // ============================

  // 1) valida EMAIL no banco (profiles.email)
  const emailCheck = await supa.rpc("is_email_available", { p_email: email });

  if (emailCheck.error) {
    console.error("Erro RPC is_email_available:", emailCheck.error);
    alert("Erro ao validar email no banco.");
    return;
  }

  if (emailCheck.data !== true) {
    emailEl.classList.remove("input-success");
    emailEl.classList.add("input-error");
    alert("Este email já está cadastrado.");
    return;
  }

  // 2) valida NOME no banco (profiles.full_name)
  const nameCheck = await supa.rpc("is_full_name_available", { p_full_name: full_name });

  if (nameCheck.error) {
    console.error("Erro RPC is_full_name_available:", nameCheck.error);
    alert("Erro ao validar nome de usuário no banco.");
    return;
  }

  if (nameCheck.data !== true) {
    nameEl.classList.remove("input-success");
    nameEl.classList.add("input-error");
    alert("Esse nome de usuário já existe. Escolha outro.");
    return;
  }

    }

    // ===== 2) signup (email duplicado pode retornar OK por design) =====
    const { data, error } = await supa.auth.signUp({
      email,
      password,
      options: {
        data: { full_name },
        emailRedirectTo: EMAIL_REDIRECT_TO,
      },
    });

    if (error) throw error;

    emailEl.classList.add("input-success");
    passEl.classList.add("input-success");
    nameEl.classList.add("input-success");

    await new Promise((resolve) => setTimeout(resolve, 300));

    // Se exigir confirmação por email (normal em produção)
    if (!data.session) {
      alert(
        "Cadastro iniciado! Agora confirme seu email e depois faça login.\n\n" +
        "Obs: se esse email já existir, o Supabase pode mostrar essa mesma mensagem por segurança."
      );
      window.location.href = "index.html";
      return;
    }

    // Se logou direto (sem confirmação), pode atualizar profile se quiser
    const userId = data.user?.id || data.session.user.id;

    const { error: upErr } = await supa
      .from("profiles")
      .update({ full_name })
      .eq("id", userId);

    if (upErr) console.warn("Não consegui atualizar profiles:", upErr);

    alert("Cadastrado com sucesso!");
    window.location.href = "feed.html";
  } catch (e) {
    console.error("Erro de cadastro:", e);

    emailEl.classList.remove("input-success");
    passEl.classList.remove("input-success");
    nameEl.classList.remove("input-success");

    emailEl.classList.add("input-error");
    passEl.classList.add("input-error");
    nameEl.classList.add("input-error");

    let errorMessage = "Erro ao cadastrar.";
    const msg = (e && e.message ? String(e.message) : "").toLowerCase();

    if (msg.includes("password") && msg.includes("at least")) {
      errorMessage = "A senha deve ter pelo menos 6 caracteres.";
    } else if (msg.includes("invalid email")) {
      errorMessage = "Por favor, insira um email válido.";
    } else if (msg.includes("rpc") || msg.includes("function") || msg.includes("permission")) {
      errorMessage = "Erro ao validar nome no banco. Confere se você criou a RPC (SQL) certinho.";
    } else {
      errorMessage = e.message || "Erro ao cadastrar.";
    }

    alert(errorMessage);
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.removeAttribute("aria-label");
  }
}

// Inicializar
document.addEventListener("DOMContentLoaded", function () {
  console.log("Página de cadastro inicializada");
  setupEventListeners();

  if (emailEl) setTimeout(() => emailEl.focus(), 100);
});


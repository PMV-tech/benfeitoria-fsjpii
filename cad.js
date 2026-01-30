// cad.js
const supa = window.supa;

// ===== CONFIG =====
const EMAIL_REDIRECT_TO = "https://pmv-tech.github.io/benfeitoria-fsjpii/index.html"; // <-- AJUSTE AQUI

// Elementos do DOM
const emailEl = document.getElementById("cadEmail");
const passEl = document.getElementById("cadPass");
const nameEl = document.getElementById("cadName");
const btn = document.getElementById("btnCadastrar");
const togglePasswordBtn = document.getElementById("togglePassword");
const passwordInput = document.getElementById("cadPass");

// Configurar botões e eventos
function setupEventListeners() {
  // Botão cadastrar
  btn.addEventListener("click", cadastrar);

  // Botão mostrar/esconder senha
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", togglePasswordVisibility);
    togglePasswordBtn.querySelector("i").className = "fas fa-eye-slash";
    togglePasswordBtn.setAttribute("aria-label", "Mostrar senha");
  }

  // Enter para enviar formulário
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

  // Validação em tempo real
  emailEl.addEventListener("input", validateEmail);
  passEl.addEventListener("input", validatePassword);
  nameEl.addEventListener("input", validateName);
}

// Mostrar/esconder senha
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

// Validação de email
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

// Validação de senha
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

// Validação de nome
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

// ===== NOVO: checar se full_name já existe no profiles (case-insensitive) =====
async function nomeJaExiste(full_name) {
  // Importante: isso depende de você ter permissão de SELECT em profiles via RLS.
  // Se der "permission denied", aí você precisa criar policy de read ou usar RPC.
  const { data, error } = await supa
    .from("profiles")
    .select("id")
    .ilike("full_name", full_name)
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

// Função de cadastro
async function cadastrar() {
  const email = emailEl.value.trim();
  const password = passEl.value;
  const full_name = nameEl.value.trim();

  // Validação básica
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

  // Validação de formato de email
  if (!validateEmail()) {
    alert("Por favor, insira um email válido.");
    return;
  }

  // Validação de tamanho da senha
  if (!validatePassword()) {
    alert("A senha deve ter pelo menos 6 caracteres.");
    return;
  }

  // Validação de nome
  if (!validateName()) {
    alert("O nome deve ter pelo menos 2 caracteres.");
    return;
  }

  // Estado de carregamento
  btn.disabled = true;
  btn.classList.add("loading");
  btn.setAttribute("aria-label", "Cadastrando...");

  try {
    // ===== NOVO: valida nome ANTES de cadastrar =====
    const existe = await nomeJaExiste(full_name);
    if (existe) {
      nameEl.classList.remove("input-success");
      nameEl.classList.add("input-error");
      alert("Esse nome já está em uso. Escolha outro.");
      return;
    }

    const { data, error } = await supa.auth.signUp({
      email,
      password,
      options: {
        data: { full_name },
        emailRedirectTo: EMAIL_REDIRECT_TO, // ===== NOVO: resolve 404 do email =====
      },
    });

    if (error) throw error;

    // Feedback visual de sucesso
    emailEl.classList.add("input-success");
    passEl.classList.add("input-success");
    nameEl.classList.add("input-success");

    // Pequeno delay para mostrar o feedback
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Se exigir confirmação por email, session pode vir null
    // Nesse caso NÃO tenta update em profiles (geralmente não tem sessão ainda)
    if (!data.session) {
      alert("Cadastro iniciado! Agora confirme seu email e depois faça login.");
      window.location.href = "index.html";
      return;
    }

    // Se já logou, atualiza o profile (se existir)
    const userId = data.user?.id || data.session.user.id;

    const { error: upErr } = await supa.from("profiles").update({ full_name }).eq("id", userId);

    if (upErr) console.warn("Não consegui atualizar profiles:", upErr);

    alert("Cadastrado com sucesso!");
    window.location.href = "feed.html";
  } catch (e) {
    console.error("Erro de cadastro:", e);

    // Feedback visual de erro
    emailEl.classList.remove("input-success");
    passEl.classList.remove("input-success");
    nameEl.classList.remove("input-success");

    emailEl.classList.add("input-error");
    passEl.classList.add("input-error");
    nameEl.classList.add("input-error");

    // Mensagens de erro específicas
    let errorMessage = "Erro ao cadastrar.";

    const msg = (e && e.message ? String(e.message) : "").toLowerCase();

    if (msg.includes("user already registered") || msg.includes("already registered")) {
      errorMessage = "Este email já está cadastrado.";
    } else if (msg.includes("duplicate key value") && msg.includes("profiles_full_name_unique")) {
      errorMessage = "Esse nome já está em uso. Escolha outro.";
    } else if (msg.includes("password") && msg.includes("at least")) {
      errorMessage = "A senha deve ter pelo menos 6 caracteres.";
    } else if (msg.includes("invalid email")) {
      errorMessage = "Por favor, insira um email válido.";
    } else if (msg.includes("permission denied") || msg.includes("violates row-level security")) {
      errorMessage =
        "Seu banco bloqueou a validação do nome (RLS). Ative leitura em profiles ou use uma função RPC para validar.";
    } else {
      errorMessage = e.message || "Erro ao cadastrar.";
    }

    alert(errorMessage);
  } finally {
    // Restaurar estado normal
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.removeAttribute("aria-label");
  }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", function () {
  console.log("Página de cadastro inicializada");
  setupEventListeners();

  // Focar no email ao carregar
  if (emailEl) {
    setTimeout(() => emailEl.focus(), 100);
  }
});

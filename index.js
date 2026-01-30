// index.js - VERSÃO COMPLETA COM LEMBRAR LOGIN E RECUPERAÇÃO DE SENHA
const supa = window.supa;

// ===== URL BASE DO SEU GITHUB PAGES (COM A SUBPASTA DO REPO) =====
const BASE_URL = "https://pmv-tech.github.io/benfeitoria-fsjpii";
const PASSWORD_RESET_REDIRECT_TO = `${BASE_URL}/reset_senha.html`;

// Elementos do DOM
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const btn = document.getElementById("btnEntrar");
const togglePasswordBtn = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");
const btnEsqueciSenha = document.getElementById("btnEsqueciSenha");
const rememberMeCheckbox = document.getElementById("rememberMe");

// Elementos do modal de recuperação
const resetModal = document.getElementById("resetModal");
const resetEmailInput = document.getElementById("resetEmailInput");
const sendResetEmailBtn = document.getElementById("sendResetEmail");
const cancelResetBtn = document.getElementById("cancelReset");
const closeResetModalBtn = document.getElementById("closeResetModal");
const resetMessage = document.getElementById("resetMessage");

// Chaves para localStorage
const STORAGE_KEYS = {
  REMEMBER_ME: "fsjpii-remember-me",
  SAVED_EMAIL: "fsjpii-saved-email",
  SAVED_PASSWORD: "fsjpii-saved-password",
};

// Se já estiver logado, vai direto pro feed
(async function autoRedirectIfLogged() {
  const { data: { session } } = await supa.auth.getSession();
  if (session) window.location.href = "feed.html";
})();

// Configurar botões e eventos
function setupEventListeners() {
  console.log("Configurando event listeners...");

  // Botão entrar
  if (btn) {
    btn.addEventListener("click", entrar);
  }

  // Botão mostrar/esconder senha
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", togglePasswordVisibility);
    togglePasswordBtn.querySelector("i").className = "fas fa-eye-slash";
    togglePasswordBtn.setAttribute("aria-label", "Mostrar senha");
  }

  // Botão "Esqueci minha senha"
  if (btnEsqueciSenha) {
    btnEsqueciSenha.addEventListener("click", abrirModalRecuperacao);
  }

  // Checkbox Lembrar Login
  if (rememberMeCheckbox) {
    rememberMeCheckbox.addEventListener("change", toggleRememberMe);
  }

  // Eventos do modal de recuperação
  if (sendResetEmailBtn) {
    sendResetEmailBtn.addEventListener("click", enviarEmailRecuperacao);
  }

  if (cancelResetBtn) {
    cancelResetBtn.addEventListener("click", fecharModalRecuperacao);
  }

  if (closeResetModalBtn) {
    closeResetModalBtn.addEventListener("click", fecharModalRecuperacao);
  }

  // Fechar modal ao clicar fora
  if (resetModal) {
    resetModal.addEventListener("click", (e) => {
      if (e.target === resetModal) {
        fecharModalRecuperacao();
      }
    });
  }

  // Enter para enviar formulário
  if (emailEl) {
    emailEl.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (passEl.value.trim()) {
          entrar();
        } else {
          passEl.focus();
        }
      }
    });
  }

  if (passEl) {
    passEl.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        entrar();
      }
    });
  }

  // Enter no modal de recuperação
  if (resetEmailInput) {
    resetEmailInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        enviarEmailRecuperacao();
      }
    });
  }

  // Validação em tempo real
  if (emailEl) emailEl.addEventListener("input", validateEmail);
  if (passEl) passEl.addEventListener("input", validatePassword);

  // Carregar credenciais salvas
  loadSavedCredentials();
}

// FUNÇÕES DE "CRIPTOGRAFIA" (OBS: isso é ofuscação, não é seguro de verdade)
function encrypt(text, key = "fsjpii-secret-key-2024") {
  try {
    let result = "";
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(result);
  } catch (error) {
    console.error("Erro ao criptografar:", error);
    return null;
  }
}

function decrypt(encryptedText, key = "fsjpii-secret-key-2024") {
  try {
    const decoded = atob(encryptedText);
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (error) {
    console.error("Erro ao descriptografar:", error);
    return null;
  }
}

// FUNÇÕES DE LEMBRAR LOGIN
function toggleRememberMe() {
  if (!rememberMeCheckbox) return;

  const shouldRemember = rememberMeCheckbox.checked;

  if (shouldRemember) {
    console.log("Lembrar login ativado");
    if (emailEl && emailEl.value.trim() && passEl && passEl.value) {
      saveCredentials();
    }
  } else {
    console.log("Lembrar login desativado");
    removeSavedCredentials();
  }
}

function saveCredentials() {
  if (!emailEl || !passEl) return;

  const email = emailEl.value.trim();
  const password = passEl.value;

  if (!email || !password) return;

  try {
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, "true");
    localStorage.setItem(STORAGE_KEYS.SAVED_EMAIL, email);

    const encryptedPassword = encrypt(password);
    if (encryptedPassword) {
      localStorage.setItem(STORAGE_KEYS.SAVED_PASSWORD, encryptedPassword);
    }

    console.log("Credenciais salvas");
  } catch (error) {
    console.error("Erro ao salvar credenciais:", error);
  }
}

function loadSavedCredentials() {
  try {
    const shouldRemember = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === "true";

    if (!shouldRemember || !rememberMeCheckbox) return;

    const savedEmail = localStorage.getItem(STORAGE_KEYS.SAVED_EMAIL);
    const savedPassword = localStorage.getItem(STORAGE_KEYS.SAVED_PASSWORD);

    if (savedEmail && savedPassword && emailEl && passEl) {
      rememberMeCheckbox.checked = true;
      emailEl.value = savedEmail;

      const decryptedPassword = decrypt(savedPassword);
      if (decryptedPassword) {
        passEl.value = decryptedPassword;
      }

      validateEmail();
      validatePassword();

      console.log("Credenciais carregadas automaticamente");
    }
  } catch (error) {
    console.error("Erro ao carregar credenciais:", error);
    removeSavedCredentials();
  }
}

function removeSavedCredentials() {
  try {
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    localStorage.removeItem(STORAGE_KEYS.SAVED_EMAIL);
    localStorage.removeItem(STORAGE_KEYS.SAVED_PASSWORD);
    console.log("Credenciais removidas do localStorage");
  } catch (error) {
    console.error("Erro ao remover credenciais:", error);
  }
}

// FUNÇÕES DE RECUPERAÇÃO DE SENHA
function abrirModalRecuperacao() {
  console.log("Abrindo modal de recuperação...");

  if (!resetModal) {
    console.error("Modal não encontrado!");
    return;
  }

  // Limpar campos
  if (resetEmailInput) {
    resetEmailInput.value = emailEl ? emailEl.value || "" : "";
    resetEmailInput.classList.remove("input-error", "input-success");
  }

  if (resetMessage) {
    resetMessage.textContent = "";
    resetMessage.style.color = "";
  }

  // Mostrar modal
  resetModal.classList.add("show");
  resetModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  // Focar no input
  setTimeout(() => {
    if (resetEmailInput) resetEmailInput.focus();
  }, 50);
}

function fecharModalRecuperacao() {
  console.log("Fechando modal de recuperação...");

  if (!resetModal) return;

  resetModal.classList.remove("show");
  resetModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "auto";
}

async function enviarEmailRecuperacao() {
  console.log("Enviando email de recuperação...");

  if (!resetEmailInput) return;

  const email = resetEmailInput.value.trim();

  if (!email) {
    resetEmailInput.classList.add("input-error");
    resetEmailInput.focus();

    if (resetMessage) {
      resetMessage.textContent = "Por favor, digite seu email.";
      resetMessage.style.color = "#ff3b5c";
    }
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    resetEmailInput.classList.add("input-error");

    if (resetMessage) {
      resetMessage.textContent = "Por favor, insira um email válido.";
      resetMessage.style.color = "#ff3b5c";
    }
    return;
  }

  // Estado de carregamento
  sendResetEmailBtn.disabled = true;
  sendResetEmailBtn.innerHTML = "Enviando...";
  sendResetEmailBtn.style.opacity = "0.7";

  try {
    console.log("Enviando email para:", email);
    console.log("redirectTo (RESET):", PASSWORD_RESET_REDIRECT_TO);

    const { error } = await supa.auth.resetPasswordForEmail(email, {
      redirectTo: PASSWORD_RESET_REDIRECT_TO,
    });

    if (error) throw error;

    // Sucesso
    resetEmailInput.classList.remove("input-error");
    resetEmailInput.classList.add("input-success");

    if (resetMessage) {
      resetMessage.innerHTML =
        "✓ Email enviado!<br>Verifique sua caixa de entrada (e spam) para o link de recuperação.";
      resetMessage.style.color = "#00e676";
    }

    setTimeout(() => {
      fecharModalRecuperacao();
    }, 5000);
  } catch (error) {
    console.error("Erro ao enviar email de recuperação:", error);

    resetEmailInput.classList.remove("input-success");
    resetEmailInput.classList.add("input-error");

    let errorMessage = "Erro ao enviar email de recuperação.";
    const msg = (error?.message || "").toLowerCase();

    if (msg.includes("rate limit")) {
      errorMessage = "Muitas tentativas. Aguarde alguns minutos.";
    } else if (msg.includes("not found") || msg.includes("user not found")) {
      errorMessage = "Email não encontrado na nossa base.";
    } else if (msg.includes("email not confirmed")) {
      errorMessage = "Confirme seu email antes de usar esta funcionalidade.";
    }

    if (resetMessage) {
      resetMessage.textContent = errorMessage;
      resetMessage.style.color = "#ff3b5c";
    }
  } finally {
    sendResetEmailBtn.disabled = false;
    sendResetEmailBtn.innerHTML = "Enviar link";
    sendResetEmailBtn.style.opacity = "1";
  }
}

// FUNÇÕES EXISTENTES
function togglePasswordVisibility() {
  if (!passwordInput || !togglePasswordBtn) return;

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
  if (!emailEl) return false;

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
  if (!passEl) return false;

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

async function entrar() {
  if (!emailEl || !passEl || !btn) return;

  const email = emailEl.value.trim();
  const password = passEl.value;

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

  if (!validateEmail()) {
    alert("Por favor, insira um email válido.");
    return;
  }

  if (!validatePassword()) {
    alert("A senha deve ter pelo menos 6 caracteres.");
    return;
  }

  btn.disabled = true;
  btn.classList.add("loading");
  btn.setAttribute("aria-label", "Entrando...");

  try {
    const { error } = await supa.auth.signInWithPassword({ email, password });
    if (error) throw error;

    emailEl.classList.add("input-success");
    passEl.classList.add("input-success");

    if (rememberMeCheckbox && rememberMeCheckbox.checked) {
      saveCredentials();
    } else {
      removeSavedCredentials();
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    window.location.href = "feed.html";
  } catch (e) {
    console.error("Erro de login:", e);

    emailEl.classList.remove("input-success");
    emailEl.classList.add("input-error");
    passEl.classList.remove("input-success");
    passEl.classList.add("input-error");

    let errorMessage = "Erro ao entrar.";
    const msg = e?.message || "";

    if (msg.includes("Invalid login credentials")) {
      errorMessage = "Email ou senha incorretos.";
    } else if (msg.includes("Email not confirmed")) {
      errorMessage = "Confirme seu email antes de entrar.";
    } else if (msg.toLowerCase().includes("rate limit")) {
      errorMessage = "Muitas tentativas. Aguarde um momento.";
    } else {
      errorMessage = msg || "Erro ao entrar.";
    }

    alert(errorMessage);
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.removeAttribute("aria-label");
  }
}

window.addEventListener("beforeunload", function () {
  // opcional
});

document.addEventListener("DOMContentLoaded", function () {
  console.log("Página de login inicializada");
  setupEventListeners();

  if (emailEl) {
    setTimeout(() => {
      if (!emailEl.value) emailEl.focus();
    }, 100);
  }
});

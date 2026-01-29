// cad.js - VERSÃO COMPLETA COM TODAS AS FUNCIONALIDADES
const supa = window.supa;

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
    togglePasswordBtn.querySelector('i').className = 'fas fa-eye-slash';
    togglePasswordBtn.setAttribute('aria-label', 'Mostrar senha');
  }
  
  // Enter para enviar formulário
  emailEl.addEventListener("keypress", function(e) {
    if (e.key === 'Enter') {
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
  
  passEl.addEventListener("keypress", function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nameEl.value.trim()) {
        cadastrar();
      } else {
        nameEl.focus();
      }
    }
  });
  
  nameEl.addEventListener("keypress", function(e) {
    if (e.key === 'Enter') {
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
  const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  passwordInput.setAttribute('type', type);
  
  const icon = togglePasswordBtn.querySelector('i');
  if (type === 'text') {
    icon.className = 'fas fa-eye';
    togglePasswordBtn.setAttribute('aria-label', 'Esconder senha');
  } else {
    icon.className = 'fas fa-eye-slash';
    togglePasswordBtn.setAttribute('aria-label', 'Mostrar senha');
  }
}

// Validação de email
function validateEmail() {
  const email = emailEl.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (email === '') {
    emailEl.classList.remove('input-error', 'input-success');
    return false;
  }
  
  if (emailRegex.test(email)) {
    emailEl.classList.remove('input-error');
    emailEl.classList.add('input-success');
    return true;
  } else {
    emailEl.classList.remove('input-success');
    emailEl.classList.add('input-error');
    return false;
  }
}

// Validação de senha
function validatePassword() {
  const password = passEl.value;
  
  if (password === '') {
    passEl.classList.remove('input-error', 'input-success');
    return false;
  }
  
  if (password.length >= 6) {
    passEl.classList.remove('input-error');
    passEl.classList.add('input-success');
    return true;
  } else {
    passEl.classList.remove('input-success');
    passEl.classList.add('input-error');
    return false;
  }
}

// Validação de nome
function validateName() {
  const name = nameEl.value.trim();
  
  if (name === '') {
    nameEl.classList.remove('input-error', 'input-success');
    return false;
  }
  
  if (name.length >= 2) {
    nameEl.classList.remove('input-error');
    nameEl.classList.add('input-success');
    return true;
  } else {
    nameEl.classList.remove('input-success');
    nameEl.classList.add('input-error');
    return false;
  }
}

// Função de cadastro
async function cadastrar() {
  const email = emailEl.value.trim();
  const password = passEl.value;
  const full_name = nameEl.value.trim();

  // Validação básica
  if (!email) {
    emailEl.focus();
    emailEl.classList.add('input-error');
    alert("Por favor, preencha o email.");
    return;
  }
  
  if (!password) {
    passEl.focus();
    passEl.classList.add('input-error');
    alert("Por favor, preencha a senha.");
    return;
  }
  
  if (!full_name) {
    nameEl.focus();
    nameEl.classList.add('input-error');
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
    const { data, error } = await supa.auth.signUp({
      email,
      password,
      options: {
        data: { full_name }
      }
    });

    if (error) throw error;

    // Feedback visual de sucesso
    emailEl.classList.add('input-success');
    passEl.classList.add('input-success');
    nameEl.classList.add('input-success');
    
    // Pequeno delay para mostrar o feedback
    await new Promise(resolve => setTimeout(resolve, 500));

    // Se o Supabase exigir confirmação por email, session pode vir null
    if (!data.session) {
      alert("Cadastro criado! Agora confirme seu email e depois faça login.");
      window.location.href = "index.html";
      return;
    }

    // Se já logou, atualiza o profile
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
    
    // Feedback visual de erro
    emailEl.classList.remove('input-success');
    emailEl.classList.add('input-error');
    passEl.classList.remove('input-success');
    passEl.classList.add('input-error');
    nameEl.classList.remove('input-success');
    nameEl.classList.add('input-error');
    
    // Mensagens de erro específicas
    let errorMessage = "Erro ao cadastrar.";
    if (e.message.includes("User already registered")) {
      errorMessage = "Este email já está cadastrado.";
    } else if (e.message.includes("Password should be at least")) {
      errorMessage = "A senha deve ter pelo menos 6 caracteres.";
    } else if (e.message.includes("Invalid email")) {
      errorMessage = "Por favor, insira um email válido.";
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
document.addEventListener('DOMContentLoaded', function() {
  console.log("Página de cadastro inicializada");
  setupEventListeners();
  
  // Focar no email ao carregar
  if (emailEl) {
    setTimeout(() => emailEl.focus(), 100);
  }
});

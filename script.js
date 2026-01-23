// LOGIN
function login() {
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;

  if (user && pass) {
    localStorage.setItem("user", user);
    window.location.href = "feed.html";
  } else {
    alert("Preencha todos os campos");
  }
}

// LOGOUT
function logout() {
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// PROTEÇÃO DE ROTA
if (window.location.pathname.includes("feed.html")) {
  if (!localStorage.getItem("user")) {
    window.location.href = "index.html";
  }
}

// CURTIDAS
let likes = 0;

function likePost() {
  likes++;
  document.getElementById("likes").innerText = likes + " curtidas";
}

// COMENTÁRIOS
function addComment() {
  const input = document.getElementById("commentInput");
  const comment = input.value;

  if (comment) {
    const li = document.createElement("li");
    li.innerText = comment;
    document.getElementById("comments").appendChild(li);
    input.value = "";
  }
}

  function entrar(e) {
    e.preventDefault(); // impede reload
    window.location.href = "feed.html";
  }


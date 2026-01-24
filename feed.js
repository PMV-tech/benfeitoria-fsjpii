const fileInput = document.getElementById("fileInput");
const feed = document.getElementById("feed");

// abre galeria
function abrirGaleria() {
  fileInput.click();
}

// quando escolher imagem
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    criarPost(reader.result);
  };
  reader.readAsDataURL(file);
});

// ... seu código acima ...

function criarPost(imagem) {
  const legenda = prompt("Digite a legenda do post:");

  const post = document.createElement("div");
  post.classList.add("post");

  post.innerHTML = `
    <img src="${imagem}">

    <div class="post-actions">
      <button class="like-btn">🤍</button>
      <button class="comment-btn">💬</button>
      <span class="likes">0 curtidas</span>
      <span class="comments-count">0 comentários</span>
    </div>

    <p>${legenda || ""}</p>

    <div class="comments">
      <input type="text" placeholder="Adicionar um comentário...">
      <ul></ul>
    </div>
  `;

  // CURTIR
  let likes = 0;
  const likeBtn = post.querySelector(".like-btn");
  const likesSpan = post.querySelector(".likes");

  likeBtn.addEventListener("click", () => {
    if (likeBtn.classList.contains("liked")) {
      likeBtn.classList.remove("liked");
      likeBtn.textContent = "🤍";
      likes--;
    } else {
      likeBtn.classList.add("liked");
      likeBtn.textContent = "❤️";
      likes++;
    }
    likesSpan.textContent = likes + " curtidas";
  });

  // COMENTÁRIOS (numerador)
  let comments = 0;
  const commentsCountSpan = post.querySelector(".comments-count");

  function atualizarContadorComentarios() {
    commentsCountSpan.textContent =
      comments + (comments === 1 ? " comentário" : " comentários");
  }

  const input = post.querySelector(".comments input");
  const ul = post.querySelector(".comments ul");

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && input.value.trim() !== "") {
      const li = document.createElement("li");
      li.textContent = input.value;
      ul.appendChild(li);
      input.value = "";

      comments++; // ✅ incrementa
      atualizarContadorComentarios(); // ✅ atualiza texto
    }
  });

  // (Opcional) clicar no 💬 foca no input
  const commentBtn = post.querySelector(".comment-btn");
  commentBtn.addEventListener("click", () => {
    input.focus();
  });

  feed.prepend(post);
}

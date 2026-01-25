const fileInput = document.getElementById("fileInput");
const feed = document.getElementById("feed");

// Modal refs
const postModal = document.getElementById("postModal");
const previewImg = document.getElementById("previewImg");
const captionInput = document.getElementById("captionInput");
const publishPost = document.getElementById("publishPost");
const cancelPost = document.getElementById("cancelPost");
const closeModal = document.getElementById("closeModal");

let pendingImageDataUrl = null;

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
    pendingImageDataUrl = reader.result;
    abrirModalComImagem(pendingImageDataUrl);
  };
  reader.readAsDataURL(file);

  // permite escolher o mesmo arquivo de novo depois
  fileInput.value = "";
});

function abrirModalComImagem(dataUrl) {
  previewImg.src = dataUrl;
  captionInput.value = "";
  postModal.classList.add("show");
  postModal.setAttribute("aria-hidden", "false");
  setTimeout(() => captionInput.focus(), 50);
}

function fecharModal() {
  postModal.classList.remove("show");
  postModal.setAttribute("aria-hidden", "true");
  pendingImageDataUrl = null;
}

// fechar modal: botões e clique fora
closeModal.addEventListener("click", fecharModal);
cancelPost.addEventListener("click", fecharModal);

postModal.addEventListener("click", (e) => {
  if (e.target === postModal) fecharModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && postModal.classList.contains("show")) fecharModal();
});

// publicar
publishPost.addEventListener("click", () => {
  if (!pendingImageDataUrl) return;
  const legenda = captionInput.value.trim();
  criarPost(pendingImageDataUrl, legenda);
  fecharModal();
});

function criarPost(imagem, legenda) {
  const post = document.createElement("div");
  post.classList.add("post");

  post.innerHTML = `
    <img src="${imagem}" alt="Post">

    <div class="post-actions">
      <button class="like-btn" aria-label="Curtir">🤍</button>
      <button class="comment-btn" aria-label="Comentar">💬</button>
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

      comments++;
      atualizarContadorComentarios();
    }
  });

  // clicar no 💬 foca no input
  const commentBtn = post.querySelector(".comment-btn");
  commentBtn.addEventListener("click", () => input.focus());

  feed.prepend(post);
}

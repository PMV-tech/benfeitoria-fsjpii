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

// cria post
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

  // COMENTAR
  const input = post.querySelector(".comments input");
  const ul = post.querySelector(".comments ul");

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && input.value.trim() !== "") {
      const li = document.createElement("li");
      li.textContent = input.value;
      ul.appendChild(li);
      input.value = "";
    }
  });

  feed.prepend(post);
}

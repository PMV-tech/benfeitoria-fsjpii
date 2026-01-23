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
  post.className = "post";

  post.innerHTML = `
    <img src="${imagem}">
    <p>${legenda || ""}</p>
  `;

  feed.prepend(post);
}

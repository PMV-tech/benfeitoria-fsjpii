const supa = window.supabaseClient;

const fileInput = document.getElementById("fileInput");
const feed = document.getElementById("feed");

// Modal (se você já colocou o modal que fizemos)
const postModal = document.getElementById("postModal");
const previewImg = document.getElementById("previewImg");
const captionInput = document.getElementById("captionInput");
const publishPost = document.getElementById("publishPost");
const cancelPost = document.getElementById("cancelPost");
const closeModal = document.getElementById("closeModal");

let pendingFile = null;
let currentUser = null;
let currentProfile = null;

// ====================== AUTH / PERFIL ======================
async function init() {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) {
    // não logou -> volta pro login
    window.location.href = "index.html";
    return;
  }
  currentUser = user;

  // pega profile pra saber role
  const { data: profile, error } = await supa
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error(error);
    alert("Erro ao carregar perfil.");
    return;
  }
  currentProfile = profile;

  // se NÃO for admin, esconde botão +
  if (currentProfile.role !== "admin") {
    const btn = document.querySelector(".add-post");
    if (btn) btn.style.display = "none";
  }

  await carregarFeed();
}

init();

// ====================== FEED ======================
async function carregarFeed() {
  feed.innerHTML = "";

  const { data, error } = await supa
    .from("v_feed")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    alert("Erro ao carregar feed.");
    return;
  }

  for (const post of data) {
    const card = await renderPost(post);
    feed.appendChild(card);
  }
}

// Monta URL pública do Storage (bucket public)
function getPublicImageUrl(path) {
  const { data } = supa.storage.from("posts").getPublicUrl(path);
  return data.publicUrl;
}

async function renderPost(post) {
  const postEl = document.createElement("div");
  postEl.className = "post";

  const imgUrl = getPublicImageUrl(post.image_url);

  postEl.innerHTML = `
    <img src="${imgUrl}" alt="Post">

    <div class="post-actions">
      <button class="like-btn" aria-label="Curtir">🤍</button>
      <button class="comment-btn" aria-label="Comentar">💬</button>

      <span class="likes">${post.likes_count} curtidas</span>
      <span class="comments-count">${post.comments_count} comentários</span>
    </div>

    <p>${post.caption || ""}</p>

    <div class="comments">
      <input type="text" placeholder="Adicionar um comentário...">
      <ul></ul>
    </div>
  `;

  // ===== LIKE =====
  const likeBtn = postEl.querySelector(".like-btn");
  const likesSpan = postEl.querySelector(".likes");

  // checar se eu já curti
  const { data: likedRow } = await supa
    .from("likes")
    .select("post_id")
    .eq("post_id", post.id)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  let liked = !!likedRow;
  if (liked) {
    likeBtn.classList.add("liked");
    likeBtn.textContent = "❤️";
  }

  likeBtn.addEventListener("click", async () => {
    if (!currentUser) return;

    if (liked) {
      const { error } = await supa
        .from("likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", currentUser.id);

      if (error) {
        console.error(error);
        alert("Erro ao remover curtida.");
        return;
      }
      liked = false;
      likeBtn.classList.remove("liked");
      likeBtn.textContent = "🤍";
      post.likes_count = Math.max(0, post.likes_count - 1);
    } else {
      const { error } = await supa
        .from("likes")
        .insert({ post_id: post.id, user_id: currentUser.id });

      if (error) {
        console.error(error);
        alert("Erro ao curtir.");
        return;
      }
      liked = true;
      likeBtn.classList.add("liked");
      likeBtn.textContent = "❤️";
      post.likes_count += 1;
    }
    likesSpan.textContent = post.likes_count + " curtidas";
  });

  // ===== COMMENTS =====
  const input = postEl.querySelector(".comments input");
  const ul = postEl.querySelector(".comments ul");
  const commentsCountSpan = postEl.querySelector(".comments-count");
  const commentBtn = postEl.querySelector(".comment-btn");

  commentBtn.addEventListener("click", () => input.focus());

  // carrega comentários do post
  await carregarComentarios(post.id, ul);

  input.addEventListener("keypress", async (e) => {
    if (e.key === "Enter" && input.value.trim() !== "") {
      const content = input.value.trim();

      const { error } = await supa
        .from("comments")
        .insert({ post_id: post.id, user_id: currentUser.id, content });

      if (error) {
        console.error(error);
        alert("Erro ao comentar.");
        return;
      }

      input.value = "";
      post.comments_count += 1;
      commentsCountSpan.textContent =
        post.comments_count + (post.comments_count === 1 ? " comentário" : " comentários");

      await carregarComentarios(post.id, ul);
    }
  });

  return postEl;
}

async function carregarComentarios(postId, ul) {
  ul.innerHTML = "";

  // comentários com nome do autor (join via profiles)
  const { data, error } = await supa
    .from("comments")
    .select("id, content, created_at, user_id")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  for (const c of data) {
    const li = document.createElement("li");
    li.textContent = c.content;
    ul.appendChild(li);
  }
}

// ====================== POSTAR (ADMIN) ======================
window.abrirGaleria = function abrirGaleria() {
  if (!currentProfile || currentProfile.role !== "admin") return;
  fileInput.click();
};

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  pendingFile = file;

  // abre modal e mostra preview
  const reader = new FileReader();
  reader.onload = () => {
    previewImg.src = reader.result;
    captionInput.value = "";
    postModal.classList.add("show");
    setTimeout(() => captionInput.focus(), 50);
  };
  reader.readAsDataURL(file);

  fileInput.value = "";
});

function fecharModal() {
  postModal.classList.remove("show");
  pendingFile = null;
}

if (closeModal) closeModal.addEventListener("click", fecharModal);
if (cancelPost) cancelPost.addEventListener("click", fecharModal);

if (postModal) {
  postModal.addEventListener("click", (e) => {
    if (e.target === postModal) fecharModal();
  });
}

if (publishPost) {
  publishPost.addEventListener("click", async () => {
    if (!pendingFile) return;
    if (!currentProfile || currentProfile.role !== "admin") return;

    const caption = captionInput.value.trim();

    // gera um nome único pro arquivo
    const ext = pendingFile.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `${currentUser.id}/${fileName}`;

    // 1) upload no Storage
    const { error: upErr } = await supa.storage
      .from("posts")
      .upload(filePath, pendingFile, { upsert: false });

    if (upErr) {
      console.error(upErr);
      alert("Erro ao enviar imagem.");
      return;
    }

    // 2) insert no banco (guarda o PATH)
    const { error: insErr } = await supa
      .from("posts")
      .insert({
        user_id: currentUser.id,
        caption,
        image_url: filePath,
      });

    if (insErr) {
      console.error(insErr);
      alert("Erro ao criar post.");
      return;
    }

    fecharModal();
    await carregarFeed();
  });
}

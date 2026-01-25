// feed.js
const supa = window.supa;

const fileInput = document.getElementById("fileInput");
const feed = document.getElementById("feed");

// Modal novo post
const postModal = document.getElementById("postModal");
const previewImg = document.getElementById("previewImg");
const captionInput = document.getElementById("captionInput");
const publishPost = document.getElementById("publishPost");
const cancelPost = document.getElementById("cancelPost");
const closeModal = document.getElementById("closeModal");

// Logout
const btnLogout = document.getElementById("btnLogout");

let pendingFile = null;
let currentUser = null;
let currentProfile = null;

// ===================== HELPERS =====================
function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function timeAgo(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 10) return "agora";
  if (sec < 60) return `há ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `há ${day}d`;
  return d.toLocaleString("pt-BR");
}

// Monta URL pública do Storage (bucket "posts" público)
function getPublicImageUrl(path) {
  const { data } = supa.storage.from("posts").getPublicUrl(path);
  return data?.publicUrl || "";
}

// ===================== INIT =====================
async function init() {
  // Proteção: precisa estar logado
  const { data: sessionData, error: sessErr } = await supa.auth.getSession();
  if (sessErr) {
    console.error(sessErr);
    alert("Erro ao ler sessão.");
    window.location.href = "index.html";
    return;
  }

  const session = sessionData?.session;
  if (!session) {
    window.location.href = "index.html";
    return;
  }

  currentUser = session.user;

  // Carrega profile (role)
  const { data: profile, error: profileErr } = await supa
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", currentUser.id)
    .single();

  if (profileErr) {
    console.error(profileErr);
    alert("Erro ao carregar perfil.");
    return;
  }

  currentProfile = profile;

  // Se não for admin, esconde botão +
  if (currentProfile.role !== "admin") {
    const btn = document.querySelector(".add-post");
    if (btn) btn.style.display = "none";
  }

  // Logout
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      try {
        const { error } = await supa.auth.signOut();
        if (error) throw error;
        window.location.href = "index.html";
      } catch (e) {
        console.error(e);
        alert(e?.message || "Erro ao sair.");
      }
    });
  }

  await carregarFeed();
}

init();

// ===================== FEED =====================
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

async function renderPost(post) {
  post.likes_count = post.likes_count ?? 0;
  post.comments_count = post.comments_count ?? 0;

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

    <p>${escapeHtml(post.caption || "")}</p>

    <div class="comments">
      <div class="comment-row">
        <input type="text" class="comment-input" placeholder="Adicionar um comentário...">
        <button class="comment-send" type="button">Enviar</button>
      </div>
      <ul class="comments-list"></ul>
    </div>
  `;

  // Admin actions (apagar)
  if (currentProfile?.role === "admin") {
    const adminBar = document.createElement("div");
    adminBar.className = "post-admin";
    adminBar.innerHTML = `
      <button class="btn-danger" type="button">Apagar post</button>
    `;
    postEl.appendChild(adminBar);

    const btnDelete = adminBar.querySelector(".btn-danger");
    btnDelete.addEventListener("click", async () => {
      const ok = confirm("Tem certeza que deseja apagar este post? Isso remove curtidas/comentários e a imagem.");
      if (!ok) return;

      btnDelete.disabled = true;
      try {
        await apagarPostCompleto(post);
        // remove do DOM
        postEl.remove();
      } catch (e) {
        console.error(e);
        alert(e?.message || "Erro ao apagar post.");
      } finally {
        btnDelete.disabled = false;
      }
    });
  }

  // LIKE
  const likeBtn = postEl.querySelector(".like-btn");
  const likesSpan = postEl.querySelector(".likes");

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

  // COMMENTS
  const input = postEl.querySelector(".comment-input");
  const ul = postEl.querySelector(".comments-list");
  const commentsCountSpan = postEl.querySelector(".comments-count");
  const commentBtn = postEl.querySelector(".comment-btn");
  const sendBtn = postEl.querySelector(".comment-send");

  commentBtn.addEventListener("click", () => input.focus());

  // carrega comentários com autor + data
  await carregarComentariosComAutor(post.id, ul);

  async function enviarComentario() {
    const content = input.value.trim();
    if (!content) return;

    sendBtn.disabled = true;
    try {
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

      await carregarComentariosComAutor(post.id, ul);
    } finally {
      sendBtn.disabled = false;
    }
  }

  sendBtn.addEventListener("click", enviarComentario);

  input.addEventListener("keypress", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await enviarComentario();
    }
  });

  return postEl;
}

// Puxa comentários e tenta exibir nome/email do autor + tempo
async function carregarComentariosComAutor(postId, ul) {
  ul.innerHTML = "";

  // Busca comentários
  const { data: comments, error } = await supa
    .from("comments")
    .select("id, content, created_at, user_id")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  // Coleta user_ids (pra buscar profiles de uma vez)
  const userIds = [...new Set(comments.map(c => c.user_id))];

  let profileMap = {};
  if (userIds.length) {
    const { data: проф, error: profErr } = await supa
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (!profErr && Array.isArray(проф)) {
      profileMap = Object.fromEntries(проф.map(p => [p.id, p]));
    }
  }

  for (const c of comments) {
    const li = document.createElement("li");

    const p = profileMap[c.user_id];
    const author =
      (p?.full_name && p.full_name.trim()) ||
      // fallback: tenta email do auth (se estiver disponível no token)
      (c.user_id === currentUser?.id ? (currentUser?.email || "Você") : "Usuário");

    li.innerHTML = `
      <div class="comment-meta">
        <span class="comment-author">${escapeHtml(author)}</span>
        <span>•</span>
        <span>${escapeHtml(timeAgo(c.created_at))}</span>
      </div>
      <div class="comment-text">${escapeHtml(c.content || "")}</div>
    `;
    ul.appendChild(li);
  }
}

// ===================== POSTAR (ADMIN) =====================
window.abrirGaleria = function abrirGaleria() {
  if (!currentProfile || currentProfile.role !== "admin") return;
  fileInput.click();
};

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  pendingFile = file;

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

    const ext = pendingFile.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `${currentUser.id}/${fileName}`;

    // upload storage
    const { error: upErr } = await supa.storage
      .from("posts")
      .upload(filePath, pendingFile, { upsert: false });

    if (upErr) {
      console.error(upErr);
      alert("Erro ao enviar imagem.");
      return;
    }

    // insert post
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

// ===================== APAGAR POST (ADMIN) =====================
// Remove storage image + comments + likes + post
async function apagarPostCompleto(post) {
  if (!currentProfile || currentProfile.role !== "admin") {
    throw new Error("Apenas admin pode apagar posts.");
  }

  // 1) tenta remover imagem do Storage (se existir)
  if (post.image_url) {
    const { error: stErr } = await supa.storage
      .from("posts")
      .remove([post.image_url]);

    // Se falhar por policy, você vai ver aqui
    if (stErr) {
      console.error("Storage remove error:", stErr);
      // Não vou travar total, mas aviso:
      // (se você preferir travar, troque por: throw stErr;)
    }
  }

  // 2) remove comentários do post
  const { error: cErr } = await supa
    .from("comments")
    .delete()
    .eq("post_id", post.id);

  if (cErr) throw cErr;

  // 3) remove likes do post
  const { error: lErr } = await supa
    .from("likes")
    .delete()
    .eq("post_id", post.id);

  if (lErr) throw lErr;

  // 4) remove o post
  const { error: pErr } = await supa
    .from("posts")
    .delete()
    .eq("id", post.id);

  if (pErr) throw pErr;
}

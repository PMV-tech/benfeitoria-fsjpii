// feed.js
const supa = window.supa; // vem do supabaseClient.js

// ========= helpers =========
function fmtWhen(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function errToText(e) {
  if (!e) return "Erro desconhecido";
  if (typeof e === "string") return e;
  const parts = [];
  if (e.message) parts.push(e.message);
  if (e.error) parts.push(e.error);
  if (e.details) parts.push(e.details);
  if (e.hint) parts.push(e.hint);
  if (e.status) parts.push(`status=${e.status}`);
  if (e.statusCode) parts.push(`statusCode=${e.statusCode}`);
  return parts.filter(Boolean).join(" | ") || JSON.stringify(e);
}

function isAdmin(profile) {
  return profile?.role === "admin";
}

function canDeleteComment(commentUserId) {
  return isAdmin(currentProfile) || (currentUser?.id && currentUser.id === commentUserId);
}

// ========= DOM =========
const fileInput = document.getElementById("fileInput");
const feed = document.getElementById("feed");

// modal
const postModal = document.getElementById("postModal");
const previewImg = document.getElementById("previewImg");
const captionInput = document.getElementById("captionInput");
const publishPost = document.getElementById("publishPost");
const cancelPost = document.getElementById("cancelPost");
const closeModal = document.getElementById("closeModal");

// logout
const btnLogout = document.getElementById("btnLogout");

let pendingFile = null;
let currentUser = null;
let currentProfile = null;

if (!supa?.auth) {
  alert("Supabase não carregou. Verifique supabaseClient.js e o <script> do supabase-js.");
  throw new Error("Supabase client missing");
}

// ========= INIT =========
async function init() {
  const { data: sessData, error: sessErr } = await supa.auth.getSession();
  if (sessErr) {
    console.error(sessErr);
    alert("Erro ao checar sessão.");
    return;
  }

  if (!sessData.session) {
    window.location.href = "index.html";
    return;
  }

  currentUser = sessData.session.user;

  const { data: profile, error: profErr } = await supa
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", currentUser.id)
    .single();

  if (profErr) {
    console.error(profErr);
    alert("Erro ao carregar perfil.");
    return;
  }

  currentProfile = profile;

  const plusBtn = document.querySelector(".add-post");
  if (plusBtn && !isAdmin(currentProfile)) plusBtn.style.display = "none";

  await carregarFeed();
}

init();

// ========= LOGOUT =========
if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    try {
      const { error } = await supa.auth.signOut();
      if (error) throw error;
      window.location.href = "index.html";
    } catch (e) {
      console.error(e);
      alert("Erro ao sair: " + errToText(e));
    }
  });
}

// ========= MODAL (corrige warning aria-hidden) =========
function abrirModal() {
  if (!postModal) return;
  postModal.classList.add("show");
  postModal.setAttribute("aria-hidden", "false");
}

function fecharModal() {
  if (!postModal) return;
  postModal.classList.remove("show");
  postModal.setAttribute("aria-hidden", "true");
  pendingFile = null;
}

if (closeModal) closeModal.addEventListener("click", fecharModal);
if (cancelPost) cancelPost.addEventListener("click", fecharModal);

if (postModal) {
  postModal.addEventListener("click", (e) => {
    if (e.target === postModal) fecharModal();
  });
}

// ========= FEED =========
async function carregarFeed() {
  feed.innerHTML = "";

  const { data, error } = await supa
    .from("v_feed")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    alert("Erro ao carregar feed: " + errToText(error));
    return;
  }

  for (const post of data) {
    const card = await renderPost(post);
    feed.appendChild(card);
  }
}

function getPublicImageUrl(path) {
  const { data } = supa.storage.from("posts").getPublicUrl(path);
  return data?.publicUrl || "";
}

async function renderPost(post) {
  post.likes_count = post.likes_count ?? 0;
  post.comments_count = post.comments_count ?? 0;

  const postEl = document.createElement("div");
  postEl.className = "post";

  const imgUrl = getPublicImageUrl(post.image_url);
  const authorName = post.full_name || "Usuário";
  const when = fmtWhen(post.created_at);

  const deletePostBtnHtml = isAdmin(currentProfile)
    ? `<button class="delete-post-btn" title="Apagar post" aria-label="Apagar post">🗑️</button>`
    : "";

  postEl.innerHTML = `
    <div class="post-top">
      <div class="post-meta">
        <div class="post-author">${authorName}</div>
        <div class="post-when">${when}</div>
      </div>
      <div class="post-top-actions">${deletePostBtnHtml}</div>
    </div>

    <img src="${imgUrl}" alt="Post">

    <div class="post-actions">
      <button class="like-btn" aria-label="Curtir">🤍</button>
      <button class="comment-btn" aria-label="Comentar">💬</button>

      <span class="likes">${post.likes_count} curtidas</span>
      <span class="comments-count">${post.comments_count} comentários</span>
    </div>

    <p class="post-caption">${post.caption || ""}</p>

    <div class="comments">
      <div class="comment-compose">
        <input class="comment-input" type="text" placeholder="Adicionar um comentário...">
        <button class="comment-send" type="button" aria-label="Enviar comentário">➤</button>
      </div>
      <ul class="comments-list"></ul>
    </div>
  `;

  // ====== DELETE POST (admin) ======
  const delPostBtn = postEl.querySelector(".delete-post-btn");
  if (delPostBtn) {
    delPostBtn.addEventListener("click", async () => {
      if (!isAdmin(currentProfile)) return;
      const ok = confirm("Apagar este post?");
      if (!ok) return;

      delPostBtn.disabled = true;

      try {
        // apaga do DB
        const { error: delDbErr } = await supa.from("posts").delete().eq("id", post.id);
        if (delDbErr) throw delDbErr;

        // tenta apagar do storage (depende da policy)
        const { error: delStErr } = await supa.storage.from("posts").remove([post.image_url]);
        if (delStErr) console.warn("DB ok, storage não apagou:", delStErr);

        postEl.remove();
      } catch (e) {
        console.error(e);
        alert("Erro ao apagar post: " + errToText(e));
      } finally {
        delPostBtn.disabled = false;
      }
    });
  }

  // ===== LIKE =====
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
        alert("Erro ao remover curtida: " + errToText(error));
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
        alert("Erro ao curtir: " + errToText(error));
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
  const input = postEl.querySelector(".comment-input");
  const sendBtn = postEl.querySelector(".comment-send");
  const ul = postEl.querySelector(".comments-list");
  const commentsCountSpan = postEl.querySelector(".comments-count");
  const commentBtn = postEl.querySelector(".comment-btn");

  commentBtn.addEventListener("click", () => input.focus());

  await carregarComentarios(post.id, ul);

  async function refreshCount() {
    // pega contagem real (mais robusto)
    const { count, error } = await supa
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", post.id);

    if (!error && typeof count === "number") {
      post.comments_count = count;
      commentsCountSpan.textContent =
        post.comments_count + (post.comments_count === 1 ? " comentário" : " comentários");
    }
  }

  async function enviarComentario() {
    const content = input.value.trim();
    if (!content) return;

    sendBtn.disabled = true;
    try {
      const { error } = await supa
        .from("comments")
        .insert({ post_id: post.id, user_id: currentUser.id, content });

      if (error) throw error;

      input.value = "";
      await carregarComentarios(post.id, ul);
      await refreshCount();
    } catch (e) {
      console.error(e);
      alert("Erro ao comentar: " + errToText(e));
    } finally {
      sendBtn.disabled = false;
    }
  }

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") enviarComentario();
  });
  sendBtn.addEventListener("click", enviarComentario);

  return postEl;
}

// Carrega comentários + mostra autor + hora + botão apagar (admin ou dono)
async function carregarComentarios(postId, ul) {
  ul.innerHTML = "";

  // tenta join comments -> profiles
  let rows = null;
  let joinOk = true;

  const { data: joined, error: joinErr } = await supa
    .from("comments")
    .select("id, content, created_at, user_id, profiles(full_name)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (joinErr) {
    joinOk = false;
    console.warn("Join comments->profiles falhou, fallback:", joinErr);
  } else {
    rows = joined;
  }

  if (!joinOk) {
    const { data: plain, error: plainErr } = await supa
      .from("comments")
      .select("id, content, created_at, user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (plainErr) {
      console.error(plainErr);
      return;
    }

    const userIds = [...new Set(plain.map((c) => c.user_id))].filter(Boolean);
    let nameMap = {};

    if (userIds.length) {
      const { data: profs } = await supa
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profs?.length) {
        for (const p of profs) nameMap[p.id] = p.full_name || "Usuário";
      }
    }

    rows = plain.map((c) => ({
      ...c,
      profiles: { full_name: nameMap[c.user_id] || "Usuário" },
    }));
  }

  for (const c of rows) {
    const li = document.createElement("li");
    li.className = "comment-item";

    const name = c.profiles?.full_name || "Usuário";
    const when = fmtWhen(c.created_at);

    const delBtnHtml = canDeleteComment(c.user_id)
      ? `<button class="comment-delete" title="Apagar comentário" aria-label="Apagar comentário">🗑️</button>`
      : "";

    li.innerHTML = `
      <div class="comment-row">
        <div class="comment-left">
          <div class="comment-head">
            <span class="comment-author">${name}</span>
            <span class="comment-when">${when}</span>
          </div>
          <div class="comment-text">${c.content}</div>
        </div>
        <div class="comment-actions">
          ${delBtnHtml}
        </div>
      </div>
    `;

    const delBtn = li.querySelector(".comment-delete");
    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        const ok = confirm("Apagar este comentário?");
        if (!ok) return;

        delBtn.disabled = true;
        try {
          const { error } = await supa.from("comments").delete().eq("id", c.id);
          if (error) throw error;

          li.remove();
        } catch (e) {
          console.error(e);
          alert("Erro ao apagar comentário: " + errToText(e));
        } finally {
          delBtn.disabled = false;
        }
      });
    }

    ul.appendChild(li);
  }
}

// ========= POSTAR (ADMIN) =========
window.abrirGaleria = function abrirGaleria() {
  if (!isAdmin(currentProfile)) return;
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
    abrirModal();
    setTimeout(() => captionInput.focus(), 50);
  };
  reader.readAsDataURL(file);

  fileInput.value = "";
});

if (publishPost) {
  publishPost.addEventListener("click", async () => {
    if (!pendingFile) return;
    if (!isAdmin(currentProfile)) return;

    const caption = captionInput.value.trim();

    publishPost.disabled = true;

    try {
      const ext = (pendingFile.name.split(".").pop() || "jpg").toLowerCase();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const filePath = `${currentUser.id}/${fileName}`;

      // upload no storage
      const { error: upErr } = await supa.storage
        .from("posts")
        .upload(filePath, pendingFile, {
          upsert: false,
          contentType: pendingFile.type || undefined,
        });

      if (upErr) throw upErr;

      // salva no DB
      const { error: insErr } = await supa
        .from("posts")
        .insert({ user_id: currentUser.id, caption, image_url: filePath });

      if (insErr) throw insErr;

      fecharModal();
      await carregarFeed();
    } catch (e) {
      console.error(e);
      alert("Erro ao publicar: " + errToText(e));
    } finally {
      publishPost.disabled = false;
    }
  });
}

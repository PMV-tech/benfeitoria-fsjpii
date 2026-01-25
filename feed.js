// feed.js
const supa = window.supa || window.supabaseClient;

if (!supa) {
  alert("Supabase não carregou. Verifique o supabaseClient.js");
  throw new Error("Supabase client missing");
}

const fileInput = document.getElementById("fileInput");
const feed = document.getElementById("feed");

// Topbar
const topbarTitle = document.querySelector(".topbar h2");

// Logout
const btnLogout = document.getElementById("btnLogout");

// Modal
const postModal = document.getElementById("postModal");
const previewImg = document.getElementById("previewImg");
const captionInput = document.getElementById("captionInput");
const publishPost = document.getElementById("publishPost");
const cancelPost = document.getElementById("cancelPost");
const closeModal = document.getElementById("closeModal");

// Botão +
const addPostBtn = document.querySelector(".add-post");

let pendingFile = null;
let currentUser = null;
let currentProfile = null;

// ----------------- Helpers UI -----------------
function setTopbarTitle() {
  const isAdmin = currentProfile?.role === "admin";
  if (topbarTitle) topbarTitle.textContent = isAdmin ? "FSJPII • Admin" : "FSJPII";
  document.title = isAdmin ? "Feed | Admin FSJPII" : "Feed | FSJPII";
}

function setModalOpen(open) {
  if (!postModal) return;
  if (open) {
    postModal.classList.add("show");
    postModal.setAttribute("aria-hidden", "false");
  } else {
    postModal.classList.remove("show");
    postModal.setAttribute("aria-hidden", "true");
  }
}

function makeIconButton({ title, variant = "default" } = {}) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.title = title || "";
  btn.setAttribute("aria-label", title || "Ação");

  // estilo "bonito" direto no JS (não depende do CSS)
  btn.style.width = "34px";
  btn.style.height = "34px";
  btn.style.display = "inline-flex";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";
  btn.style.borderRadius = "10px";
  btn.style.border = "1px solid rgba(255,255,255,0.10)";
  btn.style.background = "rgba(255,255,255,0.06)";
  btn.style.cursor = "pointer";
  btn.style.padding = "0";
  btn.style.transition = "transform .15s ease, background .15s ease, border-color .15s ease";
  btn.style.userSelect = "none";

  const svg = document.createElement("span");
  svg.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M9 3h6l1 2h5v2H3V5h5l1-2Z" fill="rgba(255,255,255,0.85)"/>
      <path d="M6 9h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 9Z"
        fill="rgba(255,255,255,0.70)"/>
      <path d="M10 12v7M14 12v7" stroke="rgba(0,0,0,0.55)" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
  btn.appendChild(svg);

  if (variant === "danger") {
    btn.style.borderColor = "rgba(255, 80, 120, 0.25)";
  }

  btn.addEventListener("mouseenter", () => {
    btn.style.background = "rgba(255,255,255,0.10)";
    btn.style.transform = "translateY(-1px)";
    btn.style.borderColor = variant === "danger"
      ? "rgba(255, 80, 120, 0.45)"
      : "rgba(255,255,255,0.18)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "rgba(255,255,255,0.06)";
    btn.style.transform = "translateY(0)";
    btn.style.borderColor = variant === "danger"
      ? "rgba(255, 80, 120, 0.25)"
      : "rgba(255,255,255,0.10)";
  });

  return btn;
}

// Storage (bucket public)
function getPublicImageUrl(path) {
  const { data } = supa.storage.from("posts").getPublicUrl(path);
  return data?.publicUrl || "";
}

// ----------------- Auth / Perfil -----------------
async function init() {
  // sessão (mais confiável pra GH Pages)
  const { data: { session } } = await supa.auth.getSession();

  if (!session) {
    window.location.href = "index.html";
    return;
  }

  currentUser = session.user;

  // profile
  const { data: profile, error } = await supa
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error(error);
    alert("Erro ao carregar perfil.");
    return;
  }

  currentProfile = profile;
  setTopbarTitle();

  // Somente admin pode postar: esconde o +
  if (currentProfile.role !== "admin") {
    if (addPostBtn) addPostBtn.style.display = "none";
  } else {
    if (addPostBtn) addPostBtn.style.display = "flex";
  }

  await carregarFeed();
}

init();

// ----------------- Feed -----------------
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

function fmtDateBR(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy}, ${hh}:${mi}`;
}

async function renderPost(post) {
  post.likes_count = post.likes_count ?? 0;
  post.comments_count = post.comments_count ?? 0;

  const isAdmin = currentProfile?.role === "admin";

  const postEl = document.createElement("div");
  postEl.className = "post";

  const imgUrl = getPublicImageUrl(post.image_url);

  // Cabeçalho do post (autor + data + delete do post p/ admin)
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "10px";
  header.style.padding = "12px 12px 0";

  const left = document.createElement("div");
  left.style.display = "flex";
  left.style.flexDirection = "column";
  left.style.gap = "2px";

  const author = document.createElement("div");
  author.style.fontWeight = "800";
  author.style.fontSize = "14px";
  author.textContent = post.author_name || "Usuário";

  const date = document.createElement("div");
  date.style.fontSize = "12px";
  date.style.color = "rgba(255,255,255,0.55)";
  date.textContent = fmtDateBR(post.created_at);

  left.appendChild(author);
  left.appendChild(date);

  header.appendChild(left);

  // Botão excluir post (apenas admin)
  if (isAdmin) {
    const delPostBtn = makeIconButton({ title: "Excluir post", variant: "danger" });
    delPostBtn.addEventListener("click", async () => {
      const ok = confirm("Excluir este post? Isso remove o post e a imagem.");
      if (!ok) return;

      delPostBtn.disabled = true;
      delPostBtn.style.opacity = "0.6";
      delPostBtn.style.pointerEvents = "none";

      try {
        // 1) tenta remover arquivo do Storage (se falhar, ainda pode apagar o post)
        if (post.image_url) {
          const { error: stErr } = await supa.storage.from("posts").remove([post.image_url]);
          if (stErr) console.warn("Falha ao remover imagem do storage:", stErr);
        }

        // 2) remove do banco
        const { error: dbErr } = await supa.from("posts").delete().eq("id", post.id);
        if (dbErr) throw dbErr;

        // remove do DOM
        postEl.remove();
      } catch (e) {
        console.error(e);
        alert(e?.message || "Erro ao excluir post.");
      } finally {
        delPostBtn.disabled = false;
        delPostBtn.style.opacity = "1";
        delPostBtn.style.pointerEvents = "auto";
      }
    });

    header.appendChild(delPostBtn);
  } else {
    // mantém alinhamento sem botão
    const spacer = document.createElement("div");
    spacer.style.width = "34px";
    spacer.style.height = "34px";
    header.appendChild(spacer);
  }

  postEl.appendChild(header);

  // Imagem
  const img = document.createElement("img");
  img.src = imgUrl;
  img.alt = "Post";
  postEl.appendChild(img);

  // Actions
  const actions = document.createElement("div");
  actions.className = "post-actions";
  actions.innerHTML = `
    <button class="like-btn" aria-label="Curtir">🤍</button>
    <button class="comment-btn" aria-label="Comentar">💬</button>
    <span class="likes">${post.likes_count} curtidas</span>
    <span class="comments-count">${post.comments_count} comentários</span>
  `;
  postEl.appendChild(actions);

  // Caption
  const caption = document.createElement("p");
  caption.textContent = post.caption || "";
  postEl.appendChild(caption);

  // Comments area
  const commentsWrap = document.createElement("div");
  commentsWrap.className = "comments";

  // input row + botão enviar (seu CSS já pode ajustar, mas aqui funciona mesmo sem)
  const inputRow = document.createElement("div");
  inputRow.style.display = "flex";
  inputRow.style.gap = "10px";
  inputRow.style.alignItems = "center";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Adicionar um comentário...";
  inputRow.appendChild(input);

  const sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.setAttribute("aria-label", "Enviar comentário");
  sendBtn.textContent = "➤";
  sendBtn.style.width = "40px";
  sendBtn.style.height = "36px";
  sendBtn.style.borderRadius = "10px";
  sendBtn.style.border = "1px solid rgba(255,255,255,0.10)";
  sendBtn.style.background = "rgba(255,255,255,0.06)";
  sendBtn.style.color = "#fff";
  sendBtn.style.cursor = "pointer";
  sendBtn.style.transition = "background .15s ease, transform .15s ease";
  sendBtn.addEventListener("mouseenter", () => {
    sendBtn.style.background = "rgba(255,255,255,0.10)";
    sendBtn.style.transform = "translateY(-1px)";
  });
  sendBtn.addEventListener("mouseleave", () => {
    sendBtn.style.background = "rgba(255,255,255,0.06)";
    sendBtn.style.transform = "translateY(0)";
  });

  inputRow.appendChild(sendBtn);

  const ul = document.createElement("ul");

  commentsWrap.appendChild(inputRow);
  commentsWrap.appendChild(ul);
  postEl.appendChild(commentsWrap);

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

  // COMMENTS (carregar + deletar)
  const commentsCountSpan = postEl.querySelector(".comments-count");
  const commentBtn = postEl.querySelector(".comment-btn");

  commentBtn.addEventListener("click", () => input.focus());

  await carregarComentarios(post.id, ul);

  async function enviarComentario() {
    const content = input.value.trim();
    if (!content) return;

    sendBtn.disabled = true;
    sendBtn.style.opacity = "0.6";

    try {
      const { error } = await supa
        .from("comments")
        .insert({ post_id: post.id, user_id: currentUser.id, content });

      if (error) throw error;

      input.value = "";
      post.comments_count += 1;

      commentsCountSpan.textContent =
        post.comments_count + (post.comments_count === 1 ? " comentário" : " comentários");

      await carregarComentarios(post.id, ul);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Erro ao comentar.");
    } finally {
      sendBtn.disabled = false;
      sendBtn.style.opacity = "1";
    }
  }

  input.addEventListener("keypress", async (e) => {
    if (e.key === "Enter") await enviarComentario();
  });
  sendBtn.addEventListener("click", enviarComentario);

  return postEl;
}

async function carregarComentarios(postId, ul) {
  ul.innerHTML = "";

  const { data, error } = await supa
    .from("comments")
    .select("id, content, created_at, user_id")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const isAdmin = currentProfile?.role === "admin";

  for (const c of data) {
    const li = document.createElement("li");

    // mantém seu layout atual (sem autor_nome, porque não existe)
    li.textContent = c.content;

    const canDelete = isAdmin || c.user_id === currentUser.id;
    if (canDelete) {
      const delBtn = makeIconButton({ title: "Excluir comentário", variant: "danger" });
      delBtn.addEventListener("click", async () => {
        const ok = confirm("Excluir este comentário?");
        if (!ok) return;

        const { error } = await supa.from("comments").delete().eq("id", c.id);
        if (error) {
          console.error(error);
          alert(error.message || "Erro ao excluir comentário.");
          return;
        }
        li.remove();
      });
      li.appendChild(delBtn);
    }

    ul.appendChild(li);
  }
}


// ----------------- Postar (ADMIN) -----------------
window.abrirGaleria = function abrirGaleria() {
  if (!currentProfile || currentProfile.role !== "admin") return;
  fileInput.click();
};

fileInput?.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  pendingFile = file;

  const reader = new FileReader();
  reader.onload = () => {
    if (previewImg) previewImg.src = reader.result;
    if (captionInput) captionInput.value = "";
    setModalOpen(true);
    setTimeout(() => captionInput?.focus(), 50);
  };
  reader.readAsDataURL(file);

  fileInput.value = "";
});

function fecharModal() {
  setModalOpen(false);
  pendingFile = null;
}

closeModal?.addEventListener("click", fecharModal);
cancelPost?.addEventListener("click", fecharModal);

postModal?.addEventListener("click", (e) => {
  if (e.target === postModal) fecharModal();
});

publishPost?.addEventListener("click", async () => {
  if (!pendingFile) return;
  if (!currentProfile || currentProfile.role !== "admin") return;

  const caption = captionInput?.value?.trim() || "";

  publishPost.disabled = true;
  publishPost.style.opacity = "0.7";
  publishPost.style.pointerEvents = "none";

  try {
    const ext = (pendingFile.name.split(".").pop() || "jpg").toLowerCase();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `${currentUser.id}/${fileName}`;

    // upload
    const { error: upErr } = await supa.storage
      .from("posts")
      .upload(filePath, pendingFile, { upsert: false });

    if (upErr) throw upErr;

    // insert
    const { error: insErr } = await supa
      .from("posts")
      .insert({ user_id: currentUser.id, caption, image_url: filePath });

    if (insErr) throw insErr;

    fecharModal();
    await carregarFeed();
  } catch (e) {
    console.error(e);
    alert(e?.message || "Erro ao postar.");
  } finally {
    publishPost.disabled = false;
    publishPost.style.opacity = "1";
    publishPost.style.pointerEvents = "auto";
  }
});

// ----------------- Logout -----------------
btnLogout?.addEventListener("click", async () => {
  try {
    const { error } = await supa.auth.signOut();
    if (error) throw error;
    window.location.href = "index.html";
  } catch (e) {
    console.error(e);
    alert(e?.message || "Erro ao sair.");
  }
});



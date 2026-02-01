// feed.js - VERSÃO COMPLETA (com posts sem imagem + modal de escolha)
// -------------------------------------------------------------
const supa = window.supa || window.supabaseClient;

if (!supa) {
  alert("Supabase não carregou. Verifique o supabaseClient.js");
  throw new Error("Supabase client missing");
}

const fileInput = document.getElementById("fileInput");
const feed = document.getElementById("feed");

// Topbar
const topbarTitle = document.querySelector(".topbar h2");

// Botões
const btnLogout = document.getElementById("btnLogout");
const btnTheme = document.getElementById("btnTheme");

// Modal de novo post
const postModal = document.getElementById("postModal");
const previewImg = document.getElementById("previewImg");
const previewWrap = previewImg?.closest(".modal-preview") || document.querySelector("#postModal .modal-preview");

function setPreviewVisible(visible) {
  if (previewWrap) previewWrap.style.display = visible ? "" : "none";
  if (!visible && previewImg) {
    previewImg.removeAttribute("src");
    previewImg.src = "";
  }
}

const captionInput = document.getElementById("captionInput");
const publishPost = document.getElementById("publishPost");
const cancelPost = document.getElementById("cancelPost");
const closeModal = document.getElementById("closeModal");

// Esconde a área de prévia por padrão (evita ícone de imagem quebrada)
setPreviewVisible(false);

// Modal de curtidas
const likesModal = document.getElementById("likesModal");
const closeLikesModal = document.getElementById("closeLikesModal");
const likesList = document.getElementById("likesList");

// Botão +
const addPostBtn = document.querySelector(".add-post");

let pendingFile = null;
let currentUser = null;
let currentProfile = null;
let editingCommentId = null;

// Map de perfis (para nome de autor)
let profilesMap = {}; // id -> full_name

// ----------------- TEMA -----------------
function applyThemeToDynamicElements() {
  const isDarkMode = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDarkMode ? "#ffffff" : "#222222";

  // Atualizar botões dinâmicos
  document.querySelectorAll(".btn-danger").forEach((btn) => {
    btn.style.color = textColor;
  });

  // Atualizar botões de ação
  document.querySelectorAll(".post-actions button").forEach((btn) => {
    btn.style.color = textColor;
  });
}

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

function makeIconButton({ title, variant = "default", icon = "trash" } = {}) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.title = title || "";
  btn.setAttribute("aria-label", title || "Ação");

  const isDarkMode = document.documentElement.getAttribute("data-theme") === "dark";
  const bg = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const border = isDarkMode ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.1)";
  const hoverBg = isDarkMode ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
  const hoverBorder = isDarkMode ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)";

  btn.style.width = "34px";
  btn.style.height = "34px";
  btn.style.display = "inline-flex";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";
  btn.style.borderRadius = "10px";
  btn.style.border = `1px solid ${border}`;
  btn.style.background = bg;
  btn.style.cursor = "pointer";
  btn.style.padding = "0";
  btn.style.transition = "transform .15s ease, background .15s ease, border-color .15s ease";
  btn.style.userSelect = "none";

  const svg = document.createElement("span");

  if (icon === "trash") {
    svg.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M9 3h6l1 2h5v2H3V5h5l1-2Z" fill="currentColor"/>
        <path d="M6 9h12l-1 12H7L6 9Z" fill="currentColor" opacity="0.9"/>
      </svg>
    `;
  } else if (icon === "x") {
    svg.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
  } else {
    svg.textContent = "•";
  }

  btn.appendChild(svg);

  btn.addEventListener("mouseenter", () => {
    btn.style.background = hoverBg;
    btn.style.borderColor = hoverBorder;
    btn.style.transform = "translateY(-1px)";
  });

  btn.addEventListener("mouseleave", () => {
    btn.style.background = bg;
    btn.style.borderColor = border;
    btn.style.transform = "translateY(0)";
  });

  if (variant === "danger") {
    btn.classList.add("btn-danger");
    btn.style.color = "var(--danger)";
    svg.style.color = "inherit";
  } else {
    btn.style.color = "var(--text-primary)";
  }

  return btn;
}

// ----------------- Modal de escolha (com / sem imagem) -----------------
let choiceModal = null;

function ensureChoiceModal() {
  if (choiceModal) return choiceModal;

  choiceModal = document.createElement("div");
  choiceModal.className = "modal";
  choiceModal.setAttribute("aria-hidden", "true");
  choiceModal.style.display = "none";

  const card = document.createElement("div");
  card.className = "modal-card";
  card.style.maxWidth = "420px";

  const title = document.createElement("div");
  title.textContent = "Novo post";
  title.style.fontSize = "18px";
  title.style.fontWeight = "800";
  title.style.color = "var(--text-primary)";
  title.style.marginBottom = "6px";

  const subtitle = document.createElement("div");
  subtitle.textContent = "Você quer publicar com imagem ou sem imagem?";
  subtitle.style.fontSize = "13px";
  subtitle.style.color = "var(--text-muted)";
  subtitle.style.marginBottom = "14px";

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "10px";

  const btnWith = document.createElement("button");
  btnWith.type = "button";
  btnWith.textContent = "📷 Com imagem";
  btnWith.style.flex = "1";
  btnWith.style.padding = "12px 14px";
  btnWith.style.borderRadius = "14px";
  btnWith.style.border = "1px solid var(--border-color)";
  btnWith.style.background = "var(--button-bg)";
  btnWith.style.color = "var(--text-primary)";
  btnWith.style.cursor = "pointer";
  btnWith.style.fontWeight = "800";

  const btnWithout = document.createElement("button");
  btnWithout.type = "button";
  btnWithout.textContent = "✍️ Sem imagem";
  btnWithout.style.flex = "1";
  btnWithout.style.padding = "12px 14px";
  btnWithout.style.borderRadius = "14px";
  btnWithout.style.border = "1px solid var(--border-color)";
  btnWithout.style.background = "var(--button-bg)";
  btnWithout.style.color = "var(--text-primary)";
  btnWithout.style.cursor = "pointer";
  btnWithout.style.fontWeight = "800";

  const cancelRow = document.createElement("div");
  cancelRow.style.marginTop = "12px";

  const btnCancel = document.createElement("button");
  btnCancel.type = "button";
  btnCancel.textContent = "Cancelar";
  btnCancel.style.width = "100%";
  btnCancel.style.padding = "10px 14px";
  btnCancel.style.borderRadius = "14px";
  btnCancel.style.border = "1px solid var(--border-color)";
  btnCancel.style.background = "transparent";
  btnCancel.style.color = "var(--text-primary)";
  btnCancel.style.cursor = "pointer";
  btnCancel.style.fontWeight = "800";

  btnWith.addEventListener("click", () => {
    closeChoiceModal();
    fileInput?.click();
  });

  btnWithout.addEventListener("click", () => {
    closeChoiceModal();
    pendingFile = null;

    // Post sem imagem: não mostra a área de prévia
    setPreviewVisible(false);

    if (captionInput) captionInput.value = "";
    setModalOpen(true);
    setTimeout(() => captionInput?.focus(), 50);
  });

  btnCancel.addEventListener("click", closeChoiceModal);

  card.appendChild(title);
  card.appendChild(subtitle);
  row.appendChild(btnWith);
  row.appendChild(btnWithout);
  card.appendChild(row);
  cancelRow.appendChild(btnCancel);
  card.appendChild(cancelRow);

  choiceModal.appendChild(card);
  document.body.appendChild(choiceModal);

  choiceModal.addEventListener("click", (e) => {
    if (e.target === choiceModal) closeChoiceModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && choiceModal.style.display === "flex") {
      closeChoiceModal();
    }
  });

  return choiceModal;
}

function openChoiceModal() {
  ensureChoiceModal();
  choiceModal.style.display = "flex";
  choiceModal.setAttribute("aria-hidden", "false");
}

function closeChoiceModal() {
  if (!choiceModal) return;
  choiceModal.style.display = "none";
  choiceModal.setAttribute("aria-hidden", "true");
}

// ----------------- Curtidas (modal de quem curtiu) -----------------
function abrirModalCurtidas(users) {
  likesList.innerHTML = "";
  if (!users?.length) {
    const empty = document.createElement("div");
    empty.textContent = "Ninguém curtiu ainda.";
    empty.style.color = "var(--text-muted)";
    empty.style.fontSize = "14px";
    likesList.appendChild(empty);
  } else {
    users.forEach((u) => {
      const item = document.createElement("div");
      item.className = "like-item";
      item.textContent = u?.full_name || u?.email || "Usuário";
      likesList.appendChild(item);
    });
  }
  likesModal.classList.add("show");
  likesModal.setAttribute("aria-hidden", "false");
}

function fecharModalCurtidas() {
  likesModal.classList.remove("show");
  likesModal.setAttribute("aria-hidden", "true");
}

closeLikesModal?.addEventListener("click", fecharModalCurtidas);

likesModal?.addEventListener("click", (e) => {
  if (e.target === likesModal) fecharModalCurtidas();
});

// ----------------- AUTH -----------------
async function requireAuth() {
  const { data, error } = await supa.auth.getUser();
  if (error) throw error;
  if (!data?.user) {
    window.location.href = "index.html";
    return null;
  }
  currentUser = data.user;
  return data.user;
}

async function loadProfile() {
  if (!currentUser) return null;
  const { data, error } = await supa
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error("Erro ao carregar profile:", error);
    return null;
  }
  currentProfile = data;
  setTopbarTitle();
  return data;
}

async function loadProfilesMap() {
  const { data, error } = await supa.from("profiles").select("id, full_name");
  if (!error && Array.isArray(data)) {
    profilesMap = {};
    data.forEach((p) => {
      profilesMap[p.id] = p.full_name || "Usuário";
    });
  }
}

// ----------------- TEMA (botão) -----------------
function initTheme() {
  const saved = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
}

btnTheme?.addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  applyThemeToDynamicElements();
});

// ----------------- LOAD FEED -----------------
async function carregarFeed() {
  if (!feed) return;

  feed.innerHTML = `<div class="loading">Carregando feed...</div>`;

  // posts (mais recente primeiro)
  const { data: posts, error } = await supa
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    feed.innerHTML = `<div class="error">Erro ao carregar feed.</div>`;
    return;
  }

  // likes / comments counts (via views ou columns)
  // Se seu schema não tem likes_count/comments_count, esse fallback mantém 0 e atualiza via queries depois.
  const postList = Array.isArray(posts) ? posts : [];
  feed.innerHTML = "";

  for (const post of postList) {
    // buscar contagem de curtidas
    const { count: likesCount } = await supa
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", post.id);

    // buscar contagem de comentários
    const { count: commentsCount } = await supa
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", post.id);

    post.likes_count = likesCount ?? post.likes_count ?? 0;
    post.comments_count = commentsCount ?? post.comments_count ?? 0;

    const postEl = await renderPost(post);
    feed.appendChild(postEl);
  }

  applyThemeToDynamicElements();
}

// ----------------- FULLSCREEN IMG -----------------
function abrirImagemTelaCheia(imgUrl, imgContainerRef) {
  const modal = document.createElement("div");
  modal.className = "fullscreen-modal";

  const fullscreenImg = document.createElement("img");
  fullscreenImg.src = imgUrl;
  fullscreenImg.className = "fullscreen-img";

  modal.appendChild(fullscreenImg);
  document.body.appendChild(modal);

  modal.addEventListener("dblclick", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleLike(post, postEl, imgContainerRef, true);
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// ----------------- Like Animation -----------------
function criarAnimacaoCurtida(container, fromDblClick = false) {
  if (!container) return;

  const heart = document.createElement("div");
  heart.textContent = "❤️";
  heart.style.position = "absolute";
  heart.style.left = "50%";
  heart.style.top = "50%";
  heart.style.transform = "translate(-50%, -50%) scale(0.5)";
  heart.style.fontSize = fromDblClick ? "60px" : "46px";
  heart.style.opacity = "0";
  heart.style.pointerEvents = "none";
  heart.style.transition = "all 0.25s ease";

  // Garante que o container esteja relativo
  const oldPos = container.style.position;
  if (!oldPos || oldPos === "static") container.style.position = "relative";

  container.appendChild(heart);

  requestAnimationFrame(() => {
    heart.style.opacity = "1";
    heart.style.transform = "translate(-50%, -50%) scale(1)";
  });

  setTimeout(() => {
    heart.style.opacity = "0";
    heart.style.transform = "translate(-50%, -50%) scale(1.4)";
  }, 280);

  setTimeout(() => {
    container.removeChild(heart);
  }, 600);
}

// ----------------- Render Post -----------------
async function renderPost(post) {
  post.likes_count = post.likes_count ?? 0;
  post.comments_count = post.comments_count ?? 0;

  const isAdmin = currentProfile?.role === "admin";
  const hasImage = !!post.image_url;

  const postEl = document.createElement("div");
  postEl.className = "post";
  postEl.dataset.postId = post.id;

  // Cabeçalho
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "10px";
  header.style.padding = "12px 16px";
  header.style.borderBottom = "1px solid var(--border-light)";

  const left = document.createElement("div");
  left.style.display = "flex";
  left.style.flexDirection = "column";
  left.style.gap = "2px";

  const authorName = document.createElement("div");
  authorName.style.fontWeight = "900";
  authorName.style.color = "var(--text-primary)";
  authorName.textContent = profilesMap[post.user_id] || "Usuário";

  const date = document.createElement("div");
  date.style.fontSize = "12px";
  date.style.color = "var(--text-muted)";
  date.textContent = new Date(post.created_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  left.appendChild(authorName);
  left.appendChild(date);

  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.gap = "8px";
  right.style.alignItems = "center";

  if (isAdmin) {
    const delBtn = makeIconButton({ title: "Excluir post", variant: "danger", icon: "trash" });
    delBtn.addEventListener("click", async () => {
      const ok = confirm("Excluir este post?");
      if (!ok) return;

      try {
        // remover imagem se tiver
        if (post.image_url) {
          await supa.storage.from("posts").remove([post.image_url]);
        }

        const { error } = await supa.from("posts").delete().eq("id", post.id);
        if (error) throw error;

        await carregarFeed();
      } catch (e) {
        console.error(e);
        alert(e?.message || "Erro ao excluir post.");
      }
    });
    right.appendChild(delBtn);
  }

  header.appendChild(left);
  header.appendChild(right);

  postEl.appendChild(header);

  // Imagem (se houver)
  let visualContainer = null;

  if (hasImage) {
    const imgContainer = document.createElement("div");
    imgContainer.className = "img-container";

    const imgUrl = supa.storage.from("posts").getPublicUrl(post.image_url).data.publicUrl;

    const img = document.createElement("img");
    img.src = imgUrl;
    img.alt = "Post";
    img.loading = "lazy";

    // Overlay hover
    const overlay = document.createElement("div");
    overlay.className = "img-overlay";
    overlay.style.position = "absolute";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.3s ease";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.color = "white";
    overlay.style.fontSize = "14px";
    overlay.style.fontWeight = "bold";
    overlay.style.backdropFilter = "blur(2px)";
    overlay.style.backgroundColor = "rgba(0,0,0,0.3)";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "1";

    const expandIcon = document.createElement("div");
    expandIcon.innerHTML = "🔍 Clique para expandir";
    expandIcon.style.opacity = "0.7";
    expandIcon.style.pointerEvents = "none";
    overlay.appendChild(expandIcon);

    imgContainer.appendChild(img);
    imgContainer.appendChild(overlay);

    // click/dblclick
    let clickTimer = null;
    let isDoubleClick = false;

    imgContainer.addEventListener("click", () => {
      if (isDoubleClick) {
        isDoubleClick = false;
        return;
      }

      if (clickTimer === null) {
        clickTimer = setTimeout(() => {
          abrirImagemTelaCheia(imgUrl, imgContainer);
          clickTimer = null;
        }, 300);
      }
    });

    imgContainer.addEventListener("dblclick", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }

      isDoubleClick = true;

      await handleLike(post, postEl, imgContainer, true);

      setTimeout(() => {
        isDoubleClick = false;
      }, 100);
    });

    imgContainer.addEventListener("mouseenter", () => {
      overlay.style.opacity = "1";
      img.style.transform = "scale(1.02)";
    });

    imgContainer.addEventListener("mouseleave", () => {
      overlay.style.opacity = "0";
      img.style.transform = "scale(1)";
    });

    postEl.appendChild(imgContainer);
    visualContainer = imgContainer;
  } else {
    // Post sem imagem: mostra apenas o texto (sem "Post sem imagem" e sem emojis)
    const textBox = document.createElement("div");
    textBox.style.width = "100%";
    textBox.style.padding = "18px 14px";
    textBox.style.borderRadius = "14px";
    textBox.style.border = "1px solid var(--border-color)";
    textBox.style.background = "var(--bg-secondary)";
    textBox.style.whiteSpace = "pre-wrap";
    textBox.style.wordBreak = "break-word";
    textBox.style.fontSize = "15px";
    textBox.style.color = "var(--text-primary)";
    textBox.style.lineHeight = "1.5";

    textBox.textContent = post.caption || "";

    postEl.appendChild(textBox);
    visualContainer = textBox;
  }

  // Actions
  const actions = document.createElement("div");
  actions.className = "post-actions";
  actions.innerHTML = `
    <button class="like-btn" aria-label="Curtir">🤍</button>
    <button class="comment-btn" aria-label="Comentar">💬</button>
    <span class="likes" style="cursor: pointer; transition: all 0.2s ease;" 
          title="Clique para ver quem curtiu">${post.likes_count} curtidas</span>
    <span class="comments-count">${post.comments_count} comentários</span>
  `;
  postEl.appendChild(actions);

  const likesSpan = postEl.querySelector(".likes");
  likesSpan.addEventListener("click", async () => {
    try {
      const { data, error } = await supa
        .from("likes")
        .select("user_id, profiles(full_name, email)")
        .eq("post_id", post.id);

      if (error) throw error;

      const users = (data || []).map((l) => l.profiles).filter(Boolean);
      abrirModalCurtidas(users);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Erro ao carregar curtidas.");
    }
  });

  likesSpan.addEventListener("mouseenter", () => {
    likesSpan.style.opacity = "0.8";
    likesSpan.style.textDecoration = "underline";
  });

  likesSpan.addEventListener("mouseleave", () => {
    likesSpan.style.opacity = "1";
    likesSpan.style.textDecoration = "none";
  });

  // Caption (para posts com imagem)
  if (hasImage) {
    const caption = document.createElement("p");
    caption.textContent = post.caption || "";
    postEl.appendChild(caption);
  }

  // Comments
  const commentsWrap = document.createElement("div");
  commentsWrap.className = "comments";

  const inputRow = document.createElement("div");
  inputRow.style.display = "flex";
  inputRow.style.gap = "10px";
  inputRow.style.alignItems = "center";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Adicionar um comentário...";
  input.style.color = "var(--text-primary)";
  input.style.backgroundColor = "var(--bg-secondary)";
  input.style.border = "1px solid var(--border-color)";
  input.style.flex = "1";
  input.style.padding = "10px 12px";
  input.style.borderRadius = "14px";

  const sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.textContent = "▶";
  sendBtn.style.width = "44px";
  sendBtn.style.height = "38px";
  sendBtn.style.borderRadius = "12px";
  sendBtn.style.border = "1px solid var(--border-color)";
  sendBtn.style.background = "var(--button-bg)";
  sendBtn.style.cursor = "pointer";
  sendBtn.style.color = "var(--text-primary)";
  sendBtn.style.fontWeight = "900";

  inputRow.appendChild(input);
  inputRow.appendChild(sendBtn);

  const ul = document.createElement("ul");

  const seeMoreContainer = document.createElement("div");
  seeMoreContainer.className = "see-more-comments";

  commentsWrap.appendChild(inputRow);
  commentsWrap.appendChild(ul);
  commentsWrap.appendChild(seeMoreContainer);

  postEl.appendChild(commentsWrap);

  const likeBtn = postEl.querySelector(".like-btn");

  // check se usuário curtiu
  const { data: likedData } = await supa
    .from("likes")
    .select("id")
    .eq("post_id", post.id)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (likedData) {
    likeBtn.classList.add("liked");
    likeBtn.textContent = "❤️";
  }

  // Função de curtir reutilizável
  async function handleLike(postObj, postElement, containerForAnim = null, showAnimation = false) {
    if (!currentUser) return;

    const likeBtnLocal = postElement.querySelector(".like-btn");
    const likesSpanLocal = postElement.querySelector(".likes");

    const { data: existing } = await supa
      .from("likes")
      .select("id")
      .eq("post_id", postObj.id)
      .eq("user_id", currentUser.id)
      .maybeSingle();

    // Se já curtiu -> remove
    if (existing?.id) {
      const { error } = await supa.from("likes").delete().eq("id", existing.id);
      if (error) {
        console.error(error);
        return;
      }

      postObj.likes_count = Math.max(0, (postObj.likes_count || 0) - 1);
      likeBtnLocal.classList.remove("liked");
      likeBtnLocal.textContent = "🤍";
    } else {
      // curtir
      const { error } = await supa
        .from("likes")
        .insert({ post_id: postObj.id, user_id: currentUser.id });
      if (error) {
        console.error(error);
        return;
      }

      postObj.likes_count = (postObj.likes_count || 0) + 1;
      likeBtnLocal.classList.add("liked");
      likeBtnLocal.textContent = "❤️";

      if (showAnimation) criarAnimacaoCurtida(containerForAnim, true);
    }

    likesSpanLocal.textContent = postObj.likes_count + " curtidas";
  }

  likeBtn.addEventListener("click", async () => await handleLike(post, postEl, visualContainer, false));

  // COMMENTS
  const commentsCountSpan = postEl.querySelector(".comments-count");
  const commentBtn = postEl.querySelector(".comment-btn");

  commentBtn.addEventListener("click", () => input.focus());

  await carregarComentariosRecentes(post.id, ul, seeMoreContainer, post);

  async function enviarComentario() {
    const text = input.value.trim();
    if (!text) return;

    sendBtn.disabled = true;
    sendBtn.style.opacity = "0.7";
    sendBtn.style.pointerEvents = "none";

    try {
      const { error } = await supa
        .from("comments")
        .insert({ post_id: post.id, user_id: currentUser.id, content: text });

      if (error) throw error;

      input.value = "";
      post.comments_count = (post.comments_count || 0) + 1;
      commentsCountSpan.textContent = post.comments_count + " comentários";

      await carregarComentariosRecentes(post.id, ul, seeMoreContainer, post);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Erro ao comentar.");
    } finally {
      sendBtn.disabled = false;
      sendBtn.style.opacity = "1";
      sendBtn.style.pointerEvents = "auto";
    }
  }

  sendBtn.addEventListener("click", enviarComentario);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") enviarComentario();
  });

  return postEl;
}

// ----------------- Comments helpers -----------------
async function carregarComentariosRecentes(postId, ul, seeMoreContainer, postObj) {
  ul.innerHTML = "";
  seeMoreContainer.innerHTML = "";

  // carrega últimos 3
  const { data: comments, error } = await supa
    .from("comments")
    .select("id, content, created_at, user_id")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error(error);
    return;
  }

  const list = Array.isArray(comments) ? comments.slice().reverse() : [];

  for (const c of list) {
    ul.appendChild(renderCommentItem(c, postId, postObj));
  }

  // total count
  const { count: totalCount } = await supa
    .from("comments")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  const total = totalCount ?? postObj.comments_count ?? 0;

  if (total > 3) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `Ver mais comentários (${total - 3})`;
    btn.className = "btn-see-more";
    btn.addEventListener("click", async () => {
      await abrirListaCompletaComentarios(postId, ul, seeMoreContainer, postObj);
    });
    seeMoreContainer.appendChild(btn);
  }
}

async function abrirListaCompletaComentarios(postId, ul, seeMoreContainer, postObj) {
  ul.innerHTML = "";
  seeMoreContainer.innerHTML = "";

  const { data: comments, error } = await supa
    .from("comments")
    .select("id, content, created_at, user_id")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const list = Array.isArray(comments) ? comments : [];
  list.forEach((c) => ul.appendChild(renderCommentItem(c, postId, postObj)));
}

function renderCommentItem(comment, postId, postObj) {
  const li = document.createElement("li");

  const left = document.createElement("div");
  left.style.display = "flex";
  left.style.flexDirection = "column";
  left.style.gap = "2px";

  const name = document.createElement("div");
  name.style.fontWeight = "900";
  name.style.fontSize = "13px";
  name.style.color = "var(--text-primary)";
  name.textContent = profilesMap[comment.user_id] || "Usuário";

  const content = document.createElement("div");
  content.style.fontSize = "14px";
  content.style.color = "var(--text-secondary)";
  content.style.whiteSpace = "pre-wrap";
  content.textContent = comment.content;

  left.appendChild(name);
  left.appendChild(content);

  li.appendChild(left);

  // Ações de editar/excluir comentário (somente admin)
  const isAdmin = currentProfile?.role === "admin";
  if (isAdmin) {
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.marginLeft = "auto";

    const editBtn = makeIconButton({ title: "Editar comentário", icon: "x" });
    editBtn.textContent = "✎";
    editBtn.style.fontSize = "14px";
    editBtn.style.width = "32px";
    editBtn.style.height = "32px";

    const delBtn = makeIconButton({ title: "Excluir comentário", variant: "danger", icon: "trash" });

    editBtn.addEventListener("click", async () => {
      const novo = prompt("Editar comentário:", comment.content);
      if (novo === null) return;
      const txt = novo.trim();
      if (!txt) return;

      try {
        const { error } = await supa.from("comments").update({ content: txt }).eq("id", comment.id);
        if (error) throw error;
        await carregarFeed();
      } catch (e) {
        console.error(e);
        alert(e?.message || "Erro ao editar comentário.");
      }
    });

    delBtn.addEventListener("click", async () => {
      const ok = confirm("Excluir este comentário?");
      if (!ok) return;

      try {
        const { error } = await supa.from("comments").delete().eq("id", comment.id);
        if (error) throw error;

        postObj.comments_count = Math.max(0, (postObj.comments_count || 0) - 1);
        await carregarFeed();
      } catch (e) {
        console.error(e);
        alert(e?.message || "Erro ao excluir comentário.");
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    li.appendChild(actions);
  }

  return li;
}

// ----------------- Botão + / File input -----------------
function abrirGaleria() {
  if (!currentProfile || currentProfile.role !== "admin") return;
  openChoiceModal();
};

fileInput?.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  pendingFile = file;

  const reader = new FileReader();
  reader.onload = () => {
    // Post com imagem: mostra a área de prévia e carrega a imagem
    setPreviewVisible(true);
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

  // Fecha sempre sem deixar "imagem quebrada" no próximo abrir (principalmente no modo sem imagem)
  setPreviewVisible(false);

  if (captionInput) captionInput.value = "";
}

closeModal?.addEventListener("click", fecharModal);
cancelPost?.addEventListener("click", fecharModal);

postModal?.addEventListener("click", (e) => {
  if (e.target === postModal) fecharModal();
});

publishPost?.addEventListener("click", async () => {
  if (!currentProfile || currentProfile.role !== "admin") return;

  const caption = captionInput?.value?.trim() || "";

  // sem imagem exige texto
  if (!pendingFile && !caption) {
    alert("Digite uma mensagem para publicar sem imagem.");
    captionInput?.focus();
    return;
  }

  publishPost.disabled = true;
  publishPost.style.opacity = "0.7";
  publishPost.style.pointerEvents = "none";

  try {
    // COM IMAGEM
    if (pendingFile) {
      const ext = (pendingFile.name.split(".").pop() || "jpg").toLowerCase();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const filePath = `${currentUser.id}/${fileName}`;

      const { error: upErr } = await supa.storage
        .from("posts")
        .upload(filePath, pendingFile, { upsert: false });

      if (upErr) throw upErr;

      const { error: insErr } = await supa
        .from("posts")
        .insert({ user_id: currentUser.id, caption, image_url: filePath });

      if (insErr) throw insErr;
    }
    // SEM IMAGEM
    else {
      const { error: insErr } = await supa
        .from("posts")
        .insert({ user_id: currentUser.id, caption, image_url: null });

      if (insErr) throw insErr;
    }

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

// Fechar modais com tecla ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (likesModal?.classList?.contains("show")) fecharModalCurtidas();
    if (postModal?.classList?.contains("show")) fecharModal();
  }
});

// Observar mudanças de tema para atualizar elementos dinâmicos
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.attributeName === "data-theme") {
      applyThemeToDynamicElements();
    }
  });
});

observer.observe(document.documentElement, { attributes: true });

// ----------------- Init -----------------
(async function init() {
  try {
    initTheme();
    await requireAuth();
    await loadProfile();
    await loadProfilesMap();
    await carregarFeed();
  } catch (e) {
    console.error(e);
    alert(e?.message || "Erro ao iniciar o feed.");
  }
})();

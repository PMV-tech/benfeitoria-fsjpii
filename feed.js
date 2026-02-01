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
const previewWrap = document.querySelector("#postModal .modal-preview");

function setPreviewVisible(visible) {
  if (previewWrap) previewWrap.style.display = visible ? "" : "none";
  if (!visible && previewImg) {
    previewImg.removeAttribute("src");
    previewImg.src = "";
  }
}

// Evita aparecer ícone de imagem quebrada ao abrir o modal sem foto
setPreviewVisible(false);
const captionInput = document.getElementById("captionInput");
const publishPost = document.getElementById("publishPost");
const cancelPost = document.getElementById("cancelPost");
const closeModal = document.getElementById("closeModal");

// Modal de curtidas
const likesModal = document.getElementById("likesModal");
const closeLikesModal = document.getElementById("closeLikesModal");
const likesList = document.getElementById("likesList");

// Sidebars
const miniProfileName = document.getElementById("miniProfileName");
const miniProfileRole = document.getElementById("miniProfileRole");
const adminShortcuts = document.getElementById("adminShortcuts");
const btnNewPinned = document.getElementById("btnNewPinned");

const pinnedList = document.getElementById("pinnedList");
const pinnedEmpty = document.getElementById("pinnedEmpty");
const activityList = document.getElementById("activityList");
const activityEmpty = document.getElementById("activityEmpty");

// Botão +
const addPostBtn = document.querySelector(".add-post");

let pendingFile = null;
let forcePinOnPublish = false; // usado pelo atalho 'Novo aviso fixado'
let currentUser = null;
let currentProfile = null;
let editingCommentId = null;

// Feature flags (tabelas/colunas opcionais)
let hasPinnedColumn = true;

// Map de perfis (para nome de autor)
let profilesMap = {}; // id -> full_name

// Quantos comentários aparecem no feed antes do botão "ver mais"
const COMMENT_PREVIEW_LIMIT = 2;

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

// Scrollbar dourada nos modais de comentários (igual ao resto do app)
function ensureGoldScrollbars() {
  if (document.getElementById("goldScrollbars")) return;

  const style = document.createElement("style");
  style.id = "goldScrollbars";
  style.textContent = `
    /* WebKit */
    .comments-modal-card .comments-modal-list::-webkit-scrollbar {
      width: 10px;
    }
    .comments-modal-card .comments-modal-list::-webkit-scrollbar-track {
      background: transparent;
    }
    .comments-modal-card .comments-modal-list::-webkit-scrollbar-thumb {
      background: rgba(212, 175, 55, 0.55);
      border-radius: 999px;
      border: 2px solid transparent;
      background-clip: content-box;
    }
    .comments-modal-card .comments-modal-list::-webkit-scrollbar-thumb:hover {
      background: rgba(212, 175, 55, 0.75);
      background-clip: content-box;
    }

    /* Firefox */
    .comments-modal-card .comments-modal-list {
      scrollbar-color: rgba(212, 175, 55, 0.65) transparent;
      scrollbar-width: thin;
    }
  `;
  document.head.appendChild(style);
}

// ----------------- Helpers UI -----------------
function setTopbarTitle() {
  const isAdmin = currentProfile?.role === "admin";
  if (topbarTitle) topbarTitle.textContent = isAdmin ? "FSJPII • Admin" : "FSJPII";
  document.title = isAdmin ? "Feed | Admin FSJPII" : "Feed | FSJPII";

  // Sidebars
  if (miniProfileName) miniProfileName.textContent = currentProfile?.full_name || "Usuário";
  if (miniProfileRole) miniProfileRole.textContent = isAdmin ? "Admin" : "Membro";
  if (adminShortcuts) adminShortcuts.style.display = isAdmin ? "" : "none";
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
        <path d="M6 9h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 9Z"
          fill="currentColor" opacity="0.7"/>
        <path d="M10 12v7M14 12v7" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
      </svg>
    `;
  } else if (icon === "edit") {
    svg.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 21H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M17 3L21 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M14 6L4 16V20H8L18 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  } else if (icon === "check") {
    svg.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  svg.style.color = isDarkMode ? "#ffffff" : "#222222";
  btn.appendChild(svg);

  if (variant === "danger") {
    btn.style.borderColor = "rgba(255, 80, 120, 0.25)";
  }

  btn.addEventListener("mouseenter", () => {
    btn.style.background = hoverBg;
    btn.style.transform = "translateY(-1px)";
    btn.style.borderColor = variant === "danger" ? "rgba(255, 80, 120, 0.45)" : hoverBorder;
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = bg;
    btn.style.transform = "translateY(0)";
    btn.style.borderColor = variant === "danger" ? "rgba(255, 80, 120, 0.25)" : border;
  });

  return btn;
}

// Storage (bucket public)
function getPublicImageUrl(path) {
  const { data } = supa.storage.from("posts").getPublicUrl(path);
  return data?.publicUrl || "";
}

// ----------------- Modal: escolher post com/sem imagem -----------------
let choiceModal = null;

function ensureChoiceModal() {
  if (choiceModal) return choiceModal;

  choiceModal = document.createElement("div");
  choiceModal.id = "choiceModal";
  choiceModal.style.position = "fixed";
  choiceModal.style.inset = "0";
  choiceModal.style.background = "rgba(0,0,0,0.55)";
  choiceModal.style.backdropFilter = "blur(8px)";
  choiceModal.style.display = "none";
  choiceModal.style.alignItems = "center";
  choiceModal.style.justifyContent = "center";
  choiceModal.style.zIndex = "10001";
  choiceModal.style.padding = "20px";

  const card = document.createElement("div");
  card.style.width = "100%";
  card.style.maxWidth = "420px";
  card.style.background = "var(--bg-card)";
  card.style.border = "1px solid var(--border-color)";
  card.style.borderRadius = "18px";
  card.style.padding = "18px";
  card.style.boxShadow = "0 20px 60px rgba(0,0,0,0.35)";

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
  forcePinOnPublish = false;

    // Sem imagem: esconde a área de prévia (não deixa ícone quebrado)
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

// ----------------- Função para abrir modal com quem curtiu -----------------
async function abrirModalCurtidas(postId, postEl = null) {
  likesList.innerHTML = `
    <div class="likes-empty">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Carregando curtidas...</p>
    </div>
  `;

  likesModal.classList.add("show");
  likesModal.setAttribute("aria-hidden", "false");

  try {
    const { data: likes, error } = await supa
      .from("likes")
      .select(
        `
        created_at,
        user_id,
        profiles:profiles (
          full_name
        )
      `
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    console.log(`Curtidas carregadas: ${likes?.length || 0}`, likes);

    // Ajuste contador se discrepância (opcional)
    if (postEl) {
      const likesSpan = postEl.querySelector(".likes");
      if (likesSpan) {
        const currentDisplayCount = parseInt(likesSpan.textContent.split(" ")[0]) || 0;
        const actualCount = likes?.length || 0;
        if (currentDisplayCount !== actualCount) {
          likesSpan.textContent = actualCount + " curtidas";
        }
      }
    }

    if (!likes || likes.length === 0) {
      likesList.innerHTML = `
        <div class="likes-empty">
          <i class="far fa-heart"></i>
          <p>Ninguém curtiu ainda</p>
          <small>Seja o primeiro a curtir!</small>
        </div>
      `;
      return;
    }

    const header = document.createElement("div");
    header.className = "likes-count-header";
    header.textContent = `${likes.length} ${likes.length === 1 ? "curtida" : "curtidas"}`;

    const usersList = document.createElement("div");

    likes.forEach((like) => {
      const userDiv = document.createElement("div");
      userDiv.className = "like-user";

      const avatarDiv = document.createElement("div");
      avatarDiv.className = "like-user-avatar";

      let userName = "Usuário";
      let initials = "U";
      const isCurrentUser = like.user_id === currentUser?.id;

      if (like.profiles && like.profiles.full_name) {
        userName = like.profiles.full_name;
        initials = userName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
      } else if (isCurrentUser && currentProfile?.full_name) {
        userName = currentProfile.full_name;
        initials = userName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
      } else {
        userName = "Usuário";
        initials = "U";
      }

      if (isCurrentUser) userName += " (Você)";

      avatarDiv.textContent = initials;
      avatarDiv.title = userName;

      const infoDiv = document.createElement("div");

      const nameDiv = document.createElement("div");
      nameDiv.className = "like-user-name";
      nameDiv.textContent = userName;

      const dateDiv = document.createElement("div");
      dateDiv.className = "like-user-date";
      dateDiv.textContent = `Curtiu em ${fmtDateBR(like.created_at)}`;

      infoDiv.appendChild(nameDiv);
      infoDiv.appendChild(dateDiv);

      userDiv.appendChild(avatarDiv);
      userDiv.appendChild(infoDiv);

      usersList.appendChild(userDiv);
    });

    likesList.innerHTML = "";
    likesList.appendChild(header);
    likesList.appendChild(usersList);
  } catch (error) {
    console.error("Erro ao carregar curtidas:", error);
    likesList.innerHTML = `
      <div class="likes-empty">
        <i class="fas fa-exclamation-circle"></i>
        <p>Erro ao carregar curtidas</p>
        <small>Tente novamente mais tarde</small>
      </div>
    `;
  }
}

// Fechar modal de curtidas
function fecharModalCurtidas() {
  likesModal.classList.remove("show");
  likesModal.setAttribute("aria-hidden", "true");
}

closeLikesModal?.addEventListener("click", fecharModalCurtidas);

likesModal?.addEventListener("click", (e) => {
  if (e.target === likesModal) fecharModalCurtidas();
});

// ----------------- Auth / Perfil -----------------
// ----------------- Detect feature support -----------------
async function detectPinnedSupport() {
  // Detecta se existe coluna "pinned" em posts (evita quebrar caso o SQL ainda não tenha sido aplicado)
  try {
    const { error } = await supa.from("posts").select("id, pinned").limit(1);
    if (error) throw error;
    hasPinnedColumn = true;
  } catch (e) {
    hasPinnedColumn = false;
  }
}

async function loadPinnedSidebar() {
  if (!pinnedList || !pinnedEmpty) return;

  pinnedList.innerHTML = "";
  pinnedEmpty.style.display = "none";

  if (!hasPinnedColumn) {
    pinnedEmpty.textContent = "Para usar avisos fixados, adicione a coluna 'pinned' na tabela posts.";
    pinnedEmpty.style.display = "";
    return;
  }

  const { data, error } = await supa
    .from("posts")
    .select("id, caption, image_url, created_at, user_id, pinned")
    .eq("pinned", true)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error(error);
    pinnedEmpty.textContent = "Erro ao carregar avisos fixados.";
    pinnedEmpty.style.display = "";
    return;
  }

  const list = Array.isArray(data) ? data : [];
  if (!list.length) {
    pinnedEmpty.textContent = "Nenhum aviso fixado ainda.";
    pinnedEmpty.style.display = "";
    return;
  }

  list.forEach((p) => {
    const item = document.createElement("div");
    item.className = "side-item";
    item.dataset.postId = p.id;

    const title = document.createElement("div");
    title.className = "side-item-title";
    title.textContent = profilesMap[p.user_id] || "Usuário";

    const sub = document.createElement("div");
    sub.className = "side-item-sub";
    sub.textContent = (p.caption || "").replace(/\s+/g, " ").trim() || "(sem texto)";

    item.appendChild(title);
    item.appendChild(sub);

    item.addEventListener("click", () => {
      const target = document.querySelector(`.post[data-post-id="${p.id}"]`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("pulse-highlight");
        setTimeout(() => target.classList.remove("pulse-highlight"), 1200);
      }
    });

    pinnedList.appendChild(item);
  });
}

async function loadActivitySidebar() {
  if (!activityList || !activityEmpty) return;

  activityList.innerHTML = "";
  activityEmpty.style.display = "none";

  const { data, error } = await supa
    .from("comments")
    .select("id, post_id, user_id, content, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error(error);
    activityEmpty.textContent = "Erro ao carregar atividade.";
    activityEmpty.style.display = "";
    return;
  }

  const list = Array.isArray(data) ? data : [];
  if (!list.length) {
    activityEmpty.textContent = "Sem atividade recente.";
    activityEmpty.style.display = "";
    return;
  }

  list.forEach((c) => {
    const item = document.createElement("div");
    item.className = "side-item";
    item.dataset.postId = c.post_id;

    const title = document.createElement("div");
    title.className = "side-item-title";
    title.textContent = profilesMap[c.user_id] || "Usuário";

    const sub = document.createElement("div");
    sub.className = "side-item-sub";
    sub.textContent = (c.content || "").replace(/\s+/g, " ").trim() || "(comentário)";

    item.appendChild(title);
    item.appendChild(sub);

    item.addEventListener("click", () => {
      const target = document.querySelector(`.post[data-post-id="${c.post_id}"]`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("pulse-highlight");
        setTimeout(() => target.classList.remove("pulse-highlight"), 1200);
      }
    });

    activityList.appendChild(item);
  });
}

// Atalho: criar aviso fixado (admin)
btnNewPinned?.addEventListener("click", () => {
  if (currentProfile?.role !== "admin") return;
  forcePinOnPublish = true;
  pendingFile = null;
  // abre modal sem imagem, sem prévia
  if (previewWrap) previewWrap.style.display = "none";
  if (previewImg) { previewImg.removeAttribute("src"); previewImg.src = ""; }
  if (captionInput) captionInput.value = "";
  postModal?.classList.add("show");
  postModal?.setAttribute("aria-hidden", "false");
  setTimeout(() => captionInput?.focus(), 50);
});

async function init() {
  const {
    data: { session },
  } = await supa.auth.getSession();

  if (!session) {
    window.location.href = "index.html";
    return;
  }

  currentUser = session.user;

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

  await detectPinnedSupport();

  applyThemeToDynamicElements();
  await carregarFeed();
  await loadPinnedSidebar();
  await loadActivitySidebar();
}

init();

// ----------------- Feed -----------------
async function carregarFeed() {
  feed.innerHTML = "";

  // Carrega posts direto da tabela (evita depender de views como v_feed)
  let query = supa
    .from("posts")
    .select("id, user_id, caption, image_url, created_at" + (hasPinnedColumn ? ", pinned" : ""));

  if (hasPinnedColumn) {
    query = query.order("pinned", { ascending: false }).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: posts, error } = await query.limit(50);

  if (error) {
    console.error(error);
    alert("Erro ao carregar feed.");
    return;
  }

  // Carrega nomes (profiles) para autores presentes na lista
  const userIds = [...new Set((posts || []).map((p) => p.user_id).filter(Boolean))];
  profilesMap = {};

  if (userIds.length) {
    const { data: profs, error: profErr } = await supa
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (profErr) {
      console.warn("Não consegui carregar nomes de profiles (provável RLS):", profErr);
    } else {
      profilesMap = Object.fromEntries((profs || []).map((p) => [p.id, p.full_name]));
    }
  }

  // Prepara posts com contagens (likes/comments) antes de renderizar
  for (const post of posts || []) {
    post.author_name = post.author_name || profilesMap[post.user_id] || "Usuário";

    // Curtidas
    const { count: likesCount } = await supa
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", post.id);

    // Comentários
    const { count: commentsCount } = await supa
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", post.id);

    post.likes_count = likesCount ?? 0;
    post.comments_count = commentsCount ?? 0;

    const card = await renderPost(post);
    feed.appendChild(card);
  }

  applyThemeToDynamicElements();
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



// ----------------- Comentários: likes e respostas -----------------
// Requer no Supabase:
// - coluna comments.parent_comment_id (uuid, nullable) para respostas
// - tabela comment_likes (comment_id, user_id) para curtidas em comentário
async function safeSelectTopLevelComments(postId, ascending, limit) {
  // tenta com parent_comment_id; se a coluna não existir, cai para "tudo"
  let q = supa
    .from("comments")
    .select("id, content, created_at, user_id, parent_comment_id, profiles:profiles(full_name)")
    .eq("post_id", postId);

  try {
    q = q.is("parent_comment_id", null);
  } catch (_) {}

  q = q.order("created_at", { ascending: !!ascending });
  if (typeof limit === "number") q = q.limit(limit);

  let { data, error } = await q;
  if (error && String(error.message || "").toLowerCase().includes("parent_comment_id")) {
    // retry sem parent_comment_id
    const retry = await supa
      .from("comments")
      .select("id, content, created_at, user_id, profiles:profiles(full_name)")
      .eq("post_id", postId)
      .order("created_at", { ascending: !!ascending })
      .limit(typeof limit === "number" ? limit : 1000);
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  return data || [];
}

async function safeCountReplies(rootCommentId) {
  try {
    const { count, error } = await supa
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("parent_comment_id", rootCommentId);
    if (error) throw error;
    return count ?? 0;
  } catch (e) {
    return 0;
  }
}

async function safeFetchReplies(rootCommentId) {
  try {
    const { data, error } = await supa
      .from("comments")
      .select("id, content, created_at, user_id, parent_comment_id, profiles:profiles(full_name)")
      .eq("parent_comment_id", rootCommentId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
}

async function safeGetCommentLikeState(commentId) {
  let count = 0;
  let liked = false;

  try {
    const r1 = await supa
      .from("comment_likes")
      .select("*", { count: "exact", head: true })
      .eq("comment_id", commentId);
    if (!r1.error) count = r1.count ?? 0;
  } catch (_) {}

  try {
    const r2 = await supa
      .from("comment_likes")
      .select("id")
      .eq("comment_id", commentId)
      .eq("user_id", currentUser?.id)
      .maybeSingle();
    if (!r2.error) liked = !!r2.data;
  } catch (_) {}

  return { count, liked };
}

async function safeToggleCommentLike(commentId) {
  // retorna {count, liked} atualizado
  try {
    const existing = await supa
      .from("comment_likes")
      .select("id")
      .eq("comment_id", commentId)
      .eq("user_id", currentUser?.id)
      .maybeSingle();

    if (existing?.data?.id) {
      await supa.from("comment_likes").delete().eq("id", existing.data.id);
    } else {
      await supa.from("comment_likes").insert({ comment_id: commentId, user_id: currentUser?.id });
    }
  } catch (_) {}

  return await safeGetCommentLikeState(commentId);
}

function makeInlineActionButton(label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.style.background = "none";
  btn.style.border = "none";
  btn.style.padding = "0";
  btn.style.margin = "0";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "12px";
  btn.style.fontWeight = "800";
  btn.style.color = "var(--text-muted)";
  btn.style.opacity = "0.9";
  btn.style.transition = "opacity .15s ease";
  btn.addEventListener("mouseenter", () => (btn.style.opacity = "1"));
  btn.addEventListener("mouseleave", () => (btn.style.opacity = "0.9"));
  return btn;
}

// Função para criar animação de coração
function criarAnimacaoCurtida(container, isLiked) {
  if (!container) return;

  const heart = document.createElement("div");
  heart.innerHTML = isLiked ? "❤️" : "🤍";
  heart.style.position = "absolute";
  heart.style.fontSize = "70px";
  heart.style.opacity = "1";
  heart.style.transform = "translate(-50%, -50%) scale(1)";
  heart.style.transition = "all 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55)";
  heart.style.pointerEvents = "none";
  heart.style.top = "50%";
  heart.style.left = "50%";
  heart.style.zIndex = "100";
  heart.style.textShadow = isLiked
    ? "0 0 20px rgba(255, 0, 0, 0.8), 0 0 40px rgba(255, 0, 0, 0.6)"
    : "0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.6)";
  heart.style.filter = "drop-shadow(0 0 10px currentColor)";

  container.appendChild(heart);

  setTimeout(() => {
    heart.style.opacity = "0.9";
    heart.style.transform = "translate(-50%, -150%) scale(1.2)";
  }, 50);

  setTimeout(() => {
    heart.style.opacity = "0";
    heart.style.transform = "translate(-50%, -250%) scale(0.5)";
    setTimeout(() => {
      if (heart.parentNode) heart.parentNode.removeChild(heart);
    }, 800);
  }, 500);
}

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
  header.style.padding = "12px 12px 0";

  const left = document.createElement("div");
  left.style.display = "flex";
  left.style.flexDirection = "column";
  left.style.gap = "2px";

  const author = document.createElement("div");
  author.style.fontWeight = "800";
  author.style.fontSize = "14px";
  author.style.color = "var(--text-primary)";
  author.textContent = post.author_name || profilesMap[post.user_id] || "Usuário";

  const date = document.createElement("div");
  date.style.fontSize = "12px";
  date.style.color = "var(--text-muted)";
  date.textContent = fmtDateBR(post.created_at);

  left.appendChild(author);
  left.appendChild(date);

  header.appendChild(left);

  // Container de ações (para manter 📍/📌 ao lado da lixeira)
  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.gap = "8px";
  right.style.alignItems = "center";

  // Ações do post (admin)
  if (isAdmin) {
    // Fixar/desafixar (se suporte disponível)
    if (hasPinnedColumn) {
      const pinBtn = makeIconButton({ title: post.pinned ? "Desafixar" : "Fixar" });
      pinBtn.textContent = post.pinned ? "📌" : "📍";
      pinBtn.style.fontSize = "16px";
      pinBtn.style.width = "34px";
      pinBtn.style.height = "34px";

      pinBtn.addEventListener("click", async () => {
        try {
          const next = !post.pinned;
          const { error } = await supa.from("posts").update({ pinned: next }).eq("id", post.id);
          if (error) throw error;
          post.pinned = next;
          await carregarFeed();
          await loadPinnedSidebar();
          // Leva o post fixado para o topo/visível
          setTimeout(() => {
            const el = document.querySelector(`.post[data-post-id="${post.id}"]`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 80);
        } catch (e) {
          console.error(e);
          alert(e?.message || "Erro ao fixar/desafixar.");
        }
      });

      right.appendChild(pinBtn);
    }

    const delPostBtn = makeIconButton({ title: "Excluir post", variant: "danger" });
    delPostBtn.addEventListener("click", async () => {
      const ok = confirm("Excluir este post? Isso remove o post e a imagem (se houver).");
      if (!ok) return;

      delPostBtn.disabled = true;
      delPostBtn.style.opacity = "0.6";
      delPostBtn.style.pointerEvents = "none";

      try {
        if (post.image_url) {
          const { error: stErr } = await supa.storage.from("posts").remove([post.image_url]);
          if (stErr) console.warn("Falha ao remover imagem do storage:", stErr);
        }

        const { error: dbErr } = await supa.from("posts").delete().eq("id", post.id);
        if (dbErr) throw dbErr;

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

    right.appendChild(delPostBtn);
  } else {
    const spacer = document.createElement("div");
    spacer.style.width = "34px";
    spacer.style.height = "34px";
    header.appendChild(spacer);
  }

  header.appendChild(right);

  postEl.appendChild(header);

  // Espaço
  const space = document.createElement("div");
  space.style.height = "12px";
  postEl.appendChild(space);

  // Conteúdo visual (imagem ou placeholder)
  let visualContainer = null;
  let imgUrl = "";

  if (hasImage) {
    imgUrl = getPublicImageUrl(post.image_url);

    const imgContainer = document.createElement("div");
    imgContainer.style.position = "relative";
    imgContainer.style.cursor = "pointer";
    imgContainer.style.overflow = "hidden";
    imgContainer.style.width = "100%";
    imgContainer.style.height = "auto";
    imgContainer.style.userSelect = "none";

    const img = document.createElement("img");
    img.src = imgUrl;
    img.alt = "Post";
    img.style.width = "100%";
    img.style.display = "block";
    img.style.maxHeight = "520px";
    img.style.objectFit = "cover";
    img.style.background = "var(--bg-secondary)";
    img.style.transition = "transform 0.3s ease";
    img.style.userSelect = "none";
    img.style.pointerEvents = "none";

    const overlay = document.createElement("div");
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
    // Post sem imagem: não renderiza placeholder/emoji (fica só o texto da legenda)
    visualContainer = postEl;
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
  likesSpan.addEventListener("click", async (e) => {
    e.stopPropagation();
    await abrirModalCurtidas(post.id, postEl);
  });

  likesSpan.addEventListener("mouseenter", () => {
    likesSpan.style.opacity = "0.8";
    likesSpan.style.textDecoration = "underline";
  });

  likesSpan.addEventListener("mouseleave", () => {
    likesSpan.style.opacity = "1";
    likesSpan.style.textDecoration = "none";
  });

  // Caption
  const caption = document.createElement("p");
  caption.textContent = post.caption || "";
  postEl.appendChild(caption);

  // Comments
  const commentsWrap = document.createElement("div");
  commentsWrap.className = "comments";

  // Estado de resposta (para "Responder")
  let replyToCommentId = null;
  let replyToName = null;

  const replyBanner = document.createElement("div");
  replyBanner.style.display = "none";
  replyBanner.style.margin = "10px 0 8px";
  replyBanner.style.padding = "10px 12px";
  replyBanner.style.borderRadius = "14px";
  replyBanner.style.border = "1px solid var(--border-color)";
  replyBanner.style.background = "var(--bg-secondary)";
  replyBanner.style.color = "var(--text-primary)";
  replyBanner.style.fontSize = "12px";
  replyBanner.style.display = "none";
  replyBanner.style.alignItems = "center";
  replyBanner.style.justifyContent = "space-between";
  replyBanner.style.gap = "10px";

  const replyBannerText = document.createElement("div");
  replyBannerText.style.fontWeight = "800";
  const replyBannerCancel = makeIconButton({ title: "Cancelar resposta", icon: "x" });
  replyBannerCancel.style.width = "30px";
  replyBannerCancel.style.height = "30px";
  replyBannerCancel.addEventListener("click", () => {
    replyToCommentId = null;
    replyToName = null;
    replyBanner.style.display = "none";
    if (input) input.placeholder = "Adicionar um comentário...";
  });

  replyBanner.appendChild(replyBannerText);
  replyBanner.appendChild(replyBannerCancel);


  const inputRow = document.createElement("div");
  inputRow.style.display = "flex";
  inputRow.style.gap = "10px";
  inputRow.style.alignItems = "center";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Adicionar um comentário...";
  input.style.color = "var(--text-primary)";
  input.style.backgroundColor = "var(--input-bg)";
  input.style.borderColor = "var(--border-color)";
  inputRow.appendChild(input);

  const sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.setAttribute("aria-label", "Enviar comentário");
  sendBtn.textContent = "➤";
  sendBtn.style.width = "40px";
  sendBtn.style.height = "36px";
  sendBtn.style.borderRadius = "10px";
  sendBtn.style.border = "1px solid var(--border-color)";
  sendBtn.style.background = "var(--button-bg)";
  sendBtn.style.color = "var(--text-primary)";
  sendBtn.style.cursor = "pointer";
  sendBtn.style.transition = "background .15s ease, transform .15s ease";
  sendBtn.addEventListener("mouseenter", () => {
    sendBtn.style.background = "var(--button-hover)";
    sendBtn.style.transform = "translateY(-1px)";
  });
  sendBtn.addEventListener("mouseleave", () => {
    sendBtn.style.background = "var(--button-bg)";
    sendBtn.style.transform = "translateY(0)";
  });

  inputRow.appendChild(sendBtn);

  const ul = document.createElement("ul");

  const seeMoreContainer = document.createElement("div");
  seeMoreContainer.style.marginTop = "10px";
  seeMoreContainer.style.display = "none";

  const seeMoreBtn = document.createElement("button");
  seeMoreBtn.type = "button";
  seeMoreBtn.className = "see-more-comments";
  seeMoreBtn.textContent = "Ver mais comentários";
  seeMoreBtn.style.width = "100%";
  seeMoreBtn.style.padding = "10px";
  seeMoreBtn.style.borderRadius = "10px";
  seeMoreBtn.style.border = "1px solid var(--border-color)";
  seeMoreBtn.style.background = "var(--button-bg)";
  seeMoreBtn.style.color = "var(--text-primary)";
  seeMoreBtn.style.cursor = "pointer";
  seeMoreBtn.style.fontSize = "14px";
  seeMoreBtn.style.fontWeight = "600";
  seeMoreBtn.style.transition = "all 0.2s ease";

  seeMoreBtn.addEventListener("mouseenter", () => {
    seeMoreBtn.style.background = "var(--button-hover)";
    seeMoreBtn.style.transform = "translateY(-1px)";
  });

  seeMoreBtn.addEventListener("mouseleave", () => {
    seeMoreBtn.style.background = "var(--button-bg)";
    seeMoreBtn.style.transform = "translateY(0)";
  });

  seeMoreBtn.addEventListener("click", () => {
    abrirModalComentarios(post.id, post.comments_count);
  });

  seeMoreContainer.appendChild(seeMoreBtn);

  commentsWrap.appendChild(replyBanner);
  commentsWrap.appendChild(inputRow);
  commentsWrap.appendChild(ul);
  commentsWrap.appendChild(seeMoreContainer);
  postEl.appendChild(commentsWrap);

  // LIKE
  const likeBtn = postEl.querySelector(".like-btn");

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

  // Tela cheia (apenas se tem imagem)
  function abrirImagemTelaCheia(url, imgContainerRef) {
    const modal = document.createElement("div");
    modal.className = "fullscreen-modal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100vw";
    modal.style.height = "100vh";
    modal.style.backgroundColor = "rgba(0,0,0,0.95)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "9999";
    modal.style.cursor = "pointer";
    modal.style.backdropFilter = "blur(10px)";

    const fullscreenImg = document.createElement("img");
    fullscreenImg.src = url;
    fullscreenImg.style.maxWidth = "90vw";
    fullscreenImg.style.maxHeight = "90vh";
    fullscreenImg.style.objectFit = "contain";
    fullscreenImg.style.borderRadius = "10px";
    fullscreenImg.style.cursor = "default";
    fullscreenImg.style.userSelect = "none";
    fullscreenImg.style.pointerEvents = "none";

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

  // Função de curtir reutilizável
  async function handleLike(postObj, postElement, containerForAnim = null, showAnimation = false) {
    if (!currentUser) return;

    const likeBtnLocal = postElement.querySelector(".like-btn");
    const likesSpanLocal = postElement.querySelector(".likes");
    const alreadyLiked = likeBtnLocal.classList.contains("liked");

    if (alreadyLiked) {
      const { error } = await supa
        .from("likes")
        .delete()
        .eq("post_id", postObj.id)
        .eq("user_id", currentUser.id);

      if (error) {
        console.error(error);
        alert("Erro ao remover curtida.");
        return;
      }

      likeBtnLocal.classList.remove("liked");
      likeBtnLocal.textContent = "🤍";
      postObj.likes_count = Math.max(0, postObj.likes_count - 1);

      if (showAnimation) criarAnimacaoCurtida(containerForAnim, false);
    } else {
      const { error } = await supa
        .from("likes")
        .insert({ post_id: postObj.id, user_id: currentUser.id });

      if (error) {
        console.error(error);
        alert("Erro ao curtir.");
        return;
      }

      likeBtnLocal.classList.add("liked");
      likeBtnLocal.textContent = "❤️";
      postObj.likes_count += 1;

      if (showAnimation) criarAnimacaoCurtida(containerForAnim, true);
    }

    likesSpanLocal.textContent = postObj.likes_count + " curtidas";
  }

  likeBtn.addEventListener("click", async () => await handleLike(post, postEl, visualContainer, false));

  // COMMENTS
  const commentsCountSpan = postEl.querySelector(".comments-count");
  const commentBtn = postEl.querySelector(".comment-btn");

  commentBtn.addEventListener("click", () => input.focus());

  const previewControls = {
    setReplyTarget: (commentId, name) => {
      replyToCommentId = commentId;
      replyToName = name;
      replyBannerText.textContent = `Respondendo a ${replyToName}`;
      replyBanner.style.display = "flex";
      input.placeholder = `Responder para ${replyToName}...`;
      setTimeout(() => input.focus(), 20);
    },
  };

  await carregarComentariosRecentes(post.id, ul, seeMoreContainer, post, previewControls);

  async function enviarComentario() {
    const content = input.value.trim();
    if (!content) return;

    sendBtn.disabled = true;
    sendBtn.style.opacity = "0.6";

    try {
      const { error } = await supa
        .from("comments")
        .insert({ post_id: post.id, user_id: currentUser.id, content, parent_comment_id: replyToCommentId });

      if (error) throw error;

      input.value = "";

      // reset reply state
      replyToCommentId = null;
      replyToName = null;
      replyBanner.style.display = "none";
      input.placeholder = "Adicionar um comentário...";

      post.comments_count += 1;

      commentsCountSpan.textContent =
        post.comments_count + (post.comments_count === 1 ? " comentário" : " comentários");

      await carregarComentariosRecentes(post.id, ul, seeMoreContainer, post, previewControls);
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

// Função para carregar apenas comentários MAIS RECENTES (preview no feed)
async function carregarComentariosRecentes(postId, ul, seeMoreContainer, post, controls = {}) {
  ul.innerHTML = "";

  let commentsToShow = [];

  try {
    commentsToShow = await safeSelectTopLevelComments(postId, false, COMMENT_PREVIEW_LIMIT);
  } catch (error) {
    console.error(error);
    return;
  }

  
  const isAdmin = currentProfile?.role === "admin";

  if (post.comments_count > COMMENT_PREVIEW_LIMIT) {
    seeMoreContainer.style.display = "block";
  } else {
    seeMoreContainer.style.display = "none";
  }

  for (const c of commentsToShow) {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.alignItems = "flex-start";
    li.style.justifyContent = "space-between";
    li.style.gap = "12px";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.flexDirection = "column";
    left.style.gap = "2px";
    left.style.flex = "1";

    const authorName = (c.profiles?.full_name || "Usuário").trim();

    const meta = document.createElement("div");
    meta.style.fontWeight = "800";
    meta.style.fontSize = "13px";
    meta.style.color = "var(--text-primary)";
    meta.textContent = `${authorName}  ${fmtDateBR(c.created_at)}`;

    const txt = document.createElement("div");
    txt.style.fontSize = "13px";
    txt.style.color = "var(--text-secondary)";
    txt.textContent = c.content;

    left.appendChild(meta);
    left.appendChild(txt);

    // Ações: curtir comentário / responder / ver respostas
    const actionsRow = document.createElement("div");
    actionsRow.style.display = "flex";
    actionsRow.style.gap = "14px";
    actionsRow.style.marginTop = "6px";
    actionsRow.style.alignItems = "center";

    const likeBtn = makeInlineActionButton("🤍");
    likeBtn.style.fontSize = "13px";
    likeBtn.style.fontWeight = "900";

    const likeCount = document.createElement("span");
    likeCount.style.fontSize = "12px";
    likeCount.style.color = "var(--text-muted)";
    likeCount.style.fontWeight = "800";

    const replyBtn = makeInlineActionButton("Responder");

    // inicializa estado de like
    (async () => {
      const st = await safeGetCommentLikeState(c.id);
      likeBtn.textContent = st.liked ? "❤️" : "🤍";
      likeCount.textContent = st.count ? String(st.count) : "";
    })();

    likeBtn.addEventListener("click", async () => {
      const st = await safeToggleCommentLike(c.id);
      likeBtn.textContent = st.liked ? "❤️" : "🤍";
      likeCount.textContent = st.count ? String(st.count) : "";
    });

    replyBtn.addEventListener("click", () => {
      if (typeof controls.setReplyTarget === "function") {
        controls.setReplyTarget(c.id, authorName);
      }
    });

    actionsRow.appendChild(likeBtn);
    actionsRow.appendChild(likeCount);
    actionsRow.appendChild(replyBtn);

    // Ver respostas (se existir)
    (async () => {
      const rc = await safeCountReplies(c.id);
      if (rc > 0) {
        const viewReplies = makeInlineActionButton(`Ver respostas (${rc})`);
        viewReplies.addEventListener("click", async () => {
          await abrirModalComentarios(postId, post.comments_count, { focusCommentId: c.id, autoExpand: true });
        });
        actionsRow.appendChild(viewReplies);
      }
    })();

    left.appendChild(actionsRow);

    li.appendChild(left);

    const canDelete = isAdmin || c.user_id === currentUser?.id;
    if (canDelete) {
      const delBtn = makeIconButton({ title: "Excluir comentário", variant: "danger" });

      delBtn.addEventListener("click", async () => {
        const ok = confirm("Excluir este comentário?");
        if (!ok) return;

        delBtn.disabled = true;
        delBtn.style.opacity = "0.6";
        delBtn.style.pointerEvents = "none";

        try {
          const { error } = await supa.from("comments").delete().eq("id", c.id);
          if (error) throw error;

          // Re-sincroniza a contagem e o preview (evita "perder" comentários antigos)
          const { count: newCount, error: cntErr } = await supa
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", postId);

          if (cntErr) console.warn("Erro ao contar comentários:", cntErr);

          post.comments_count = newCount ?? Math.max(0, post.comments_count - 1);

          const commentsCountSpan = ul.closest(".post")?.querySelector(".comments-count");
          if (commentsCountSpan) {
            commentsCountSpan.textContent =
              post.comments_count + (post.comments_count === 1 ? " comentário" : " comentários");
          }

          await carregarComentariosRecentes(postId, ul, seeMoreContainer, post, controls);
        } catch (e) {
          console.error(e);
          alert(e?.message || "Erro ao excluir comentário.");
        } finally {
          delBtn.disabled = false;
          delBtn.style.opacity = "1";
          delBtn.style.pointerEvents = "auto";
        }
      });

      li.appendChild(delBtn);
    } else {
      const spacer = document.createElement("div");
      spacer.style.width = "34px";
      spacer.style.height = "34px";
      li.appendChild(spacer);
    }

    ul.appendChild(li);
  }
}

// Função para abrir modal com todos os comentários
async function abrirModalComentarios(postId, totalComments, options = {}) {
  const modal = document.createElement("div");
  modal.className = "comments-modal";
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "10000";
  modal.style.backdropFilter = "blur(10px)";
  modal.style.padding = "20px";

  const modalCard = document.createElement("div");
  modalCard.className = "comments-modal-card";
  modalCard.style.width = "100%";
  modalCard.style.maxWidth = "500px";
  modalCard.style.maxHeight = "80vh";
  modalCard.style.background = "var(--bg-card)";
  modalCard.style.border = "1px solid var(--border-color)";
  modalCard.style.borderRadius = "20px";
  modalCard.style.overflow = "hidden";
  modalCard.style.display = "flex";
  modalCard.style.flexDirection = "column";

  const modalHeader = document.createElement("div");
  modalHeader.style.display = "flex";
  modalHeader.style.justifyContent = "space-between";
  modalHeader.style.alignItems = "center";
  modalHeader.style.padding = "16px 20px";
  modalHeader.style.borderBottom = "1px solid var(--border-light)";
  modalHeader.style.background = "var(--bg-secondary)";

  const modalTitle = document.createElement("h3");
  modalTitle.textContent = `Comentários (${totalComments})`;
  modalTitle.style.color = "var(--text-primary)";
  modalTitle.style.fontSize = "18px";
  modalTitle.style.fontWeight = "700";
  modalTitle.style.margin = "0";

  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "×";
  closeBtn.style.background = "none";
  closeBtn.style.border = "none";
  closeBtn.style.color = "var(--text-primary)";
  closeBtn.style.fontSize = "28px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.width = "40px";
  closeBtn.style.height = "40px";
  closeBtn.style.display = "flex";
  closeBtn.style.alignItems = "center";
  closeBtn.style.justifyContent = "center";
  closeBtn.style.borderRadius = "10px";
  closeBtn.style.transition = "background 0.2s ease";

  closeBtn.addEventListener("mouseenter", () => {
    closeBtn.style.background = "var(--button-bg)";
  });

  closeBtn.addEventListener("mouseleave", () => {
    closeBtn.style.background = "none";
  });

  closeBtn.addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeBtn);

  ensureGoldScrollbars();

  const commentsList = document.createElement("div");
  commentsList.className = "comments-modal-list";
  commentsList.style.flex = "1";
  commentsList.style.overflowY = "auto";
  commentsList.style.padding = "20px";

  const inputContainer = document.createElement("div");
  inputContainer.style.padding = "0 20px 20px";
  inputContainer.style.borderTop = "1px solid var(--border-light)";

  // Estado de resposta no modal
  let modalReplyToId = null;
  let modalReplyToName = null;

  const modalReplyBanner = document.createElement("div");
  modalReplyBanner.style.display = "none";
  modalReplyBanner.style.margin = "14px 0 10px";
  modalReplyBanner.style.padding = "10px 12px";
  modalReplyBanner.style.borderRadius = "14px";
  modalReplyBanner.style.border = "1px solid var(--border-color)";
  modalReplyBanner.style.background = "var(--bg-secondary)";
  modalReplyBanner.style.color = "var(--text-primary)";
  modalReplyBanner.style.fontSize = "12px";
  modalReplyBanner.style.display = "none";
  modalReplyBanner.style.alignItems = "center";
  modalReplyBanner.style.justifyContent = "space-between";
  modalReplyBanner.style.gap = "10px";

  const modalReplyBannerText = document.createElement("div");
  modalReplyBannerText.style.fontWeight = "800";
  const modalReplyCancel = makeIconButton({ title: "Cancelar resposta", icon: "x" });
  modalReplyCancel.style.width = "30px";
  modalReplyCancel.style.height = "30px";
  modalReplyCancel.addEventListener("click", () => {
    modalReplyToId = null;
    modalReplyToName = null;
    modalReplyBanner.style.display = "none";
    input.placeholder = "Adicionar um comentário...";
  });

  modalReplyBanner.appendChild(modalReplyBannerText);
  modalReplyBanner.appendChild(modalReplyCancel);


  const inputRow = document.createElement("div");
  inputRow.style.display = "flex";
  inputRow.style.gap = "10px";
  inputRow.style.alignItems = "center";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Adicionar um comentário...";
  input.style.flex = "1";
  input.style.padding = "12px 14px";
  input.style.background = "var(--input-bg)";
  input.style.border = "1px solid var(--border-color)";
  input.style.borderRadius = "12px";
  input.style.color = "var(--text-primary)";
  input.style.outline = "none";

  const sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.textContent = "➤";
  sendBtn.style.width = "40px";
  sendBtn.style.height = "40px";
  sendBtn.style.borderRadius = "10px";
  sendBtn.style.border = "1px solid var(--border-color)";
  sendBtn.style.background = "var(--button-bg)";
  sendBtn.style.color = "var(--text-primary)";
  sendBtn.style.cursor = "pointer";
  sendBtn.style.transition = "background .15s ease";

  sendBtn.addEventListener("mouseenter", () => {
    sendBtn.style.background = "var(--button-hover)";
  });

  sendBtn.addEventListener("mouseleave", () => {
    sendBtn.style.background = "var(--button-bg)";
  });

  inputRow.appendChild(input);
  inputRow.appendChild(sendBtn);
  inputContainer.appendChild(modalReplyBanner);
  inputContainer.appendChild(inputRow);

  modalCard.appendChild(modalHeader);
  modalCard.appendChild(commentsList);
  modalCard.appendChild(inputContainer);
  modal.appendChild(modalCard);
  document.body.appendChild(modal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });

  
  // helper para definir alvo de resposta no modal (thread por comentário raiz)
  function setReplyTarget(rootId, name) {
    modalReplyToId = rootId;
    modalReplyToName = name;
    modalReplyBannerText.textContent = `Respondendo a ${modalReplyToName}`;
    modalReplyBanner.style.display = "flex";
    input.placeholder = `Responder para ${modalReplyToName}...`;
    setTimeout(() => input.focus(), 20);
  }

  const mergedOptions = { ...options, setReplyTarget };
await carregarTodosComentarios(postId, commentsList, modalTitle, totalComments, mergedOptions);

  async function enviarComentarioModal() {
    const content = input.value.trim();
    if (!content) return;

    sendBtn.disabled = true;
    sendBtn.style.opacity = "0.6";

    try {
      const { error } = await supa
        .from("comments")
        .insert({ post_id: postId, user_id: currentUser.id, content, parent_comment_id: modalReplyToId });

      if (error) throw error;

      input.value = "";

      // reset reply state
      modalReplyToId = null;
      modalReplyToName = null;
      modalReplyBanner.style.display = "none";
      input.placeholder = "Adicionar um comentário...";

      totalComments += 1;
      modalTitle.textContent = `Comentários (${totalComments})`;

      const postElement = document.querySelector(`.post[data-post-id="${postId}"]`);
      if (postElement) {
        const commentsCountSpan = postElement.querySelector(".comments-count");
        if (commentsCountSpan) {
          commentsCountSpan.textContent =
            totalComments + (totalComments === 1 ? " comentário" : " comentários");
        }
        const seeMoreContainer = postElement.querySelector(".comments > div:last-child");
        if (seeMoreContainer && totalComments > COMMENT_PREVIEW_LIMIT) {
          seeMoreContainer.style.display = "block";
        }
      }

      await carregarTodosComentarios(postId, commentsList, modalTitle, totalComments, mergedOptions);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Erro ao comentar.");
    } finally {
      sendBtn.disabled = false;
      sendBtn.style.opacity = "1";
    }
  }

  input.addEventListener("keypress", async (e) => {
    if (e.key === "Enter") await enviarComentarioModal();
  });
  sendBtn.addEventListener("click", enviarComentarioModal);
}


// Atualiza contagem e preview de comentários de um post específico no FEED (sem recarregar a página)
async function refreshPostCommentUI(postId) {
  const postEl = document.querySelector(`.post[data-post-id="${postId}"]`);
  if (!postEl) return;

  let newCount = null;
  try {
    const { count, error } = await supa
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (error) console.warn("Erro ao contar comentários:", error);
    newCount = count ?? 0;
  } catch (e) {
    console.warn("Falha ao recontar comentários:", e);
    newCount = null;
  }

  if (typeof newCount === "number") {
    const commentsCountSpan = postEl.querySelector(".comments-count");
    if (commentsCountSpan) commentsCountSpan.textContent = `${newCount} comentários`;

    const ul = postEl.querySelector(".comments ul");
    const seeMore = postEl.querySelector(".see-more-comments");
    if (ul && seeMore) {
      await carregarComentariosRecentes(postId, ul, seeMore, { comments_count: newCount });
    }
  }
}

async function carregarTodosComentarios(postId, container, titleElement, totalComments, options = {}) {
  container.innerHTML = "";

  let data = [];
  let error = null;

  try {
    data = await safeSelectTopLevelComments(postId, true, undefined);
  } catch (e) {
    error = e;
  }
if (error) {
    console.error(error);
    container.innerHTML = `<p style="color: var(--text-muted); text-align: center;">Erro ao carregar comentários</p>`;
    return;
  }

  const isAdmin = currentProfile?.role === "admin";

  if (!data || data.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); text-align: center;">Nenhum comentário ainda</p>`;
    return;
  }

  if (titleElement) {
    try {
      const { count: realTotal, error: cntErr } = await supa
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);
      if (cntErr) console.warn("Erro ao contar comentários:", cntErr);
      titleElement.textContent = `Comentários (${(realTotal ?? 0)})`;
    } catch (e) {
      titleElement.textContent = `Comentários (${(totalComments ?? data.length)})`;
    }
  }

  for (const c of data) {
    const commentDiv = document.createElement("div");
    commentDiv.style.padding = "12px 0";
    commentDiv.style.borderBottom = "1px solid var(--border-light)";

    const authorName = (c.profiles?.full_name || "Usuário").trim();

    const meta = document.createElement("div");
    meta.style.display = "flex";
    meta.style.justifyContent = "space-between";
    meta.style.alignItems = "center";
    meta.style.marginBottom = "6px";

    const authorAndDate = document.createElement("div");
    authorAndDate.style.display = "flex";
    authorAndDate.style.gap = "8px";
    authorAndDate.style.alignItems = "center";

    const authorSpan = document.createElement("span");
    authorSpan.style.fontWeight = "800";
    authorSpan.style.fontSize = "13px";
    authorSpan.style.color = "var(--text-primary)";
    authorSpan.textContent = authorName;

    const dateSpan = document.createElement("span");
    dateSpan.style.fontSize = "12px";
    dateSpan.style.color = "var(--text-muted)";
    dateSpan.textContent = fmtDateBR(c.created_at);

    authorAndDate.appendChild(authorSpan);
    authorAndDate.appendChild(dateSpan);

    meta.appendChild(authorAndDate);

    const canDelete = isAdmin || c.user_id === currentUser?.id;
    if (canDelete) {
      const delBtn = document.createElement("button");
      delBtn.innerHTML = "🗑️";
      delBtn.style.background = "none";
      delBtn.style.border = "none";
      delBtn.style.color = "var(--text-muted)";
      delBtn.style.cursor = "pointer";
      delBtn.style.fontSize = "14px";
      delBtn.style.padding = "4px 8px";
      delBtn.style.borderRadius = "6px";
      delBtn.style.transition = "all 0.2s ease";

      delBtn.addEventListener("mouseenter", () => {
        delBtn.style.color = "#ff3b5c";
        delBtn.style.background = "rgba(255, 59, 92, 0.1)";
      });

      delBtn.addEventListener("mouseleave", () => {
        delBtn.style.color = "var(--text-muted)";
        delBtn.style.background = "none";
      });

      delBtn.addEventListener("click", async () => {
        const ok = confirm("Excluir este comentário?");
        if (!ok) return;

        delBtn.disabled = true;
        delBtn.style.opacity = "0.6";

        try {
          const { error } = await supa.from("comments").delete().eq("id", c.id);
          if (error) throw error;

          // Re-sincroniza a contagem real no banco e atualiza UI (modal + feed)
          const { count: newCount, error: cntErr } = await supa
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", postId);

          if (cntErr) console.warn("Erro ao contar comentários:", cntErr);

          const safeCount = newCount ?? Math.max(0, parseInt(titleElement.textContent.match(/\d+/)[0], 10) - 1);
          titleElement.textContent = `Comentários (${safeCount})`;

          const postElement = document.querySelector(`.post[data-post-id="${postId}"]`);
          if (postElement) {
            const commentsCountSpan = postElement.querySelector(".comments-count");
            if (commentsCountSpan) {
              commentsCountSpan.textContent =
                safeCount + (safeCount === 1 ? " comentário" : " comentários");
            }

            const seeMoreContainer = postElement.querySelector(".comments > div:last-child");
            if (seeMoreContainer) {
              seeMoreContainer.style.display = safeCount > COMMENT_PREVIEW_LIMIT ? "block" : "none";
            }

            // Atualiza o preview do feed também (para não ficar "perdido")
            const ul = postElement.querySelector(".comments ul");
            if (ul && seeMoreContainer) {
              await carregarComentariosRecentes(postId, ul, seeMoreContainer, { comments_count: safeCount }, {});
            }
          }

          // Recarrega a lista do modal para manter consistência visual
          await carregarTodosComentarios(postId, container, titleElement, safeCount);
        } catch (e) {
          console.error(e);
          alert(e?.message || "Erro ao excluir comentário.");
        } finally {
          delBtn.disabled = false;
          delBtn.style.opacity = "1";
        }
      });

      meta.appendChild(delBtn);
    }

    const contentDiv = document.createElement("div");
    contentDiv.style.fontSize = "14px";
    contentDiv.style.color = "var(--text-secondary)";
    contentDiv.style.lineHeight = "1.5";
    contentDiv.textContent = c.content;

    // Ações (curtir / responder / ver respostas)
    const actionsRow = document.createElement("div");
    actionsRow.style.display = "flex";
    actionsRow.style.gap = "14px";
    actionsRow.style.marginTop = "8px";
    actionsRow.style.alignItems = "center";

    const likeBtn = makeInlineActionButton("🤍");
    likeBtn.style.fontSize = "13px";
    likeBtn.style.fontWeight = "900";

    const likeCount = document.createElement("span");
    likeCount.style.fontSize = "12px";
    likeCount.style.color = "var(--text-muted)";
    likeCount.style.fontWeight = "800";

    const replyBtn = makeInlineActionButton("Responder");

    // init like state
    (async () => {
      const st = await safeGetCommentLikeState(c.id);
      likeBtn.textContent = st.liked ? "❤️" : "🤍";
      likeCount.textContent = st.count ? String(st.count) : "";
    })();

    likeBtn.addEventListener("click", async () => {
      const st = await safeToggleCommentLike(c.id);
      likeBtn.textContent = st.liked ? "❤️" : "🤍";
      likeCount.textContent = st.count ? String(st.count) : "";
    });

    replyBtn.addEventListener("click", () => {
      if (options?.setReplyTarget) options.setReplyTarget(c.id, authorName);
    });

    actionsRow.appendChild(likeBtn);
    actionsRow.appendChild(likeCount);
    actionsRow.appendChild(replyBtn);

    const repliesContainer = document.createElement("div");
    repliesContainer.style.marginTop = "10px";
    repliesContainer.style.marginLeft = "14px";
    repliesContainer.style.paddingLeft = "10px";
    repliesContainer.style.borderLeft = "2px solid var(--border-light)";
    repliesContainer.style.display = "none";

    let repliesLoaded = false;

    // Ver respostas (toggle)
    (async () => {
      const rc = await safeCountReplies(c.id);
      if (rc > 0) {
        const viewBtn = makeInlineActionButton(`Ver respostas (${rc})`);
        viewBtn.addEventListener("click", async () => {
          const isOpen = repliesContainer.style.display === "block";
          if (isOpen) {
            repliesContainer.style.display = "none";
            return;
          }

          repliesContainer.style.display = "block";

          if (!repliesLoaded) {
            repliesLoaded = true;
            const replies = await safeFetchReplies(c.id);

            for (const r of replies) {
              const row = document.createElement("div");
              row.style.padding = "10px 0";
              row.style.borderBottom = "1px solid var(--border-light)";

              const rAuthor = (r.profiles?.full_name || "Usuário").trim();

              const rMeta = document.createElement("div");
              rMeta.style.display = "flex";
              rMeta.style.justifyContent = "space-between";
              rMeta.style.alignItems = "center";
              rMeta.style.marginBottom = "4px";

              const rLeft = document.createElement("div");
              rLeft.style.display = "flex";
              rLeft.style.gap = "8px";
              rLeft.style.alignItems = "center";

              const rAuthorSpan = document.createElement("span");
              rAuthorSpan.style.fontWeight = "800";
              rAuthorSpan.style.fontSize = "12px";
              rAuthorSpan.style.color = "var(--text-primary)";
              rAuthorSpan.textContent = rAuthor;

              const rDate = document.createElement("span");
              rDate.style.fontSize = "11px";
              rDate.style.color = "var(--text-muted)";
              rDate.textContent = fmtDateBR(r.created_at);

              rLeft.appendChild(rAuthorSpan);
              rLeft.appendChild(rDate);

              rMeta.appendChild(rLeft);

              const rCanDelete = isAdmin || r.user_id === currentUser?.id;
              if (rCanDelete) {
                const rDel = document.createElement("button");
                rDel.innerHTML = "🗑️";
                rDel.style.background = "none";
                rDel.style.border = "none";
                rDel.style.color = "var(--text-muted)";
                rDel.style.cursor = "pointer";
                rDel.style.fontSize = "13px";
                rDel.style.padding = "2px 6px";
                rDel.style.borderRadius = "6px";

                rDel.addEventListener("mouseenter", () => {
                  rDel.style.color = "#ff3b5c";
                  rDel.style.background = "rgba(255, 59, 92, 0.1)";
                });

                rDel.addEventListener("mouseleave", () => {
                  rDel.style.color = "var(--text-muted)";
                  rDel.style.background = "none";
                });

                rDel.addEventListener("click", async () => {
                  const ok = confirm("Excluir este comentário?");
                  if (!ok) return;
                  try {
                    await supa.from("comments").delete().eq("id", r.id);
                    await carregarTodosComentarios(postId, container, titleElement, totalComments, options);
                    await refreshPostCommentUI(postId);
                  } catch (e) {
                    console.error(e);
                    alert(e?.message || "Erro ao excluir comentário.");
                  }
                });

                rMeta.appendChild(rDel);
              }

              const rTxt = document.createElement("div");
              rTxt.style.fontSize = "13px";
              rTxt.style.color = "var(--text-secondary)";
              rTxt.textContent = r.content;

              const rActions = document.createElement("div");
              rActions.style.display = "flex";
              rActions.style.gap = "14px";
              rActions.style.marginTop = "6px";
              rActions.style.alignItems = "center";

              const rLikeBtn = makeInlineActionButton("🤍");
              rLikeBtn.style.fontSize = "13px";
              rLikeBtn.style.fontWeight = "900";

              const rLikeCount = document.createElement("span");
              rLikeCount.style.fontSize = "12px";
              rLikeCount.style.color = "var(--text-muted)";
              rLikeCount.style.fontWeight = "800";

              (async () => {
                const st = await safeGetCommentLikeState(r.id);
                rLikeBtn.textContent = st.liked ? "❤️" : "🤍";
                rLikeCount.textContent = st.count ? String(st.count) : "";
              })();

              rLikeBtn.addEventListener("click", async () => {
                const st = await safeToggleCommentLike(r.id);
                rLikeBtn.textContent = st.liked ? "❤️" : "🤍";
                rLikeCount.textContent = st.count ? String(st.count) : "";
              });

              const rReplyBtn = makeInlineActionButton("Responder");
              rReplyBtn.addEventListener("click", () => {
                // mantém a thread no raiz, mas mostra o nome do alvo
                if (options?.setReplyTarget) options.setReplyTarget(c.id, rAuthor);
              });

              rActions.appendChild(rLikeBtn);
              rActions.appendChild(rLikeCount);
              rActions.appendChild(rReplyBtn);

              row.appendChild(rMeta);
              row.appendChild(rTxt);
              row.appendChild(rActions);
              repliesContainer.appendChild(row);
            }
          }
        });

        actionsRow.appendChild(viewBtn);

        // auto-expand e foco em um comentário específico
        if (options?.autoExpand && options?.focusCommentId === c.id) {
          setTimeout(() => viewBtn.click(), 60);
        }
      }
    })();

    commentDiv.appendChild(meta);
    commentDiv.appendChild(contentDiv);
    commentDiv.appendChild(actionsRow);
    commentDiv.appendChild(repliesContainer);
    container.appendChild(commentDiv);
  }
}

// ----------------- Postar (ADMIN) -----------------
window.abrirGaleria = function abrirGaleria() {
  if (!currentProfile || currentProfile.role !== "admin") return;
  openChoiceModal();
};

fileInput?.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  pendingFile = file;

  const reader = new FileReader();
  reader.onload = () => {
    // Com imagem: mostra a área de prévia
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
  forcePinOnPublish = false;

  // Fecha sempre limpando e escondendo a prévia
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

      const { data: insertedPost, error: insErr } = await supa
        .from("posts")
        .insert({ user_id: currentUser.id, caption, image_url: filePath, ...(forcePinOnPublish && hasPinnedColumn ? { pinned: true } : {}) })
        .select("id")
        .single();

      if (insErr) throw insErr;
      var insertedId = insertedPost?.id;
    }
    // SEM IMAGEM
    else {
      const { data: insertedPost, error: insErr } = await supa
        .from("posts")
        .insert({ user_id: currentUser.id, caption, image_url: null, ...(forcePinOnPublish && hasPinnedColumn ? { pinned: true } : {}) })
        .select("id")
        .single();

      if (insErr) throw insErr;
      var insertedId = insertedPost?.id;
    }

    const justInsertedId = typeof insertedId !== "undefined" ? insertedId : null;
    const wasPinned = forcePinOnPublish && hasPinnedColumn;

    fecharModal();
    await carregarFeed();
    // Atualiza sidebars (evita corrida/duplicação: chamamos só aqui)
    await loadPinnedSidebar().catch(() => {});
    await loadActivitySidebar().catch(() => {});

    if (justInsertedId) {
      setTimeout(() => {
        const el = document.querySelector(`.post[data-post-id="${justInsertedId}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: wasPinned ? "start" : "center" });
      }, 120);
    }
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

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-theme"],
});

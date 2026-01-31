// feed.js - POST COM OU SEM IMAGEM + FIX JOIN AMBIGUO (PGRST201)
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

// Modal de novo post
const postModal = document.getElementById("postModal");
const previewImg = document.getElementById("previewImg");
const captionInput = document.getElementById("captionInput");
const publishPost = document.getElementById("publishPost");
const cancelPost = document.getElementById("cancelPost");
const closeModal = document.getElementById("closeModal");

// Modal de curtidas
const likesModal = document.getElementById("likesModal");
const closeLikesModal = document.getElementById("closeLikesModal");
const likesList = document.getElementById("likesList");

// Botão +
const addPostBtn = document.querySelector(".add-post");

let pendingFile = null;
let currentUser = null;
let currentProfile = null;

// modo do post: "image" | "text"
let postMode = "image";

// ----------------- TEMA -----------------
function applyThemeToDynamicElements() {
  const isDarkMode = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDarkMode ? "#ffffff" : "#222222";

  document.querySelectorAll(".btn-danger").forEach((btn) => {
    btn.style.color = textColor;
  });

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
  if (!path) return "";
  const { data } = supa.storage.from("posts").getPublicUrl(path);
  return data?.publicUrl || "";
}

// Formata data
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

// ----------------- POST MODE UI (com/sem imagem) -----------------
function setPreviewVisible(visible) {
  if (!previewImg) return;

  const wrap =
    previewImg.closest(".preview") ||
    previewImg.closest(".preview-container") ||
    previewImg.parentElement;

  if (wrap) wrap.style.display = visible ? "" : "none";
  previewImg.style.display = visible ? "" : "none";

  if (!visible) {
    try {
      previewImg.removeAttribute("src");
    } catch (_) {}
  }
}

function openPostTypeChooser() {
  if (!currentProfile || currentProfile.role !== "admin") return;

  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.65)";
  overlay.style.backdropFilter = "blur(8px)";
  overlay.style.zIndex = "10001";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "20px";

  const card = document.createElement("div");
  card.style.width = "100%";
  card.style.maxWidth = "420px";
  card.style.borderRadius = "18px";
  card.style.border = "1px solid var(--border-color)";
  card.style.background = "var(--bg-card)";
  card.style.boxShadow = "0 20px 70px rgba(0,0,0,.45)";
  card.style.overflow = "hidden";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.padding = "14px 16px";
  header.style.borderBottom = "1px solid var(--border-light)";

  const title = document.createElement("div");
  title.textContent = "Novo post";
  title.style.fontWeight = "800";
  title.style.color = "var(--text-primary)";
  title.style.fontSize = "16px";

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.style.width = "38px";
  close.style.height = "38px";
  close.style.borderRadius = "12px";
  close.style.border = "1px solid var(--border-color)";
  close.style.background = "var(--button-bg)";
  close.style.color = "var(--text-primary)";
  close.style.cursor = "pointer";
  close.style.fontSize = "22px";
  close.addEventListener("click", () => document.body.removeChild(overlay));

  header.appendChild(title);
  header.appendChild(close);

  const body = document.createElement("div");
  body.style.padding = "16px";
  body.style.color = "var(--text-secondary)";
  body.style.fontSize = "14px";
  body.innerHTML = `Você quer publicar <b>com imagem</b> ou <b>sem imagem</b>?`;

  const actions = document.createElement("div");
  actions.style.display = "grid";
  actions.style.gridTemplateColumns = "1fr 1fr";
  actions.style.gap = "12px";
  actions.style.padding = "0 16px 16px";

  const btnImg = document.createElement("button");
  btnImg.type = "button";
  btnImg.textContent = "Com imagem";
  btnImg.style.padding = "12px 10px";
  btnImg.style.borderRadius = "14px";
  btnImg.style.border = "1px solid var(--border-color)";
  btnImg.style.background = "var(--button-bg)";
  btnImg.style.color = "var(--text-primary)";
  btnImg.style.cursor = "pointer";
  btnImg.style.fontWeight = "700";
  btnImg.style.transition = "transform .15s ease";
  btnImg.addEventListener("mouseenter", () => (btnImg.style.transform = "translateY(-1px)"));
  btnImg.addEventListener("mouseleave", () => (btnImg.style.transform = "translateY(0)"));

  const btnText = document.createElement("button");
  btnText.type = "button";
  btnText.textContent = "Sem imagem";
  btnText.style.padding = "12px 10px";
  btnText.style.borderRadius = "14px";
  btnText.style.border = "1px solid var(--border-color)";
  btnText.style.background = "var(--button-bg)";
  btnText.style.color = "var(--text-primary)";
  btnText.style.cursor = "pointer";
  btnText.style.fontWeight = "700";
  btnText.style.transition = "transform .15s ease";
  btnText.addEventListener("mouseenter", () => (btnText.style.transform = "translateY(-1px)"));
  btnText.addEventListener("mouseleave", () => (btnText.style.transform = "translateY(0)"));

  btnImg.addEventListener("click", () => {
    postMode = "image";
    pendingFile = null;
    setPreviewVisible(true);
    document.body.removeChild(overlay);
    fileInput?.click();
  });

  btnText.addEventListener("click", () => {
    postMode = "text";
    pendingFile = null;
    setPreviewVisible(false); // ESCONDE PRÉVIA
    if (captionInput) captionInput.value = "";
    document.body.removeChild(overlay);
    setModalOpen(true);
    setTimeout(() => captionInput?.focus(), 80);
  });

  actions.appendChild(btnImg);
  actions.appendChild(btnText);

  card.appendChild(header);
  card.appendChild(body);
  card.appendChild(actions);
  overlay.appendChild(card);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });

  document.body.appendChild(overlay);
}

// ----------------- Curtidas modal -----------------
async function abrirModalCurtidas(postId) {
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
      .select(`created_at, user_id, profiles:profiles(full_name)`)
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    if (error) throw error;

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

      if (like.profiles?.full_name) {
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

function fecharModalCurtidas() {
  likesModal.classList.remove("show");
  likesModal.setAttribute("aria-hidden", "true");
}

closeLikesModal?.addEventListener("click", fecharModalCurtidas);
likesModal?.addEventListener("click", (e) => {
  if (e.target === likesModal) fecharModalCurtidas();
});

// ----------------- Auth / Perfil -----------------
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

  if (currentProfile.role !== "admin") {
    if (addPostBtn) addPostBtn.style.display = "none";
  } else {
    if (addPostBtn) addPostBtn.style.display = "flex";
  }

  applyThemeToDynamicElements();
  await carregarFeed();
}

init();

// ----------------- Feed (SEM embed de profiles pra evitar PGRST201) -----------------
async function carregarFeed() {
  feed.innerHTML = "";

  // 1) Pega posts sem embed de profiles (evita ambiguidade)
  const { data: posts, error: postsErr } = await supa
    .from("posts")
    .select("id, user_id, caption, image_url, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (postsErr) {
    console.error(postsErr);
    alert("Erro ao carregar feed.");
    return;
  }

  const postList = posts || [];

  // 2) Pega nomes dos autores numa query separada
  const authorIds = [...new Set(postList.map((p) => p.user_id).filter(Boolean))];

  let profileMap = new Map();
  if (authorIds.length > 0) {
    const { data: profs, error: profErr } = await supa
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);

    if (profErr) {
      // não quebra o feed; só cai no "Usuário"
      console.warn("Não consegui carregar profiles:", profErr);
    } else {
      (profs || []).forEach((p) => {
        profileMap.set(p.id, p.full_name || "Usuário");
      });
    }
  }

  // 3) Pega contagens de likes/comments via queries agregadas (sem precisar view)
  // Likes
  const postIds = postList.map((p) => p.id);
  const likesCountMap = new Map();
  const commentsCountMap = new Map();

  if (postIds.length > 0) {
    const { data: likesAgg, error: likesErr } = await supa
      .from("likes")
      .select("post_id")
      .in("post_id", postIds);

    if (!likesErr) {
      (likesAgg || []).forEach((r) => {
        likesCountMap.set(r.post_id, (likesCountMap.get(r.post_id) || 0) + 1);
      });
    } else {
      console.warn("Erro likes agg:", likesErr);
    }

    const { data: commentsAgg, error: commentsErr } = await supa
      .from("comments")
      .select("post_id")
      .in("post_id", postIds);

    if (!commentsErr) {
      (commentsAgg || []).forEach((r) => {
        commentsCountMap.set(r.post_id, (commentsCountMap.get(r.post_id) || 0) + 1);
      });
    } else {
      console.warn("Erro comments agg:", commentsErr);
    }
  }

  // 4) Monta e renderiza
  const normalized = postList.map((p) => ({
    id: p.id,
    user_id: p.user_id,
    caption: p.caption,
    image_url: p.image_url,
    created_at: p.created_at,
    author_name: profileMap.get(p.user_id) || "Usuário",
    likes_count: likesCountMap.get(p.id) || 0,
    comments_count: commentsCountMap.get(p.id) || 0,
  }));

  for (const post of normalized) {
    const card = await renderPost(post);
    feed.appendChild(card);
  }

  applyThemeToDynamicElements();
}

// animação coração
function criarAnimacaoCurtida(imgContainer, isLiked) {
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

  imgContainer.appendChild(heart);

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

  const postEl = document.createElement("div");
  postEl.className = "post";
  postEl.dataset.postId = post.id;

  const imgUrl = getPublicImageUrl(post.image_url);

  // header
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
  author.textContent = post.author_name || "Usuário";

  const date = document.createElement("div");
  date.style.fontSize = "12px";
  date.style.color = "var(--text-muted)";
  date.textContent = fmtDateBR(post.created_at);

  left.appendChild(author);
  left.appendChild(date);

  header.appendChild(left);

  // delete post (admin)
  if (isAdmin) {
    const delPostBtn = makeIconButton({ title: "Excluir post", variant: "danger" });
    delPostBtn.addEventListener("click", async () => {
      const ok = confirm("Excluir este post? Isso remove o post e a imagem (se existir).");
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

    header.appendChild(delPostBtn);
  } else {
    const spacer = document.createElement("div");
    spacer.style.width = "34px";
    spacer.style.height = "34px";
    header.appendChild(spacer);
  }

  postEl.appendChild(header);

  const space = document.createElement("div");
  space.style.height = "12px";
  postEl.appendChild(space);

  // IMAGEM (só se existir)
  let imgContainer = null;
  if (imgUrl) {
    imgContainer = document.createElement("div");
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

    let clickTimer = null;
    let isDoubleClick = false;

    imgContainer.addEventListener("click", () => {
      if (isDoubleClick) {
        isDoubleClick = false;
        return;
      }
      if (clickTimer === null) {
        clickTimer = setTimeout(() => {
          abrirImagemTelaCheia(imgUrl);
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
  } else {
    const noImgLine = document.createElement("div");
    noImgLine.style.height = "2px";
    noImgLine.style.margin = "6px 12px 10px";
    noImgLine.style.background = "var(--border-light)";
    noImgLine.style.opacity = "0.6";
    postEl.appendChild(noImgLine);
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
    await abrirModalCurtidas(post.id);
  });

  // Caption
  const caption = document.createElement("p");
  caption.textContent = post.caption || "";
  postEl.appendChild(caption);

  // Comments area
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

  inputRow.appendChild(sendBtn);

  const ul = document.createElement("ul");
  commentsWrap.appendChild(inputRow);
  commentsWrap.appendChild(ul);
  postEl.appendChild(commentsWrap);

  // LIKE initial state
  const likeBtn = postEl.querySelector(".like-btn");

  const { data: likedRow } = await supa
    .from("likes")
    .select("post_id")
    .eq("post_id", post.id)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (likedRow) {
    likeBtn.classList.add("liked");
    likeBtn.textContent = "❤️";
  }

  function abrirImagemTelaCheia(imgUrl) {
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
    fullscreenImg.src = imgUrl;
    fullscreenImg.style.maxWidth = "90vw";
    fullscreenImg.style.maxHeight = "90vh";
    fullscreenImg.style.objectFit = "contain";
    fullscreenImg.style.borderRadius = "10px";
    fullscreenImg.style.cursor = "default";
    fullscreenImg.style.userSelect = "none";
    fullscreenImg.style.pointerEvents = "none";

    modal.appendChild(fullscreenImg);
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) document.body.removeChild(modal);
    });
  }

  async function handleLike(post, postEl, imgContainer = null, showAnimation = false) {
    if (!currentUser) return;

    const likeBtn = postEl.querySelector(".like-btn");
    const likesSpan = postEl.querySelector(".likes");
    const liked = likeBtn.classList.contains("liked");

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

      likeBtn.classList.remove("liked");
      likeBtn.textContent = "🤍";
      post.likes_count = Math.max(0, post.likes_count - 1);

      if (showAnimation && imgContainer) criarAnimacaoCurtida(imgContainer, false);
    } else {
      const { error } = await supa.from("likes").insert({ post_id: post.id, user_id: currentUser.id });

      if (error) {
        console.error(error);
        alert("Erro ao curtir.");
        return;
      }

      likeBtn.classList.add("liked");
      likeBtn.textContent = "❤️";
      post.likes_count += 1;

      if (showAnimation && imgContainer) criarAnimacaoCurtida(imgContainer, true);
    }

    likesSpan.textContent = post.likes_count + " curtidas";
  }

  likeBtn.addEventListener("click", async () => await handleLike(post, postEl, imgContainer, false));

  // COMMENTS (simples)
  const commentsCountSpan = postEl.querySelector(".comments-count");
  const commentBtn = postEl.querySelector(".comment-btn");
  commentBtn.addEventListener("click", () => input.focus());

  await carregarComentariosRecentes(post.id, ul, post);

  async function enviarComentario() {
    const content = input.value.trim();
    if (!content) return;

    sendBtn.disabled = true;
    sendBtn.style.opacity = "0.6";

    try {
      const { error } = await supa.from("comments").insert({ post_id: post.id, user_id: currentUser.id, content });
      if (error) throw error;

      input.value = "";
      post.comments_count += 1;

      commentsCountSpan.textContent =
        post.comments_count + (post.comments_count === 1 ? " comentário" : " comentários");

      await carregarComentariosRecentes(post.id, ul, post);
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

async function carregarComentariosRecentes(postId, ul, post) {
  ul.innerHTML = "";

  const { data, error } = await supa
    .from("comments")
    .select("id, content, created_at, user_id, profiles:profiles(full_name)")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error(error);
    return;
  }

  const commentsToShow = data || [];
  const isAdmin = currentProfile?.role === "admin";

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

          post.comments_count = Math.max(0, post.comments_count - 1);

          const postElement = document.querySelector(`.post[data-postid="${postId}"]`) ||
                              document.querySelector(`.post[data-post-id="${postId}"]`) ||
                              document.querySelector(`.post[data-post-id="${postId}"]`);
          const commentsCountSpan = postElement?.querySelector(".comments-count");
          if (commentsCountSpan) {
            commentsCountSpan.textContent =
              post.comments_count + (post.comments_count === 1 ? " comentário" : " comentários");
          }

          li.remove();
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

// ----------------- Postar (ADMIN) -----------------
window.abrirGaleria = function abrirGaleria() {
  openPostTypeChooser();
};

addPostBtn?.addEventListener("click", () => openPostTypeChooser());

fileInput?.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  postMode = "image";
  pendingFile = file;

  const reader = new FileReader();
  reader.onload = () => {
    setPreviewVisible(true);
    if (previewImg) previewImg.src = reader.result;
    if (captionInput) captionInput.value = "";
    setModalOpen(true);
    setTimeout(() => captionInput?.focus(), 80);
  };
  reader.readAsDataURL(file);

  fileInput.value = "";
});

function fecharModal() {
  setModalOpen(false);
  pendingFile = null;
  postMode = "image";
}

closeModal?.addEventListener("click", fecharModal);
cancelPost?.addEventListener("click", fecharModal);

postModal?.addEventListener("click", (e) => {
  if (e.target === postModal) fecharModal();
});

publishPost?.addEventListener("click", async () => {
  if (!currentProfile || currentProfile.role !== "admin") return;

  const caption = captionInput?.value?.trim() || "";

  if (!pendingFile && (!caption || caption.length === 0)) {
    alert("Escreva uma legenda para publicar sem imagem.");
    captionInput?.focus();
    return;
  }

  publishPost.disabled = true;
  publishPost.style.opacity = "0.7";
  publishPost.style.pointerEvents = "none";

  try {
    let filePath = null;

    if (pendingFile) {
      const ext = (pendingFile.name.split(".").pop() || "jpg").toLowerCase();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      filePath = `${currentUser.id}/${fileName}`;

      const { error: upErr } = await supa.storage.from("posts").upload(filePath, pendingFile, { upsert: false });
      if (upErr) throw upErr;
    }

    const payload = {
      user_id: currentUser.id,
      caption,
      image_url: filePath, // null se sem imagem
    };

    const { error: insErr } = await supa.from("posts").insert(payload);
    if (insErr) throw insErr;

    fecharModal();
    await carregarFeed();
  } catch (e) {
    console.error(e);
    const msg = (e?.message || "").toLowerCase();
    if (msg.includes("image_url") && msg.includes("not-null")) {
      alert(
        `Seu banco ainda bloqueia post sem imagem.\n\nRode no Supabase SQL Editor:\n` +
          `alter table public.posts alter column image_url drop not null;`
      );
    } else {
      alert(e?.message || "Erro ao postar.");
    }
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
    if (likesModal?.classList.contains("show")) fecharModalCurtidas();
    if (postModal?.classList.contains("show")) fecharModal();
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

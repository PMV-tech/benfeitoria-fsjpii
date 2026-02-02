// feed.js - VERSÃO COMPLETA (com posts sem imagem + modal de escolha)
// -------------------------------------------------------------
const supa = window.supa || window.supabaseClient;

if (!supa) {
  alert("Supabase não carregou. Verifique o supabaseClient.js");
  throw new Error("Supabase client missing");
}

const fileInput = document.getElementById("fileInput");
if (fileInput) fileInput.accept = "image/*,video/*";
const feed = document.getElementById("feed");

// Topbar
const topbarTitle = document.querySelector(".topbar h2");


// ===== WhatsApp (atalho fixo) =====
// Troque o número abaixo (somente dígitos, com DDI). Ex: 5511999999999
const WHATS_NUMBER = "5511944809104";
const WHATS_TEXT = "Olá! Vim pelo app FSJPII.";

function ensureWhatsFab() {
  if (document.getElementById("whatsFab")) return;

  const a = document.createElement("a");
  a.id = "whatsFab";
  a.href = `https://wa.me/${WHATS_NUMBER}?text=${encodeURIComponent(WHATS_TEXT)}`;
  a.target = "_blank";
  a.rel = "noopener";
  a.title = "Falar no WhatsApp";

  a.style.position = "fixed";
  a.style.right = "22px";
  a.style.bottom = "110px"; // acima do botão "+"
  a.style.width = "54px";
  a.style.height = "54px";
  a.style.borderRadius = "50%";
  a.style.display = "flex";
  a.style.alignItems = "center";
  a.style.justifyContent = "center";
  a.style.background = "#25D366";
  a.style.boxShadow = "0 12px 32px rgba(0,0,0,.35)";
  a.style.zIndex = "9999";

  a.innerHTML = `
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path fill="#fff" d="M19.11 17.42c-.26-.13-1.54-.76-1.78-.85-.24-.09-.42-.13-.6.13-.17.26-.69.85-.85 1.02-.16.17-.31.2-.57.07-.26-.13-1.1-.4-2.1-1.28-.78-.69-1.3-1.54-1.45-1.8-.15-.26-.02-.4.11-.53.12-.12.26-.31.39-.47.13-.16.17-.26.26-.44.09-.17.04-.33-.02-.46-.07-.13-.6-1.44-.82-1.97-.22-.53-.44-.46-.6-.47h-.51c-.17 0-.44.07-.67.33-.22.26-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.29 3.79.6.26 1.07.42 1.44.54.6.19 1.15.16 1.58.1.48-.07 1.54-.63 1.76-1.24.22-.61.22-1.13.15-1.24-.07-.11-.24-.17-.5-.3z"/>
      <path fill="#fff" d="M16 3C9.37 3 4 8.22 4 14.67c0 2.56.86 4.92 2.32 6.83L5 29l7.72-1.95c1.04.28 2.14.43 3.28.43 6.63 0 12-5.22 12-11.67S22.63 3 16 3zm0 21.02c-1.04 0-2.06-.18-3.01-.52l-.54-.19-4.58 1.16 1.23-4.32-.35-.56c-1.2-1.91-1.84-4.11-1.84-6.25C6.91 8.82 11 4.88 16 4.88s9.09 3.94 9.09 8.79S21 24.02 16 24.02z"/>
    </svg>
  `;
  document.body.appendChild(a);
}

// Botões
const btnLogout = document.getElementById("btnLogout");
const btnTheme = document.getElementById("btnTheme");

// Modal de novo post
const postModal = document.getElementById("postModal");
const previewImg = document.getElementById("previewImg");
const previewWrap = document.querySelector("#postModal .modal-preview");

let previewVideo = null;

function ensurePreviewVideo() {
  if (previewVideo) return previewVideo;
  if (!previewWrap) return null;
  const v = document.createElement("video");
  v.id = "previewVideo";
  v.muted = true;
  v.playsInline = true;
  v.loop = true;
  v.controls = true;
  v.style.width = "100%";
  v.style.display = "none";
  v.style.borderRadius = "16px";
  v.style.maxHeight = "260px";
  v.style.objectFit = "cover";
  // coloca o vídeo junto da imagem (mesma área de prévia)
  previewWrap.appendChild(v);
  previewVideo = v;
  return v;
}

function setPreviewMode(mode, dataUrl = "") {
  // mode: "none" | "image" | "video"
  const v = ensurePreviewVideo();
  if (previewImg) {
    previewImg.style.display = mode === "image" ? "block" : "none";
    if (mode === "image") previewImg.src = dataUrl;
    if (mode !== "image") previewImg.removeAttribute("src");
  }
  if (v) {
    v.style.display = mode === "video" ? "block" : "none";
    if (mode === "video") {
      v.src = dataUrl;
      // tenta começar em silêncio
      v.currentTime = 0;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      v.pause();
      v.removeAttribute("src");
      v.load();
    }
  }
}

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
const miniAvatar = document.querySelector(".avatar-mini");
const adminShortcuts = document.getElementById("adminShortcuts");
const btnNewPinned = document.getElementById("btnNewPinned");

const pinnedList = document.getElementById("pinnedList");
const pinnedEmpty = document.getElementById("pinnedEmpty");
const activityList = document.getElementById("activityList");
const activityEmpty = document.getElementById("activityEmpty");


// Menu / Views
const navFeed = document.getElementById("navFeed");
const navNotifications = document.getElementById("navNotifications");
const navNotices = document.getElementById("navNotices");
const navEvents = document.getElementById("navEvents");
const notifBadge = document.getElementById("notifBadge");

const mainContent = document.getElementById("mainContent");
const viewFeed = document.getElementById("view-feed");
const viewNotifications = document.getElementById("view-notifications");
const viewNotices = document.getElementById("view-notices");
const viewEvents = document.getElementById("view-events");

const notifList = document.getElementById("notifList");
const notifEmpty = document.getElementById("notifEmpty");
const btnMarkRead = document.getElementById("btnMarkRead");

const noticesList = document.getElementById("noticesList");
const noticesEmpty = document.getElementById("noticesEmpty");
const btnNewPinnedCenter = document.getElementById("btnNewPinnedCenter");

const eventsList = document.getElementById("eventsList");
const eventsEmpty = document.getElementById("eventsEmpty");
const btnNewEvent = document.getElementById("btnNewEvent");

// Notificações: last seen (localStorage por usuário)
function notifKey() {
  return currentUser?.id ? `notif_last_seen_${currentUser.id}` : "notif_last_seen";
}
function getNotifLastSeen() {
  const v = localStorage.getItem(notifKey());
  return v ? new Date(v) : new Date(0);
}
function setNotifLastSeenNow() {
  localStorage.setItem(notifKey(), new Date().toISOString());
}

function notifExpireKey(){ return currentUser?.id ? `notif_seen_expire_${currentUser.id}` : 'notif_seen_expire'; }
function setNotifExpire(){ try{ localStorage.setItem(notifExpireKey(), String(Date.now() + 3*24*60*60*1000)); }catch(_){}}
function cleanupNotifExpire(){
  try{
    const exp = Number(localStorage.getItem(notifExpireKey())||0);
    if (exp && Date.now() > exp) {
      localStorage.removeItem(notifExpireKey());
      // mantém last_seen; apenas limpa o controle de expiração
    }
  }catch(_){ }
}


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

// Carrega nomes de perfis para uma lista de user_ids (sem depender de FK/joins do PostgREST)
async function hydrateProfiles(userIds) {
  try {
    const ids = Array.from(new Set((userIds || []).filter(Boolean)));
    const missing = ids.filter((id) => !profilesMap[id]);
    if (!missing.length) return;

    const { data, error } = await supa.from("profiles").select("id, full_name").in("id", missing);
    if (error) return;
    (data || []).forEach((p) => {
      profilesMap[p.id] = p.full_name || "Usuário";
    });
  } catch (_) {}
}

// ----------------- Perfis (avatar/bio + modais) -----------------
const AVATAR_BUCKET = "posts"; // usa o bucket existente "posts"; vamos salvar avatar em posts/avatars/<user_id>/

function getAvatarPublicUrl(path) {
  if (!path) return "";
  try {
    return supa.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl || "";
  } catch (_) {
    return "";
  }
}

function setMiniProfileUI() {
  if (!currentProfile) return;
  if (miniProfileName) miniProfileName.textContent = currentProfile.full_name || "Usuário";
  if (miniProfileRole) miniProfileRole.textContent = currentProfile.role || "membro";

  // avatar
  if (miniAvatar) {
    const url = currentProfile.avatar_url ? getAvatarPublicUrl(currentProfile.avatar_url) : "";
    if (url) {
      miniAvatar.style.backgroundImage = `url('${url}')`;
      miniAvatar.style.backgroundSize = "cover";
      miniAvatar.style.backgroundPosition = "center";
      miniAvatar.textContent = "";
    } else {
      miniAvatar.style.backgroundImage = "";
      miniAvatar.textContent = mkAvatarInitials(currentProfile.full_name || "Usuário");
    }
  }
}

let editProfileModalEl = null;
let viewProfileModalEl = null;

// Estilos mínimos (inline via <style>) para o modal de perfil.
// Isso evita depender de classes que podem não existir no feed.css atual.
function ensureProfileModalStyles() {
  if (document.getElementById("profile-modal-styles")) return;
  const st = document.createElement("style");
  st.id = "profile-modal-styles";
  st.textContent = `
    .profile-modal .modal-card{max-width:560px;width:92vw;}
    .profile-modal .pm-header{display:flex;align-items:center;justify-content:space-between;gap:12px;}
    .profile-modal .pm-title{font-size:18px;font-weight:900;color:var(--text-primary);}
    .profile-modal .pm-close{width:38px;height:38px;border-radius:12px;border:1px solid var(--border-color);background:rgba(255,255,255,0.06);color:var(--text-primary);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;line-height:1;}
    .profile-modal .pm-form{margin-top:12px;display:flex;flex-direction:column;gap:10px;}
    .profile-modal .pm-label{font-weight:800;color:var(--text-primary);font-size:13px;}
    .profile-modal .pm-input,.profile-modal .pm-textarea{padding:10px 12px;border-radius:12px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);outline:none;}
    .profile-modal .pm-textarea{resize:vertical;min-height:84px;}
    .profile-modal .pm-row{display:flex;gap:10px;align-items:center;}
    .profile-modal .pm-preview{width:56px;height:56px;border-radius:16px;border:1px solid var(--border-color);background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-weight:900;color:var(--text-primary);overflow:hidden;}
    .profile-modal .pm-file{color:var(--text-primary);}
    .profile-modal .pm-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:10px;}
    .profile-modal .pm-btn{padding:10px 14px;border-radius:14px;font-weight:900;cursor:pointer;border:1px solid var(--border-color);}
    .profile-modal .pm-btn.secondary{background:rgba(255,255,255,0.06);color:var(--text-primary);}
    .profile-modal .pm-btn.primary{background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#fff;border:none;}
  `;
  document.head.appendChild(st);
}

function ensureEditProfileModal() {
  if (editProfileModalEl) return editProfileModalEl;

  ensureProfileModalStyles();

  editProfileModalEl = document.createElement("div");
  editProfileModalEl.className = "modal profile-modal";
  editProfileModalEl.style.display = "none";

  const card = document.createElement("div");
  card.className = "modal-card";

  const header = document.createElement("div");
  header.className = "pm-header";

  const title = document.createElement("div");
  title.textContent = "Editar perfil";
  title.className = "pm-title";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "pm-close";
  close.title = "Fechar";
  close.textContent = "×";
  close.addEventListener("click", () => closeEditProfileModal());

  header.appendChild(title);
  header.appendChild(close);

  const form = document.createElement("div");
  form.className = "pm-form";

  const nameLabel = document.createElement("div");
  nameLabel.textContent = "Nome";
  nameLabel.className = "pm-label";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.id = "editProfileName";
  nameInput.placeholder = "Seu nome";
  nameInput.className = "pm-input";

  const bioLabel = document.createElement("div");
  bioLabel.textContent = "Bio";
  bioLabel.className = "pm-label";

  const bioInput = document.createElement("textarea");
  bioInput.id = "editProfileBio";
  bioInput.placeholder = "Uma frase sobre você…";
  bioInput.rows = 3;
  bioInput.className = "pm-textarea";

  const photoLabel = document.createElement("div");
  photoLabel.textContent = "Foto";
  photoLabel.className = "pm-label";

  const row = document.createElement("div");
  row.className = "pm-row";

  const photoPreview = document.createElement("div");
  photoPreview.className = "pm-preview";
  photoPreview.textContent = mkAvatarInitials(currentProfile?.full_name || "Usuário");

  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/*";
  file.id = "editProfileAvatar";
  file.className = "pm-file";
  file.style.flex = "1";

  let pendingAvatarFile = null;

  file.addEventListener("change", () => {
    const f = file.files?.[0];
    if (!f) return;
    pendingAvatarFile = f;
    const r = new FileReader();
    r.onload = () => {
      photoPreview.style.backgroundImage = `url('${r.result}')`;
      photoPreview.style.backgroundSize = "cover";
      photoPreview.style.backgroundPosition = "center";
      photoPreview.textContent = "";
    };
    r.readAsDataURL(f);
  });

  row.appendChild(photoPreview);
  row.appendChild(file);

  const actions = document.createElement("div");
  actions.className = "pm-actions";

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancelar";
  cancel.className = "pm-btn secondary";
  cancel.addEventListener("click", () => closeEditProfileModal());

  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "Salvar";
  save.className = "pm-btn primary";

  save.addEventListener("click", async () => {
    if (!currentUser) return;
    save.disabled = true;
    save.style.opacity = "0.7";
    try {
      const full_name = nameInput.value.trim();
      const bio = bioInput.value.trim();

      let avatar_url = currentProfile?.avatar_url || null;
      let avatarUploadWarn = "";

      if (pendingAvatarFile) {
        const ext = (pendingAvatarFile.name.split(".").pop() || "jpg").toLowerCase();
        const path = `avatars/${currentUser.id}/avatar.${ext}`;
        const up = await supa.storage.from(AVATAR_BUCKET).upload(path, pendingAvatarFile, { upsert: true });
        if (up.error) {
          const msg = String(up.error.message || up.error);
          // Se o bucket não existir, não travar a edição de nome/bio.
          if (msg.toLowerCase().includes("bucket") && msg.toLowerCase().includes("not") && msg.toLowerCase().includes("found")) {
            avatarUploadWarn = "Não consegui enviar a foto porque o o bucket 'posts' (pasta avatars/) não está acessível. Verifique o Storage/policies e tente de novo.";
          } else {
            avatarUploadWarn = "Não consegui enviar a foto agora. Você ainda pode salvar nome/bio e tentar a foto depois.";
          }
        } else {
          avatar_url = path;
        }
      }

      const { error } = await supa
        .from("profiles")
        .update({ full_name: full_name || currentProfile.full_name, bio, avatar_url })
        .eq("id", currentUser.id);

      if (error) {
        const msg = String(error.message || "");
        const det = String(error.details || "");
        // Seu schema tem uma constraint única (ex.: profiles_username_unique). 
        // Se o nome já existe, mostramos uma mensagem amigável e não travamos o app.
        if (msg.includes("profiles_username_unique") || msg.includes("duplicate key value") || det.includes("profiles_username_unique")) {
          alert("Esse nome já está em uso. Escolha outro nome para salvar.");
          return;
        }
        throw error;
      }

      // refresh local profile
      currentProfile.full_name = full_name || currentProfile.full_name;
      currentProfile.bio = bio;
      currentProfile.avatar_url = avatar_url;

      setMiniProfileUI();

      // re-hidrata map
      profilesMap[currentUser.id] = currentProfile.full_name || "Usuário";

      closeEditProfileModal();
      ensureWhatsFab();
  await carregarFeed();
      await loadPinnedSidebar();
      await loadNoticesView();
      await loadNotificationsView();
      await loadNotificationsBadge();

      if (avatarUploadWarn) {
        alert(avatarUploadWarn);
      }
    } catch (e) {
      console.error(e);
      alert(e?.message || "Erro ao salvar perfil. Confirme se existe o bucket 'posts' (pasta avatars/) e as colunas avatar_url/bio em profiles.");
    } finally {
      save.disabled = false;
      save.style.opacity = "1";
    }
  });

  actions.appendChild(cancel);
  actions.appendChild(save);

  form.appendChild(nameLabel);
  form.appendChild(nameInput);
  form.appendChild(bioLabel);
  form.appendChild(bioInput);
  form.appendChild(photoLabel);
  form.appendChild(row);
  form.appendChild(actions);

  card.appendChild(header);
  card.appendChild(form);
  editProfileModalEl.appendChild(card);
  document.body.appendChild(editProfileModalEl);

  editProfileModalEl.addEventListener("click", (e) => {
    if (e.target === editProfileModalEl) closeEditProfileModal();
  });

  // preencher com dados atuais quando abrir
  editProfileModalEl._fill = () => {
    nameInput.value = currentProfile?.full_name || "";
    bioInput.value = currentProfile?.bio || "";
    pendingAvatarFile = null;
    file.value = "";
    const url = currentProfile?.avatar_url ? getAvatarPublicUrl(currentProfile.avatar_url) : "";
    if (url) {
      photoPreview.style.backgroundImage = `url('${url}')`;
      photoPreview.style.backgroundSize = "cover";
      photoPreview.style.backgroundPosition = "center";
      photoPreview.textContent = "";
    } else {
      photoPreview.style.backgroundImage = "";
      photoPreview.textContent = mkAvatarInitials(currentProfile?.full_name || "Usuário");
    }
  };

  return editProfileModalEl;
}

function openEditProfileModal() {
  ensureEditProfileModal();
  if (typeof editProfileModalEl._fill === "function") editProfileModalEl._fill();
  editProfileModalEl.style.display = "flex";
  editProfileModalEl.setAttribute("aria-hidden", "false");
}

function closeEditProfileModal() {
  if (!editProfileModalEl) return;
  editProfileModalEl.style.display = "none";
  editProfileModalEl.setAttribute("aria-hidden", "true");
}

function ensureViewProfileModal() {
  if (viewProfileModalEl) return viewProfileModalEl;

  ensureProfileModalStyles();

  viewProfileModalEl = document.createElement("div");
  viewProfileModalEl.className = "modal profile-modal";
  viewProfileModalEl.style.display = "none";

  const card = document.createElement("div");
  card.className = "modal-card";
  card.style.maxWidth = "520px";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";

  const title = document.createElement("div");
  title.textContent = "Perfil";
  title.style.fontSize = "18px";
  title.style.fontWeight = "900";
  title.style.color = "var(--text-primary)";

  const close = makeIconButton({ title: "Fechar", icon: "x" });
  close.addEventListener("click", () => closeViewProfileModal());

  header.appendChild(title);
  header.appendChild(close);

  const body = document.createElement("div");
  body.id = "viewProfileBody";
  body.style.marginTop = "12px";

  card.appendChild(header);
  card.appendChild(body);
  viewProfileModalEl.appendChild(card);
  document.body.appendChild(viewProfileModalEl);

  viewProfileModalEl.addEventListener("click", (e) => {
    if (e.target === viewProfileModalEl) closeViewProfileModal();
  });

  return viewProfileModalEl;
}

async function openViewProfileModal(userId) {
  ensureViewProfileModal();

  try {
    const { data, error } = await supa
      .from("profiles")
      .select("id, full_name, role, bio, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return;

    const body = document.getElementById("viewProfileBody");
    if (!body) return;
    body.innerHTML = "";

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "12px";
    row.style.alignItems = "center";

    const av = document.createElement("div");
    av.style.width = "64px";
    av.style.height = "64px";
    av.style.borderRadius = "18px";
    av.style.border = "1px solid var(--border-color)";
    av.style.background = "rgba(255,255,255,0.06)";
    av.style.display = "flex";
    av.style.alignItems = "center";
    av.style.justifyContent = "center";
    av.style.fontWeight = "900";
    av.style.color = "var(--text-primary)";

    const url = data.avatar_url ? getAvatarPublicUrl(data.avatar_url) : "";
    if (url) {
      av.style.backgroundImage = `url('${url}')`;
      av.style.backgroundSize = "cover";
      av.style.backgroundPosition = "center";
      av.textContent = "";
    } else {
      av.textContent = mkAvatarInitials(data.full_name || "Usuário");
    }

    const info = document.createElement("div");
    const nm = document.createElement("div");
    nm.style.fontWeight = "900";
    nm.style.color = "var(--text-primary)";
    nm.style.fontSize = "16px";
    nm.textContent = data.full_name || "Usuário";

    const rl = document.createElement("div");
    rl.style.color = "var(--text-muted)";
    rl.style.fontSize = "12px";
    rl.textContent = data.role || "membro";

    info.appendChild(nm);
    info.appendChild(rl);

    row.appendChild(av);
    row.appendChild(info);

    const bio = document.createElement("div");
    bio.style.marginTop = "10px";
    bio.style.color = "var(--text-secondary)";
    bio.style.whiteSpace = "pre-wrap";
    bio.textContent = (data.bio || "").trim() || "Sem bio.";

    body.appendChild(row);
    body.appendChild(bio);

    viewProfileModalEl.style.display = "flex";
    viewProfileModalEl.setAttribute("aria-hidden", "false");
  } catch (e) {
    console.error(e);
  }
}

function closeViewProfileModal() {
  if (!viewProfileModalEl) return;
  viewProfileModalEl.style.display = "none";
  viewProfileModalEl.setAttribute("aria-hidden", "true");
}

// deixa 'Minha conta' clicável para editar
function wireProfileMini() {
  const mini = document.querySelector(".profile-mini");
  if (!mini) return;
  mini.style.cursor = "pointer";
  mini.title = "Clique para editar seu perfil";
  mini.addEventListener("click", () => openEditProfileModal());
}


// Quantos comentários aparecem no feed antes do botão "ver mais"
const COMMENT_PREVIEW_LIMIT = 2;

// Notificações: manter apenas os últimos N dias
const NOTIF_RETENTION_DAYS = 3;

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


function isVideoPath(path = "") {
  return /\.(mp4|webm|mov|m4v|ogg)$/i.test(path);
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
      .select("created_at, user_id")
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

    await hydrateProfiles((likes||[]).map(l=>l.user_id));

    const header = document.createElement("div");
    header.className = "likes-count-header";
    header.textContent = `${likes.length} ${likes.length === 1 ? "curtida" : "curtidas"}`;

    const usersList = document.createElement("div");

    likes.forEach((like) => {
  const userDiv = document.createElement("div");
  userDiv.className = "like-user";

  const avatarDiv = document.createElement("div");
  avatarDiv.className = "like-user-avatar";

  const isCurrentUser = like.user_id === currentUser?.id;
  let userName =
    (isCurrentUser ? currentProfile?.full_name : profilesMap[like.user_id]) || "Usuário";

  if (isCurrentUser) userName += " (Você)";

  avatarDiv.textContent = mkAvatarInitials(userName);
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
;

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

  await hydrateProfiles(list.map((c) => c.user_id));

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
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
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


// ----------------- Menu / Views -----------------
const VIEWS = ["feed", "notifications", "notices", "events"];

function setActiveNav(viewName) {
  const map = {
    feed: navFeed,
    notifications: navNotifications,
    notices: navNotices,
    events: navEvents,
  };
  Object.entries(map).forEach(([k, el]) => {
    if (!el) return;
    if (k === viewName) el.classList.add("active");
    else el.classList.remove("active");
  });
}

function setActiveView(viewName) {
  const map = {
    feed: viewFeed,
    notifications: viewNotifications,
    notices: viewNotices,
    events: viewEvents,
  };
  Object.entries(map).forEach(([k, el]) => {
    if (!el) return;
    if (k === viewName) el.classList.add("view-active");
    else el.classList.remove("view-active");
  });
}

function switchView(viewName) {
  if (!VIEWS.includes(viewName)) viewName = "feed";
  setActiveNav(viewName);
  setActiveView(viewName);
  try { localStorage.setItem("active_view", viewName); } catch (_) {}

  if (viewName === "notifications") {
    loadNotificationsView();
  } else if (viewName === "notices") {
    loadNoticesView();
  } else if (viewName === "events") {
    loadEventsView();
  }
}

function scrollToPost(postId) {
  if (!postId) return;
  // garante que está no feed
  if (!viewFeed?.classList.contains("view-active")) switchView("feed");

  const target = document.querySelector(`.post[data-post-id="${postId}"]`);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("pulse-highlight");
    setTimeout(() => target.classList.remove("pulse-highlight"), 1200);
  }
}

function setupMenu() {
  const navs = [navFeed, navNotifications, navNotices, navEvents].filter(Boolean);
  navs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.getAttribute("data-view");
      switchView(v || "feed");
    });
  });

  // Botões de ação
  btnMarkRead?.addEventListener("click", () => {
    setNotifLastSeenNow();
    setNotifExpire();
    loadNotificationsBadge();
    loadNotificationsView();
  });

  // Central "Novo aviso fixado" (somente admin)
  const isAdmin = currentProfile?.role === "admin";
  if (btnNewPinnedCenter) btnNewPinnedCenter.style.display = isAdmin ? "" : "none";
  btnNewPinnedCenter?.addEventListener("click", () => btnNewPinned?.click());

  // Eventos
  btnNewEvent?.addEventListener("click", () => {
    if (currentProfile?.role !== "admin") {
      // membros apenas veem a lista; criação é do admin
      return;
    }
    openEventModal({ mode: "create" });
  });

  // Restaura última view
  const saved = localStorage.getItem("active_view");
  if (saved && VIEWS.includes(saved)) switchView(saved);
  else switchView("feed");
}

// ----------------- Notificações -----------------
async function fetchMyPostIds() {
  const { data, error } = await supa.from("posts").select("id").eq("user_id", currentUser.id).limit(300);
  if (error) return [];
  return (data || []).map((p) => p.id).filter(Boolean);
}

function mkAvatarInitials(name) {
  const n = (name || "U").trim();
  const parts = n.split(/\s+/).filter(Boolean);
  const a = (parts[0] || "U")[0] || "U";
  const b = (parts[1] || "")[0] || "";
  return (a + b).toUpperCase();
}

async function fetchNotifications(limit = 50) {
  const items = [];
  const seen = new Set();

  const myPostIds = await fetchMyPostIds();
  if (!myPostIds.length) return [];


  const cutoffIso = new Date(Date.now() - NOTIF_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Likes em posts meus
  try {
    const { data } = await supa
      .from("likes")
      .select("created_at, user_id, post_id")
      .in("post_id", myPostIds)
      .neq("user_id", currentUser.id)
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(limit);

    (data || []).forEach((l) => {
      const key = `like:${l.user_id}:${l.post_id}:${l.created_at}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({
        type: "like",
        id: key,
        created_at: l.created_at,
        actor_id: l.user_id,
        post_id: l.post_id,
      });
    });
  } catch (_) {}

  // Comentários em posts meus (inclui respostas)
  try {
    const { data } = await supa
      .from("comments")
      .select("id, created_at, user_id, post_id, parent_comment_id, content")
      .in("post_id", myPostIds)
      .neq("user_id", currentUser.id)
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(limit);

    (data || []).forEach((c) => {
      const key = `comment:${c.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({
        type: c.parent_comment_id ? "reply_on_post" : "comment",
        id: c.id,
        created_at: c.created_at,
        actor_id: c.user_id,
        post_id: c.post_id,
        text: c.content || "",
      });
    });
  } catch (_) {}

  // Respostas aos meus comentários (quando eu comento em qualquer post)
  try {
    const { data: myComments } = await supa
      .from("comments")
      .select("id")
      .eq("user_id", currentUser.id)
      .limit(300);

    const myCommentIds = (myComments || []).map((x) => x.id).filter(Boolean);

    if (myCommentIds.length) {
      const { data } = await supa
        .from("comments")
        .select("id, created_at, user_id, post_id, parent_comment_id, content")
        .in("parent_comment_id", myCommentIds)
        .neq("user_id", currentUser.id)
        .gte("created_at", cutoffIso)
        .order("created_at", { ascending: false })
        .limit(limit);

      (data || []).forEach((c) => {
        const key = `reply:${c.id}`;
        if (seen.has(key)) return;
        seen.add(key);
        items.push({
          type: "reply",
          id: c.id,
          created_at: c.created_at,
          actor_id: c.user_id,
          post_id: c.post_id,
          text: c.content || "",
        });
      });

      // Curtidas nos meus comentários (se a tabela existir)
      try {
        const { data: cl } = await supa
          .from("comment_likes")
          .select("created_at, user_id, comment_id")
          .in("comment_id", myCommentIds)
          .neq("user_id", currentUser.id)
          .order("created_at", { ascending: false })
          .limit(limit);

        (cl || []).forEach((l) => {
          const key = `comment_like:${l.user_id}:${l.comment_id}:${l.created_at}`;
          if (seen.has(key)) return;
          seen.add(key);
          items.push({
            type: "comment_like",
            id: key,
            created_at: l.created_at,
            actor_id: l.user_id,
            post_id: null,
            comment_id: l.comment_id,
          });
        });
      } catch (_) {}
    }
  } catch (_) {}

  // Ordena por data
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  await hydrateProfiles(items.map((x) => x.actor_id));
  items.forEach((x) => {
    if (!x.actor) x.actor = profilesMap[x.actor_id] || "Usuário";
  });

  return items.slice(0, limit);
}

function notifMessage(n) {
  const actor = n.actor || "Alguém";
  if (n.type === "like") return `${actor} curtiu seu post`;
  if (n.type === "comment") return `${actor} comentou no seu post`;
  if (n.type === "reply") return `${actor} respondeu seu comentário`;
  if (n.type === "comment_like") return `${actor} curtiu seu comentário`;
  // fallback
  return `${actor} interagiu`;
}

function notifSnippet(n) {
  const t = (n.text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > 70 ? t.slice(0, 70) + "…" : t;
}

function renderNotifItem(n, unread) {
  const item = document.createElement("div");
  item.className = "view-item" + (unread ? " unread" : "");
  item.dataset.postId = n.post_id || "";

  const avatar = document.createElement("div");
  avatar.className = "vi-avatar";
  avatar.textContent = mkAvatarInitials(n.actor);

  const main = document.createElement("div");
  main.className = "vi-main";

  const title = document.createElement("div");
  title.className = "vi-title";
  title.textContent = notifMessage(n);

  const sub = document.createElement("div");
  sub.className = "vi-sub";
  const sn = notifSnippet(n);
  sub.textContent = sn || (n.type === "comment_like" ? "Toque para ver detalhes" : "Toque para abrir o post");

  const meta = document.createElement("div");
  meta.className = "vi-meta";
  meta.textContent = fmtDateBR(n.created_at);

  main.appendChild(title);
  main.appendChild(sub);
  main.appendChild(meta);

  item.appendChild(avatar);
  item.appendChild(main);

  item.addEventListener("click", async () => {
    // garante feed carregado
    if (n.post_id) {
      // se post não existe no DOM (por limitação de 50), recarrega
      if (!document.querySelector(`.post[data-post-id="${n.post_id}"]`)) {
        await carregarFeed();
      }
      scrollToPost(n.post_id);
    } else {
      alert("Essa notificação não está vinculada diretamente a um post (em breve).");
    }
  });

  return item;
}

async function loadNotificationsBadge() {
  if (!notifBadge) return;

  const lastSeen = getNotifLastSeen();
  const list = await fetchNotifications(60);
  const unreadCount = list.filter((n) => new Date(n.created_at) > lastSeen).length;

  if (unreadCount > 0) {
    notifBadge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
    notifBadge.style.display = "inline-flex";
  } else {
    notifBadge.style.display = "none";
  }
}

async function loadNotificationsView() {
  if (!notifList || !notifEmpty) return;

  notifList.innerHTML = "";
  notifEmpty.style.display = "none";

  const lastSeen = getNotifLastSeen();
  const list = await fetchNotifications(60);

  if (!list.length) {
    notifEmpty.textContent = "Sem notificações.";
    notifEmpty.style.display = "";
    return;
  }

  list.forEach((n) => {
    const unread = new Date(n.created_at) > lastSeen;
    notifList.appendChild(renderNotifItem(n, unread));
  });
}

// ----------------- Avisos (view) -----------------
async function loadNoticesView() {
  if (!noticesList || !noticesEmpty) return;

  noticesList.innerHTML = "";
  noticesEmpty.style.display = "none";

  if (!hasPinnedColumn) {
    noticesEmpty.textContent = "Para usar avisos, adicione a coluna 'pinned' na tabela posts.";
    noticesEmpty.style.display = "";
    return;
  }

  const { data, error } = await supa
    .from("posts")
    .select("id, caption, created_at, user_id, pinned")
    .eq("pinned", true)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    noticesEmpty.textContent = "Erro ao carregar avisos.";
    noticesEmpty.style.display = "";
    return;
  }

  const list = Array.isArray(data) ? data : [];
  if (!list.length) {
    noticesEmpty.textContent = "Nenhum aviso fixado ainda.";
    noticesEmpty.style.display = "";
    return;
  }

  list.forEach((p) => {
    const item = document.createElement("div");
    item.className = "view-item";
    const avatar = document.createElement("div");
    avatar.className = "vi-avatar";
    avatar.textContent = mkAvatarInitials(profilesMap[p.user_id] || "Usuário");

    const main = document.createElement("div");
    main.className = "vi-main";
    const title = document.createElement("div");
    title.className = "vi-title";
    title.textContent = (profilesMap[p.user_id] || "Usuário") + " • Aviso fixado";

    const sub = document.createElement("div");
    sub.className = "vi-sub";
    const txt = (p.caption || "").replace(/\s+/g, " ").trim() || "(sem texto)";
    sub.textContent = txt.length > 90 ? txt.slice(0, 90) + "…" : txt;

    const meta = document.createElement("div");
    meta.className = "vi-meta";
    meta.textContent = fmtDateBR(p.created_at);

    main.appendChild(title);
    main.appendChild(sub);
    main.appendChild(meta);

    item.appendChild(avatar);
    item.appendChild(main);

    item.addEventListener("click", async () => {
      if (!document.querySelector(`.post[data-post-id="${p.id}"]`)) {
        await carregarFeed();
      }
      scrollToPost(p.id);
    });

    noticesList.appendChild(item);
  });
}


// ----------------- Eventos -----------------
let hasEventsTable = true;
let hasEventRsvpsTable = true;
let eventModal = null;
let editingEventId = null;
let eventsCache = []; // lista atual em memória
let myRsvpMap = {}; // event_id -> status

function ensureEventStyles() {
  if (document.getElementById("eventStyles")) return;
  const style = document.createElement("style");
  style.id = "eventStyles";
  style.textContent = `
    .event-pill{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      height: 26px;
      padding: 0 10px;
      border-radius: 999px;
      border: 1px solid var(--border-color);
      background: var(--button-bg);
      color: var(--text-primary);
      font-weight: 800;
      font-size: 12px;
      cursor: pointer;
      user-select: none;
    }
    .event-pill.active{
      border-color: rgba(212,175,55,0.75);
      box-shadow: 0 0 0 4px rgba(212,175,55,0.12);
    }
    .event-meta-row{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      margin-top: 8px;
    }
    .event-date-badge{
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      width: 44px;
      height: 44px;
      border-radius: 14px;
      background: rgba(212,175,55,0.18);
      border: 1px solid rgba(212,175,55,0.35);
      color: var(--text-primary);
      font-weight: 900;
      line-height: 1.0;
      flex: 0 0 44px;
    }
    .event-date-badge .d{ font-size: 14px; }
    .event-date-badge .m{ font-size: 11px; opacity: .85; margin-top: 2px; }
    .event-actions{
      display:flex;
      gap:8px;
      align-items:center;
      margin-left:auto;
      flex-wrap:wrap;
    }
    .event-modal-grid label{ display:block; margin-top: 10px; font-weight: 800; color: var(--text-primary); font-size: 13px; }
    .event-modal-grid input, .event-modal-grid textarea{
      width: 100%;
      margin-top: 6px;
      padding: 10px 12px;
      border-radius: 14px;
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      color: var(--text-primary);
      outline: none;
    }
    .event-modal-grid textarea{ resize: vertical; min-height: 90px; }
    .event-modal-row{ display:flex; gap:10px; }
    .event-modal-row > div{ flex:1; }
    .event-check{
      display:flex;
      align-items:center;
      gap:10px;
      margin-top: 10px;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 700;
    }
    .event-check input{ width: 16px; height: 16px; }
    .event-divider{ height: 1px; background: var(--border-light); margin: 12px 0; opacity: .9; }
  `;
  document.head.appendChild(style);
}

function fmtEventDate(startAt, endAt, allDay) {
  try {
    const s = new Date(startAt);
    const d = s.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    if (allDay) return `${d} (dia todo)`;
    const t = s.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (!endAt) return `${d} • ${t}`;
    const e = new Date(endAt);
    const t2 = e.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${d} • ${t}–${t2}`;
  } catch {
    return "";
  }
}

function monthShortPT(dateObj) {
  const m = dateObj.toLocaleString("pt-BR", { month: "short" });
  return (m || "").replace(".", "").toUpperCase();
}

function rsvpLabel(status) {
  if (status === "going") return "Vou";
  if (status === "maybe") return "Talvez";
  if (status === "no") return "Não vou";
  return "Responder";
}

function isoForDatetimeLocal(dateObj) {
  const pad = (n) => String(n).padStart(2, "0");
  const y = dateObj.getFullYear();
  const m = pad(dateObj.getMonth() + 1);
  const d = pad(dateObj.getDate());
  const hh = pad(dateObj.getHours());
  const mm = pad(dateObj.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function ensureEventModal() {
  ensureEventStyles();
  if (eventModal) return eventModal;

  eventModal = document.createElement("div");
  eventModal.className = "modal";
  eventModal.id = "eventModal";
  eventModal.setAttribute("aria-hidden", "true");

  const card = document.createElement("div");
  card.className = "modal-card";

  const closeBtn = document.createElement("button");
  closeBtn.className = "modal-close";
  closeBtn.type = "button";
  closeBtn.textContent = "×";
  closeBtn.setAttribute("aria-label", "Fechar");
  closeBtn.addEventListener("click", () => closeEventModal());

  const h3 = document.createElement("h3");
  h3.id = "eventModalTitle";
  h3.textContent = "Evento";

  const grid = document.createElement("div");
  grid.className = "event-modal-grid";

  grid.innerHTML = `
    <label for="evTitle">Título</label>
    <input id="evTitle" type="text" placeholder="Ex.: Reunião de domingo" />

    <div class="event-modal-row">
      <div>
        <label for="evStart">Início</label>
        <input id="evStart" type="datetime-local" />
      </div>
      <div>
        <label for="evEnd">Fim (opcional)</label>
        <input id="evEnd" type="datetime-local" />
      </div>
    </div>

    <div class="event-check">
      <input id="evAllDay" type="checkbox" />
      <label for="evAllDay" style="margin:0; font-weight:800; cursor:pointer;">Dia todo</label>
    </div>

    <label for="evLocation">Local (opcional)</label>
    <input id="evLocation" type="text" placeholder="Ex.: Salão principal" />

    <label for="evDesc">Descrição (opcional)</label>
    <textarea id="evDesc" placeholder="Detalhes do evento..."></textarea>

    <div class="event-divider"></div>

    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content:space-between;">
      <div id="evRsvpRow" class="event-meta-row" style="margin:0;">
        <span style="color:var(--text-muted); font-size:12px; font-weight:800;">Sua resposta:</span>
        <button type="button" class="event-pill" data-rsvp="going">Vou</button>
        <button type="button" class="event-pill" data-rsvp="maybe">Talvez</button>
        <button type="button" class="event-pill" data-rsvp="no">Não vou</button>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button type="button" class="btn secondary" id="evDelete" style="display:none;">Excluir</button>
      </div>
    </div>
  `;

  const actions = document.createElement("div");
  actions.className = "modal-actions";
  actions.innerHTML = `
    <button class="btn secondary" id="evCancel" type="button">Fechar</button>
    <button class="btn primary" id="evSave" type="button">Salvar</button>
  `;

  card.appendChild(closeBtn);
  card.appendChild(h3);
  card.appendChild(grid);
  card.appendChild(actions);

  eventModal.appendChild(card);
  document.body.appendChild(eventModal);

  // backdrop click
  eventModal.addEventListener("click", (e) => {
    if (e.target === eventModal) closeEventModal();
  });

  // wire buttons
  eventModal.querySelector("#evCancel").addEventListener("click", () => closeEventModal());
  eventModal.querySelector("#evSave").addEventListener("click", () => saveEventFromModal());
  eventModal.querySelector("#evDelete").addEventListener("click", () => deleteEventFromModal());

  // RSVP buttons
  eventModal.querySelectorAll(".event-pill[data-rsvp]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const status = btn.getAttribute("data-rsvp");
      if (!editingEventId) return;
      await setMyEventRsvp(editingEventId, status);
      renderEventModalRsvp(editingEventId);
      // atualiza lista
      await loadEventsView();
    });
  });

  return eventModal;
}

function openEventModal({ mode = "view", event = null } = {}) {
  ensureEventModal();
  const isAdmin = currentProfile?.role === "admin";

  const titleEl = eventModal.querySelector("#eventModalTitle");
  const evTitle = eventModal.querySelector("#evTitle");
  const evStart = eventModal.querySelector("#evStart");
  const evEnd = eventModal.querySelector("#evEnd");
  const evAllDay = eventModal.querySelector("#evAllDay");
  const evLocation = eventModal.querySelector("#evLocation");
  const evDesc = eventModal.querySelector("#evDesc");
  const btnSave = eventModal.querySelector("#evSave");
  const btnDelete = eventModal.querySelector("#evDelete");

  if (mode === "create") {
    editingEventId = null;
    titleEl.textContent = "Novo evento";
    evTitle.value = "";
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    evStart.value = isoForDatetimeLocal(now);
    evEnd.value = "";
    evAllDay.checked = false;
    evLocation.value = "";
    evDesc.value = "";

    // admin pode salvar, não tem delete
    btnSave.style.display = isAdmin ? "" : "none";
    btnDelete.style.display = "none";

    // RSVP desabilitado (não existe evento ainda)
    setRsvpRowEnabled(false);

    // Campos editáveis só para admin
    setEventFieldsEnabled(isAdmin);

  } else {
    editingEventId = event?.id || null;
    titleEl.textContent = "Evento";
    evTitle.value = event?.title || "";
    evStart.value = event?.start_at ? isoForDatetimeLocal(new Date(event.start_at)) : "";
    evEnd.value = event?.end_at ? isoForDatetimeLocal(new Date(event.end_at)) : "";
    evAllDay.checked = !!event?.all_day;
    evLocation.value = event?.location || "";
    evDesc.value = event?.description || "";

    // admin pode salvar/editar e excluir
    btnSave.style.display = isAdmin ? "" : "none";
    btnDelete.style.display = isAdmin ? "" : "none";

    setEventFieldsEnabled(isAdmin);

    // RSVP habilitado para todos (se tabela existir)
    setRsvpRowEnabled(hasEventRsvpsTable);

    // renderiza estado do RSVP
    renderEventModalRsvp(editingEventId);
  }

  eventModal.classList.add("show");
  eventModal.setAttribute("aria-hidden", "false");
}

function closeEventModal() {
  if (!eventModal) return;
  eventModal.classList.remove("show");
  eventModal.setAttribute("aria-hidden", "true");
  editingEventId = null;
}

function setEventFieldsEnabled(enabled) {
  if (!eventModal) return;
  ["#evTitle", "#evStart", "#evEnd", "#evAllDay", "#evLocation", "#evDesc"].forEach((sel) => {
    const el = eventModal.querySelector(sel);
    if (!el) return;
    el.disabled = !enabled;
  });
}

function setRsvpRowEnabled(enabled) {
  if (!eventModal) return;
  eventModal.querySelectorAll(".event-pill[data-rsvp]").forEach((btn) => {
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? "1" : "0.5";
    btn.style.pointerEvents = enabled ? "auto" : "none";
  });
}

function renderEventModalRsvp(eventId) {
  if (!eventModal || !eventId) return;
  const status = myRsvpMap[eventId] || "";
  eventModal.querySelectorAll(".event-pill[data-rsvp]").forEach((btn) => {
    const s = btn.getAttribute("data-rsvp");
    btn.classList.toggle("active", s === status);
  });
}

// Create/Update event
async function saveEventFromModal() {
  if (currentProfile?.role !== "admin") return;
  if (!eventModal) return;

  const evTitle = eventModal.querySelector("#evTitle").value.trim();
  const evStart = eventModal.querySelector("#evStart").value;
  const evEnd = eventModal.querySelector("#evEnd").value;
  const evAllDay = !!eventModal.querySelector("#evAllDay").checked;
  const evLocation = eventModal.querySelector("#evLocation").value.trim();
  const evDesc = eventModal.querySelector("#evDesc").value.trim();

  if (!evTitle) { alert("Título é obrigatório."); return; }
  if (!evStart) { alert("Data/hora de início é obrigatória."); return; }

  const payload = {
    title: evTitle,
    start_at: new Date(evStart).toISOString(),
    end_at: evEnd ? new Date(evEnd).toISOString() : null,
    all_day: evAllDay,
    location: evLocation || null,
    description: evDesc || null,
  };

  try {
    if (!hasEventsTable) return;

    if (!editingEventId) {
      payload.created_by = currentUser.id;
      const { error } = await supa.from("events").insert(payload);
      if (error) throw error;
    } else {
      const { error } = await supa.from("events").update(payload).eq("id", editingEventId);
      if (error) throw error;
    }

    closeEventModal();
    await loadEventsView();
  } catch (e) {
    console.error(e);
    alert(e?.message || "Erro ao salvar evento.");
  }
}

async function deleteEventFromModal() {
  if (currentProfile?.role !== "admin") return;
  if (!editingEventId) return;
  const ok = confirm("Excluir este evento?");
  if (!ok) return;

  try {
    const { error } = await supa.from("events").delete().eq("id", editingEventId);
    if (error) throw error;
    closeEventModal();
    await loadEventsView();
  } catch (e) {
    console.error(e);
    alert(e?.message || "Erro ao excluir evento.");
  }
}

async function loadMyRsvps(eventIds) {
  myRsvpMap = {};
  if (!hasEventRsvpsTable || !eventIds?.length) return;

  try {
    const { data, error } = await supa
      .from("event_rsvps")
      .select("event_id, status")
      .eq("user_id", currentUser.id)
      .in("event_id", eventIds);

    if (error) {
      // tabela pode não existir
      if ((error.message || "").toLowerCase().includes("does not exist")) hasEventRsvpsTable = false;
      return;
    }

    (data || []).forEach((r) => {
      if (r?.event_id) myRsvpMap[r.event_id] = r.status;
    });
  } catch (_) {}
}

async function setMyEventRsvp(eventId, status) {
  if (!hasEventRsvpsTable) return;

  try {
    const { error } = await supa.from("event_rsvps").upsert(
      { event_id: eventId, user_id: currentUser.id, status },
      { onConflict: "event_id,user_id" }
    );
    if (error) throw error;
    myRsvpMap[eventId] = status;
  } catch (e) {
    console.error(e);
    alert(e?.message || "Erro ao responder evento.");
  }
}

function renderEventsList(events) {
  eventsList.innerHTML = "";
  if (!events?.length) {
    eventsEmpty.style.display = "";
    return;
  }
  eventsEmpty.style.display = "none";

  events.forEach((ev) => {
    const item = document.createElement("div");
    item.className = "view-item";
    item.dataset.eventId = ev.id;

    const d = new Date(ev.start_at);
    const avatar = document.createElement("div");
    avatar.className = "event-date-badge";
    avatar.innerHTML = `<div class="d">${String(d.getDate()).padStart(2, "0")}</div><div class="m">${monthShortPT(d)}</div>`;

    const main = document.createElement("div");
    main.className = "vi-main";

    const title = document.createElement("div");
    title.className = "vi-title";
    title.textContent = ev.title || "Evento";

    const sub = document.createElement("div");
    sub.className = "vi-sub";
    const when = fmtEventDate(ev.start_at, ev.end_at, ev.all_day);
    const loc = ev.location ? ` • ${ev.location}` : "";
    sub.textContent = when + loc;

    const meta = document.createElement("div");
    meta.className = "vi-meta";
    const mine = myRsvpMap[ev.id];
    meta.textContent = mine ? `Sua resposta: ${rsvpLabel(mine)}` : "Toque para ver / responder";

    main.appendChild(title);
    main.appendChild(sub);
    main.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "event-actions";

    // RSVP pill (mostra status atual; clique abre modal)
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "event-pill";
    pill.textContent = mine ? rsvpLabel(mine) : "Responder";
    pill.addEventListener("click", (e) => {
      e.stopPropagation();
      openEventModal({ mode: "view", event: ev });
    });

    actions.appendChild(pill);

    // admin quick delete/edit via modal
    if (currentProfile?.role === "admin") {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "event-pill";
      edit.textContent = "Editar";
      edit.addEventListener("click", (e) => {
        e.stopPropagation();
        openEventModal({ mode: "view", event: ev });
        // campos já ficam editáveis pro admin e tem salvar/excluir
      });
      actions.appendChild(edit);
    }

    item.appendChild(avatar);
    item.appendChild(main);
    item.appendChild(actions);

    item.addEventListener("click", () => openEventModal({ mode: "view", event: ev }));

    eventsList.appendChild(item);
  });
}

function getShowPastEvents() {
  try { return localStorage.getItem("events_show_past") === "1"; } catch { return false; }
}
function setShowPastEvents(v) {
  try { localStorage.setItem("events_show_past", v ? "1" : "0"); } catch (_) {}
}

async function loadEventsView() {
  if (!eventsList || !eventsEmpty) return;

  ensureEventStyles();

  eventsEmpty.textContent = "Carregando eventos…";
  eventsEmpty.style.display = "";
  eventsList.innerHTML = "";

  // botão novo evento só para admin
  if (btnNewEvent) btnNewEvent.style.display = currentProfile?.role === "admin" ? "" : "none";

  // se tabela não existir, orienta
  if (!hasEventsTable) {
    eventsEmpty.textContent = "Eventos não configurado no Supabase. Rode o SQL da seção 'Eventos'.";
    return;
  }

  try {
    const { data, error } = await supa
      .from("events")
      .select("id, title, description, location, start_at, end_at, all_day, created_by, created_at")
      .order("start_at", { ascending: true })
      .limit(200);

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("does not exist") || msg.includes("relation") && msg.includes("events")) {
        hasEventsTable = false;
        eventsEmpty.textContent = "Eventos não configurado no Supabase. Rode o SQL da seção 'Eventos'.";
        return;
      }
      throw error;
    }

    let events = Array.isArray(data) ? data : [];

    // filtro: por padrão só próximos e os que começaram recentemente
    const showPast = getShowPastEvents();
    const now = new Date();
    const cutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 dias atrás (mantém eventos recentes)
    if (!showPast) {
      events = events.filter((ev) => {
        const endOrStart = ev.end_at ? new Date(ev.end_at) : (ev.start_at ? new Date(ev.start_at) : null);
        if (!endOrStart) return false;
        return endOrStart >= cutoff;
      });
    }

    eventsCache = events;

    // carrega RSVPs do usuário
    await loadMyRsvps(events.map((e) => e.id));

    // atualiza rótulos com RSVP
    renderEventsList(eventsCache);

    // Estado vazio
    if (!eventsCache.length) {
      eventsEmpty.textContent = showPast ? "Nenhum evento encontrado." : "Sem eventos futuros. (Dica: admin pode criar em '＋ Novo evento')";
      eventsEmpty.style.display = "";
    }

  } catch (e) {
    console.error(e);
    eventsEmpty.textContent = e?.message || "Erro ao carregar eventos.";
    eventsEmpty.style.display = "";
  }
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


// ----------------- Realtime (atualiza notificações/atividade ao vivo) -----------------
var realtimeChannel = window.__fsjpiiRealtimeChannel || null;

function isViewActive(viewEl) {
  if (!viewEl) return false;
  return viewEl.style.display !== "none" && !viewEl.classList.contains("hidden");
}

function refreshLiveWidgetsSoon() {
  if (refreshLiveWidgetsSoon._t) clearTimeout(refreshLiveWidgetsSoon._t);
  refreshLiveWidgetsSoon._t = setTimeout(async () => {
    try {
      await loadNotificationsBadge();
      if (isViewActive(viewNotifications)) await loadNotificationsView();
      await loadPinnedSidebar();
      await loadActivitySidebar();
      if (isViewActive(viewNotices)) await loadNoticesView();
      if (isViewActive(viewEvents)) await loadEventsView();
    } catch (_) {}
  }, 350);
}

function initRealtime() {
  try {
    if (!supa?.channel) return;
    if (realtimeChannel) return;

    realtimeChannel = supa
      .channel("live-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => refreshLiveWidgetsSoon())
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, () => refreshLiveWidgetsSoon())
      .on("postgres_changes", { event: "*", schema: "public", table: "comment_likes" }, () => refreshLiveWidgetsSoon())
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => refreshLiveWidgetsSoon())
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => refreshLiveWidgetsSoon())
      .on("postgres_changes", { event: "*", schema: "public", table: "event_rsvps" }, () => refreshLiveWidgetsSoon())
      .subscribe();
  } catch (e) {
    console.warn("Realtime não disponível:", e?.message || e);
  }
}


async function init() {
  let session = null;
  try {
    const { data, error } = await supa.auth.getSession();
    if (error) throw error;
    session = data?.session || null;
  } catch (e) {
    console.error(e);
    alert("Não foi possível conectar ao Supabase (sessão). Verifique sua internet/VPN e as credenciais do Supabase.");
    return;
  }

  if (!session) {
    window.location.href = "index.html";
    return;
  }

  currentUser = session.user;

  cleanupNotifExpire();

  // Carrega perfil com fallback caso colunas opcionais (bio/avatar_url) não existam ainda
  let profile = null;
  try {
    let res = await supa
      .from("profiles")
      .select("id, role, full_name, bio, avatar_url")
      .eq("id", currentUser.id)
      .single();

    if (res.error) {
      const msg = String(res.error?.message || "");
      const det = String(res.error?.details || "");
      if (msg.includes("does not exist") || det.includes("does not exist") || msg.includes("column") || det.includes("column")) {
        res = await supa
          .from("profiles")
          .select("id, role, full_name")
          .eq("id", currentUser.id)
          .single();
      }
    }

    if (res.error) throw res.error;
    profile = res.data;
  } catch (e) {
    console.error(e);
    alert("Erro ao carregar perfil. Se você ainda não criou bio/avatar_url, rode o SQL das colunas opcionais — ou verifique RLS/permissões.");
    return;
  }

  currentProfile = profile;
  setTopbarTitle();
  setMiniProfileUI();
  wireProfileMini();
  initRealtime();

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

  setupMenu();
  await loadNotificationsBadge();
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
    .select("id, content, created_at, user_id, parent_comment_id")
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
      .select("id, content, created_at, user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: !!ascending })
      .limit(typeof limit === "number" ? limit : 1000);
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  await hydrateProfiles((data || []).map((x) => x.user_id));
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
      .select("id, content, created_at, user_id, parent_comment_id")
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
  author.style.cursor = "pointer";
  author.title = "Ver perfil";
  author.addEventListener("click", (e) => { e.stopPropagation(); openViewProfileModal(post.user_id); });

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
          if (viewNotices?.classList.contains("view-active")) await loadNoticesView();
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

    const isVideo = isVideoPath(post.image_url);

    let mediaEl;
    if (isVideo) {
      const v = document.createElement("video");
      v.src = imgUrl;
      v.muted = true;
      v.playsInline = true;
      v.preload = "metadata";
      v.style.width = "100%";
      v.style.display = "block";
      v.style.maxHeight = "520px";
      v.style.objectFit = "cover";
      v.style.background = "black";
      v.style.userSelect = "none";
      v.style.pointerEvents = "none";
      mediaEl = v;
    } else {
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
      mediaEl = img;
    }

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
    expandIcon.innerHTML = isVideoPath(post.image_url) ? "▶ Clique para assistir" : "🔍 Clique para expandir";
    expandIcon.style.opacity = "0.7";
    expandIcon.style.pointerEvents = "none";
    overlay.appendChild(expandIcon);

    imgContainer.appendChild(mediaEl);
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
          if (isVideoPath(post.image_url)) abrirVideoTelaCheia(imgUrl);
          else abrirImagemTelaCheia(imgUrl, imgContainer);
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


function abrirVideoTelaCheia(url) {
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

    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.playsInline = true;
    video.autoplay = true;
    video.style.maxWidth = "90vw";
    video.style.maxHeight = "90vh";
    video.style.borderRadius = "10px";
    video.style.cursor = "default";
    video.style.background = "black";

    modal.appendChild(video);

    // fecha ao clicar fora
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    // ESC
    const onKey = (e) => {
      if (e.key === "Escape") {
        modal.remove();
      }
    };
    document.addEventListener("keydown", onKey);
    modal.addEventListener("remove", () => document.removeEventListener("keydown", onKey));

    document.body.appendChild(modal);

    // tenta tocar
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
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

    const authorName = ((c.user_id === currentUser?.id ? currentProfile?.full_name : profilesMap[c.user_id]) || "Usuário").trim();

    const meta = document.createElement("div");
    meta.style.fontWeight = "800";
    meta.style.fontSize = "13px";
    meta.style.color = "var(--text-primary)";
    meta.textContent = `${authorName}  ${fmtDateBR(c.created_at)}`;
    meta.style.cursor = "pointer";
    meta.title = "Ver perfil";
    meta.addEventListener("click", (e) => { e.stopPropagation(); openViewProfileModal(c.user_id); });

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

    const authorName = ((c.user_id === currentUser?.id ? currentProfile?.full_name : profilesMap[c.user_id]) || "Usuário").trim();

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

              const rAuthor = ((r.user_id === currentUser?.id ? currentProfile?.full_name : profilesMap[r.user_id]) || "Usuário").trim();

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
    setPreviewVisible(true);
    const dataUrl = reader.result;
    if (pendingFile?.type?.startsWith("video/")) {
      setPreviewMode("video", dataUrl);
    } else {
      setPreviewMode("image", dataUrl);
    }
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
  setPreviewMode("none");

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
    if (viewNotices?.classList.contains("view-active")) await loadNoticesView().catch(() => {});
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
// ----------------- Realtime (atualiza notificações/atividade ao vivo) -----------------
var realtimeChannel = window.__fsjpiiRealtimeChannel || null;

function isViewActive(viewEl) {
  if (!viewEl) return false;
  return viewEl.style.display !== "none" && !viewEl.classList.contains("hidden");
}

function refreshLiveWidgetsSoon() {
  // Debounce simples
  if (refreshLiveWidgetsSoon._t) clearTimeout(refreshLiveWidgetsSoon._t);
  refreshLiveWidgetsSoon._t = setTimeout(async () => {
    try {
      await loadNotificationsBadge();
      if (isViewActive(viewNotifications)) await loadNotificationsView();
      await loadPinnedSidebar();
      await loadActivitySidebar();
      if (isViewActive(viewNotices)) await loadNoticesView();
      if (isViewActive(viewEvents)) await loadEventsView();
    } catch (_) {}
  }, 300);
}

function initRealtime() {
  try {
    if (!supa?.channel) return;
    if (realtimeChannel) return;

    realtimeChannel = supa
      .channel("live-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => refreshLiveWidgetsSoon())
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, () => refreshLiveWidgetsSoon())
      .on("postgres_changes", { event: "*", schema: "public", table: "comment_likes" }, () => refreshLiveWidgetsSoon())
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => refreshLiveWidgetsSoon())
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => refreshLiveWidgetsSoon())
      .on("postgres_changes", { event: "*", schema: "public", table: "event_rsvps" }, () => refreshLiveWidgetsSoon())
      .subscribe();
  } catch (e) {
    console.warn("Realtime não disponível:", e?.message || e);
  }
}

// feed.js - VERSÃO COMPLETA COM TODAS AS CORREÇÕES
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
let editingCommentId = null;
let profilesMap = {}; 

// ----------------- TEMA -----------------
function applyThemeToDynamicElements() {
  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDarkMode ? '#ffffff' : '#222222';
  const bgColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  
  // Atualizar botões dinâmicos
  document.querySelectorAll('.btn-danger').forEach(btn => {
    btn.style.color = textColor;
  });
  
  // Atualizar botões de ação
  document.querySelectorAll('.post-actions button').forEach(btn => {
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
  
  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
  const bg = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const border = isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.1)';
  const hoverBg = isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
  const hoverBorder = isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)';

  // estilo "bonito" direto no JS
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
  
  svg.style.color = isDarkMode ? '#ffffff' : '#222222';
  btn.appendChild(svg);

  if (variant === "danger") {
    btn.style.borderColor = "rgba(255, 80, 120, 0.25)";
  }

  btn.addEventListener("mouseenter", () => {
    btn.style.background = hoverBg;
    btn.style.transform = "translateY(-1px)";
    btn.style.borderColor = variant === "danger"
      ? "rgba(255, 80, 120, 0.45)"
      : hoverBorder;
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = bg;
    btn.style.transform = "translateY(0)";
    btn.style.borderColor = variant === "danger"
      ? "rgba(255, 80, 120, 0.25)"
      : border;
  });

  return btn;
}

// Storage (bucket public)
function getPublicImageUrl(path) {
  const { data } = supa.storage.from("posts").getPublicUrl(path);
  return data?.publicUrl || "";
}

// ----------------- Função para abrir modal com quem curtiu -----------------
async function abrirModalCurtidas(postId, postEl = null) {
  // Mostrar estado de carregamento
  likesList.innerHTML = `
    <div class="likes-empty">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Carregando curtidas...</p>
    </div>
  `;
  
  // Abrir modal
  likesModal.classList.add("show");
  likesModal.setAttribute("aria-hidden", "false");
  
  try {
    // BUSCAR CURTIDAS COM LEFT JOIN PARA INCLUIR USUÁRIOS SEM PERFIL
    const { data: likes, error } = await supa
      .from("likes")
      .select(`
        created_at,
        user_id,
        profiles:profiles (
          full_name
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    
    // VERIFICAR SE HÁ DISCREPÂNCIA ENTRE O CONTADOR E A LISTA REAL
    // Isso ajuda a identificar problemas de sincronização
    console.log(`Curtidas carregadas: ${likes?.length || 0}`, likes);
    
    // Atualizar contador se fornecido e se houver discrepância
    if (postEl) {
      const likesSpan = postEl.querySelector(".likes");
      if (likesSpan) {
        const currentDisplayCount = parseInt(likesSpan.textContent.split(" ")[0]) || 0;
        const actualCount = likes?.length || 0;
        
        // Se houver diferença, atualiza o display
        if (currentDisplayCount !== actualCount) {
          likesSpan.textContent = actualCount + " curtidas";
          
          // Atualizar também no objeto post
          const postContainer = postEl.closest('.post');
          if (postContainer) {
            const postIdAttr = postContainer.dataset.postId;
            // Podemos atualizar a visual view se necessário
            const likeCountElement = postContainer.querySelector('.likes');
            if (likeCountElement) {
              likeCountElement.textContent = actualCount + " curtidas";
            }
          }
        }
      }
    }
    
    // Renderizar lista
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
    
    // Criar header com contador
    const header = document.createElement("div");
    header.className = "likes-count-header";
    header.textContent = `${likes.length} ${likes.length === 1 ? 'curtida' : 'curtidas'}`;
    
    // Criar lista de usuários
    const usersList = document.createElement("div");
    
    let hasCurrentUser = false;
    
    likes.forEach((like, index) => {
      const userDiv = document.createElement("div");
      userDiv.className = "like-user";
      
      // Criar avatar com inicial
      const avatarDiv = document.createElement("div");
      avatarDiv.className = "like-user-avatar";
      
      let userName = "Usuário";
      let initials = "U";
      const isCurrentUser = like.user_id === currentUser?.id;
      
      if (isCurrentUser) {
        hasCurrentUser = true;
      }
      
      if (like.profiles && like.profiles.full_name) {
        userName = like.profiles.full_name;
        initials = userName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
      } else if (isCurrentUser && currentProfile?.full_name) {
        userName = currentProfile.full_name;
        initials = userName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
      } else {
        // Se não tem nome, mostra ID ou "Usuário"
        
        userName = "Usuário";
        initials = "U";

      }
      
      // Adicionar indicador "Você" se for o usuário atual
      if (isCurrentUser) {
        userName += " (Você)";
      }
      
      avatarDiv.textContent = initials;
      avatarDiv.title = userName;
      
      // Criar info do usuário
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
    
    // Adicionar nota se o contador estiver diferente
    if (postEl) {
      const likesSpan = postEl.querySelector(".likes");
      if (likesSpan) {
        const displayCount = parseInt(likesSpan.textContent.split(" ")[0]) || 0;
        if (displayCount > likes.length) {
          const noteDiv = document.createElement("div");
          noteDiv.className = "likes-note";
          noteDiv.style.fontSize = "12px";
          noteDiv.style.color = "var(--text-muted)";
          noteDiv.style.textAlign = "center";
          noteDiv.style.marginTop = "10px";
          noteDiv.style.padding = "8px";
          noteDiv.style.backgroundColor = "var(--button-bg)";
          noteDiv.style.borderRadius = "8px";
          noteDiv.innerHTML = `<i class="fas fa-info-circle"></i> Alguns usuários podem não aparecer na lista`;
          usersList.appendChild(noteDiv);
        }
      }
    }
    
    // Limpar e adicionar conteúdo
    likesList.innerHTML = '';
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

// Event listeners para o modal de curtidas
closeLikesModal?.addEventListener("click", fecharModalCurtidas);

likesModal?.addEventListener("click", (e) => {
  if (e.target === likesModal) fecharModalCurtidas();
});

// ----------------- Auth / Perfil -----------------
async function init() {
  // sessão
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

  // ============ CORREÇÃO DO BOTÃO "+" ============
  // Somente admin pode postar: esconde o +
  if (currentProfile.role !== "admin") {
    if (addPostBtn) {
      addPostBtn.style.display = "none";
      console.log("Botão + escondido: usuário não é admin");
    }
  } else {
    if (addPostBtn) {
      addPostBtn.style.display = "flex";
      console.log("Botão + mostrado: usuário é admin");
    }
  }
  // ============ FIM DA CORREÇÃO ============

  // Aplicar tema aos elementos dinâmicos
  applyThemeToDynamicElements();
  
  await carregarFeed();
}

init();

// ----------------- Feed -----------------
async function carregarFeed() {
  feed.innerHTML = "";

  // 1) carrega posts + contadores da VIEW
  const { data: posts, error } = await supa
    .from("v_feed")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    alert("Erro ao carregar feed.");
    return;
  }

  // 2) monta lista única de user_id
  const userIds = [...new Set((posts || []).map(p => p.user_id).filter(Boolean))];

  // 3) busca nomes no profiles (para mostrar nome real no post)
  profilesMap = {};
  if (userIds.length) {
    const { data: profs, error: profErr } = await supa
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (profErr) {
      console.warn("Não consegui carregar nomes de profiles (provável RLS):", profErr);
    } else {
      profilesMap = Object.fromEntries((profs || []).map(p => [p.id, p.full_name]));
    }
  }

  // 4) renderiza posts, preenchendo author_name se vier faltando da view
  for (const post of posts || []) {
    const nameFromProfiles = profilesMap[post.user_id];
    if (!post.author_name && nameFromProfiles) post.author_name = nameFromProfiles;

    const card = await renderPost(post);
    feed.appendChild(card);
  }

  // Reaplicar tema após carregar posts
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

// Função para criar animação de coração
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
  
  // Animação
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
  author.style.color = "var(--text-primary)";
  author.textContent = post.author_name || profilesMap[post.user_id] || "Usuário";

  const date = document.createElement("div");
  date.style.fontSize = "12px";
  date.style.color = "var(--text-muted)";
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
        // 1) tenta remover arquivo do Storage
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

  // Espaço entre data e imagem
  const space = document.createElement("div");
  space.style.height = "12px";
  postEl.appendChild(space);

  // Imagem com funcionalidade de clique para tela cheia e double click para curtir
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
  img.style.pointerEvents = "none"; // IMPORTANTE: imagem não captura eventos

  // Overlay para indicar que é clicável
  const overlay = document.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "transparent";
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
  overlay.style.pointerEvents = "none"; // Overlay não captura eventos
  overlay.style.zIndex = "1";

  const expandIcon = document.createElement("div");
  expandIcon.innerHTML = "🔍 Clique para expandir";
  expandIcon.style.opacity = "0.7";
  expandIcon.style.pointerEvents = "none";
  overlay.appendChild(expandIcon);

  imgContainer.appendChild(img);
  imgContainer.appendChild(overlay);

  // VARIÁVEIS PARA CONTROLE DE CLICK/DOUBLE CLICK
  let clickTimer = null;
  let isDoubleClick = false;

  // Clique único para expandir imagem
  imgContainer.addEventListener("click", (e) => {
    // Se for double click, não executa o clique único
    if (isDoubleClick) {
      isDoubleClick = false;
      return;
    }
    
    // Configura timer para clique único
    if (clickTimer === null) {
      clickTimer = setTimeout(() => {
        // Este é um clique único - expandir imagem
        abrirImagemTelaCheia(imgUrl, imgContainer);
        clickTimer = null;
      }, 300); // Delay para detectar double click
    }
  });

  // Double click para curtir
  imgContainer.addEventListener("dblclick", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Cancela o timer do clique único
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
    }
    
    // Marca como double click
    isDoubleClick = true;
    
    // Executa a curtida
    await handleLike(post, postEl, imgContainer, true);
    
    // Reseta após um tempo
    setTimeout(() => {
      isDoubleClick = false;
    }, 100);
  });

  // Efeito hover na imagem
  imgContainer.addEventListener("mouseenter", () => {
    overlay.style.opacity = "1";
    img.style.transform = "scale(1.02)";
  });

  imgContainer.addEventListener("mouseleave", () => {
    overlay.style.opacity = "0";
    img.style.transform = "scale(1)";
  });

  postEl.appendChild(imgContainer);

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

  // Adicionar evento para abrir modal de curtidas ao clicar no contador
  const likesSpan = postEl.querySelector(".likes");
  likesSpan.addEventListener("click", async (e) => {
    e.stopPropagation();
    await abrirModalCurtidas(post.id, postEl);
  });
  
  // Estilo hover para o contador de curtidas
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

  // Comments area - MOSTRA APENAS 3 COMENTÁRIOS MAIS RECENTES + BOTÃO "VER MAIS"
  const commentsWrap = document.createElement("div");
  commentsWrap.className = "comments";

  // input row + botão enviar
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
  
  // Botão "Ver mais comentários" se houver mais de 3
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

  // Função para abrir imagem em tela cheia
  function abrirImagemTelaCheia(imgUrl, imgContainer) {
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

    // Double click na imagem em tela cheia também curte
    let lastFullscreenClick = 0;
    modal.addEventListener("dblclick", async (e) => {
      const now = Date.now();
      if (now - lastFullscreenClick < 300) return;
      lastFullscreenClick = now;
      
      await handleLike(post, postEl, imgContainer, true);
      
      // Fecha o modal após curtir (opcional)
      // document.body.removeChild(modal);
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  // Função de curtir reutilizável - CORRIGIDA
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
      
      // Animação de descurtida (coração branco)
      if (showAnimation && imgContainer) {
        criarAnimacaoCurtida(imgContainer, false);
      }
    } else {
      const { error } = await supa
        .from("likes")
        .insert({ post_id: post.id, user_id: currentUser.id });

      if (error) {
        console.error(error);
        alert("Erro ao curtir.");
        return;
      }
      likeBtn.classList.add("liked");
      likeBtn.textContent = "❤️";
      post.likes_count += 1;
      
      // Animação de curtida (coração vermelho)
      if (showAnimation && imgContainer) {
        criarAnimacaoCurtida(imgContainer, true);
      }
    }
    likesSpan.textContent = post.likes_count + " curtidas";
  }

  likeBtn.addEventListener("click", async () => await handleLike(post, postEl));

  // COMMENTS
  const commentsCountSpan = postEl.querySelector(".comments-count");
  const commentBtn = postEl.querySelector(".comment-btn");

  commentBtn.addEventListener("click", () => input.focus());

  // Carregar apenas os 3 comentários MAIS RECENTES - CORRIGIDO
  await carregarComentariosRecentes(post.id, ul, seeMoreContainer, post);

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

      // Recarregar os 3 comentários mais recentes
      await carregarComentariosRecentes(post.id, ul, seeMoreContainer, post);
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

// Função para carregar apenas 3 comentários MAIS RECENTES - CORRIGIDA
async function carregarComentariosRecentes(postId, ul, seeMoreContainer, post) {
  ul.innerHTML = "";

  // Carregar os 3 comentários MAIS RECENTES (mais novos primeiro)
  const { data, error } = await supa
    .from("comments")
    .select("id, content, created_at, user_id, profiles:profiles(full_name)")
    .eq("post_id", postId)
    .order("created_at", { ascending: false }) // Mais novos primeiro
    .limit(3);

  if (error) {
    console.error(error);
    return;
  }

  const commentsToShow = data || [];

  const isAdmin = currentProfile?.role === "admin";

  // Mostrar botão "Ver mais" se houver mais de 3 comentários
  if (post.comments_count > 3) {
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

    // lado esquerdo: meta + texto
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

    // lado direito: lixeira (admin ou dono)
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
          
          // Atualiza contador
          post.comments_count = Math.max(0, post.comments_count - 1);
          const commentsCountSpan = ul.closest('.post').querySelector('.comments-count');
          if (commentsCountSpan) {
            commentsCountSpan.textContent = post.comments_count + 
              (post.comments_count === 1 ? " comentário" : " comentários");
          }
          
          li.remove();
          
          // Atualizar visibilidade do botão "Ver mais"
          if (post.comments_count <= 3) {
            seeMoreContainer.style.display = "none";
          }
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
      // mantém alinhamento
      const spacer = document.createElement("div");
      spacer.style.width = "34px";
      spacer.style.height = "34px";
      li.appendChild(spacer);
    }

    ul.appendChild(li);
  }
}

// Função para abrir modal com todos os comentários
async function abrirModalComentarios(postId, totalComments) {
  // Criar modal
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

  // Card do modal
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

  // Cabeçalho do modal
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

  // Lista de comentários
  const commentsList = document.createElement("div");
  commentsList.style.flex = "1";
  commentsList.style.overflowY = "auto";
  commentsList.style.padding = "20px";

  // Input para novo comentário
  const inputContainer = document.createElement("div");
  inputContainer.style.padding = "0 20px 20px";
  inputContainer.style.borderTop = "1px solid var(--border-light)";

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
  inputContainer.appendChild(inputRow);

  modalCard.appendChild(modalHeader);
  modalCard.appendChild(commentsList);
  modalCard.appendChild(inputContainer);
  modal.appendChild(modalCard);
  document.body.appendChild(modal);

  // Fechar modal ao clicar fora
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });

  // Carregar todos os comentários (mais antigos primeiro no modal)
  await carregarTodosComentarios(postId, commentsList, modalTitle, totalComments);

  // Função para enviar comentário no modal
  async function enviarComentarioModal() {
    const content = input.value.trim();
    if (!content) return;

    sendBtn.disabled = true;
    sendBtn.style.opacity = "0.6";

    try {
      const { error } = await supa
        .from("comments")
        .insert({ post_id: postId, user_id: currentUser.id, content });

      if (error) throw error;

      input.value = "";
      totalComments += 1;
      modalTitle.textContent = `Comentários (${totalComments})`;

      // Atualizar contador no post original
      const postElement = document.querySelector(`.post[data-post-id="${postId}"]`);
      if (postElement) {
        const commentsCountSpan = postElement.querySelector('.comments-count');
        if (commentsCountSpan) {
          commentsCountSpan.textContent = totalComments + 
            (totalComments === 1 ? " comentário" : " comentários");
        }
        
        // Atualizar botão "Ver mais" se necessário
        const seeMoreContainer = postElement.querySelector('.comments > div:last-child');
        if (seeMoreContainer && totalComments > 3) {
          seeMoreContainer.style.display = "block";
        }
      }

      await carregarTodosComentarios(postId, commentsList, modalTitle, totalComments);
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

// Função para carregar TODOS os comentários no modal (mais antigos primeiro)
async function carregarTodosComentarios(postId, container, titleElement, totalComments) {
  container.innerHTML = "";

  const { data, error } = await supa
    .from("comments")
    .select("id, content, created_at, user_id, profiles:profiles(full_name)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true }); // Mais antigos primeiro no modal

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

  // Atualizar contador real
  if (titleElement && data.length !== totalComments) {
    titleElement.textContent = `Comentários (${data.length})`;
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

    // Botão excluir (admin ou dono)
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
          
          // Remover do modal
          commentDiv.remove();
          
          // Atualizar contador
          const currentCount = parseInt(titleElement.textContent.match(/\d+/)[0]);
          titleElement.textContent = `Comentários (${currentCount - 1})`;
          
          // Atualizar contador no post original
          const postElement = document.querySelector(`.post[data-post-id="${postId}"]`);
          if (postElement) {
            const commentsCountSpan = postElement.querySelector('.comments-count');
              if (commentsCountSpan) {
                const newCount = currentCount - 1;
                commentsCountSpan.textContent = newCount + 
                  (newCount === 1 ? " comentário" : " comentários");
              }
            
            // Atualizar visibilidade do botão "Ver mais"
            const seeMoreContainer = postElement.querySelector('.comments > div:last-child');
            if (seeMoreContainer && newCount <= 3) {
              seeMoreContainer.style.display = "none";
            }
          }
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

    commentDiv.appendChild(meta);
    commentDiv.appendChild(contentDiv);
    container.appendChild(commentDiv);
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

// Fechar modais com tecla ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (likesModal.classList.contains("show")) {
      fecharModalCurtidas();
    }
    if (postModal.classList.contains("show")) {
      fecharModal();
    }
  }
});

// Observar mudanças de tema para atualizar elementos dinâmicos
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.attributeName === 'data-theme') {
      applyThemeToDynamicElements();
    }
  });
});

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme']
});

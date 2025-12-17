const body = document.body;
const sidebar = document.querySelector("nav.sidebar");
const toggle = document.querySelector(".toggle");
const searchBtn = document.querySelector(".search-box");
const modeSwitch = document.querySelector(".toggle-switch");
const modeText = document.querySelector(".mode-text");
const logoFull = document.querySelector(".image img.logo-full") || document.querySelector(".image img");
const logoAvi = document.getElementById("logoavi");
const saudacaoEl = document.getElementById("saudacao");
const dataHoraEl = document.getElementById("dataHora");
const anoAtualEl = document.getElementById("anoAtual");
const menuUserNameEl = document.getElementById("menuUserName");
const profilePicEl = document.getElementById("profile-pic");
const defaultAvatar = "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\" viewBox=\"0 0 120 120\"><circle cx=\"60\" cy=\"60\" r=\"60\" fill=\"%23f3f4f6\"/><text x=\"50%\" y=\"55%\" font-size=\"42\" text-anchor=\"middle\" fill=\"%236b7280\">?</text></svg>";
const NOTIFICATION_KEY = "sellastay_notifications_v2";
const NOTIFICATION_DISMISSED_KEY = "sellastay_notifications_dismissed_v1";
const notificationExclusions = new Set([
    "admin-login.html",
    "admin-panel.html",
    "home - ibexy.html",
    "index.html",
    "login.html",
    ".env",
    ".htaccess",
]);
let notificationUI = null;
let notificationDetail = null;
function getUserName() {
    const storedUser = localStorage.getItem("sellastay_user");
    if (storedUser) return storedUser;
    if (saudacaoEl && saudacaoEl.dataset.username) {
        return saudacaoEl.dataset.username;
    }
    const userNameElement = document.getElementById("user-name");
    return userNameElement ? userNameElement.textContent.trim() : "Usuario";
}
function obterSaudacao() {
    const hora = new Date().getHours();
    let saudacaoBase = "Boa noite";
    if (hora >= 6 && hora < 12) {
        saudacaoBase = "Bom dia";
    } else if (hora >= 12 && hora < 18) {
        saudacaoBase = "Boa tarde";
    }
    return `${saudacaoBase}, ${getUserName()}!`;
}
function applyUserContext() {
    const userName = getUserName();
    if (menuUserNameEl) {
        menuUserNameEl.textContent = userName;
    }
    if (profilePicEl) {
        const storedAvatar = localStorage.getItem("sellastay_user_avatar");
        const avatarUrl = storedAvatar || (userName ? `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6d28d9&color=fff` : defaultAvatar);
        profilePicEl.src = avatarUrl;
        profilePicEl.alt = userName || "Usuario";
    }
}
function updateDataHora() {
    if (!dataHoraEl) return;
    const data = new Date();
    const options = {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    };
    dataHoraEl.textContent = data.toLocaleString("pt-BR", options);
}
function setThemeAssets(theme) {
    if (modeText) {
        modeText.innerText = theme === "dark" ? "Light mode" : "Dark mode";
    }
    if (logoFull) {
        logoFull.src = theme === "dark" ? "img/logo_.png" : "img/logo.png";
    }
    if (logoAvi) {
        logoAvi.src = theme === "dark" ? "img/aviat_.png" : "img/aviat.png";
    }
}
function disableAnimations() {
    body.style.transition = "none";
    if (sidebar) sidebar.style.transition = "none";
    if (logoAvi) logoAvi.style.transition = "none";
    if (logoFull) logoFull.style.transition = "none";
}
function enableAnimations() {
    setTimeout(() => {
        body.style.transition = "";
        if (sidebar) sidebar.style.transition = "";
        if (logoAvi) logoAvi.style.transition = "";
        if (logoFull) logoFull.style.transition = "";
    }, 300);
}
function readNotifications() {
    try {
        const raw = localStorage.getItem(NOTIFICATION_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn("N?o foi poss?vel ler notificacoes globais:", e);
        return [];
    }
}
function readDismissedNotifications() {
    try {
        const raw = localStorage.getItem(NOTIFICATION_DISMISSED_KEY);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
        return new Set();
    }
}
function saveDismissedNotifications(set) {
    localStorage.setItem(NOTIFICATION_DISMISSED_KEY, JSON.stringify(Array.from(set).slice(0, 200)));
}
function dismissNotification(id) {
    if (!id) return;
    const dismissed = readDismissedNotifications();
    if (!dismissed.has(id)) {
        dismissed.add(id);
        saveDismissedNotifications(dismissed);
    }
}
function activeNotifications(list) {
    const dismissed = readDismissedNotifications();
    const base = Array.isArray(list) ? list : readNotifications();
    const filtered = base.filter((item) => item && !dismissed.has(item.id));
    if (!Array.isArray(list) && filtered.length !== base.length) {
        saveNotifications(filtered);
    }
    return filtered;
}
function saveNotifications(list) {
    localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(list.slice(0, 80)));
}
function pushNotification(message, options = {}) {
    const dismissed = readDismissedNotifications();
    if (options.id && dismissed.has(options.id)) return null;
    const list = readNotifications();
    const entry = {
        id: options.id || (crypto.randomUUID ? crypto.randomUUID() : `ntf-${Date.now()}`),
        message,
        type: options.type || "info",
        createdAt: options.createdAt || new Date().toISOString(),
        source: options.source || "Sistema",
        url: options.url || null,
    };
    if (options.id && list.some((item) => item.id === options.id)) {
        return entry;
    }
    list.unshift(entry);
    saveNotifications(list);
    renderNotificationUI(list);
    return entry;
}
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}
function renderNotificationUI(list) {
    if (!notificationUI) return;
    const { bell, badge, badgeNum, panel, listEl } = notificationUI;
    const normalized = activeNotifications(list);
    const hasNotifications = normalized.length > 0;
    badgeNum.textContent = normalized.length;
    badge.classList.toggle("pulse", hasNotifications);
    badge.classList.toggle("empty", !hasNotifications);
    listEl.innerHTML = "";
    if (!normalized.length) {
        listEl.innerHTML = "<div class='notification-item'>Nenhuma notifica\u00e7\u00e3o pendente.</div>";
    } else {
        normalized.forEach((item) => {
            const row = document.createElement("div");
            row.className = "notification-item";
            row.innerHTML = `
                <span class="tag">${item.source || "Sistema"}</span>
                <div>${item.message}</div>
                <small>${formatRelativeTime(item.createdAt)}</small>
            `;
            row.addEventListener("click", () => openNotificationDetail(item));
            listEl.appendChild(row);
        });
    }
}
function markNotificationRead(id) {
    if (id) dismissNotification(id);
    const list = readNotifications();
    const updated = list.filter((n) => n.id !== id);
    saveNotifications(updated);
    renderNotificationUI(updated);
}
function openNotificationDetail(item){
    if(!item) return;
    if (item.id) markNotificationRead(item.id);
    if(!notificationDetail){
        notificationDetail = document.createElement("div");
        notificationDetail.className = "notification-detail-modal";
        notificationDetail.innerHTML = `
            <div class="notification-detail-card">
                <header>
                    <h4>Detalhes da notificação</h4>
                    <button class="close-detail close-icon" type="button"><i class='bx bx-x'></i></button>
                </header>
                <p class="notif-source"></p>
                <p class="notif-message"></p>
                <small class="notif-time"></small>
                <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
                    <button class="action-link btn-primary" type="button" style="display:none;">Abrir</button>
                </div>
            </div>
        `;
        document.body.appendChild(notificationDetail);
        notificationDetail.addEventListener("click", (e) => { if(e.target === notificationDetail) notificationDetail.classList.remove("open"); });
        notificationDetail.querySelectorAll(".close-detail").forEach(btn => btn.addEventListener("click", () => {
            notificationDetail.classList.remove("open");
        }));
    }
    const source = notificationDetail.querySelector(".notif-source");
    const message = notificationDetail.querySelector(".notif-message");
    const time = notificationDetail.querySelector(".notif-time");
    const actionBtn = notificationDetail.querySelector(".action-link");
    source.textContent = item.source || "Sistema";
    message.textContent = item.message || "";
    time.textContent = formatRelativeTime(item.createdAt || new Date());
    notificationDetail.dataset.url = item.url || "";
    if(item.url){
        actionBtn.style.display = "inline-flex";
        actionBtn.textContent = "Abrir";
        actionBtn.onclick = () => { window.location.href = item.url; };
    }else{
        actionBtn.style.display = "none";
    }
    notificationDetail.classList.add("open");
}
function shouldInitNotifications() {
    const current = (window.location.pathname.split("/").pop() || "").toLowerCase();
    return !notificationExclusions.has(current);
}
function collectSystemNotifications() {
    try {
        const proposalsRaw = localStorage.getItem("sellastay_propostas_v1");
        const proposals = proposalsRaw ? JSON.parse(proposalsRaw) : [];
        const now = Date.now();
        proposals.forEach((p) => {
            if (!p || !p.id) return;
            if (p.status === "accepted") {
                pushNotification(`Proposta aprovada: ${p.titulo || p.cliente || p.id}`, { id: `proposal-accepted-${p.id}`, type: "success", source: "Propostas", url: "propostas.html" });
            } else if (p.status === "refused") {
                pushNotification(`Proposta recusada: ${p.titulo || p.cliente || p.id}`, { id: `proposal-refused-${p.id}`, type: "alert", source: "Propostas", url: "propostas.html" });
            }
            const createdAt = p.createdAt ? new Date(p.createdAt).getTime() : null;
            const pendingHours = createdAt ? Math.floor((now - createdAt) / 3600000) : null;
            if (p.status === "draft" && pendingHours !== null && pendingHours >= 4) {
                pushNotification(`Proposta de ${p.cliente || "cliente"} aguardando envio h\u00e1 ${pendingHours}h.`, { id: `proposal-pending-${p.id}`, type: "warning", source: "Propostas", url: "propostas.html" });
            }
            if (p.status === "sent" && p.lastSentAt) {
                const sentHours = Math.floor((now - new Date(p.lastSentAt).getTime()) / 3600000);
                if (sentHours >= 24) {
                    pushNotification(`Proposta enviada para ${p.cliente || "cliente"} h\u00e1 ${sentHours}h sem resposta.`, { id: `proposal-followup-${p.id}`, type: "info", source: "Propostas", url: "propostas.html" });
                }
            }
        });
        Object.keys(localStorage).forEach((key) => {
            if (/reminder/i.test(key)) {
                try {
                    const reminders = JSON.parse(localStorage.getItem(key)) || [];
                    reminders.forEach((reminder) => {
                        const dateValue = reminder.date || reminder.data || reminder.dueDate;
                        const date = dateValue ? new Date(dateValue) : null;
                        if (date && !Number.isNaN(date.getTime())) {
                            const hours = Math.floor((date.getTime() - now) / 3600000);
                            if (hours <= 24 && hours >= 0) {
                                pushNotification(`Lembrete para ${reminder.title || reminder.nome || "atividade"} em ${hours}h.`, { id: `reminder-${key}-${reminder.id || reminder.title || dateValue}`, type: "info", source: "Lembretes", url: "reminder.html" });
                            }
                        }
                    });
                } catch (e) {
                    /* ignore parse issues */
                }
            }
            if (/kanban_columns_/i.test(key)) {
                try {
                    const columns = JSON.parse(localStorage.getItem(key)) || [];
                    columns.forEach((column) => {
                        (column.cards || []).forEach((card) => {
                            if (card.dueDate) {
                                const due = new Date(card.dueDate);
                                const hoursLeft = Math.floor((due.getTime() - now) / 3600000);
                                if (hoursLeft <= 12 && hoursLeft >= 0) {
                                    pushNotification(`Tarefa ${card.title || card.name || "sem nome"} vence em ${hoursLeft}h.`, { id: `task-${card.id || card.title}`, type: "warning", source: "Tarefas", url: "tasks.html" });
                                }
                            }
                        });
                    });
                } catch (e) {
                    /* ignore parse issues */
                }
            }
        });
    } catch (e) {
        console.warn("N\u00e3o foi poss\u00edvel consolidar notificacoes do sistema:", e);
    }
}
function initNotificationCenter() {
    if (!shouldInitNotifications()) return;
    collectSystemNotifications();
    if (notificationUI) {
        renderNotificationUI(readNotifications());
        return;
    }
    const wrapper = document.createElement("div");
    wrapper.className = "notification-center";
    const bell = document.createElement("button");
    bell.className = "notification-bell";
    bell.setAttribute("title", "Notifica\u00e7\u00f5es");
    bell.innerHTML = `<span class="bell-icon"><i class='bx bxs-bell'></i></span><span class="badge"><span class="badge-num">0</span></span>`;
    const panel = document.createElement("div");
    panel.className = "notification-panel";
    const header = document.createElement("header");
    header.textContent = "Notifica\u00e7\u00f5es";
    const openAllBtn = document.createElement("button");
    openAllBtn.className = "open-all";
    openAllBtn.textContent = "Abrir todas";
    openAllBtn.addEventListener("click", () => {
        const current = readNotifications();
        current.forEach((item) => dismissNotification(item.id));
        saveNotifications([]);
        renderNotificationUI([]);
        panel.classList.remove("open");
    });
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "<i class='bx bx-x'></i>";
    closeBtn.addEventListener("click", () => panel.classList.remove("open"));
    header.appendChild(openAllBtn);
    header.appendChild(closeBtn);
    const listEl = document.createElement("div");
    listEl.className = "notification-list";
    panel.appendChild(header);
    panel.appendChild(listEl);
    wrapper.appendChild(bell);
    wrapper.appendChild(panel);
    const anchor = document.querySelector("[data-notification-anchor]");
    if (anchor) {
        anchor.classList.add("notification-anchor");
        anchor.appendChild(wrapper);
    } else {
        document.body.appendChild(wrapper);
    }
    bell.addEventListener("click", () => {
        panel.classList.toggle("open");
    });
    document.addEventListener("click", (event) => {
        if (!panel.contains(event.target) && !bell.contains(event.target)) {
            panel.classList.remove("open");
        }
    });
    const badge = bell.querySelector(".badge");
    const badgeNum = bell.querySelector(".badge-num");
    notificationUI = { bell, badge, badgeNum, panel, listEl };
    renderNotificationUI(readNotifications());
}
window.pushNotification = pushNotification;
window.renderNotificationUI = renderNotificationUI;
window.initNotificationCenter = initNotificationCenter;
function setupSidebarTooltips() {
    const links = document.querySelectorAll(".sidebar li > a");
    links.forEach((link) => {
        const labelSource = link.querySelector(".nav-text")?.textContent || link.textContent || "";
        const label = labelSource.replace(/\s+/g, " ").trim();
        if (label) {
            link.setAttribute("data-label", label);
        }
    });
}
function initApp() {
    const storedUserName = localStorage.getItem("sellastay_user");
    if (storedUserName && saudacaoEl) {
        saudacaoEl.dataset.username = storedUserName;
    }
    if (saudacaoEl) {
        saudacaoEl.textContent = obterSaudacao();
    }
    applyUserContext();
    if (dataHoraEl) {
        updateDataHora();
        setInterval(updateDataHora, 1000);
    }
    if (anoAtualEl) {
        anoAtualEl.textContent = new Date().getFullYear();
    }
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        body.classList.add("dark");
    }
    setThemeAssets(body.classList.contains("dark") ? "dark" : "light");
    if (sidebar) {
        const isMobile = window.innerWidth <= 768;
        const savedSidebarState = localStorage.getItem("sidebar");
        if (isMobile) {
            sidebar.classList.add("close");
            localStorage.setItem("sidebar", "close");
        } else if (savedSidebarState === "close") {
            sidebar.classList.add("close");
        } else {
            sidebar.classList.remove("close");
        }
    }
    disableAnimations();
    window.addEventListener("load", enableAnimations);
    if (toggle && sidebar) {
        toggle.addEventListener("click", () => {
            sidebar.classList.toggle("close");
            localStorage.setItem("sidebar", sidebar.classList.contains("close") ? "close" : "open");
        });
    }
    if (searchBtn && sidebar) {
        searchBtn.addEventListener("click", () => {
            sidebar.classList.remove("close");
            localStorage.setItem("sidebar", "open");
        });
    }
    if (modeSwitch) {
        modeSwitch.addEventListener("click", () => {
            body.classList.toggle("dark");
            const theme = body.classList.contains("dark") ? "dark" : "light";
            setThemeAssets(theme);
            localStorage.setItem("theme", theme);
        });
    }
    const menuLinks = document.querySelectorAll(".menu-links");
    const currentPath = window.location.pathname.split("/").pop() || "home.html";
    menuLinks.forEach((link) => {
        const href = link.getAttribute("href");
        if (href && currentPath === href) {
            link.classList.add("active");
            link.closest(".nav-link")?.classList.add("active");
        }
        link.addEventListener("click", () => {
            menuLinks.forEach((item) => item.classList.remove("active"));
            link.classList.add("active");
        });
    });
    setupSidebarTooltips();
    document.querySelectorAll(".nav-link.has-submenu > a").forEach((trigger) => {
        trigger.addEventListener("click", (event) => {
            event.preventDefault();
            trigger.parentElement.classList.toggle("active");
        });
    });
    initNotificationCenter();
}
initApp();

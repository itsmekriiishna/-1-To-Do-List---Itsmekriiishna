// ========== STATE ==========
let todos = JSON.parse(localStorage.getItem("todos")) || [];
const defaultCategories = [
    { key: "personal", icon: "person", label: "Personal" },
    { key: "work", icon: "work", label: "Work" },
    { key: "shopping", icon: "shopping_cart", label: "Shopping" },
    { key: "health", icon: "ecg_heart", label: "Health" },
];
let categories = JSON.parse(localStorage.getItem("categories")) || defaultCategories.map((c) => ({ ...c }));
let currentView = "home";
let activeCategory = categories.length > 0 ? categories[0].key : "personal";
let currentFilter = "all";
let searchQuery = "";
let currentPage = 1;
const TASKS_PER_PAGE = 8;
let openKebabId = null;
let calWeekStart = null; // Monday of the displayed week (category screen)
let calSelectedDate = null; // "YYYY-MM-DD" or null (category screen)
let homeCalWeekStart = null; // Monday of the displayed week (home screen)
let homeCalSelectedDate = null; // "YYYY-MM-DD" or null (home screen)

// ========== DOM ==========
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const sidebar = $("#sidebar");
const sidebarOverlay = $("#sidebarOverlay");
const hamburgerBtn = $("#hamburgerBtn");
const sidebarCloseBtn = $("#sidebarClose");
const themeToggle = $("#themeToggle");
const topbarTitle = $("#topbarTitle");

// Screens
const screenHome = $("#screenHome");
const screenCategory = $("#screenCategory");

// Home
const recentList = $("#recentList");
const homeEmpty = $("#homeEmpty");
const todoForm = $("#todoForm");
const todoInput = $("#todoInput");
const datePicker = $("#datePicker");
const prioritySlider = $("#prioritySlider");
const priorityValue = $("#priorityValue");

// Category
const catIcon = $("#catIcon");
const catTitle = $("#catTitle");
const searchInput = $("#searchInput");
const categoryListEl = $("#categoryList");
const catEmpty = $("#catEmpty");
const pagination = $("#pagination");
const prevPage = $("#prevPage");
const nextPage = $("#nextPage");
const pageInfo = $("#pageInfo");
const backFromCategory = $("#backFromCategory");
const tabs = $$(".tab");

// Modal
const modalOverlay = $("#modalOverlay");
const modalCloseBtn = $("#modalClose");
const modalCancel = $("#modalCancel");
const modalConfirm = $("#modalConfirm");
const modalMessage = $("#modalMessage");

// Notifications
const notifPanel = $("#notifPanel");
const notifList = $("#notifList");
const notifEmpty = $("#notifEmpty");
const notifMarkAll = $("#notifMarkAll");

// Misc
const toastContainer = $("#toastContainer");
const notifDot = $("#notifDot");

// Home extras
const greetingTitle = $("#greetingTitle");
const greetingSubtitle = $("#greetingSubtitle");
const greetingDate = $("#greetingDate");
const todayHeader = $("#todayHeader");
const todayList = $("#todayList");
const taskFormCard = $("#taskFormCard");
const focusModeBtn = $("#focusModeBtn");
let focusMode = false;

// ========== HELPERS ==========
function saveTodos() {
    localStorage.setItem("todos", JSON.stringify(todos));
}

function getPriorityLabel(val) {
    return ["Low", "Medium", "High"][val - 1];
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function getCategoryMeta(cat) {
    const found = categories.find((c) => c.key === cat);
    if (found) return found;
    return { key: cat, icon: "label", label: cat.charAt(0).toUpperCase() + cat.slice(1) };
}

// ========== CATEGORY COLORS ==========
const categoryColorMap = {
    personal: { bg: "#c5cae9", text: "#303f9f", darkBg: "#1a237e", darkText: "#9fa8da", accent: "#5c6bc0" },
    work:     { bg: "#b2dfdb", text: "#00695c", darkBg: "#004d40", darkText: "#80cbc4", accent: "#00897b" },
    shopping: { bg: "#fff9c4", text: "#f57f17", darkBg: "#4a3800", darkText: "#ffd54f", accent: "#f9a825" },
    health:   { bg: "#f8bbd0", text: "#c2185b", darkBg: "#880e4f", darkText: "#f48fb1", accent: "#e91e63" },
};

const vibrantPalette = [
    { bg: "#c8e6c9", text: "#2e7d32", darkBg: "#1b5e20", darkText: "#a5d6a7", accent: "#43a047" },
    { bg: "#bbdefb", text: "#1565c0", darkBg: "#0d47a1", darkText: "#90caf9", accent: "#1e88e5" },
    { bg: "#ffe0b2", text: "#e65100", darkBg: "#bf360c", darkText: "#ffcc80", accent: "#fb8c00" },
    { bg: "#e1bee7", text: "#7b1fa2", darkBg: "#4a148c", darkText: "#ce93d8", accent: "#9c27b0" },
    { bg: "#b3e5fc", text: "#0277bd", darkBg: "#01579b", darkText: "#81d4fa", accent: "#039be5" },
    { bg: "#ffcdd2", text: "#c62828", darkBg: "#b71c1c", darkText: "#ef9a9a", accent: "#e53935" },
    { bg: "#d7ccc8", text: "#4e342e", darkBg: "#3e2723", darkText: "#bcaaa4", accent: "#6d4c41" },
    { bg: "#dcedc8", text: "#558b2f", darkBg: "#33691e", darkText: "#c5e1a5", accent: "#7cb342" },
];

function getCategoryColor(key) {
    if (categoryColorMap[key]) return categoryColorMap[key];
    const customCats = categories.filter((c) => !categoryColorMap[c.key]);
    const idx = customCats.findIndex((c) => c.key === key);
    return vibrantPalette[(idx >= 0 ? idx : 0) % vibrantPalette.length];
}

function isDark() {
    return document.documentElement.getAttribute("data-theme") === "dark";
}

function getTagStyle(key) {
    const c = getCategoryColor(key);
    return isDark()
        ? `background:${c.darkBg};color:${c.darkText}`
        : `background:${c.bg};color:${c.text}`;
}

// ========== PRIORITY BADGES IN SIDEBAR ==========
const priorityBadgeColors = {
    light: { 1: "#059669", 2: "#2563eb", 3: "#dc2626" },
    dark:  { 1: "#059669", 2: "#2563eb", 3: "#dc2626" }
};

function getPriorityCounts(catKey) {
    const counts = { 1: 0, 2: 0, 3: 0 };
    todos.forEach((t) => {
        if (t.category === catKey && !t.completed) {
            counts[t.priority] = (counts[t.priority] || 0) + 1;
        }
    });
    return counts;
}

function renderPriorityBadges(container, catKey) {
    const counts = getPriorityCounts(catKey);
    const colors = isDark() ? priorityBadgeColors.dark : priorityBadgeColors.light;
    container.innerHTML = "";

    [3, 2, 1].forEach((level) => {
        if (counts[level] > 0) {
            const circle = document.createElement("span");
            circle.className = "priority-circle";
            circle.style.background = colors[level];
            circle.textContent = counts[level];
            container.appendChild(circle);
        }
    });
}

function updateAllPriorityBadges() {
    document.querySelectorAll(".priority-badges").forEach((el) => {
        const cat = el.dataset.cat;
        if (cat) renderPriorityBadges(el, cat);
    });
}

function saveCategories() {
    localStorage.setItem("categories", JSON.stringify(categories));
}

function addCategory(name) {
    const key = name.trim().toLowerCase().replace(/\s+/g, "-");
    if (!key) return null;
    if (categories.find((c) => c.key === key)) return key;
    const label = name.trim().charAt(0).toUpperCase() + name.trim().slice(1);
    categories.push({ key, icon: "label", label });
    saveCategories();
    renderSidebarCategories();
    updateFormCategories();
    return key;
}

function deleteCategory(key) {
    categories = categories.filter((c) => c.key !== key);
    saveCategories();
    todos = todos.filter((t) => t.category !== key);
    saveTodos();
    renderSidebarCategories();
    updateFormCategories();
    if (activeCategory === key) showScreen("home");
    else refreshCurrentView();
}

function isDefaultCategory(key) {
    return defaultCategories.some((c) => c.key === key);
}

function renderSidebarCategories() {
    const container = document.getElementById("sidebarCategoryList");
    container.innerHTML = "";

    // Only render custom (non-default) categories dynamically
    const customCats = categories.filter((cat) => !isDefaultCategory(cat.key));

    customCats.forEach((cat) => {
        const color = getCategoryColor(cat.key);
        const a = document.createElement("a");
        a.href = "#";
        a.className = "sidebar-link sidebar-link-cat";
        a.dataset.view = cat.key;
        a.style.setProperty("--cat-accent", color.accent);
        a.style.setProperty("--cat-bg", color.bg);
        a.style.setProperty("--cat-dark-bg", color.darkBg);
        if (currentView === "category" && activeCategory === cat.key) a.classList.add("active");

        const icon = document.createElement("span");
        icon.className = "icon material-symbols-outlined cat-icon-colored";
        icon.textContent = cat.icon;
        const iconBg = isDark() ? color.darkBg : color.bg;
        const iconColor = isDark() ? color.darkText : color.text;
        icon.style.cssText = `background:${iconBg};color:${iconColor};width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;font-size:1.5rem;`;

        const text = document.createTextNode(" " + cat.label + " ");

        const badges = document.createElement("span");
        badges.className = "priority-badges";
        badges.dataset.cat = cat.key;

        const delBtn = document.createElement("button");
        delBtn.className = "cat-delete-btn";
        delBtn.title = "Delete category";
        delBtn.innerHTML = "&times;";
        delBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const count = todos.filter((t) => t.category === cat.key).length;
            const msg = count > 0
                ? `Delete "${cat.label}" and its ${count} task(s)?`
                : `Delete "${cat.label}" category?`;
            showConfirmModal(msg, () => {
                deleteCategory(cat.key);
                showToast(`"${cat.label}" category deleted`, "error");
            });
        });

        a.appendChild(icon);
        a.appendChild(text);
        a.appendChild(badges);
        a.appendChild(delBtn);

        a.addEventListener("click", (e) => {
            e.preventDefault();
            activeCategory = cat.key;
            showScreen("category");
            closeSidebar();
        });

        container.appendChild(a);
    });

    // Update hardcoded default sidebar links: colors + active state
    document.querySelectorAll(".sidebar-nav > a.sidebar-link[data-view]").forEach((link) => {
        const view = link.dataset.view;
        if (view === "home") return;
        const color = getCategoryColor(view);
        if (color) {
            link.style.setProperty("--cat-accent", color.accent);
            link.style.setProperty("--cat-bg", color.bg);
            link.style.setProperty("--cat-dark-bg", color.darkBg);
            const iconEl = link.querySelector(".icon");
            if (iconEl && !iconEl.classList.contains("cat-icon-colored")) {
                iconEl.classList.add("cat-icon-colored");
                const iconBg = isDark() ? color.darkBg : color.bg;
                const iconColor = isDark() ? color.darkText : color.text;
                iconEl.style.cssText = `background:${iconBg};color:${iconColor};width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;font-size:1.5rem;`;
            }
        }
        if (currentView === "category" && activeCategory === view) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
        link.style.background = "";
        link.style.color = "";
    });
}

function updateFormCategories() {
    const radioGroup = document.getElementById("categoryRadioGroup");

    // Remove previously added custom radio cards (keep hardcoded defaults)
    radioGroup.querySelectorAll(".radio-card-custom").forEach((el) => el.remove());

    // Add custom (non-default) categories
    const customCats = categories.filter((cat) => !isDefaultCategory(cat.key));

    customCats.forEach((cat) => {
        const label = document.createElement("label");
        label.className = "radio-card radio-card-custom";
        label.dataset.value = cat.key;

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "category";
        input.value = cat.key;

        const iconSpan = document.createElement("span");
        iconSpan.className = "radio-icon material-symbols-outlined";
        iconSpan.textContent = cat.icon;

        const textSpan = document.createElement("span");
        textSpan.textContent = cat.label;

        label.appendChild(input);
        label.appendChild(iconSpan);
        label.appendChild(textSpan);

        label.addEventListener("click", () => {
            radioGroup.querySelectorAll(".radio-card").forEach((c) => c.classList.remove("selected"));
            label.classList.add("selected");
            input.checked = true;
            colorRadioCards();
        });

        radioGroup.appendChild(label);
    });

    // Apply accent colors to ALL radio cards (default + custom)
    colorRadioCards();
}

function colorRadioCards() {
    document.querySelectorAll("#categoryRadioGroup .radio-card").forEach((card) => {
        const key = card.dataset.value;
        if (!key) return;
        const color = getCategoryColor(key);
        if (card.classList.contains("selected")) {
            card.style.setProperty("--card-accent", color.accent);
            card.style.setProperty("--card-bg", isDark() ? color.darkBg : color.bg);
        } else {
            card.style.removeProperty("--card-accent");
            card.style.removeProperty("--card-bg");
        }
    });
}

// ========== TOAST ==========
function showToast(message, type = "success") {
    const icons = { success: "check_circle", error: "cancel", warning: "warning" };
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon material-symbols-outlined">${icons[type] || ""}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add("fade-out");
        toast.addEventListener("animationend", () => toast.remove());
    }, 3000);
}

// ========== SCREEN NAVIGATION ==========
function showScreen(screen) {
    screenHome.classList.remove("active");
    screenCategory.classList.remove("active");

    if (screen === "home") {
        screenHome.classList.add("active");
        topbarTitle.textContent = "To Do List";
        currentView = "home";
        renderHome();
    } else if (screen === "category") {
        screenCategory.classList.add("active");
        const meta = getCategoryMeta(activeCategory);
        const color = getCategoryColor(activeCategory);
        topbarTitle.textContent = meta.label;
        catIcon.textContent = meta.icon;
        catTitle.textContent = meta.label;
        // Color the category icon header
        const iconBg = isDark() ? color.darkBg : color.bg;
        const iconColor = isDark() ? color.darkText : color.accent;
        catIcon.style.cssText = `background:${iconBg};color:${iconColor};`;
        catTitle.style.color = isDark() ? color.darkText : color.accent;
        currentView = "category";
        currentFilter = "all";
        searchQuery = "";
        searchInput.value = "";
        currentPage = 1;
        calSelectedDate = null;
        calWeekStart = getMonday(new Date());
        tabs.forEach((t) => {
            t.classList.toggle("active", t.dataset.filter === "all");
        });
        renderCalendarStrip();
        updateCalFilterInfo();
        renderCategoryList();
    }

    // First clear ALL sidebar active states
    document.querySelectorAll(".sidebar-link").forEach((l) => {
        l.classList.remove("active");
        l.style.background = "";
        l.style.color = "";
    });

    // Set the correct active link
    if (screen === "home") {
        const homeLink = document.querySelector('.sidebar-link[data-view="home"]');
        if (homeLink) homeLink.classList.add("active");
    } else if (screen === "category") {
        const catLink = document.querySelector(`.sidebar-link[data-view="${activeCategory}"]`);
        if (catLink) {
            catLink.classList.add("active");
        }
    }

    renderSidebarCategories();
}

// ========== SIDEBAR ==========
function openSidebar() {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("active");
}

function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("active");
}

hamburgerBtn.addEventListener("click", openSidebar);
sidebarCloseBtn.addEventListener("click", closeSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);

// Home link in sidebar
document.querySelector('.sidebar-link[data-view="home"]').addEventListener("click", (e) => {
    e.preventDefault();
    showScreen("home");
    closeSidebar();
});

// Default category links in sidebar
["personal", "work", "shopping", "health"].forEach((view) => {
    const link = document.querySelector(`.sidebar-link[data-view="${view}"]`);
    if (link) {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            activeCategory = view;
            showScreen("category");
            closeSidebar();
        });
    }
});

// Add category from sidebar
document.getElementById("addCategoryBtn").addEventListener("click", () => {
    const input = document.getElementById("newCategoryInput");
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    const key = addCategory(name);
    if (key) {
        input.value = "";
        showToast(`"${name}" category added!`);
        renderHome();
    }
});

document.getElementById("newCategoryInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("addCategoryBtn").click();
    }
});

// Default radio card click handlers
document.querySelectorAll("#categoryRadioGroup .radio-card").forEach((card) => {
    card.addEventListener("click", () => {
        document.querySelectorAll("#categoryRadioGroup .radio-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        card.querySelector("input").checked = true;
        colorRadioCards();
    });
});

// ========== DARK MODE ==========
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
themeToggle.checked = savedTheme === "dark";

themeToggle.addEventListener("change", () => {
    const theme = themeToggle.checked ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    // Re-render to update all colors for new theme
    recolorSidebarIcons();
    colorRadioCards();
    setPriority(+prioritySlider.value);
    refreshCurrentView();
});

function recolorSidebarIcons() {
    document.querySelectorAll(".sidebar-nav .cat-icon-colored").forEach((iconEl) => {
        const link = iconEl.closest(".sidebar-link");
        if (!link) return;
        const view = link.dataset.view;
        if (!view || view === "home") return;
        const color = getCategoryColor(view);
        const iconBg = isDark() ? color.darkBg : color.bg;
        const iconColor = isDark() ? color.darkText : color.text;
        iconEl.style.background = iconBg;
        iconEl.style.color = iconColor;
    });
}

// ========== HOME SCREEN ==========

function updateGreeting() {}

// ---- Stats ----
function getStreak() {
    const completedDates = new Set();
    todos.forEach((t) => {
        if (t.completed && t.createdAt) {
            completedDates.add(new Date(t.createdAt).toDateString());
        }
    });

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        if (completedDates.has(d.toDateString())) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }
    return streak;
}

function updateStats() {
    const completed = todos.filter((t) => t.completed).length;
    const pending = todos.filter((t) => !t.completed).length;
    const total = todos.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const streak = getStreak();

    $("#statCompleted").textContent = completed;
    $("#statPending").textContent = pending;
    $("#statRate").textContent = rate + "%";
    $("#statStreak").textContent = streak;
}

// ---- Today's Tasks ----
function getTodayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function renderTodayTasks() {
    const todayStr = getTodayStr();
    const todayTasks = todos.filter((t) => t.dueDate === todayStr && !t.completed);
    todayTasks.sort((a, b) => b.priority - a.priority);

    todayList.innerHTML = "";
    if (todayTasks.length > 0) {
        todayHeader.style.display = "";
        todayTasks.forEach((todo) => renderTodoItem(todayList, todo));
    } else {
        todayHeader.style.display = "none";
    }
}

// ---- Home Calendar Strip ----
const homeCalDaysEl = $("#homeCalDays");
const homeCalPrev = $("#homeCalPrev");
const homeCalNext = $("#homeCalNext");
const homeCalFilterInfo = $("#homeCalFilterInfo");
const homeCalFilterText = $("#homeCalFilterText");
const homeCalClearFilter = $("#homeCalClearFilter");

function renderHomeCalendar() {
    if (!homeCalWeekStart) homeCalWeekStart = getMonday(new Date());
    const todayStr = getTodayStr();
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // Update month label
    const calMonthLabel = $("#calMonthLabel");
    if (calMonthLabel) {
        const endOfWeek = new Date(homeCalWeekStart);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        const startMonth = homeCalWeekStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        const endMonth = endOfWeek.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        calMonthLabel.textContent = startMonth === endMonth ? startMonth : `${homeCalWeekStart.toLocaleDateString("en-US", { month: "short" })} - ${endOfWeek.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
    }

    // Find which dates have tasks (all categories)
    const taskDates = new Set();
    todos.forEach((t) => {
        if (t.dueDate && !t.completed) taskDates.add(t.dueDate);
    });

    homeCalDaysEl.innerHTML = "";
    for (let i = 0; i < 7; i++) {
        const d = new Date(homeCalWeekStart);
        d.setDate(d.getDate() + i);
        const ds = toDateStr(d);

        const dayEl = document.createElement("div");
        dayEl.className = "cal-day";
        if (ds === todayStr) dayEl.classList.add("today");
        if (ds === homeCalSelectedDate) dayEl.classList.add("selected");
        if (taskDates.has(ds)) dayEl.classList.add("has-tasks");

        dayEl.innerHTML = `
            <span class="cal-day-name">${dayNames[i]}</span>
            <span class="cal-day-num">${d.getDate()}</span>
        `;

        dayEl.addEventListener("click", () => {
            if (homeCalSelectedDate === ds) {
                homeCalSelectedDate = null;
            } else {
                homeCalSelectedDate = ds;
            }
            renderHomeCalendar();
            updateHomeCalFilter();
            renderHome();
        });

        homeCalDaysEl.appendChild(dayEl);
    }
}

function updateHomeCalFilter() {
    if (homeCalSelectedDate) {
        const d = new Date(homeCalSelectedDate + "T00:00:00");
        const formatted = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        homeCalFilterText.textContent = "Showing tasks for " + formatted;
        homeCalFilterInfo.classList.remove("hidden");
    } else {
        homeCalFilterInfo.classList.add("hidden");
    }
}

homeCalPrev.addEventListener("click", () => {
    homeCalWeekStart.setDate(homeCalWeekStart.getDate() - 7);
    renderHomeCalendar();
});

homeCalNext.addEventListener("click", () => {
    homeCalWeekStart.setDate(homeCalWeekStart.getDate() + 7);
    renderHomeCalendar();
});

homeCalClearFilter.addEventListener("click", () => {
    homeCalSelectedDate = null;
    renderHomeCalendar();
    updateHomeCalFilter();
    renderHome();
});

// Home calendar: Jump to date
const homeCalJumpBtn = $("#homeCalJumpBtn");
const homeCalJumpInput = $("#homeCalJumpInput");

homeCalJumpBtn.addEventListener("click", () => {
    homeCalJumpInput.showPicker();
});

homeCalJumpInput.addEventListener("change", () => {
    const val = homeCalJumpInput.value;
    if (!val) return;
    const targetDate = new Date(val + "T00:00:00");
    homeCalWeekStart = getMonday(targetDate);
    homeCalSelectedDate = val;
    renderHomeCalendar();
    updateHomeCalFilter();
    renderHome();
    homeCalJumpInput.value = "";
});

// ---- Focus Mode ----
focusModeBtn.addEventListener("click", () => {
    focusMode = !focusMode;
    document.body.classList.toggle("focus-mode", focusMode);
    focusModeBtn.classList.toggle("active", focusMode);
    focusModeBtn.innerHTML = focusMode
        ? '<span class="material-symbols-outlined">close</span> Exit Focus'
        : '<span class="material-symbols-outlined">center_focus_strong</span> Focus Mode';
    renderHome();
});

// Priority smooth slider
const priorityWrap = document.getElementById("prioritySliderWrap");
const priorityTrack = document.getElementById("priorityTrack");
const priorityFill = document.getElementById("priorityFill");
const priorityThumb = document.getElementById("priorityThumb");

// Gradient color stops: Low (green) → Medium (blue) → High (red)
const priorityGradientLight = [
    { r: 0, g: 210, b: 106 },   // #00d26a green (Low)
    { r: 59, g: 130, b: 246 },  // #3b82f6 blue (Medium)
    { r: 239, g: 68, b: 68 },   // #ef4444 red (High)
];
const priorityGradientDark = [
    { r: 74, g: 222, b: 128 },  // #4ade80 (Low)
    { r: 96, g: 165, b: 250 },  // #60a5fa (Medium)
    { r: 248, g: 113, b: 113 }, // #f87171 (High)
];

function lerpColor(stops, t) {
    // t: 0 to 1, interpolates across gradient stops
    t = Math.max(0, Math.min(1, t));
    const segCount = stops.length - 1;
    const seg = Math.min(Math.floor(t * segCount), segCount - 1);
    const local = (t * segCount) - seg;
    const a = stops[seg], b = stops[seg + 1];
    const r = Math.round(a.r + (b.r - a.r) * local);
    const g = Math.round(a.g + (b.g - a.g) * local);
    const bl = Math.round(a.b + (b.b - a.b) * local);
    return `rgb(${r},${g},${bl})`;
}

function pctToLevel(pct) {
    return pct < 33 ? 1 : pct < 66 ? 2 : 3;
}

// Set priority with smooth free-position (for dragging) or snapped (for click/release)
function setPriorityAt(pct, snap) {
    const level = pctToLevel(pct);
    const positions = { 1: 0, 2: 50, 3: 100 };
    const finalPct = snap ? positions[level] : pct;

    prioritySlider.value = level;
    priorityWrap.dataset.level = level;

    // Toggle transitions: smooth when snapping, instant when dragging
    if (snap) {
        priorityThumb.classList.remove("no-transition");
        priorityFill.classList.remove("no-transition");
    } else {
        priorityThumb.classList.add("no-transition");
        priorityFill.classList.add("no-transition");
    }

    // Gradient color based on position (0-100 → 0-1)
    const t = finalPct / 100;
    const gradient = isDark() ? priorityGradientDark : priorityGradientLight;
    const color = lerpColor(gradient, t);

    priorityThumb.style.left = finalPct + "%";
    priorityThumb.style.background = color;
    priorityFill.style.width = finalPct + "%";
    priorityFill.style.background = color;

    const label = getPriorityLabel(level);
    const colorClass = ["low", "medium", "high"][level - 1];
    priorityValue.textContent = label;
    priorityValue.className = `priority-label-${colorClass}`;

    // Update step dots and labels
    priorityWrap.querySelectorAll(".priority-step-dot").forEach((dot) => {
        dot.classList.toggle("active", +dot.dataset.step <= level);
    });
    priorityWrap.querySelectorAll(".priority-label-step").forEach((lbl) => {
        lbl.classList.toggle("active", +lbl.dataset.step === level);
    });
}

function setPriority(level) {
    const positions = { 1: 0, 2: 50, 3: 100 };
    setPriorityAt(positions[level], true);
}

// Click on track - snap to nearest level
priorityTrack.addEventListener("click", (e) => {
    if (dragging) return;
    const rect = priorityTrack.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setPriorityAt(pct, true);
});

// Click on labels
priorityWrap.querySelectorAll(".priority-label-step").forEach((lbl) => {
    lbl.addEventListener("click", () => setPriority(+lbl.dataset.step));
});

// Drag support - smooth free movement, snap on release
let dragging = false;
priorityThumb.addEventListener("mousedown", (e) => { dragging = true; e.preventDefault(); });
priorityThumb.addEventListener("touchstart", (e) => { dragging = true; }, { passive: true });

function handleDrag(clientX) {
    if (!dragging) return;
    const rect = priorityTrack.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setPriorityAt(pct, false); // smooth, no snap
}

function handleDragEnd() {
    if (!dragging) return;
    dragging = false;
    // Snap to nearest level on release
    const currentPct = parseFloat(priorityThumb.style.left) || 50;
    setPriorityAt(currentPct, true);
}

document.addEventListener("mousemove", (e) => handleDrag(e.clientX));
document.addEventListener("touchmove", (e) => handleDrag(e.touches[0].clientX), { passive: true });
document.addEventListener("mouseup", handleDragEnd);
document.addEventListener("touchend", handleDragEnd);

setPriority(2);

// Form submit - create task
todoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = todoInput.value.trim();
    if (!text) return;

    const checkedRadio = document.querySelector('input[name="category"]:checked');
    if (!checkedRadio) {
        showToast("Please select a category", "warning");
        return;
    }
    const selectedCategory = checkedRadio.value;

    todos.push({
        id: Date.now(),
        text,
        completed: false,
        category: selectedCategory,
        priority: +prioritySlider.value,
        dueDate: datePicker.value || null,
        createdAt: new Date().toISOString(),
    });

    saveTodos();

    // Reset form
    todoInput.value = "";
    datePicker.value = "";
    setPriority(2);
    const allCards = document.querySelectorAll(".radio-card");
    allCards.forEach((c) => c.classList.remove("selected"));
    document.querySelectorAll('input[name="category"]').forEach((r) => r.checked = false);
    colorRadioCards();

    todoInput.focus();
    renderHome();
    showToast("Task added successfully!");
});

function renderHome() {
    // Greeting & stats
    updateGreeting();
    updateStats();
    renderTodayTasks();
    renderHomeCalendar();

    // Badges
    const totalActive = todos.filter((t) => !t.completed).length;
    $("#badgeAll").textContent = totalActive;

    // Update all priority badges in sidebar (default + custom)
    updateAllPriorityBadges();

    // Recent/filtered tasks
    const recentTitle = $("#recentTitle");
    let taskList;
    if (homeCalSelectedDate) {
        // Filter by selected date (all categories)
        taskList = todos.filter((t) => t.dueDate === homeCalSelectedDate);
        taskList.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            if (b.priority !== a.priority) return b.priority - a.priority;
            return b.id - a.id;
        });
        const d = new Date(homeCalSelectedDate + "T00:00:00");
        recentTitle.textContent = "Tasks for " + d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else {
        // Default: last 5 newest
        taskList = [...todos].sort((a, b) => b.id - a.id).slice(0, 5);
        recentTitle.textContent = "Recent Tasks";
    }

    recentList.innerHTML = "";
    if (taskList.length === 0) {
        homeEmpty.classList.remove("hidden");
    } else {
        homeEmpty.classList.add("hidden");
        taskList.forEach((todo) => renderTodoItem(recentList, todo));
    }
}


// ========== CALENDAR STRIP ==========
const calDaysEl = $("#calDays");
const calPrev = $("#calPrev");
const calNext = $("#calNext");
const calFilterInfo = $("#calFilterInfo");
const calFilterText = $("#calFilterText");
const calClearFilter = $("#calClearFilter");

function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

function toDateStr(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function renderCalendarStrip() {
    if (!calWeekStart) calWeekStart = getMonday(new Date());
    const todayStr = getTodayStr();
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // Update month label
    const catCalMonthLabel = $("#catCalMonthLabel");
    if (catCalMonthLabel) {
        const endOfWeek = new Date(calWeekStart);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        const startMonth = calWeekStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        const endMonth = endOfWeek.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        catCalMonthLabel.textContent = startMonth === endMonth ? startMonth : `${calWeekStart.toLocaleDateString("en-US", { month: "short" })} - ${endOfWeek.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
    }

    // Find which dates have tasks in this category
    const taskDates = new Set();
    todos.forEach((t) => {
        if (t.category === activeCategory && t.dueDate && !t.completed) {
            taskDates.add(t.dueDate);
        }
    });

    calDaysEl.innerHTML = "";
    for (let i = 0; i < 7; i++) {
        const d = new Date(calWeekStart);
        d.setDate(d.getDate() + i);
        const ds = toDateStr(d);

        const dayEl = document.createElement("div");
        dayEl.className = "cal-day";
        if (ds === todayStr) dayEl.classList.add("today");
        if (ds === calSelectedDate) dayEl.classList.add("selected");
        if (taskDates.has(ds)) dayEl.classList.add("has-tasks");

        dayEl.innerHTML = `
            <span class="cal-day-name">${dayNames[i]}</span>
            <span class="cal-day-num">${d.getDate()}</span>
        `;

        dayEl.addEventListener("click", () => {
            if (calSelectedDate === ds) {
                calSelectedDate = null;
            } else {
                calSelectedDate = ds;
            }
            renderCalendarStrip();
            updateCalFilterInfo();
            currentPage = 1;
            renderCategoryList();
        });

        calDaysEl.appendChild(dayEl);
    }
}

function updateCalFilterInfo() {
    if (calSelectedDate) {
        const d = new Date(calSelectedDate + "T00:00:00");
        const formatted = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        calFilterText.textContent = "Showing tasks for " + formatted;
        calFilterInfo.classList.remove("hidden");
    } else {
        calFilterInfo.classList.add("hidden");
    }
}

calPrev.addEventListener("click", () => {
    calWeekStart.setDate(calWeekStart.getDate() - 7);
    renderCalendarStrip();
});

calNext.addEventListener("click", () => {
    calWeekStart.setDate(calWeekStart.getDate() + 7);
    renderCalendarStrip();
});

calClearFilter.addEventListener("click", () => {
    calSelectedDate = null;
    renderCalendarStrip();
    updateCalFilterInfo();
    currentPage = 1;
    renderCategoryList();
});

// Category calendar: Jump to date
const catCalJumpBtn = $("#catCalJumpBtn");
const catCalJumpInput = $("#catCalJumpInput");

catCalJumpBtn.addEventListener("click", () => {
    catCalJumpInput.showPicker();
});

catCalJumpInput.addEventListener("change", () => {
    const val = catCalJumpInput.value;
    if (!val) return;
    const targetDate = new Date(val + "T00:00:00");
    calWeekStart = getMonday(targetDate);
    calSelectedDate = val;
    renderCalendarStrip();
    updateCalFilterInfo();
    currentPage = 1;
    renderCategoryList();
    catCalJumpInput.value = "";
});

// ========== CATEGORY SCREEN ==========
function renderCategoryList() {
    let filtered = todos.filter((t) => {
        if (t.category !== activeCategory) return false;
        if (currentFilter === "active" && t.completed) return false;
        if (currentFilter === "completed" && !t.completed) return false;
        if (searchQuery && !t.text.toLowerCase().includes(searchQuery)) return false;
        if (calSelectedDate && t.dueDate !== calSelectedDate) return false;
        return true;
    });

    filtered.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (b.priority !== a.priority) return b.priority - a.priority;
        return b.id - a.id;
    });

    const totalFiltered = filtered.length;
    updatePagination(totalFiltered);

    const start = (currentPage - 1) * TASKS_PER_PAGE;
    const paginated = filtered.slice(start, start + TASKS_PER_PAGE);

    categoryListEl.innerHTML = "";

    if (paginated.length === 0) {
        catEmpty.classList.remove("hidden");
    } else {
        catEmpty.classList.add("hidden");
        paginated.forEach((todo) => renderTodoItem(categoryListEl, todo));
    }
}

searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.toLowerCase();
    currentPage = 1;
    renderCategoryList();
});

tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        currentFilter = tab.dataset.filter;
        currentPage = 1;
        renderCategoryList();
    });
});

backFromCategory.addEventListener("click", () => showScreen("home"));

function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / TASKS_PER_PAGE);
    if (totalPages <= 1) {
        pagination.classList.add("hidden");
        return;
    }
    pagination.classList.remove("hidden");
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPage.disabled = currentPage <= 1;
    nextPage.disabled = currentPage >= totalPages;
}

prevPage.addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; renderCategoryList(); }
});

nextPage.addEventListener("click", () => {
    currentPage++;
    renderCategoryList();
});

// ========== RENDER TODO ITEM ==========
function renderTodoItem(container, todo) {
    const li = document.createElement("li");
    li.className = "todo-item" + (todo.completed ? " completed" : "");
    li.dataset.id = todo.id;

    const priorityLabel = getPriorityLabel(todo.priority);
    const priorityClass = ["low", "medium", "high"][todo.priority - 1];
    const catMeta = getCategoryMeta(todo.category);

    const tagStyle = getTagStyle(todo.category);

    li.innerHTML = `
        <label class="custom-checkbox">
            <input type="checkbox" ${todo.completed ? "checked" : ""}>
            <span class="checkmark material-symbols-outlined">check</span>
        </label>
        <div class="todo-content">
            <div class="todo-text">${escapeHtml(todo.text)}</div>
            <div class="todo-meta">
                <span class="tag" style="${tagStyle}">${escapeHtml(catMeta.label)}</span>
                <span class="tag-priority priority-${priorityClass}">${priorityLabel}</span>
                ${todo.dueDate ? `<span class="todo-date"><span class="material-symbols-outlined" style="font-size:0.85rem;vertical-align:middle">calendar_today</span> ${formatDate(todo.dueDate)}</span>` : ""}
            </div>
        </div>
        <div class="todo-actions">
            <button class="kebab-btn material-symbols-outlined" title="More options">more_vert</button>
            <div class="kebab-menu">
                <button class="edit-btn"><span class="material-symbols-outlined" style="font-size:1.1rem">edit</span> Edit</button>
                <button class="delete-btn danger"><span class="material-symbols-outlined" style="font-size:1.1rem">delete</span> Delete</button>
            </div>
        </div>
    `;

    li.querySelector('input[type="checkbox"]').addEventListener("change", () => toggleTodo(todo.id));
    li.querySelector(".kebab-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        toggleKebab(todo.id);
    });
    li.querySelector(".edit-btn").addEventListener("click", () => editTodo(todo.id));
    li.querySelector(".delete-btn").addEventListener("click", () => requestDelete(todo.id));

    // Drag support for moving tasks between categories
    li.draggable = true;
    li.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", todo.id);
        e.dataTransfer.effectAllowed = "move";
        li.classList.add("dragging");
        // Highlight sidebar drop targets
        document.querySelectorAll(".sidebar-link[data-view]").forEach((link) => {
            if (link.dataset.view !== "home") link.classList.add("drop-target");
        });
    });
    li.addEventListener("dragend", () => {
        li.classList.remove("dragging");
        document.querySelectorAll(".sidebar-link.drop-target").forEach((link) => {
            link.classList.remove("drop-target", "drag-over");
        });
    });

    container.appendChild(li);
}

// ========== TOGGLE COMPLETE ==========
function toggleTodo(id) {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        refreshCurrentView();
        showToast(todo.completed ? "Task completed!" : "Task marked active", "success");
    }
}

// ========== DELETE / CONFIRM MODAL ==========
let modalAction = null;

function showConfirmModal(message, onConfirm) {
    modalMessage.textContent = message;
    modalAction = onConfirm;
    modalOverlay.classList.remove("hidden");
}

function requestDelete(id) {
    const todo = todos.find((t) => t.id === id);
    closeAllKebabs();
    showConfirmModal(`Are you sure you want to delete "${todo?.text}"?`, () => {
        todos = todos.filter((t) => t.id !== id);
        saveTodos();
        refreshCurrentView();
        showToast("Task deleted", "error");
    });
}

function closeModal() {
    modalOverlay.classList.add("hidden");
    modalAction = null;
}

modalCloseBtn.addEventListener("click", closeModal);
modalCancel.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
});

modalConfirm.addEventListener("click", () => {
    if (modalAction) {
        modalAction();
        closeModal();
    }
});

// ========== EDIT ==========
function editTodo(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    closeAllKebabs();

    const item = document.querySelector(`[data-id="${id}"]`);
    const textEl = item.querySelector(".todo-text");
    const original = todo.text;

    textEl.contentEditable = true;
    textEl.focus();
    textEl.style.outline = "2px solid var(--primary)";
    textEl.style.borderRadius = "4px";
    textEl.style.padding = "2px 6px";

    const range = document.createRange();
    range.selectNodeContents(textEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    function saveEdit() {
        textEl.contentEditable = false;
        textEl.style.outline = "";
        textEl.style.borderRadius = "";
        textEl.style.padding = "";
        const newText = textEl.textContent.trim();
        if (newText && newText !== original) {
            todo.text = newText;
            saveTodos();
            showToast("Task updated!", "success");
        } else {
            textEl.textContent = original;
        }
        textEl.removeEventListener("blur", saveEdit);
        textEl.removeEventListener("keydown", handleKey);
    }

    function handleKey(e) {
        if (e.key === "Enter") { e.preventDefault(); textEl.blur(); }
        if (e.key === "Escape") { textEl.textContent = original; textEl.blur(); }
    }

    textEl.addEventListener("blur", saveEdit);
    textEl.addEventListener("keydown", handleKey);
}

// ========== KEBAB ==========
function closeAllKebabs() {
    document.querySelectorAll(".kebab-menu.open").forEach((m) => m.classList.remove("open"));
    openKebabId = null;
}

function toggleKebab(id) {
    const menu = document.querySelector(`[data-id="${id}"] .kebab-menu`);
    if (openKebabId === id) {
        closeAllKebabs();
    } else {
        closeAllKebabs();
        if (menu) { menu.classList.add("open"); openKebabId = id; }
    }
}

document.addEventListener("click", (e) => {
    if (!e.target.closest(".todo-actions")) closeAllKebabs();
});

// ========== REFRESH ==========
function refreshCurrentView() {
    if (currentView === "home") renderHome();
    else if (currentView === "category") {
        renderCategoryList();
        updateAllPriorityBadges();
    }
}

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (currentView === "category") searchInput.focus();
        else todoInput.focus();
    }
    if (e.key === "Escape") { closeModal(); closeSidebar(); notifPanel.classList.add("hidden"); }
});

// ========== DRAG & DROP TO CHANGE CATEGORY ==========
function setupSidebarDropTargets() {
    document.querySelectorAll(".sidebar-link[data-view]").forEach((link) => {
        const cat = link.dataset.view;
        if (cat === "home") return;

        link.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            link.classList.add("drag-over");
        });

        link.addEventListener("dragleave", () => {
            link.classList.remove("drag-over");
        });

        link.addEventListener("drop", (e) => {
            e.preventDefault();
            link.classList.remove("drag-over");
            const todoId = +e.dataTransfer.getData("text/plain");
            const todo = todos.find((t) => t.id === todoId);
            if (todo && todo.category !== cat) {
                const newCat = getCategoryMeta(cat).label;
                todo.category = cat;
                saveTodos();
                refreshCurrentView();
                showToast(`Moved to ${newCat}`);
            }
            // Clean up highlights
            document.querySelectorAll(".sidebar-link.drop-target").forEach((l) => {
                l.classList.remove("drop-target", "drag-over");
            });
        });
    });
}

// Re-setup drop targets when sidebar categories change
const _origRenderSidebar = renderSidebarCategories;
renderSidebarCategories = function() {
    _origRenderSidebar();
    setupSidebarDropTargets();
};

// Initial setup for default category links
setupSidebarDropTargets();

// ========== NOTIFICATIONS ==========
const appNotifications = [
    {
        id: "notif-7",
        icon: "notifications_active",
        title: "Notifications Center Launched!",
        desc: "Stay updated with the latest features and improvements. Click the bell to see what's new!",
        time: "Just now",
        version: "1.7"
    },
    {
        id: "notif-6",
        icon: "create_new_folder",
        title: "Custom Categories",
        desc: "Create your own categories from the sidebar. Add unlimited custom categories to organize tasks your way.",
        time: "Recent",
        version: "1.6"
    },
    {
        id: "notif-5",
        icon: "delete_sweep",
        title: "Delete Categories",
        desc: "You can now delete custom categories. Hover over a category in the sidebar to see the delete button.",
        time: "Recent",
        version: "1.5"
    },
    {
        id: "notif-4",
        icon: "dark_mode",
        title: "Dark Mode",
        desc: "Toggle dark mode from the sidebar. Your preference is saved automatically.",
        time: "Earlier",
        version: "1.4"
    },
    {
        id: "notif-3",
        icon: "edit_note",
        title: "Edit Tasks Inline",
        desc: "Click the edit button on any task to rename it directly. Press Enter to save or Escape to cancel.",
        time: "Earlier",
        version: "1.3"
    },
    {
        id: "notif-2",
        icon: "search",
        title: "Search & Filter",
        desc: "Search tasks within categories and filter by Active or Completed status using the tab bar.",
        time: "Earlier",
        version: "1.2"
    },
    {
        id: "notif-1",
        icon: "rocket_launch",
        title: "Welcome to To Do List!",
        desc: "Manage tasks with categories, priorities, due dates, and more. Get productive!",
        time: "Day 1",
        version: "1.0"
    },
];

let readNotifications = JSON.parse(localStorage.getItem("readNotifications")) || [];

function getUnreadCount() {
    return appNotifications.filter((n) => !readNotifications.includes(n.id)).length;
}

function updateNotifBadge() {
    const count = getUnreadCount();
    if (count > 0) {
        notifDot.classList.remove("hidden");
    } else {
        notifDot.classList.add("hidden");
    }
}

function renderNotifications() {
    notifList.innerHTML = "";
    const unreadCount = getUnreadCount();

    if (appNotifications.length === 0) {
        notifEmpty.classList.remove("hidden");
        notifList.classList.add("hidden");
        notifMarkAll.style.display = "none";
        return;
    }

    notifEmpty.classList.add("hidden");
    notifList.classList.remove("hidden");
    notifMarkAll.style.display = unreadCount > 0 ? "" : "none";

    appNotifications.forEach((notif) => {
        const isUnread = !readNotifications.includes(notif.id);
        const item = document.createElement("div");
        item.className = "notif-item" + (isUnread ? " unread" : "");
        item.dataset.id = notif.id;

        item.innerHTML = `
            <div class="notif-icon"><span class="material-symbols-outlined">${notif.icon}</span></div>
            <div class="notif-content">
                <div class="notif-title">${escapeHtml(notif.title)}</div>
                <div class="notif-desc">${escapeHtml(notif.desc)}</div>
                <div class="notif-time">v${notif.version} &middot; ${notif.time}</div>
            </div>
        `;

        item.addEventListener("click", () => {
            if (isUnread) {
                readNotifications.push(notif.id);
                localStorage.setItem("readNotifications", JSON.stringify(readNotifications));
                item.classList.remove("unread");
                updateNotifBadge();
                renderNotifications();
            }
        });

        notifList.appendChild(item);
    });
}

function toggleNotifPanel() {
    const isHidden = notifPanel.classList.contains("hidden");
    if (isHidden) {
        renderNotifications();
        notifPanel.classList.remove("hidden");
    } else {
        notifPanel.classList.add("hidden");
    }
}

document.getElementById("notificationBell").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleNotifPanel();
});

notifMarkAll.addEventListener("click", (e) => {
    e.stopPropagation();
    appNotifications.forEach((n) => {
        if (!readNotifications.includes(n.id)) {
            readNotifications.push(n.id);
        }
    });
    localStorage.setItem("readNotifications", JSON.stringify(readNotifications));
    updateNotifBadge();
    renderNotifications();
    showToast("All notifications marked as read!");
});

// Close notification panel when clicking outside
document.addEventListener("click", (e) => {
    if (!e.target.closest(".topbar-right")) {
        notifPanel.classList.add("hidden");
    }
});

// ========== PROFILE NAME ==========
const profileNameEl = $("#profileName");
const profileAvatarEl = $("#profileAvatar");
const savedName = localStorage.getItem("userName");
if (savedName) {
    profileNameEl.textContent = savedName;
    profileAvatarEl.textContent = savedName.charAt(0).toUpperCase();
}

profileNameEl.addEventListener("click", () => {
    const name = prompt("Enter your name:", profileNameEl.textContent);
    if (name && name.trim()) {
        localStorage.setItem("userName", name.trim());
        profileNameEl.textContent = name.trim();
        profileAvatarEl.textContent = name.trim().charAt(0).toUpperCase();
        updateGreeting();
        showToast("Name updated!");
    }
});

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {
    renderSidebarCategories();
    updateFormCategories();
    updateNotifBadge();
    showScreen("home");
});

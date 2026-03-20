// ========== STATE ==========
let todos = JSON.parse(localStorage.getItem("todos")) || [];
let currentView = "home";
let activeCategory = "personal";
let currentFilter = "all";
let searchQuery = "";
let currentPage = 1;
const TASKS_PER_PAGE = 8;
let deleteTargetId = null;
let openKebabId = null;

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
const progressFill = $("#progressFill");
const progressText = $("#progressText");
const recentList = $("#recentList");
const homeEmpty = $("#homeEmpty");
const todoForm = $("#todoForm");
const todoInput = $("#todoInput");
const datePicker = $("#datePicker");
const prioritySlider = $("#prioritySlider");
const priorityValue = $("#priorityValue");
const radioCards = $$(".radio-card");

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

// Misc
const toastContainer = $("#toastContainer");
const notifDot = $("#notifDot");
const sidebarLinks = $$(".sidebar-link");

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

const categoryMeta = {
    personal: { icon: "\u2665", label: "Personal" },
    work: { icon: "\u2699", label: "Work" },
    shopping: { icon: "\ud83d\uded2", label: "Shopping" },
    health: { icon: "\u2764", label: "Health" },
};

// ========== TOAST ==========
function showToast(message, type = "success") {
    const icons = { success: "\u2705", error: "\u274c", warning: "\u26a0\ufe0f" };
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || ""}</span><span>${message}</span>`;
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
        const meta = categoryMeta[activeCategory];
        topbarTitle.textContent = meta.label;
        catIcon.textContent = meta.icon;
        catTitle.textContent = meta.label;
        currentView = "category";
        currentFilter = "all";
        searchQuery = "";
        searchInput.value = "";
        currentPage = 1;
        tabs.forEach((t) => {
            t.classList.toggle("active", t.dataset.filter === "all");
        });
        renderCategoryList();
    }

    // Update sidebar active
    sidebarLinks.forEach((l) => {
        if (screen === "home" && l.dataset.view === "home") {
            l.classList.add("active");
        } else if (screen === "category" && l.dataset.view === activeCategory) {
            l.classList.add("active");
        } else {
            l.classList.remove("active");
        }
    });
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

sidebarLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        if (view === "home") {
            showScreen("home");
        } else {
            activeCategory = view;
            showScreen("category");
        }
        closeSidebar();
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
});

// ========== HOME SCREEN ==========

// Radio cards
const customCategoryInput = $("#customCategoryInput");

radioCards.forEach((card) => {
    card.addEventListener("click", () => {
        radioCards.forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        card.querySelector("input").checked = true;

        if (card.dataset.value === "custom") {
            customCategoryInput.classList.remove("hidden");
            customCategoryInput.focus();
        } else {
            customCategoryInput.classList.add("hidden");
        }
    });
});

// Priority slider
prioritySlider.addEventListener("input", () => {
    priorityValue.textContent = getPriorityLabel(+prioritySlider.value);
});

// Form submit - create task
todoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = todoInput.value.trim();
    if (!text) return;

    let selectedCategory = document.querySelector('input[name="category"]:checked').value;
    if (selectedCategory === "custom") {
        const customVal = customCategoryInput.value.trim().toLowerCase();
        if (!customVal) { customCategoryInput.focus(); return; }
        selectedCategory = customVal;
    }

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
    prioritySlider.value = 2;
    priorityValue.textContent = "Medium";
    radioCards.forEach((c) => c.classList.remove("selected"));
    document.querySelector('.radio-card[data-value="personal"]').classList.add("selected");
    document.querySelector('input[name="category"][value="personal"]').checked = true;
    customCategoryInput.value = "";
    customCategoryInput.classList.add("hidden");

    todoInput.focus();
    renderHome();
    showToast("Task added successfully!");

    notifDot.classList.remove("hidden");
    setTimeout(() => notifDot.classList.add("hidden"), 2000);
});

function renderHome() {
    // Progress
    const total = todos.length;
    const done = todos.filter((t) => t.completed).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    progressFill.style.width = pct + "%";
    progressText.textContent = pct + "%";

    // Stats
    const counts = { personal: 0, work: 0, shopping: 0, health: 0 };
    todos.forEach((t) => {
        if (!t.completed && counts[t.category] !== undefined) counts[t.category]++;
    });
    $("#statPersonal").textContent = counts.personal;
    $("#statWork").textContent = counts.work;
    $("#statShopping").textContent = counts.shopping;
    $("#statHealth").textContent = counts.health;

    // Badges
    const totalActive = todos.filter((t) => !t.completed).length;
    $("#badgeAll").textContent = totalActive;
    $("#badgePersonal").textContent = counts.personal;
    $("#badgeWork").textContent = counts.work;
    $("#badgeShopping").textContent = counts.shopping;
    $("#badgeHealth").textContent = counts.health;

    // Recent tasks (last 5, newest first)
    const recent = [...todos].sort((a, b) => b.id - a.id).slice(0, 5);
    recentList.innerHTML = "";

    if (recent.length === 0) {
        homeEmpty.classList.remove("hidden");
    } else {
        homeEmpty.classList.add("hidden");
        recent.forEach((todo) => renderTodoItem(recentList, todo));
    }
}

// Stat cards click => go to category
$$(".stat-card").forEach((card) => {
    card.addEventListener("click", () => {
        activeCategory = card.dataset.view;
        showScreen("category");
    });
});

// ========== CATEGORY SCREEN ==========
function renderCategoryList() {
    let filtered = todos.filter((t) => {
        if (t.category !== activeCategory) return false;
        if (currentFilter === "active" && t.completed) return false;
        if (currentFilter === "completed" && !t.completed) return false;
        if (searchQuery && !t.text.toLowerCase().includes(searchQuery)) return false;
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

    li.innerHTML = `
        <label class="custom-checkbox">
            <input type="checkbox" ${todo.completed ? "checked" : ""}>
            <span class="checkmark">\u2713</span>
        </label>
        <div class="todo-content">
            <div class="todo-text">${escapeHtml(todo.text)}</div>
            <div class="todo-meta">
                <span class="tag tag-${todo.category}">${todo.category}</span>
                <span class="tag-priority priority-${priorityClass}">${priorityLabel}</span>
                ${todo.dueDate ? `<span class="todo-date">\ud83d\udcc5 ${formatDate(todo.dueDate)}</span>` : ""}
            </div>
        </div>
        <div class="todo-actions">
            <button class="kebab-btn" title="More options">&#8942;</button>
            <div class="kebab-menu">
                <button class="edit-btn">\u270f\ufe0f Edit</button>
                <button class="delete-btn danger">\ud83d\uddd1\ufe0f Delete</button>
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

// ========== DELETE ==========
function requestDelete(id) {
    deleteTargetId = id;
    const todo = todos.find((t) => t.id === id);
    modalMessage.textContent = `Are you sure you want to delete "${todo?.text}"?`;
    modalOverlay.classList.remove("hidden");
    closeAllKebabs();
}

function closeModal() {
    modalOverlay.classList.add("hidden");
    deleteTargetId = null;
}

modalCloseBtn.addEventListener("click", closeModal);
modalCancel.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
});

modalConfirm.addEventListener("click", () => {
    if (deleteTargetId !== null) {
        todos = todos.filter((t) => t.id !== deleteTargetId);
        saveTodos();
        refreshCurrentView();
        showToast("Task deleted", "error");
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
    else if (currentView === "category") renderCategoryList();
}

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (currentView === "category") searchInput.focus();
        else todoInput.focus();
    }
    if (e.key === "Escape") { closeModal(); closeSidebar(); }
});

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => showScreen("home"));


const TASKS_KEY = "tasks";
const OLD_TASKS_KEY = "data";   /* the old version saved the list as HTML under this key */
const THEME_KEY = "theme";
const PRIORITY_LABELS = { high: "High priority", medium: "Medium priority", low: "Low priority" };

let tasks = [];
let filter = "all";      /* all | active | completed */
let searchText = "";
let editingId = null;    /* id of the task currently being edited */

const inputBox = document.getElementById("input-box");
const dueInput = document.getElementById("due-date");
const prioritySelect = document.getElementById("priority");
const addBtn = document.getElementById("add-btn");
const listContainer = document.getElementById("list-container");
const counter = document.getElementById("counter");
const searchInput = document.getElementById("searchid");
const clearDoneBtn = document.getElementById("clear-done");
const clearAllBtn = document.getElementById("clear-all");
const progressBar = document.querySelector(".progress");
const progressFill = document.getElementById("progress-fill");
const progressLabel = document.getElementById("progress-label");
const themeToggle = document.getElementById("theme-toggle");
const filterButtons = document.querySelectorAll(".filter-btn");

/* Saving and loading */
function newId(){
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function cleanTask(t){
    if(!t || typeof t.text !== "string" || t.text.trim() === "") return null;
    return {
        id: typeof t.id === "string" && t.id ? t.id : newId(),
        text: t.text.trim(),
        done: t.done === true,
        due: typeof t.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.due) ? t.due : "",
        priority: PRIORITY_LABELS[t.priority] ? t.priority : "medium"
    };
}

/* Turn the old saved HTML list into task objects (parsed safely, nothing runs) */
function importOldTasks(html){
    const doc = new DOMParser().parseFromString(html, "text/html");
    const result = [];
    doc.querySelectorAll("li").forEach(function(li){
        li.querySelectorAll("span").forEach(function(s){ s.remove(); });
        const task = cleanTask({ text: li.textContent, done: li.classList.contains("checked") });
        if(task) result.push(task);
    });
    return result;
}

function loadTasks(){
    try{
        const raw = localStorage.getItem(TASKS_KEY);
        if(raw !== null){
            const parsed = JSON.parse(raw);
            if(Array.isArray(parsed)){
                return parsed.map(cleanTask).filter(Boolean);
            }
        }
        const old = localStorage.getItem(OLD_TASKS_KEY);
        if(old) return importOldTasks(old);
    } catch(e){}
    return [];
}

function store(){
    try{
        localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    } catch(e){}
}

/* Save, then redraw everything */
function commit(){
    store();
    render();
}

/*  Dates  */
function todayString(){
    const d = new Date();   /* local date, not UTC, so "today" is correct at night too */
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mm + "-" + dd;
}

function formatDate(str){
    const parts = str.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    const options = { day: "numeric", month: "short" };
    if(parts[0] !== new Date().getFullYear()) options.year = "numeric";
    return date.toLocaleDateString(undefined, options);
}

function dueInfo(task, today){
    if(!task.due) return null;
    const label = formatDate(task.due);
    if(task.done) return { text: "Due " + label, cls: "" };
    if(task.due < today) return { text: "Overdue: " + label, cls: "overdue" };
    if(task.due === today) return { text: "Due today", cls: "today" };
    return { text: "Due " + label, cls: "" };
}

/*  Helpers  */
function isDuplicate(text, skipId){
    const wanted = text.trim().toLowerCase();
    return tasks.some(function(t){
        return t.id !== skipId && t.text.toLowerCase() === wanted;
    });
}

function visibleTasks(){
    return tasks.filter(function(t){
        const passesFilter = filter === "all" || (filter === "active" && !t.done) || (filter === "completed" && t.done);
        return passesFilter && t.text.toLowerCase().includes(searchText);
    });
}

function makeEl(tag, className, text){
    const el = document.createElement(tag);
    if(className) el.className = className;
    if(text !== undefined) el.textContent = text;
    return el;
}

/*  additional feature  */
function buildPrioritySelect(value){
    const select = makeEl("select", "edit-priority");
    select.setAttribute("aria-label", "Priority");
    [["low", "Low"], ["medium", "Medium"], ["high", "High"]].forEach(function(p){
        const option = makeEl("option", "", p[1]);
        option.value = p[0];
        select.appendChild(option);
    });
    select.value = value;
    return select;
}

function buildEditForm(task){
    const form = makeEl("div", "edit-form");
    const text = makeEl("input", "edit-input");
    text.type = "text";
    text.value = task.text;
    text.setAttribute("aria-label", "Task text");

    const row = makeEl("div", "edit-row");
    const date = makeEl("input", "edit-date");
    date.type = "date";
    date.value = task.due;
    date.setAttribute("aria-label", "Due date");
    const select = buildPrioritySelect(task.priority);
    const saveBtn = makeEl("button", "mini", "Save");
    saveBtn.type = "button";
    const cancelBtn = makeEl("button", "mini cancel", "Cancel");
    cancelBtn.type = "button";
    row.append(date, select, saveBtn, cancelBtn);

    const error = makeEl("p", "edit-error");
    error.setAttribute("role", "alert");

    function trySave(){
        const value = text.value.trim();
        if(value === "" || isDuplicate(value, task.id)){
            text.classList.add("invalid");
            error.textContent = value === "" ? "Task can't be empty." : "That task is already on your list.";
            text.focus();
            return;
        }
        task.text = value;
        task.due = date.value;
        task.priority = select.value;
        editingId = null;
        commit();
    }
    function cancel(){
        editingId = null;
        render();
    }

    saveBtn.addEventListener("click", trySave);
    cancelBtn.addEventListener("click", cancel);
    text.addEventListener("input", function(){
        text.classList.remove("invalid");
        error.textContent = "";
    });
    form.addEventListener("keydown", function(e){
        if(e.key === "Escape"){
            cancel();
        } else if(e.key === "Enter" && e.target.tagName === "INPUT"){
            e.preventDefault();
            trySave();
        }
    });

    form.append(text, row, error);
    return form;
}

function buildItem(task, today){
    const li = makeEl("li");
    li.dataset.id = task.id;
    if(task.done) li.classList.add("checked");

    if(task.id === editingId){
        li.classList.add("editing");
        li.appendChild(buildEditForm(task));
        return li;
    }

    li.tabIndex = 0;
    const body = makeEl("div", "task-body");
    body.appendChild(makeEl("div", "task-text", task.text));

    const meta = makeEl("div", "task-meta");
    meta.appendChild(makeEl("span", "badge badge-" + task.priority, PRIORITY_LABELS[task.priority]));
    const due = dueInfo(task, today);
    if(due){
        meta.appendChild(makeEl("span", "due " + due.cls, due.text));
    }
    body.appendChild(meta);

    const actions = makeEl("div", "task-actions");
    const editBtn = makeEl("button", "icon-btn edit-btn");
    editBtn.type = "button";
    editBtn.title = "Edit task";
    editBtn.setAttribute("aria-label", "Edit task: " + task.text);
    const delBtn = makeEl("button", "icon-btn delete-btn", "\u00d7");
    delBtn.type = "button";
    delBtn.title = "Delete task";
    delBtn.setAttribute("aria-label", "Delete task: " + task.text);
    actions.append(editBtn, delBtn);

    li.append(body, actions);
    return li;
}

function emptyMessage(){
    if(tasks.length === 0) return "No tasks yet. Add your first one above.";
    if(searchText) return "No tasks match your search.";
    if(filter === "active") return "No active tasks. Nice work!";
    if(filter === "completed") return "Nothing completed yet.";
    return "No tasks to show.";
}

function updateStats(){
    const total = tasks.length;
    const done = tasks.filter(function(t){ return t.done; }).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    counter.textContent = done + "/" + total;
    progressFill.style.width = percent + "%";
    progressBar.setAttribute("aria-valuenow", percent);
    progressLabel.textContent = percent + "% complete";
    clearDoneBtn.disabled = done === 0;
    clearAllBtn.disabled = total === 0;
}

function render(){
    const today = todayString();
    listContainer.textContent = "";
    const shown = visibleTasks();
    if(shown.length === 0){
        listContainer.appendChild(makeEl("li", "empty", emptyMessage()));
    } else {
        shown.forEach(function(task){
            listContainer.appendChild(buildItem(task, today));
        });
    }
    updateStats();

    const field = listContainer.querySelector(".edit-input");
    if(field && editingId !== null){
        field.focus();
        field.select();
    }
}

function setFilter(name){
    filter = name;
    filterButtons.forEach(function(btn){
        btn.setAttribute("aria-pressed", btn.dataset.filter === name ? "true" : "false");
    });
}

/*  Adding tasks  */
function addTask(){
    const text = inputBox.value.trim();
    if(text === ""){
        alert("Enter your task!");
        return;
    }
    if(isDuplicate(text)){
        alert("That task is already on your list.");
        return;
    }
    tasks.push({
        id: newId(),
        text: text,
        done: false,
        due: dueInput.value,
        priority: prioritySelect.value
    });
    inputBox.value = "";
    dueInput.value = "";
    prioritySelect.value = "medium";

    /* make sure the new task isn't hidden by the current filter or search */
    if(filter === "completed") setFilter("all");
    if(searchText && !text.toLowerCase().includes(searchText)){
        searchText = "";
        searchInput.value = "";
    }
    editingId = null;
    commit();
}

addBtn.addEventListener("click", addTask);
inputBox.addEventListener("keydown", function(e){
    if(e.key === "Enter") addTask();
});

/*  Clicking tasks  */
listContainer.addEventListener("click", function(e){
    if(e.target.closest(".edit-form")) return;
    const li = e.target.closest("li[data-id]");
    if(!li) return;
    const task = tasks.find(function(t){ return t.id === li.dataset.id; });
    if(!task) return;

    if(e.target.closest(".edit-btn")){
        editingId = task.id;
        render();
    } else if(e.target.closest(".delete-btn")){
        tasks = tasks.filter(function(t){ return t.id !== task.id; });
        editingId = null;
        commit();
    } else {
        task.done = !task.done;
        editingId = null;
        commit();
    }
});

/* Keyboard: focus a task and press Enter or Space to check it off */
listContainer.addEventListener("keydown", function(e){
    if((e.key === "Enter" || e.key === " ") && e.target.matches("li[data-id]")){
        e.preventDefault();
        e.target.click();
    }
});

/*  Search, filters, clearing  */
searchInput.addEventListener("input", function(e){
    searchText = e.target.value.trim().toLowerCase();
    editingId = null;
    render();
});

filterButtons.forEach(function(btn){
    btn.addEventListener("click", function(){
        setFilter(btn.dataset.filter);
        editingId = null;
        render();
    });
});

clearDoneBtn.addEventListener("click", function(){
    tasks = tasks.filter(function(t){ return !t.done; });
    editingId = null;
    commit();
});

clearAllBtn.addEventListener("click", function(){
    if(tasks.length === 0) return;
    if(confirm("Delete all tasks?")){
        tasks = [];
        editingId = null;
        commit();
    }
});

/*  Dark mode  */
function applyTheme(theme){
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
}

themeToggle.addEventListener("click", function(){
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try{
        localStorage.setItem(THEME_KEY, next);
    } catch(e){}
});

/*  Start  */
applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
tasks = loadTasks();
try{
    if(localStorage.getItem(TASKS_KEY) === null && tasks.length > 0) store();   /* saves old tasks in the new format */
} catch(e){}
render();

/* Redraw when you come back to the tab, so "overdue" is right after midnight */
document.addEventListener("visibilitychange", function(){
    if(!document.hidden && editingId === null) render();
});
const inputBox = document.getElementById("input-box");
const listContainer = document.getElementById("list-container");
const counter = document.getElementById("counter");
const clearDoneBtn = document.getElementById("clear-done");
const clearAllBtn = document.getElementById("clear-all");

/* Text of a task, ignoring the edit/delete buttons inside the <li> */
function getTaskText(li){
    let text = "";
    li.childNodes.forEach(function(node){
        if(node.nodeType === Node.TEXT_NODE){
            text += node.textContent;
        }
    });
    return text.trim();
}

/* True if another task already has this text (ignoring upper/lower case).
   `skip` is the <li> being edited, so it doesn't clash with itself. */
function isDuplicate(text, skip){
    const wanted = text.trim().toLowerCase();
    return Array.from(listContainer.querySelectorAll("li")).some(function(li){
        return li !== skip && getTaskText(li).toLowerCase() === wanted;
    });
}

/* Makes sure a task has its edit and delete buttons.
   Also upgrades tasks saved by the older version of the app. */
function addButtons(li){
    let del = li.querySelector("span:not(.edit)");
    if(!del){
        del = document.createElement("span");
        del.innerHTML = "\u00d7";
        li.appendChild(del);
    }
    del.classList.add("delete");
    del.title = "Delete task";

    if(!li.querySelector("span.edit")){
        const edit = document.createElement("span");
        edit.className = "edit";
        edit.title = "Edit task";
        li.insertBefore(edit, del);
    }
}

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
    const li = document.createElement("li");
    li.appendChild(document.createTextNode(text));  /* text node = no HTML injection */
    addButtons(li);
    listContainer.appendChild(li); /*appendChild() method appends element as last child of an element. */
    inputBox.value = "";
    saveData();
}

/* Press Enter in the input box to add the task */
inputBox.addEventListener("keydown", function(e){
    if(e.key === "Enter"){
        addTask();
    }
});

function startEdit(li){
    if(li.querySelector(".edit-input")) return;

    const textNode = li.firstChild;
    const original = getTaskText(li);
    const field = document.createElement("input");
    field.type = "text";
    field.className = "edit-input";
    field.value = original;

    textNode.textContent = "";
    li.insertBefore(field, li.querySelector(".edit"));
    li.classList.add("editing");
    field.focus();
    field.select();

    let done = false;
    function finish(save){
        if(done) return;
        done = true;
        let text = original;
        if(save){
            const value = field.value.trim();
            if(value !== "" && !isDuplicate(value, li)){
                text = value;   /* empty or duplicate edits fall back to the old text */
            }
        }
        textNode.textContent = text;
        field.remove();
        li.classList.remove("editing");
        saveData();
    }

    field.addEventListener("keydown", function(e){
        if(e.key === "Enter"){
            e.preventDefault();
            const value = field.value.trim();
            if(value === "" || isDuplicate(value, li)){
                field.classList.add("invalid");   /* stay in edit mode and show red outline */
            } else {
                finish(true);
            }
        } else if(e.key === "Escape"){
            finish(false);
        }
    });
    field.addEventListener("input", function(){
        field.classList.remove("invalid");
    });
    field.addEventListener("blur", function(){
        finish(true);
    });
}

listContainer.addEventListener("click", function(e){
    const target = e.target;
    if(target.classList.contains("edit")){
        startEdit(target.parentElement);
    }
    else if(target.tagName === "SPAN"){
        target.parentElement.remove();
        saveData();
    }
    else if(target.tagName === "LI"){
        target.classList.toggle("checked");
        saveData();
    }
}, false);

clearDoneBtn.addEventListener("click", function(){
    listContainer.querySelectorAll("li.checked").forEach(function(li){
        li.remove();
    });
    saveData();
});

clearAllBtn.addEventListener("click", function(){
    if(listContainer.children.length === 0) return;
    if(confirm("Delete all tasks?")){
        listContainer.innerHTML = "";
        saveData();
    }
});

function updateCounter(){
    const total = listContainer.querySelectorAll("li").length;
    const done = listContainer.querySelectorAll("li.checked").length;
    counter.textContent = done + "/" + total;
    clearDoneBtn.disabled = done === 0;
    clearAllBtn.disabled = total === 0;
}
function saveData(){
    localStorage.setItem("data", listContainer.innerHTML);
    updateCounter();
}
function showTask(){
    listContainer.innerHTML = localStorage.getItem("data") || "";
    listContainer.querySelectorAll("li").forEach(addButtons);
    updateCounter();
}
showTask();


const allUl = document.querySelectorAll('#list-container');
const searchInput = document.querySelector('#searchid');

searchInput.addEventListener('input', function(e) {
    const searchStr = e.target.value.toLowerCase();

    allUl.forEach(ul => {
        const li_in_ul = ul.querySelectorAll('li');
        const matchingItems = [];
        const nonMatchingItems = [];
        
        li_in_ul.forEach(li => {
            const text = getTaskText(li).toLowerCase();
            
            if (text.includes(searchStr)) {
                matchingItems.push(li);  // Collect matching items
            } else {
                nonMatchingItems.push(li);  // Collect non-matching items
            }
        });
        
        // Clear the current list
        ul.querySelectorAll('li').forEach(li => li.remove());

        // Append matching items first
        matchingItems.forEach(item => ul.appendChild(item));
        
        // Append non-matching items after
        nonMatchingItems.forEach(item => ul.appendChild(item));
    });
});
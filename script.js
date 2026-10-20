const inputBox = document.getElementById("input-box");
const listContainer = document.getElementById("list-container");

function addTask(){
    if(inputBox.value === ''){
        alert("Enter your task!");
    }
    else{
        let li = document.createElement("li");
        li.innerHTML = inputBox.value;
        listContainer.appendChild(li); /*appendChild() method appends element as last child of an element. */
        let span = document.createElement("span"); 
        span.innerHTML="\u00d7";
        li.appendChild(span); /* adds a x mark*/
    }
    inputBox.value=""; 
    saveData();
} 
listContainer.addEventListener("click", function(e){
    if(e.target.tagName === "LI"){ 
        e.target.classList.toggle("checked");
        saveData();
    }
    else if(e.target.tagName === "SPAN"){
         e.target.parentElement.remove();
         saveData();
    }
}, false);


function updateCounter(){
    const total = listContainer.querySelectorAll("li").length;
    const done  = listContainer.querySelectorAll("li.checked").length;
    document.getElementById("counter").textContent = done + "/" + total;
}
function saveData(){
    localStorage.setItem("data", listContainer.innerHTML);
    updateCounter();
}
function showTask(){
    listContainer.innerHTML = localStorage.getItem("data") || "";
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
            const text = li.innerText.toLowerCase();
            
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


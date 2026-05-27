const API = "http://127.0.0.1:5000";

function openModal(){
document.getElementById("modal").style.display = "flex";
}

function closeModal(){
document.getElementById("modal").style.display = "none";
}

function toggleMode(){
document.body.classList.toggle("light");
}

async function signup(){

const email = document.getElementById("email").value;

const password = document.getElementById("password").value;

const res = await fetch(`${API}/signup`,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
email,
password
})
});

const data = await res.json();

document.getElementById("message").innerText = data.message;
}

async function login(){

const email = document.getElementById("email").value;

const password = document.getElementById("password").value;

const res = await fetch(`${API}/login`,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
email,
password
})
});

const data = await res.json();

document.getElementById("message").innerText = data.message;

if(data.success){

setTimeout(()=>{
closeModal();
alert("Welcome To Seller AI 🚀");
},1000);

}

}

async function generateAI(){

const product = document.getElementById("product").value;

if(product === ""){
alert("Enter product name");
return;
}

document.getElementById("output").innerText =
"Generating AI result...";

const res = await fetch(`${API}/generate`,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
product
})
});

const data = await res.json();

document.getElementById("output").innerText =
data.result;

}
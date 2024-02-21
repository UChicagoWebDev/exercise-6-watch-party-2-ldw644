// Constants to easily refer to pages
const SPLASH = document.querySelector(".splash");
const PROFILE = document.querySelector(".profile");
const LOGIN = document.querySelector(".login");
const ROOM = document.querySelector(".room");

// Custom validation on the password reset fields
const passwordField = document.querySelector(".profile input[name=password]");
const repeatPasswordField = document.querySelector(".profile input[name=repeatPassword]");
const repeatPasswordMatches = () => {
  const p = document.querySelector(".profile input[name=password]").value;
  const r = repeatPassword.value;
  return p == r;
};

const checkPasswordRepeat = () => {
  const passwordField = document.querySelector(".profile input[name=password]");
  if(passwordField.value == repeatPasswordField.value) {
    repeatPasswordField.setCustomValidity("");
    return;
  } else {
    repeatPasswordField.setCustomValidity("Password doesn't match");
  }
}

passwordField.addEventListener("input", checkPasswordRepeat);
repeatPasswordField.addEventListener("input", checkPasswordRepeat);

window.onload = function() {
  setInterval(() => {
    if (window.location.pathname.startsWith('/room/')) {
      messagePolling();
    }
  }, 500);
};

function show(page){
  SPLASH.classList.add("hide");
  PROFILE.classList.add("hide");
  LOGIN.classList.add("hide");
  ROOM.classList.add("hide");
  page.classList.remove("hide");
}

function logout(){
  document.cookie = "api_key=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  routes("/");
  loggedIn = false;
}


let loggedIn = getCookie("api_key") ? true : false;
let path = window.location.pathname;

document.addEventListener('DOMContentLoaded', function() {
  routes(path);
  //login ui
  const failedLogin = document.querySelectorAll(".failed *");
  failedLogin.forEach(element => {
    element.classList.add("hide");
  });
  //room ui
  
});

function messagePolling(clear = false) {
  console.log(1);
  let element = document.getElementsByClassName("messages")[0];
  if(clear) {
    element.innerHTML = "";
    if (element.hasAttribute("last_id")) {
      element.setAttribute("last_id", 0);
    }
  }
  let room_id = window.location.pathname.split("/").pop();
  let last_id = '0';
  if (element.hasAttribute("last_id")) {
    last_id = element.getAttribute("last_id");
  }
  fetch(`/api/room/${room_id}/messages?last_id=${last_id}`, {
    headers: {
      'api-key': getCookie("api_key"),
    }})
    .then(response => response.json())
    .then(messages => {
      if (messages == null) return;
      messages.forEach( m => {
        let author = document.createElement("author");
        author.textContent = m.author;
        let content = document.createElement("content");
        content.textContent = m.body;
        let message = document.createElement("message");
        message.appendChild(author);
        message.appendChild(content);
        
        element.appendChild(message);
        element.setAttribute("last_id", m.id);
      });
    })
};
function updateUI(page) {
  let loggedIn = getCookie("api_key");
  if (page == "room") {
    let room_id = window.location.pathname.split("/").pop();
    console.log(window.location.pathname);
    let element = document.getElementsByClassName("messages")[0];
    let last_id = '0';
    if (element.hasAttribute("last_id")) {
      last_id = element.getAttribute("last_id");
    }
    messagePolling(clear = true);
    fetch(`/api/room/${room_id}/info`, {
      headers: {
        'api-key': getCookie("api_key"),
      }})
      .then(response => response.json())
      .then(messages => {
        room_name = messages.room_name;
        document.getElementById("curRoomName").innerText = room_name;
      })
    fetch(`/api/user/info`, {
      headers: {
        'api-key': getCookie("api_key"),
      }})
      .then(response => response.json())
      .then(messages => {
        username = messages.name;
        document.getElementById("roomUsername").innerText = username;
      })
    
    // document.getElementById("roomUsername").innerText = "1";
    // document.getElementById("curRoomName").innerText = "2";
    // document.querySelector(".displayRoomName").classList.add("hide");
    document.querySelector(".editRoomName").classList.add("hide");
    document.getElementById("inviteLink").innerText = `/room/${room_id}`;
  } else if (page == "splash") {
    let loginbutton = document.getElementsByClassName("loggedOut");
    let userinfo = document.getElementsByClassName("loggedIn");
    let create = document.getElementsByClassName("create");
    let signup = document.getElementsByClassName("signup");
    getRooms();
    if (loggedIn) {
      loginbutton[0].classList.add("hide");
      userinfo[0].classList.remove("hide");
      create[0].classList.remove("hide");
      signup[0].classList.add("hide");
      fetch(`/api/user/info`, {
        headers: {
          'api-key': getCookie("api_key"),
        }})
        .then(response => response.json())
        .then(messages => {
          username = messages.name;
          document.getElementById("splashusername").innerText = "Welcome back, " + username + "!";
        })
    } else {
      loginbutton[0].classList.remove("hide");
      userinfo[0].classList.add("hide");
      create[0].classList.add("hide");
      signup[0].classList.remove("hide");
    }
  } else if (page == "profile") {
    fetch(`/api/user/info`, {
      headers: {
        'api-key': getCookie("api_key"),
      }})
      .then(response => response.json())
      .then(messages => {
        username = messages.name;
        document.getElementById("profileusername").value = username;
        document.getElementById("profileusernameright").innerText = username;
      })
  }
}
window.addEventListener('popstate', function(event){
  path = window.location.pathname;
  routes(path);
})

var routes = (path) => {
  if (path == "/") {
    show(SPLASH);
    updateUI("splash");
  } else if (!loggedIn) {
    show(LOGIN);
    sessionStorage.setItem('returnUrl', window.location.pathname);
    window.history.pushState({},"","/login");
  } else if (loggedIn) {
    if (path == "/profile") {
      show(PROFILE);
      updateUI("profile");
    } else if (path.split("/")[1] == "room") {
      show(ROOM);
      updateUI("room");
    } else if (path == "/login") {
      show(SPLASH);
      window.history.pushState({},"","/");
    }
  }
}
function postMessage() {
  var room_id = window.location.pathname.split("/").pop();
  let comment = document.getElementById("commentContent").value;
  fetch(`/api/room/${room_id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': getCookie("api_key"),
    },
    body: JSON.stringify({
      "comment": comment,
    }),
  })
  return;
}

function goprofile() {
  window.history.pushState({},"","/profile");
  routes("/profile");
}

function gosplash() {
  window.history.pushState({},"","/");
  routes("/");
}

function gologin() {
  // window.history.pushState({},"","/login");
  routes("/login");
}
function updateRoomName() {
  var room_id = window.location.pathname.split("/").pop();
  let new_room_name = document.getElementById("roomName").value;
  fetch(`/api/room/${room_id}/name`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': getCookie("api_key"),
    },
    body: JSON.stringify({
      "new_room_name": new_room_name,
    }),
  })

  let edit = document.querySelector(".editRoomName");
  let display = document.querySelector(".displayRoomName");
  edit.classList.add("hide");
  display.classList.remove("hide");

  document.getElementById("curRoomName").innerText = new_room_name;
}

function showUpdateRoomNameInput() {
  let edit = document.querySelector(".editRoomName");
  let display = document.querySelector(".displayRoomName");
  edit.classList.remove("hide");
  display.classList.add("hide");
}

function getCookie(name) {
  let cookieArray = document.cookie.split(';');
  for(let i = 0; i < cookieArray.length; i++) {
      let cookiePair = cookieArray[i].split('=');
      if(name == cookiePair[0].trim()) {
          return decodeURIComponent(cookiePair[1]);
      }
  }
  return null;
}

function signup(){
  fetch(`/api/signup`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
    },
  })
  .then(resp => resp.json())
  .then(message => {
    loggedIn = true;
    let api_key = message.api_key;
    document.cookie = "api_key="+api_key;
    let tryGetApikey = getCookie("api_key");
    // alert(tryGetApikey);
    window.history.pushState({},"","/");
    routes("/");
  })
}

function login(){
  fetch(`/api/login`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: document.getElementById('loginusername').value,
      password: document.getElementById('loginpassword').value,
    })
  })
  .then(resp => resp.json())
  .then(message => {
    let success =  message.success;
    console.log(success);
    if (success == 1){
      loggedIn = true;
      let api_key = message.api_key;
      document.cookie = "api_key="+api_key;
      let returnUrl = sessionStorage.getItem('returnUrl') || '/';
      if (returnUrl == '/login') returnUrl = "/";
      window.history.pushState({},"",returnUrl);
      routes(returnUrl);
      sessionStorage.removeItem('returnUrl');
    } else {
      const failedLogin = document.querySelectorAll(".failed *");
      failedLogin.forEach(element => {
        element.classList.remove("hide");
     });
    }
  
  })
}

function getRooms() {
  fetch(`/api/rooms`, {
    headers: {
      'api-key': getCookie("api_key"),
    },
  })
  .then(resp => resp.json())
  .then(messages => {
    roomList = document.querySelector(".roomList");
    roomList.innerHTML = "";
    if (messages ==null) {
      document.querySelector(".noRooms").classList.remove("hide");
    } else {
      messages.forEach(m => {
        let strong = document.createElement("strong");
        strong.textContent = m.name;
        let a = document.createElement("a");
        a.textContent = m.id+": ";
        a.appendChild(strong);
        a.onclick = () => {
          window.history.pushState({},"","/room/"+m.id);
          routes("/room/"+m.id);
        }
        roomList.appendChild(a);
      })
    }
    
  })
}

function createRoom() {
  fetch(`/api/newroom`, {
    headers: {
      'api-key': getCookie("api_key"),
    }
  })
  .then(resp => resp.json())
  .then(messages => {
    let id = messages.id;
    window.history.pushState({},"","/room/"+id);
    routes("/room/"+id);
  })
}

function changeUsername() {
  let username = document.getElementById("profileusername").value;
  fetch(`/api/user/name`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': getCookie("api_key"),
    },
    body: JSON.stringify({
      "new_name": username,
    }),
  })
  .then(() => {
    alert("Success!");
    document.getElementById("profileusernameright").innerText = username;
  })
  return;
}

function changePassword() {
  let password = document.getElementById("password").value;
  let repeatPassword = document.getElementById("repeatPassword").value;
  if (password != repeatPassword) return;
  fetch(`/api/user/password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': getCookie("api_key"),
    },
    body: JSON.stringify({
      "new_password": password,
    }),
  })
  .then(() => {
    alert("Success!");
  })
  return;
}

// TODO:  On page load, read the path and whether the user has valid credentials:
//        - If they ask for the splash page ("/"), display it
//        - If they ask for the login page ("/login") and don't have credentials, display it
//        - If they ask for the login page ("/login") and have credentials, send them to "/"
//        - If they ask for any other valid page ("/profile" or "/room") and do have credentials,
//          show it to them
//        - If they ask for any other valid page ("/profile" or "/room") and don't have
//          credentials, send them to "/login", but remember where they were trying to go. If they
//          login successfully, send them to their original destination
//        - Hide all other pages

// TODO:  When displaying a page, update the DOM to show the appropriate content for any element
//        that currently contains a {{ }} placeholder. You do not have to parse variable names out
//        of the curly  braces—they are for illustration only. You can just replace the contents
//        of the parent element (and in fact can remove the {{}} from index.html if you want).

// TODO:  Handle clicks on the UI elements.
//        - Send API requests with fetch where appropriate.
//        - Parse the results and update the page.
//        - When the user goes to a new "page" ("/", "/login", "/profile", or "/room"), push it to
//          History

// TODO:  When a user enters a room, start a process that queries for new chat messages every 0.1
//        seconds. When the user leaves the room, cancel that process.
//        (Hint: https://developer.mozilla.org/en-US/docs/Web/API/setInterval#return_value)

// On page load, show the appropriate page and hide the others

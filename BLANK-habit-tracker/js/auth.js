function signUp() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("msg");

  if (!email || !password) {
    msg.textContent = "Fill in all fields";
    return;
  }

  const users = JSON.parse(localStorage.getItem("users") || "[]");

  if (users.find(u => u.email === email)) {
    msg.textContent = "User already exists";
    return;
  }

  const user = {
    id: Date.now(),
    email,
    password
  };

  users.push(user);
  localStorage.setItem("users", JSON.stringify(users));
  localStorage.setItem("auth_user", JSON.stringify(user));

  window.location.href = "monthly.html";
}

function signIn() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("msg");

  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    msg.textContent = "Invalid login";
    return;
  }

  localStorage.setItem("auth_user", JSON.stringify(user));
  window.location.href = "monthly.html";
}

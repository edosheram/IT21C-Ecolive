
const DEMO_USER = { username: "admin", password: "1234" };

document.getElementById("loginForm")?.addEventListener("submit", function (e) {
  e.preventDefault();
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value;

  if (u === DEMO_USER.username && p === DEMO_USER.password) {
    localStorage.setItem("loggedIn", "true");
    window.location.href = "dashboard.html";
  } else {
    document.getElementById("loginMsg").textContent = "Invalid credentials";
  }
});


document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("loggedIn");
  window.location.href = "index.html";
});


if (window.location.pathname.includes("dashboard.html")) {
  if (localStorage.getItem("loggedIn") !== "true") {
    window.location.href = "index.html";
  }
}

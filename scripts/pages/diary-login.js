const SESSION_KEY = "yunhe.diary.session.v1";
const ACCOUNT_KEY = "yunhe.diary.account.v1";

document.getElementById("admin-name").value = localStorage.getItem(ACCOUNT_KEY) || "YUNHE";

async function login() {
  const adminName = document.getElementById("admin-name").value.trim();
  const password = document.getElementById("admin-password").value.trim();
  const status = document.getElementById("status");

  if (!adminName) {
    alert("请输入账户名称。");
    return;
  }

  if (!password) {
    alert("请输入账户密码。");
    return;
  }

  status.textContent = "正在连接数据库...";

  try {
    const res = await fetch("./api/diary-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminName, password })
    });

    const text = await res.text();
    let result = {};

    try {
      result = text ? JSON.parse(text) : {};
    } catch (err) {
      result = {};
    }

    if (!res.ok) {
      if (res.status === 404) {
        status.textContent =
          "登录失败：api/diary-list 没有部署到 Vercel。请确认 GitHub 里有 api/diary-list.js，并重新部署。";
        return;
      }

      status.textContent =
        result.error ||
        `登录失败：接口返回 ${res.status}。请打开 /api/diary-list 检查接口是否已更新。`;
      return;
    }

    localStorage.setItem(ACCOUNT_KEY, adminName);
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        adminName,
        password,
        loginAt: new Date().toISOString()
      })
    );

    window.location.href = "diary-app.html";
  } catch (err) {
    status.textContent = "没有连到云端接口。请用 Vercel 网址打开，不要用本地 file:// 页面。";
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}

const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const fs = require("node:fs"); // チェック用に追加

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // 💡 ローカルのJS実行を許可するために false にします
    },
  });

  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    win.loadURL("http://localhost:3000");
  } else {
    // 確実にパスを解決
    const indexPath = path.join(__dirname, "out", "index.html");

    // デバッグ用：ファイルがない場合にエラーを表示
    if (!fs.existsSync(indexPath)) {
      console.error("HTMLが見つかりません:", indexPath);
    }

    win.loadFile(indexPath); // loadURL ではなく loadFile を使うのが確実です
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

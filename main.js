const { app, BrowserWindow } = require("electron");
const path = require("node:path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    // macOSっぽい見た目にする
    titleBarStyle: "hiddenInset",
  });

  // 開発中はローカルサーバーを表示、ビルド後は静的ファイルを表示
  const url =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "out/index.html")}`;

  win.loadURL(url);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

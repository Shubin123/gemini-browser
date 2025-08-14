import electron from "electron";
const { BrowserWindow } = electron;
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let browserWindow = null;
let isPlaywrightControlled = false;

export async function createBrowserWindow() {
  if (browserWindow && !browserWindow.isDestroyed()) {
    return browserWindow;
  }

  browserWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: false,
      webSecurity: false,
    },
    icon: path.join(__dirname, "assets", "icon.png"),
    titleBarStyle: "default",
    show: false,
  });

  browserWindow.once("ready-to-show", () => {
    browserWindow.show();
  });

  browserWindow.loadURL("https://google.com");

  // if (process.env.NODE_ENV === "development") {
    // browserWindow.webContents.openDevTools();
  // }

  // Clean up reference when window is closed
  browserWindow.on('closed', () => {
    browserWindow = null;
    isPlaywrightControlled = false;
  });

  return browserWindow;
}

export function getBrowserWindow() {
  return browserWindow;
}

export function setBrowserWindow(window) {
  browserWindow = window;
}

export function setPlaywrightControlled(controlled = true) {
  isPlaywrightControlled = controlled;
}

export function isPlaywrightControlling() {
  return isPlaywrightControlled;
}

export function getBrowserWindowInfo() {
  if (!browserWindow || browserWindow.isDestroyed()) {
    return null;
  }

  return {
    id: browserWindow.id,
    pid: process.pid,
    bounds: browserWindow.getBounds(),
    title: browserWindow.getTitle(),
    url: browserWindow.webContents.getURL(),
    isPlaywrightControlled
  };
}
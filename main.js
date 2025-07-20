// main.js - Main Electron process with browser and side panel
import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename =  fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let browserWindow;
let tempDir;

// Create temp directory for screenshots
function createTempDirectory() {
  tempDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  console.log("Temp directory created at:", tempDir);
}

function createMainWindow() {
  const preloadPath = path.join(__dirname, "preload.cjs");
  console.log("Preload path:", preloadPath);
  console.log("Preload exists:", fs.existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      enableRemoteModule: false,
      sandbox: false,
      // preload: path.join(__dirname, 'preload.cjs') // Use absolute path
    },
    icon: path.join(__dirname, "assets", "icon.png"),
    titleBarStyle: "default",
    show: false,
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.loadFile("index.html");

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
}

function createBrowserWindow() {
  browserWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: false,
      webSecurity: false, // Allow cross-origin requests for the browser
    },
    icon: path.join(__dirname, "assets", "icon.png"),
    titleBarStyle: "default",
    show: false,
  });

  browserWindow.once("ready-to-show", () => {
    browserWindow.show();
  });

  // Load a default page or leave blank
  browserWindow.loadURL("https://google.com");

  if (process.env.NODE_ENV === "development") {
    browserWindow.webContents.openDevTools();
  }
}

async function handleBrowserCommand(command) {
  if (!browserWindow || browserWindow.isDestroyed()) {
    createBrowserWindow();
  }

  const parts = command.split(" ");
  const action = parts[0];
  const args = parts.slice(1);

  try {
    switch (action) {
      case "navigate":
        await browserWindow.loadURL(args[0]);
        return { status: "success", url: args[0] };

      case "click":
        const clickResult = await browserWindow.webContents.executeJavaScript(`
                    (() => {
                        const el = document.querySelector('${args[0]}');
                        if (el) {
                            el.click();
                            return { success: true };
                        }
                        return { success: false, error: 'Element not found' };
                    })()
                `);
        return {
          status: clickResult.error ? "error" : "success",
          ...clickResult,
        };

      case "input":
        const selector = args[0];
        const value = args.slice(1).join(" ");
        const inputResult = await browserWindow.webContents.executeJavaScript(`
                    (() => {
                        const el = document.querySelector('${selector}');
                        if (el) {
                            el.value = ${JSON.stringify(value)};
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                            return { success: true };
                        }
                        return { success: false, error: 'Element not found' };
                    })()
                `);
        return inputResult;

      case "screenshot":
        const screenshot = await browserWindow.webContents.capturePage();
        const filename = `screenshot_${Date.now()}.png`;
        const filepath = path.join(tempDir, filename);
        fs.writeFileSync(filepath, screenshot.toPNG());
        return { status: "success", path: filepath };

      case "evaluate":
        const code = args.join(" ");
        const evalResult = await browserWindow.webContents.executeJavaScript(
          code
        );
        return { status: "success", result: evalResult };

      case "get":
        const domInfo = await browserWindow.webContents.executeJavaScript(`
                    (() => {
                        const el = document.querySelector('${args[0]}');
                        if (!el) return null;
                        
                        return {
                            tagName: el.tagName,
                            id: el.id,
                            className: el.className,
                            textContent: el.textContent,
                            value: el.value,
                            attributes: Array.from(el.attributes).map(attr => ({
                                name: attr.name,
                                value: attr.value
                            })),
                            children: el.children.length,
                            boundingRect: {
                                x: el.getBoundingClientRect().x,
                                y: el.getBoundingClientRect().y,
                                width: el.getBoundingClientRect().width,
                                height: el.getBoundingClientRect().height
                            }
                        };
                    })()
                `);
        return domInfo
          ? { status: "success", element: domInfo }
          : { status: "error", message: "Element not found" };

      default:
        throw new Error(`Unknown browser command: ${action}`);
    }
  } catch (error) {
    console.error("Browser command error:", error);
    return { status: "error", error: error.message, stack: error.stack };
  }
}

const getGeminiPath = () => {
  if (app.isPackaged) {
    // In packaged app, use process.resourcesPath
    return path.join(process.resourcesPath, "gemini-cli", "gemini");
  } else {
    // In development, use process.cwd()
    return path.join(process.cwd(), "gemini-cli", "gemini");
    // return path.join(process.cwd(), "gemini-cli");
  }
};

// main.js (additional handlers)

async function handleGeminiCommand(command) {
  try {
    // Parse the command structure
    const [action, params] = command.split("?");
    const paramsObj = Object.fromEntries(new URLSearchParams(params));

    switch (action) {
      case "getState":
        return {
          status: "success",
          data: {
            browserUrl: browserWindow?.webContents.getURL(),
            appStatus: mainWindow?.isVisible() ? "active" : "hidden",
            lastScreenshot: getLatestScreenshot(),
          },
        };

      case "getUIState":
        const uiState = await mainWindow.webContents.executeJavaScript(`
          ({
            promptText: document.getElementById('prompt')?.value,
            outputText: document.getElementById('output')?.textContent,
            selectedModel: document.getElementById('model')?.value
          })
        `);
        return {
          status: "success",
          data: uiState,
        };

      case "setUIState":
        await mainWindow.webContents.executeJavaScript(`
          document.getElementById('${paramsObj.element}').value = '${paramsObj.value}';
        `);
        return { status: "success" };

      default:
        throw new Error(`Unknown Gemini command: ${action}`);
    }
  } catch (error) {
    return {
      status: "error",
      error: error.message,
      stack: error.stack,
    };
  }
}

function getLatestScreenshot() {
  const files = fs
    .readdirSync(tempDir)
    .filter((file) => file.endsWith(".png"))
    .sort(
      (a, b) =>
        fs.statSync(path.join(tempDir, b)).mtimeMs -
        fs.statSync(path.join(tempDir, a)).mtimeMs
    );

  return files.length > 0 ? path.join(tempDir, files[0]) : null;
}

// Handle taking screenshots of the browser window
ipcMain.handle("capture-screenshot", async () => {
  try {
    if (!browserWindow || browserWindow.isDestroyed()) {
      throw new Error("Browser window not available");
    }

    // Get the browser webview element
    const screenshot = await browserWindow.webContents.capturePage();

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `screenshot_${timestamp}.png`;
    const filepath = path.join(tempDir, filename);

    // Save screenshot to temp directory
    fs.writeFileSync(filepath, screenshot.toPNG());

    console.log("Screenshot saved to:", filepath);
    return filepath;
  } catch (error) {
    console.error("Error capturing screenshot:", error);
    throw error;
  }
});

// Handle capturing specific element screenshots from browser window
ipcMain.handle("capture-element-screenshot", async (event, selector) => {
  try {
    if (!browserWindow || browserWindow.isDestroyed()) {
      throw new Error("Browser window not available");
    }

    // Execute script in the browser window to get element bounds
    const bounds = await browserWindow.webContents.executeJavaScript(`
            (() => {
                const element = document.querySelector('${selector}');
                if (!element) return null;
                const rect = element.getBoundingClientRect();
                return {
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                };
            })()
        `);

    if (!bounds) {
      throw new Error(`Element with selector "${selector}" not found`);
    }

    // Capture element screenshot
    const screenshot = await browserWindow.webContents.capturePage(bounds);

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `element_screenshot_${timestamp}.png`;
    const filepath = path.join(tempDir, filename);

    // Save screenshot to temp directory
    fs.writeFileSync(filepath, screenshot.toPNG());

    console.log("Element screenshot saved to:", filepath);
    return filepath;
  } catch (error) {
    console.error("Error capturing element screenshot:", error);
    throw error;
  }
});

async function capscreenshot() {
  if (!browserWindow || browserWindow.isDestroyed()) {
    throw new Error("Browser window not available");
  }

  // Get the browser webview element
  const screenshot = await browserWindow.webContents.capturePage();

  // Generate unique filename
  const timestamp = Date.now();
  const filename = `screenshot_${timestamp}.png`;
  const filepath = path.join(tempDir, filename);

  // Save screenshot to temp directory
  fs.writeFileSync(filepath, screenshot.toPNG());

  console.log("Screenshot saved to:", filepath);
  return filepath;
}

// Handle Gemini CLI execution with automatic screenshot
ipcMain.handle(
  "execute-gemini",
  async (event, { prompt, captureScreen = false, options = {} }) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (prompt.startsWith("!browser ")) {
          const browserCommand = prompt.substring(9).trim();
          const result = await handleBrowserCommand(browserCommand);
          return resolve({
            success: true,
            stdout: JSON.stringify(result, null, 2),
            stderr: "",
            exitCode: 0,
          });
        }

        let imagePath = await capscreenshot();

        // Automatically capture screenshot if requested
        if (captureScreen) {
          console.log("Capturing screenshot for Gemini analysis...");
          try {
            imagePath = await mainWindow.webContents.executeJavaScript(`
                        window.electronAPI.captureScreenshot()
                    `);
            console.log("Screenshot captured:", imagePath);
          } catch (error) {
            console.error("Failed to capture screenshot:", error);
          }
        }

        // Build command arguments
        const args = [];
        // Add model if specified
        if (options.model) {
          args.push("-m", options.model);
        }

        // Combine prompt with image path if screenshot was captured
        let finalPrompt = prompt || "";
        if (imagePath && fs.existsSync(imagePath)) {
          const absoluteImagePath = path.resolve(imagePath);
          finalPrompt = `${prompt}\n\n[Image: ${absoluteImagePath}]`;
          console.log("Added screenshot path to prompt:", absoluteImagePath);
        }

        // Add final prompt
        if (finalPrompt) {
          args.push("-p", finalPrompt);
        }

        // Add other options
        if (options.sandbox) args.push("-s");
        if (options.debug) args.push("-d");
        if (options.yolo) args.push("-y");

        console.log("Executing Gemini CLI with args:", args);

        // Construct the path to the Gemini executable
        const geminiPath = getGeminiPath();

        // Check if the executable exists
        // if (!fs.existsSync(geminiPath)) {
        //     const error = new Error(`Gemini CLI executable not found at: ${geminiPath}`);
        //     console.error(error.message);
        //     reject(error);
        //     return;
        // }

        const geminiProcess = await createGeminiProcess(geminiPath, args);
        // Spawn the Gemini CLI process
        // const geminiProcess = spawn(geminiPath, args, {
        //     cwd: process.cwd(),
        //     stdio: ['pipe', 'pipe', 'pipe']
        // });

        let stdout = "";
        let stderr = "";

        // Close stdin immediately
        geminiProcess.stdin.end();

        geminiProcess.stdout.on("data", (data) => {
          const chunk = data.toString();
          stdout += chunk;
          // Send real-time updates to renderer
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("gemini-output", {
              type: "stdout",
              data: chunk,
            });
          }
        });

        geminiProcess.stderr.on("data", (data) => {
          const chunk = data.toString();
          stderr += chunk;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("gemini-output", {
              type: "stderr",
              data: chunk,
            });
          }
        });

        geminiProcess.on("close", (code) => {
          console.log(`Gemini CLI exited with code ${code}`);

          // Clean up temporary screenshot file
          if (imagePath && fs.existsSync(imagePath)) {
            try {
              fs.unlinkSync(imagePath);
              console.log("Cleaned up temporary screenshot:", imagePath);
            } catch (cleanupError) {
              console.warn(
                "Failed to clean up screenshot:",
                cleanupError.message
              );
            }
          }

          resolve({
            success: code === 0,
            stdout,
            stderr,
            exitCode: code,
            screenshotUsed: !!imagePath,
          });
        });

        geminiProcess.on("error", (error) => {
          console.error("Failed to start Gemini CLI:", error);
          reject(error);
        });

        // Handle timeout (5 minute timeout)
        const timeout = setTimeout(() => {
          console.log("Gemini CLI process timed out, killing...");
          geminiProcess.kill("SIGTERM");
          reject(new Error("Gemini CLI process timed out after 5 minutes"));
        }, 5 * 60 * 1000);

        geminiProcess.on("close", () => {
          clearTimeout(timeout);
        });
      } catch (error) {
        console.error("Error in execute-gemini:", error);
        reject(error);
      }
    });
  }
);

ipcMain.handle("execute-command", async (_, command) => {
  console.log(`Executing command: ${command}`);

  //   if (command.startsWith('!browser')) {
  return handleBrowserCommand(command);
  //   }
  //   else if (command.startsWith('ui::')) {
  //     return handleGeminiCommand(command.replace('ui::', ''));
  //   }
  //   else if (command.startsWith('system::')) {
  //     return handleGeminiCommand(command.replace('system::', ''));
  //   }

  return {
    status: "error",
    error: "Invalid command prefix",
    validPrefixes: ["browser::", "ui::", "system::"],
  };
});

// Handle browser navigation
ipcMain.handle("navigate-to", async (event, url) => {
  try {
    if (!browserWindow || browserWindow.isDestroyed()) {
      createBrowserWindow();
    }

    // Validate URL
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    await browserWindow.loadURL(url);
    return true;
  } catch (error) {
    console.error("Error navigating:", error);
    return false;
  }
});

// Handle browser control commands
ipcMain.handle("control-browser", async (event, { action, data }) => {
  try {
    if (!browserWindow || browserWindow.isDestroyed()) {
      createBrowserWindow();
    }

    switch (action) {
      case "navigate":
        await browserWindow.loadURL(data.url);
        return { success: true, url: data.url };

      case "execute":
        const result = await browserWindow.webContents.executeJavaScript(
          data.code
        );
        return { success: true, result };

      case "click":
        await browserWindow.webContents.executeJavaScript(`
                    (() => {
                        const element = document.querySelector('${data.selector}');
                        if (element) {
                            element.click();
                            return true;
                        }
                        return false;
                    })()
                `);
        return { success: true };

      case "input":
        await browserWindow.webContents.executeJavaScript(`
                    (() => {
                        const element = document.querySelector('${
                          data.selector
                        }');
                        if (element) {
                            element.value = ${JSON.stringify(data.value)};
                            element.dispatchEvent(new Event('input', { bubbles: true }));
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                            return true;
                        }
                        return false;
                    })()
                `);
        return { success: true };

      case "screenshot":
        const screenshot = await browserWindow.webContents.capturePage();
        const filename = `screenshot_${Date.now()}.png`;
        const filepath = path.join(tempDir, filename);
        fs.writeFileSync(filepath, screenshot.toPNG());
        return { success: true, path: filepath };

      default:
        throw new Error(`Unknown browser action: ${action}`);
    }
  } catch (error) {
    console.error("Browser control error:", error);
    return { success: false, error: error.message };
  }
});

// Handle DOM evaluation in browser window
ipcMain.handle("evaluate-in-browser", async (event, code) => {
  try {
    if (!browserWindow || browserWindow.isDestroyed()) {
      throw new Error("Browser window not available");
    }
    const result = await browserWindow.webContents.executeJavaScript(code);
    return { success: true, result };
  } catch (error) {
    console.error("Evaluation error:", error);
    return { success: false, error: error.message };
  }
});

// Get current browser URL
ipcMain.handle("get-current-url", async () => {
  try {
    if (browserWindow && !browserWindow.isDestroyed()) {
      return browserWindow.webContents.getURL();
    }
    return null;
  } catch (error) {
    console.error("Error getting current URL:", error);
    return null;
  }
});

// Get browser window visibility status
ipcMain.handle("is-browser-visible", async () => {
  return (
    browserWindow && !browserWindow.isDestroyed() && browserWindow.isVisible()
  );
});

// Toggle browser window visibility
ipcMain.handle("toggle-browser-window", async () => {
  try {
    if (!browserWindow || browserWindow.isDestroyed()) {
      createBrowserWindow();
      return true;
    }

    if (browserWindow.isVisible()) {
      browserWindow.hide();
    } else {
      browserWindow.show();
    }
    return true;
  } catch (error) {
    console.error("Error toggling browser window:", error);
    return false;
  }
});

// Clean up temp directory on app exit
function cleanupTempDirectory() {
  if (tempDir && fs.existsSync(tempDir)) {
    try {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      }
      fs.rmdirSync(tempDir);
      console.log("Temp directory cleaned up");
    } catch (error) {
      console.warn("Failed to clean up temp directory:", error.message);
    }
  }
}

// App event handlers
app.whenReady().then(() => {
  createTempDirectory();
  createMainWindow();
  createBrowserWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createBrowserWindow();
    }
  });
});

app.on("window-all-closed", () => {
  cleanupTempDirectory();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  cleanupTempDirectory();
});

// Prevent new window creation
app.on("web-contents-created", (event, contents) => {
  contents.on("new-window", (event, navigationUrl) => {
    event.preventDefault();
  });
});

export async function createGeminiProcess(geminiPath, args) {
  return new Promise(async (resolve, reject) => {
    // Check if the executable exists
    if (!fs.existsSync(geminiPath)) {
      console.log(`Gemini CLI executable not found at: ${geminiPath}`);

      const whichGemini = process.platform === "win32" ? "where" : "which";
      const whichProcess = spawn(whichGemini, ["gemini"]);

      let output = "";
      let errorOutput = "";

      whichProcess.stdout.on("data", (data) => {
        output += data.toString();
      });

      whichProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      whichProcess.on("close", async (code) => {
        if (code !== 0 || !output.trim()) {
          // Gemini not found, prompt user to install
          console.log("Gemini CLI is not installed or not found in PATH.");

          const shouldInstall = await promptUserForInstallation();

          if (shouldInstall) {
            try {
              await installGeminiCLI();
              // After installation, try to spawn the process again
              const geminiProcess = await trySpawnGemini(args);
              resolve(geminiProcess);
            } catch (installError) {
              reject(
                new Error(
                  `Failed to install Gemini CLI: ${installError.message}`
                )
              );
            }
          } else {
            reject(new Error("Gemini CLI installation declined by user"));
          }
        } else {
          // Found gemini in PATH, use that instead
          const foundGeminiPath = output.trim().split("\n")[0];
          console.log(`Found Gemini CLI at: ${foundGeminiPath}`);
          try {
            const geminiProcess = spawn(foundGeminiPath, args, {
              cwd: process.cwd(),
              stdio: ["pipe", "pipe", "pipe"],
            });
            resolve(geminiProcess);
          } catch (spawnError) {
            reject(spawnError);
          }
        }
      });

      whichProcess.on("error", (err) => {
        reject(
          new Error(`Failed to execute '${whichGemini} gemini': ${err.message}`)
        );
      });
    } else {
      // Executable exists at the specified path
      try {
        const geminiProcess = spawn(geminiPath, args, {
          cwd: process.cwd(),
          stdio: ["pipe", "pipe", "pipe"],
        });
        resolve(geminiProcess);
      } catch (spawnError) {
        reject(spawnError);
      }
    }
  });
}

async function promptUserForInstallation() {
 const result = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Yes', 'No'],
    defaultId: 0,
    cancelId: 1,
    title: 'Gemini CLI Required',
    message: 'Gemini CLI is not installed.',
    detail: 'To continue, we need to install the Gemini CLI:\n\nnpm install -g @google/gemini-cli\n\nWould you like to install it now?',
  });

  return result.response === 0; // 0 is "Yes"
}

function installGeminiCLI() {
  return new Promise((resolve, reject) => {
    console.log("Installing Gemini CLI...");
    console.log("Running: npm install -g @google/gemini-cli");

    const installProcess = spawn(
      "npm",
      ["install", "-g", "@google/gemini-cli"],
      {
        stdio: "inherit",
      }
    );

    installProcess.on("close", (code) => {
      if (code === 0) {
        console.log("Gemini CLI installed successfully!");
        console.log('You can now run "gemini" from the command line.');
        resolve();
      } else {
        reject(new Error(`Installation failed with exit code ${code}`));
      }
    });

    installProcess.on("error", (error) => {
      reject(error);
    });
  });
}

function trySpawnGemini(args) {
  return new Promise((resolve, reject) => {
    // Try to spawn using 'gemini' command (should be in PATH after installation)
    try {
      const geminiProcess = spawn("gemini", args, {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Test if the process started successfully
      geminiProcess.on("error", (error) => {
        reject(new Error(`Failed to start Gemini CLI: ${error.message}`));
      });

      // If we get here without immediate error, consider it successful
      setTimeout(() => {
        if (!geminiProcess.killed) {
          resolve(geminiProcess);
        }
      }, 1000);
    } catch (error) {
      reject(error);
    }
  });
}

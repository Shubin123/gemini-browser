let selectedImagePath = null;
let isExecuting = false;
let chatHistory = []; // Store conversation history
let maxHistoryLength = 10; // Configurable history limit

const elements = {
  model: document.getElementById("model"),
  prompt: document.getElementById("prompt"),
  selectImageBtn: document.getElementById("selectImageBtn"),
  selectedFile: document.getElementById("selectedFile"),
  sandbox: document.getElementById("sandbox"),
  debug: document.getElementById("debug"),
  yolo: document.getElementById("yolo"),
  executeBtn: document.getElementById("executeBtn"),
  statusIndicator: document.getElementById("statusIndicator"),
  clearBtn: document.getElementById("clearBtn"),
  output: document.getElementById("output"),
  // Add new elements for chat history controls
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),
  historyLengthInput: document.getElementById("historyLengthInput"),
  showHistoryBtn: document.getElementById("showHistoryBtn"),
};

// Chat history management
function addToHistory(prompt, response) {
  chatHistory.push({
    timestamp: new Date().toISOString(),
    prompt: prompt,
    response: response,
    imagePath: selectedImagePath
  });
  
  // Maintain history limit
  if (chatHistory.length > maxHistoryLength) {
    chatHistory = chatHistory.slice(-maxHistoryLength);
  }
  
  updateHistoryDisplay();
}

function buildContextualPrompt(currentPrompt) {
  if (chatHistory.length === 0) {
    return currentPrompt;
  }
  
  // Build context from recent history
  let contextPrompt = "Previous conversation context:\n";
  
  chatHistory.forEach((entry, index) => {
    contextPrompt += `\nUser: ${entry.prompt}`;
    contextPrompt += `\nAssistant: ${entry.response}`;
    if (entry.imagePath) {
      contextPrompt += ` [Image: ${entry.imagePath.split(/[\\/]/).pop()}]`;
    }
  });
  
  contextPrompt += `\n\nCurrent request: ${currentPrompt}`;
  
  return contextPrompt;
}

function clearChatHistory() {
  chatHistory = [];
  updateHistoryDisplay();
  appendOutput("🧹 Chat history cleared\n", "info");
}

function updateHistoryDisplay() {
  // Update UI to show current history count
  const historyCount = document.getElementById("historyCount");
  if (historyCount) {
    historyCount.textContent = `(${chatHistory.length}/${maxHistoryLength})`;
  }
}

function showChatHistory() {
  if (chatHistory.length === 0) {
    appendOutput("📚 No chat history available\n", "info");
    return;
  }
  
  appendOutput("📚 Chat History:\n", "info");
  appendOutput("=".repeat(50) + "\n", "info");
  
  chatHistory.forEach((entry, index) => {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    appendOutput(`[${index + 1}] ${time}\n`, "info");
    appendOutput(`👤 User: ${entry.prompt}\n`, "normal");
    appendOutput(`🤖 Assistant: ${entry.response.substring(0, 200)}${entry.response.length > 200 ? '...' : ''}\n`, "normal");
    if (entry.imagePath) {
      appendOutput(`🖼️ Image: ${entry.imagePath.split(/[\\/]/).pop()}\n`, "info");
    }
    appendOutput("-".repeat(30) + "\n", "info");
  });
}

// File selection
elements.selectImageBtn.addEventListener("click", async () => {
  try {
    const filePath = await window.electronAPI.selectImage();
    if (filePath) {
      selectedImagePath = filePath;
      const fileName = filePath.split(/[\\/]/).pop();
      elements.selectedFile.textContent = `Selected: ${fileName}`;
      elements.selectedFile.style.display = "block";
    } else {
      selectedImagePath = null;
      elements.selectedFile.style.display = "none";
    }
  } catch (error) {
    console.error("Error selecting file:", error);
    appendOutput("Error selecting file: " + error.message, "error");
  }
});

// Execute Gemini CLI with chat history
elements.executeBtn.addEventListener("click", async () => {
  if (isExecuting) return;

  const originalPrompt = elements.prompt.value.trim();
  if (!originalPrompt) {
    alert("Please enter a prompt");
    return;
  }

  setExecutionState(true);
  
  // Don't clear output completely - append new execution
  appendOutput("\n" + "=".repeat(60) + "\n", "info");

  const options = {
    model: elements.model.value || undefined,
    sandbox: elements.sandbox.checked,
    debug: elements.debug.checked,
    yolo: elements.yolo.checked,
  };

  // Build contextual prompt with history
  const contextualPrompt = buildContextualPrompt(originalPrompt);
  const isContextual = chatHistory.length > 0;

  appendOutput(`🚀 Executing Gemini CLI... ${isContextual ? '(with context)' : ''}\n`, "info");
  appendOutput(`Model: ${options.model || "default"}\n`, "info");
  appendOutput(`Original Prompt: ${originalPrompt}\n`, "info");
  if (isContextual) {
    appendOutput(`Context Length: ${chatHistory.length} previous exchanges\n`, "info");
  }
  if (selectedImagePath) {
    appendOutput(`Image: ${selectedImagePath}\n`, "info");
  }
  appendOutput(`Options: ${JSON.stringify(options)}\n\n`, "info");

  let assistantResponse = "";

  try {
    // Check if it's a browser command
    if (originalPrompt.startsWith('!browser ')) {
      const browserCommand = originalPrompt.substring(9).trim();
      appendOutput(`🌐 Executing browser command: ${browserCommand}\n`, "info");
      
      const result = await window.electronAPI.executeCommand(browserCommand);
      
      if (result.status === 'success') {
        appendOutput("✅ Browser command executed successfully\n", "success");
        const resultStr = JSON.stringify(result, null, 2);
        appendOutput(resultStr + "\n", "stdout");
        assistantResponse = `Browser command executed: ${resultStr}`;
      } else {
        appendOutput(`❌ Browser command failed: ${result.message || 'Unknown error'}\n`, "error");
        if (result.error) {
          appendOutput(result.error + "\n", "stderr");
        }
        assistantResponse = `Browser command failed: ${result.message || 'Unknown error'}`;
      }
    } 
    // Execute as normal Gemini prompt with context
    else {
      const result = await window.electronAPI.executeGemini({
        prompt: contextualPrompt, // Use contextual prompt instead of original
        captureScreen: false,
        options,
        imagePath: selectedImagePath
      });
      
      if (result.success) {
        appendOutput("✅ Execution completed successfully\n\n", "success");
        if (result.stdout) {
          appendOutput("--- STDOUT ---\n", "info");
          appendOutput(result.stdout + "\n", "stdout");
          assistantResponse = result.stdout;
        }
        
        // Special handling for browser-related Gemini responses
        if (result.stdout.includes('!browser')) {
          appendOutput("\n🔍 Detected browser command in response\n", "info");
          const browserCommands = result.stdout.match(/!browser .+?(?=\n|$)/g);
          if (browserCommands) {
            for (const cmd of browserCommands) {
              appendOutput(`\nExecuting: ${cmd}\n`, "info");
              const cmdResult = await window.electronAPI.executeCommand(cmd.substring(9).trim());
              appendOutput(JSON.stringify(cmdResult, null, 2) + "\n", cmdResult.status === 'success' ? "stdout" : "stderr");
            }
          }
        }
      } else {
        appendOutput(
          `❌ Execution failed (exit code: ${result.exitCode})\n\n`,
          "error"
        );
        if (result.stderr) {
          appendOutput("--- STDERR ---\n", "info");
          appendOutput(result.stderr + "\n", "stderr");
          assistantResponse = result.stderr;
        }
        if (result.stdout) {
          appendOutput("--- STDOUT ---\n", "info");
          appendOutput(result.stdout + "\n", "stdout");
          assistantResponse = result.stdout || result.stderr;
        }
      }
    }

    // Add to chat history (use original prompt, not contextual one)
    if (assistantResponse) {
      addToHistory(originalPrompt, assistantResponse);
    }

  } catch (error) {
    console.error("Execution error:", error);
    appendOutput(`💥 Fatal error: ${error.message}\n`, "error");
    
    // Enhanced error reporting for browser commands
    if (error.message.includes('Browser command')) {
      appendOutput("🛠️ Browser command troubleshooting:\n", "info");
      appendOutput("- Check the element exists with '!browser get [selector]'\n", "info");
      appendOutput("- Verify page loaded with '!browser evaluate document.readyState'\n", "info");
    }

    // Add error to history
    addToHistory(originalPrompt, `Error: ${error.message}`);
  } finally {
    setExecutionState(false);
    // Clear the prompt input for next message
    elements.prompt.value = "";
    elements.executeBtn.disabled = true;
  }
});

// Chat history controls
if (elements.clearHistoryBtn) {
  elements.clearHistoryBtn.addEventListener("click", clearChatHistory);
}

if (elements.showHistoryBtn) {
  elements.showHistoryBtn.addEventListener("click", showChatHistory);
}

if (elements.historyLengthInput) {
  elements.historyLengthInput.addEventListener("change", (e) => {
    const newLength = parseInt(e.target.value) || 10;
    maxHistoryLength = Math.max(1, Math.min(50, newLength)); // Limit between 1-50
    elements.historyLengthInput.value = maxHistoryLength;
    
    // Trim existing history if needed
    if (chatHistory.length > maxHistoryLength) {
      chatHistory = chatHistory.slice(-maxHistoryLength);
      updateHistoryDisplay();
    }
    
    appendOutput(`📊 History limit set to ${maxHistoryLength} exchanges\n`, "info");
  });
}

// Listen for real-time output
window.electronAPI.onGeminiOutput((data) => {
  if (data.type === "stdout") {
    appendOutput(data.data, "stdout-live");
  } else if (data.type === "stderr") {
    appendOutput(data.data, "stderr-live");
  }
});

// Clear output (but preserve history)
elements.clearBtn.addEventListener("click", () => {
  clearOutput();
  appendOutput("🧹 Output cleared (chat history preserved)\n", "info");
});

function setExecutionState(executing) {
  isExecuting = executing;
  elements.executeBtn.disabled = executing;
  elements.executeBtn.textContent = executing
    ? "⏳ Executing..."
    : "🚀 Execute Gemini CLI";

  elements.statusIndicator.className = `status-indicator ${
    executing ? "status-running" : "status-ready"
  }`;
  elements.statusIndicator.textContent = executing
    ? "Running..."
    : "Ready";
}

function clearOutput() {
  elements.output.innerHTML =
    '<div style="color: #888; font-style: italic;">Output cleared...</div>';
}

function appendOutput(text, type = "normal") {
  if (
    elements.output.innerHTML.includes("Output will appear here") ||
    elements.output.innerHTML.includes("Output cleared...")
  ) {
    elements.output.innerHTML = "";
  }

  const span = document.createElement("span");
  span.textContent = text;

  switch (type) {
    case "error":
      span.style.color = "#ff6b6b";
      break;
    case "success":
      span.style.color = "#51cf66";
      break;
    case "info":
      span.style.color = "#74c0fc";
      break;
    case "stdout":
    case "stdout-live":
      span.style.color = "#f0f0f0";
      break;
    case "stderr":
    case "stderr-live":
      span.style.color = "#ffa8a8";
      break;
    default:
      span.style.color = "#f0f0f0";
  }

  elements.output.appendChild(span);
  elements.output.scrollTop = elements.output.scrollHeight;
}

// Enable/disable execute button based on prompt
elements.prompt.addEventListener("input", () => {
  const hasPrompt = elements.prompt.value.trim().length > 0;
  elements.executeBtn.disabled = !hasPrompt || isExecuting;
});

// Browser control panel code (unchanged)
document
  .getElementById("browserControlBtn")
  .addEventListener("click", () => {
    const panel = document.getElementById("browserControlPanel");
    panel.style.display =
      panel.style.display === "none" ? "block" : "none";
  });

document
  .getElementById("toggleBrowserBtn")
  .addEventListener("click", async () => {
    const isVisible = await window.browserController.toggle();
    appendOutput(
      `Browser window ${isVisible ? "shown" : "hidden"}\n`,
      "info"
    );
  });

document
  .getElementById("navigateBtn")
  .addEventListener("click", async () => {
    const url = document.getElementById("browserUrl").value.trim();
    if (!url) return;

    const result = await window.browserController.navigate(url);
    appendOutput(
      `Navigated to: ${url}\n`,
      result.success ? "success" : "error"
    );
  });

document
  .getElementById("executeBtn")
  .addEventListener("click", async () => {
    const code = document.getElementById("domQuery").value.trim();
    if (!code) return;

    const result = await window.browserController.execute(code);
    appendOutput(
      `Execution result: ${JSON.stringify(result, null, 2)}\n`,
      result.success ? "success" : "error"
    );
  });

document
  .getElementById("inspectBtn")
  .addEventListener("click", async () => {
    const selector = document.getElementById("domQuery").value.trim();
    if (!selector) return;

    const domInfo = await window.browserController.getDOM(selector);
    if (domInfo) {
      appendOutput(
        `DOM Inspection:\n${JSON.stringify(domInfo, null, 2)}\n`,
        "info"
      );
    } else {
      appendOutput(`Element not found: ${selector}\n`, "error");
    }
  });

document
  .getElementById("clickBtn")
  .addEventListener("click", async () => {
    const selector = document
      .getElementById("elementSelector")
      .value.trim();
    if (!selector) return;

    const result = await window.browserController.click(selector);
    appendOutput(
      `Clicked element: ${selector}\n`,
      result.success ? "success" : "error"
    );
  });

document
  .getElementById("inputBtn")
  .addEventListener("click", async () => {
    const selector = document
      .getElementById("elementSelector")
      .value.trim();
    const value = document.getElementById("elementValue").value.trim();
    if (!selector || !value) return;

    const result = await window.browserController.input(selector, value);
    appendOutput(
      `Set value "${value}" on element: ${selector}\n`,
      result.success ? "success" : "error"
    );
  });

// Initial state
elements.executeBtn.disabled = true;
updateHistoryDisplay();
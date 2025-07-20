// preload.cjs - Preload script for Electron
const { contextBridge, ipcRenderer } = require("electron");
// const stateManager = require('./state-manager');


console.log("Preload script loaded");

try {
  // Expose protected methods that allow the renderer process to use
  // the ipcRenderer without exposing the entire object
  contextBridge.exposeInMainWorld("electronAPI", {
    executeBrowserCommand: async (command) => {
      try {
        const result = await ipcRenderer.invoke("execute-gemini", {
          prompt: `!browser ${command}`,
          captureScreen: false,
          options: {},
        });
        return result.success ? JSON.parse(result.stdout) : null;
      } catch (error) {
        console.error("Browser command error:", error);
        throw error;
      }
    },

    controlBrowser: async (action, data) => {
        
      try {
        return await ipcRenderer.invoke("control-browser", { action, data });
      } catch (error) {
        console.error("Browser control error:", error);
        throw error;
      }
    },

    // DOM Interaction Methods
    evaluateInBrowser: async (code) => {
      try {
        return await ipcRenderer.invoke("evaluate-in-browser", code);
      } catch (error) {
        console.error("Evaluation error:", error);
        throw error;
      }
    },

    // Execute Gemini CLI
    executeGemini: async (config) => {
      console.log("executeGemini called with config:", config);
      try {
        const result = await ipcRenderer.invoke("execute-gemini", config);
        console.log("executeGemini result:", result);
        return result;
      } catch (error) {
        console.error("executeGemini error:", error);
        throw error;
      }
    },

    // Select image file
    selectImage: async () => {
      console.log("selectImage called");
      try {
        const result = await ipcRenderer.invoke("select-image");
        console.log("selectImage result:", result);
        return result;
      } catch (error) {
        console.error("selectImage error:", error);
        throw error;
      }
    },

    // Listen for real-time output from Gemini CLI
    onGeminiOutput: (callback) => {
      console.log("Setting up gemini-output listener");
      ipcRenderer.on("gemini-output", (event, data) => {
        console.log("Received gemini-output:", data);
        callback(data);
      });
    },

    // Remove listeners
    removeAllListeners: (channel) => {
      console.log("Removing listeners for channel:", channel);
      ipcRenderer.removeAllListeners(channel);
    },

    // Add a test method to verify the API is working
    test: () => {
      console.log("electronAPI.test() called");
      return "API is working!";
    },

    executeCommand: async (command) => {
      try {
        const output = await ipcRenderer.invoke("execute-command", command);
        // stateManager.update(command, output);
        return output;
      } catch (error) {
        // stateManager.update(command, { error: error.message });
        throw error;
      }
    },

    // getAppState: () => stateManager.state,
    
  });

  console.log("electronAPI exposed successfully");
} catch (error) {
  console.error("Error in preload script:", error);
}

# Gemini Browser

An automated browsing application powered by Gemini CLI, built with Electron and Puppeteer for intelligent web automation and AI-driven browsing experiences.

## Features

- 🤖 **AI-Powered Automation** - Leverage Gemini CLI for intelligent web browsing
- 🔧 **Puppeteer Integration** - Two methods for robust browser automation within Electron
- 🖥️ **Cross-Platform** - Build for Windows, macOS, and Linux
- 🚀 **Modern Architecture** - Built with Electron 27 and latest web technologies
- 🛡️ **Secure** - Proper code signing and security configurations

## Prerequisites

- Node.js 16.0.0 or higher
- npm 8.0.0 or higher
- For macOS builds: Valid Apple Developer certificate
- For AI features: google account

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/shubinwang/gemini-browser.git
cd gemini-browser
npm install
```

## Development

### Running the Application

Start the application in development mode:

```bash
npm run dev
```

This starts Electron with remote debugging enabled on port 8315.

For basic development without debugging:

```bash
npm start
```

### Puppeteer Integration

This project supports two methods for integrating Puppeteer with Electron:

#### Method 1: Using `puppeteer-in-electron`

```javascript
import {BrowserWindow, app} from "electron";
import pie from "puppeteer-in-electron";
import puppeteer from "puppeteer-core";

const main = async () => {
  const browser = await pie.connect(app, puppeteer);
  const window = new BrowserWindow();
  const url = "https://example.com/";
  await window.loadURL(url);
  const page = await pie.getPage(browser, window);
  console.log(page.url());
};
```

#### Method 2: Remote Debugging Port

```javascript
import {app, BrowserWindow} from "electron";
import fetch from 'node-fetch';
import * as puppeteer from 'puppeteer';

app.commandLine.appendSwitch('remote-debugging-port', '8315');

async function connectPuppeteer() {
    const response = await fetch(`http://localhost:8315/json/versions/list`);
    const debugEndpoints = await response.json();
    const webSocketDebuggerUrl = debugEndpoints['webSocketDebuggerUrl'];
    
    const browser = await puppeteer.connect({
        browserWSEndpoint: webSocketDebuggerUrl
    });
    
    return browser;
}
```

### Important Setup Notes

**For main.js**, add this at the top:
```javascript
require('hazardous');
```

**Version Compatibility**: Ensure Puppeteer Core version matches Electron's bundled Chrome version:
```bash
npm run check-versions
```

## Building

### Development Builds

Create unpacked development builds:

```bash
# Current platform
npm run pack

# Specific platforms
npm run pack:win
npm run pack:mac  
npm run pack:linux
```

### Production Builds

Create distributable packages:

```bash
# Current platform
npm run build

# Specific platforms
npm run build:win
npm run build:mac
npm run build:linux

# All platforms
npm run build:all
```

### Platform-Specific Builds

**Windows:**
```bash
npm run build:win32    # 32-bit
npm run build:win64    # 64-bit
```

**macOS:**
```bash
npm run build:mac:universal    # Universal binary
npm run build:mac:unsigned     # Unsigned (development)
```

**Linux:**
```bash
npm run build:linux:x64     # x64 architecture
npm run build:linux:arm64   # ARM64 architecture
```

## Code Signing (macOS)

### Certificate Setup

1. Download your Apple Developer certificate
2. Install to login keychain only
3. Verify installation:
```bash
npm run check-certs
```

### Troubleshooting Certificate Issues

If you encounter `CSSMERR_TP_CERT_REVOKED` or `CSSMERR_TP_NOT_TRUSTED`:

1. **Remove revoked certificates:**
```bash
npm run clean-certs
```

2. **Check certificate status:**
```bash
security find-identity -v -p codesigning
```

3. **Fix trust settings in Keychain Access:**
   - Open certificate → Trust section
   - Set "Code Signing" to "Use System Defaults"

4. **Build unsigned for development:**
```bash
npm run build:mac:unsigned
```

## Project Structure

```
gemini-browser/
├── main.js              # Main Electron process
├── package.json         # Dependencies and build config
├── build/               # Build assets and certificates
│   └── entitlements.mac.plist
├── assets/              # Application icons
│   ├── icon.ico         # Windows icon
│   ├── icon.icns        # macOS icon
│   └── icon.png         # Linux icon
└── dist/                # Built applications
```

## Environment Variables

For code signing control:
```bash
export CSC_IDENTITY_AUTO_DISCOVERY=false  # Disable auto certificate discovery
export NODE_ENV=development                # Development mode
```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm start` | Run application |
| `npm run dev` | Run with remote debugging |
| `npm run build` | Build for current platform |
| `npm run pack` | Create unpacked build |
| `npm run clean`
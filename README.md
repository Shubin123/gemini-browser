# Gemini Browser

An automated browsing application powered by Gemini CLI, built with Electron and Puppeteer for intelligent web automation and AI-driven browsing experiences.

## Features

- 🤖 **AI-Powered Automation** - Leverage Gemini CLI for intelligent web browsing
- 🔧 **Puppeteer Integration** - Two methods for robust browser automation within Electron
- 🖥️ **Cross-Platform** - Build for Windows, macOS, and Linux, one click install
- 🚀 **Modern Architecture** - Built with Electron 37 and latest web technologies
- 🛡️ **Secure** - Proper code signing and security configurations, Oauth handled by google

## Install: fastest

# just click and install from release, Oauth signin is managed by gemini-cli which is bundled as a binary.

## Install: from [npmjs](https://www.npmjs.com/package/gemini-browser)

```bash
npm install -g gemini-browser
gemini-browser
```
or
```bash
npx gemini-browser
```
the npx command will install everything into a temp directory

## Install: from source

Clone the repository and install dependencies:

```bash
git clone https://github.com/shubinwang/gemini-browser.git
cd gemini-browser
npm install .
npm run start 
```
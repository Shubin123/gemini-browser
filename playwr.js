import pie from 'puppeteer-in-electron';
import electron from "electron";
const { app } = electron;
// import {app} from 'electron'
import puppeteer from 'puppeteer-core';
import { getBrowserWindow, setBrowserWindow, setPlaywrightControlled } from './window.js';

pie.initialize(app);

export function setupPlaywrightIPC(app, existingBrowserWindow) {
  let browser = null;
  let page = null;

  const playwrightBridge = {
    async launchElectronPlaywright() {
      try {
        // Connect puppeteer to Electron
        
        browser = await pie.connect(app || require('electron').app, puppeteer);
        
        // puppeteer should only look at the existing browser window never launch its own.
        let browserWindow = existingBrowserWindow

        // Get the page from the browser window
        page = await pie.getPage(browser, browserWindow);

        // Mark as Playwright controlled (keeping original naming)
        setPlaywrightControlled(true);
        setBrowserWindow(browserWindow);

        console.log('Puppeteer connected to Electron window');
        return browserWindow;
        
      } catch (error) {
        console.error('Failed to launch Electron with Puppeteer:', error);
        throw error;
      }
    },

    async getElectronCDPPort(browserWindow) {
      // Not needed with puppeteer-in-electron, but keeping for compatibility
      return 9222;
    },

    async getObservation() {
      if (!page) throw new Error('Puppeteer not initialized');
      
      // Get page content and interactive elements
      const observation = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*')).filter(el => {
          const rect = el.getBoundingClientRect();
          console.log(el.tagName)
          return rect.width > 0 && rect.height > 0 && 
                 (el.tagName === 'BUTTON' || el.tagName === 'A' || 
                  el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'IMAGE' ||
                  el.onclick || el.getAttribute('role') === 'button');
        }).slice(0, 500); // Limit to first n elements

        return {
          url: window.location.href,
          title: document.title,
          elements: elements.map((el, index) => ({
            index,
            tag: el.tagName,
            text: el.textContent?.trim().slice(0, 100),
            attributes: {
              id: el.id,
              class: el.className,
              type: el.type,
              href: el.href,
              role: el.getAttribute('role')
            },
            bounds: el.getBoundingClientRect()
          }))
        };
      });

      return observation;
    },

    async createAnnotatedScreenshot() {
      // if (!page) throw new Error('Puppeteer not initialized');
      
      // const screenshot = await page.screenshot({ fullPage: true });
      // const observation = await this.getObservation();
      
      // return {
      //   screenshot: screenshot.toString('base64'),
      //   observation,
      //   timestamp: Date.now()
      // };

    },

    async getActionableElements() {
      if (!page) throw new Error('Puppeteer not initialized');
      
      return await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*')).filter(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return false;
          
          return el.tagName === 'BUTTON' || el.tagName === 'A' || 
                 el.tagName === 'INPUT' || el.tagName === 'SELECT' ||
                 el.onclick || el.getAttribute('role') === 'button' ||
                 el.getAttribute('tabindex') !== null;
        });

        return elements.map((el, index) => {
          const rect = el.getBoundingClientRect();
          let actionType = 'click';
          
          if (el.tagName === 'INPUT') {
            actionType = el.type === 'checkbox' || el.type === 'radio' ? 'click' : 'type';
          } else if (el.tagName === 'SELECT') {
            actionType = 'select';
          }

          return {
            index,
            action_type: actionType,
            tag_name: el.tagName.toLowerCase(),
            description: el.textContent?.trim() || el.placeholder || el.title || `${el.tagName} element`,
            bounding_box: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height
            },
            attributes: {
              id: el.id,
              class: el.className,
              type: el.type,
              name: el.name
            }
          };
        });
      });
    },

    async takeAction(actionIndex, actionType = 'click', inputValue = null) {
      if (!page) throw new Error('Puppeteer not initialized');
      
      const elements = await this.getActionableElements();
      const element = elements[actionIndex];
      
      if (!element) {
        throw new Error(`No element found at index ${actionIndex}`);
      }

      try {
        const selector = this.buildSelector(element);
        
        switch (actionType) {
          case 'click':
            await page.click(selector);
            break;
          case 'type':
            if (inputValue) {
              await page.click(selector); // Focus first
              await page.keyboard.type(inputValue);
            }
            break;
          case 'select':
            if (inputValue) {
              await page.select(selector, inputValue);
            }
            break;
          default:
            throw new Error(`Unknown action type: ${actionType}`);
        }

        return {
          success: true,
          action: actionType,
          element: element.description,
          value: inputValue
        };
        
      } catch (error) {
        return {
          success: false,
          error: error.message,
          element: element.description
        };
      }
    },

    buildSelector(element) {
      if (element.attributes.id) {
        return `#${element.attributes.id}`;
      }
      
      let selector = element.tag_name;
      if (element.attributes.class) {
        const classes = element.attributes.class.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          selector += `.${classes.join('.')}`;
        }
      }
      
      return selector;
    },

   async cleanup() {
  // Check if page is still connected before closing
  if (page) {
    try {
      if (!page.isClosed()) {
        await page.close();
      }
    } catch (error) {
      // Ignore protocol errors - page is already closed
      if (!error.message.includes('Protocol error') && !error.message.includes('Connection closed')) {
        console.error('Error closing page:', error);
      }
    }
    page = null;
  }

  // Close browser
  if (browser) {
    try {
      if (browser.isConnected()) {
        await browser.disconnect();
      }
    } catch (error) {
      console.error('Error disconnecting browser:', error);
    }
    browser = null;
  }

  // Reset state
  try {
    setPlaywrightControlled(false);
  } catch (error) {
    console.error('Error resetting playwright state:', error);
  }
}

  };

  return playwrightBridge;
}
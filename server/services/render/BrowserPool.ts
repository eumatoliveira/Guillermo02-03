import puppeteer, { type Browser } from "puppeteer";
import fs from "fs";
import path from "path";

type PooledBrowser = {
  browser: Browser;
  inUse: boolean;
  createdAt: number;
};

export class BrowserPool {
  private readonly pool: PooledBrowser[] = [];
  private readonly maxPoolSize = 3;
  private readonly browserTtlMs = 10 * 60 * 1000;

  async acquire(): Promise<Browser> {
    const idle = this.pool.find((entry) => !entry.inUse && this.isAlive(entry));
    if (idle) {
      idle.inUse = true;
      return idle.browser;
    }

    if (this.pool.length < this.maxPoolSize) {
      const browser = await this.launch();
      this.pool.push({ browser, inUse: true, createdAt: Date.now() });
      return browser;
    }

    return this.waitForRelease();
  }

  release(browser: Browser) {
    const entry = this.pool.find((item) => item.browser === browser);
    if (entry) {
      entry.inUse = false;
    }
  }

  async shutdown() {
    await Promise.all(this.pool.map((entry) => entry.browser.close().catch(() => undefined)));
    this.pool.splice(0, this.pool.length);
  }

  private async launch(): Promise<Browser> {
    const executablePath = this.resolveExecutablePath();
    return puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--font-render-hinting=none",
      ],
    });
  }

  private resolveExecutablePath() {
    if (process.env.CHROME_PATH) {
      return process.env.CHROME_PATH;
    }

    const candidates = process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          path.join(process.env.LOCALAPPDATA ?? "", "Google\\Chrome\\Application\\chrome.exe"),
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        ]
      : [
          "/usr/bin/google-chrome",
          "/usr/bin/chromium",
          "/usr/bin/chromium-browser",
          "/snap/bin/chromium",
        ];

    return candidates.find((candidate) => candidate && fs.existsSync(candidate));
  }

  private isAlive(entry: PooledBrowser) {
    return !entry.browser.process()?.killed && Date.now() - entry.createdAt < this.browserTtlMs;
  }

  private async waitForRelease(timeoutMs = 30000): Promise<Browser> {
    const startedAt = Date.now();

    return new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        if (Date.now() - startedAt > timeoutMs) {
          clearInterval(timer);
          reject(new Error("BrowserPool timeout waiting for available browser"));
          return;
        }

        const idle = this.pool.find((entry) => !entry.inUse && this.isAlive(entry));
        if (!idle) return;

        clearInterval(timer);
        idle.inUse = true;
        resolve(idle.browser);
      }, 100);
    });
  }
}

export const browserPool = new BrowserPool();

// Turns an HTML file into a PDF with a locally installed Chrome, Chromium or Edge in headless mode.
// If none is installed, the HTML file is still there and can be printed to PDF from any browser.

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const CANDIDATES = [
  process.env.JOB_HUNT_KIT_CHROME,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

export function findChrome() {
  return CANDIDATES.find((p) => fs.existsSync(p)) || null;
}

/** @returns {{ ok: boolean, message: string }} */
export function htmlToPdf(htmlPath, pdfPath) {
  const chrome = findChrome();
  if (!chrome) return { ok: false, message: "No Chrome, Chromium or Edge found; open the HTML file and print it to PDF." };
  const run = spawnSync(
    chrome,
    ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href],
    { stdio: "ignore", timeout: 60000 },
  );
  if (run.status === 0 && fs.existsSync(pdfPath)) return { ok: true, message: pdfPath };
  return { ok: false, message: "Chrome could not print the PDF; open the HTML file and print it to PDF." };
}

/** Counts pages in a PDF Chrome produced (good enough for a page-count check, not a general parser). */
export function pdfPageCount(pdfPath) {
  const data = fs.readFileSync(pdfPath);
  return (data.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
}

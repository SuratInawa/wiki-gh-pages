"use strict";

const fs   = require("fs");
const path = require("path");

const SITE_URL  = (process.env.SITE_URL  || "").replace(/\/$/, "");
const SITE_NAME = process.env.SITE_NAME  || "Wiki";
const staticDir = path.join(__dirname, "dist", "static");
const indexPage = path.join(staticDir, "index.html");

if (!SITE_URL) {
  console.error("SITE_URL is not set.");
  process.exit(1);
}

const SKIP = new Set(["index.html", "static.css"]);

// Helper to decode links and convert characters to match our clean filename slug structure
function sanitizeHtmlLinks(htmlContent) {
  // Regex matches any href="something.html" link pattern
  return htmlContent.replace(/href="([^"]+\.html)"/g, (match, encodedLink) => {
    // Ignore links that point to external web domains or subdirectories
    if (encodedLink.startsWith("http://") || encodedLink.startsWith("https://") || encodedLink.startsWith("/")) {
      return match;
    }
    try {
      let decoded = decodeURIComponent(encodedLink);
      
      // Explicit manual chain covering illegal characters across Windows, Mac, Linux, and Web URLs
      // Percent signs (%) are intentionally left out here so multi-language scripts decode flawlessly
      let cleanLink = decoded
        .replace(/:/g, "-")
        .replace(/\//g, "-")
        .replace(/\\/g, "-")
        .replace(/\s+/g, "-")
        .replace(/\?/g, "-")
        .replace(/</g, "-")
        .replace(/>/g, "-")
        .replace(/\|/g, "-")
        .replace(/\*/g, "-")
        .replace(/"/g, "-")
        .replace(/#/g, "-")
        .normalize("NFC");
        
      return `href="${cleanLink}"`;
    } catch (e) {
      return match; // Fallback if decoding the link fails
    }
  });
}

const files = fs.readdirSync(staticDir)
  .filter(f => f.endsWith(".html") && !SKIP.has(f));

for (const file of files) {
  const oldPath = path.join(staticDir, file);
  
  // Normalize filenames to NFC formatting for strict GitHub Pages lookups
  const normalizedFile = file.normalize("NFC");
  const filePath = path.join(staticDir, normalizedFile);
  
  if (oldPath !== filePath) {
    fs.renameSync(oldPath, filePath);
  }

  let html = fs.readFileSync(filePath, "utf8");

  // Fix internal links inside this specific tiddler file body content
  html = sanitizeHtmlLinks(html);

  const tiddlerTitle = normalizedFile.replace(/\.html$/, "").replace(/-/g, " ");
  const liveUrl = `${SITE_URL}/#${encodeURIComponent(tiddlerTitle)}`;

  const banner = `<div data-banner-injected="true" style="background:#f0f0f0;border-bottom:1px solid #ccc;padding:8px 16px;font-size:0.85em;font-family:sans-serif;color:#555;">This is the static version of <a href="${liveUrl}" style="color:#333;">${tiddlerTitle}</a> from <a href="${SITE_URL}" style="color:#333;">${SITE_NAME}</a>.</div>`;

  if (!html.includes('data-banner-injected="true"') && html.match(/<body[^>]*>/)) {
    html = html.replace(/(<body[^>]*>)/, `$1\n${banner}`);
  }

  fs.writeFileSync(filePath, html, "utf8");
  console.log(`Processed: ${tiddlerTitle}`);
}

// Process the main index page links last using the same logic
if (fs.existsSync(indexPage)) {
  let indexHtml = fs.readFileSync(indexPage, "utf8");
  indexHtml = sanitizeHtmlLinks(indexHtml);

  const liveUrl = `${SITE_URL}/`;
  const indexBanner = `<div data-banner-injected="true" style="background:#f0f0f0;border-bottom:1px solid #ccc;padding:8px 16px;font-size:0.85em;font-family:sans-serif;color:#555;margin-bottom:15px;">This is the static index map of <a href="${liveUrl}" style="color:#333;">${SITE_NAME}</a>.</div>`;

  if (!indexHtml.includes('data-banner-injected="true"')) {
    if (indexHtml.match(/<body[^>]*>/)) {
      indexHtml = indexHtml.replace(/(<body[^>]*>)/, `$1\n${indexBanner}`);
    } else {
      // Wrap in a layout-safe div block so mobile and web browsers render it cleanly at the top
      indexHtml = `<div style="font-family:sans-serif;">${indexBanner}</div>\n` + indexHtml;
    }
  }

  fs.writeFileSync(indexPage, indexHtml, "utf8");
  console.log("Successfully decoded and matched all static/index.html navigation links.");
}

console.log(`\nDone. All operations completed successfully.`);
    

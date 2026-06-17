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
const sitemapEntries = []; // Container for Requirement B

// Helper to decode links and convert characters to match our clean filename slug structure
function sanitizeHtmlLinks(htmlContent) {
  return htmlContent.replace(/href="([^"]+\.html)"/g, (match, encodedLink) => {
    if (encodedLink.startsWith("http://") || encodedLink.startsWith("https://") || encodedLink.startsWith("/")) {
      return match;
    }
    try {
      let decoded = decodeURIComponent(encodedLink);
      
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
      return match;
    }
  });
}

const files = fs.readdirSync(staticDir)
  .filter(f => f.endsWith(".html") && !SKIP.has(f));

for (const file of files) {
  const oldPath = path.join(staticDir, file);
  const normalizedFile = file.normalize("NFC");
  const filePath = path.join(staticDir, normalizedFile);
  
  if (oldPath !== filePath) {
    fs.renameSync(oldPath, filePath);
  }

  let html = fs.readFileSync(filePath, "utf8");
  html = sanitizeHtmlLinks(html);

  const tiddlerTitle = normalizedFile.replace(/\.html$/, "").replace(/-/g, " ");
  const liveUrl = `${SITE_URL}/#${encodeURIComponent(tiddlerTitle)}`;

  const banner = `<div data-banner-injected="true" style="background:#f0f0f0;border-bottom:1px solid #ccc;padding:8px 16px;font-size:0.85em;font-family:sans-serif;color:#555;">This is the static version of <a href="${liveUrl}" style="color:#333;">${tiddlerTitle}</a> from <a href="${SITE_URL}" style="color:#333;">${SITE_NAME}</a>.</div>`;

  if (!html.includes('data-banner-injected="true"') && html.match(/<body[^>]*>/)) {
    html = html.replace(/(<body[^>]*>)/, `$1\n${banner}`);
  }

  fs.writeFileSync(filePath, html, "utf8");
  console.log(`Processed: ${tiddlerTitle}`);

  // REQUIREMENT B: Collect metrics for individual static tiddler pages
  const stat = fs.statSync(filePath);
  sitemapEntries.push(`  <url>
    <loc>${SITE_URL}/static/${encodeURIComponent(normalizedFile)}</loc>
    <lastmod>${stat.mtime.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
}

// Process the main index page links last
if (fs.existsSync(indexPage)) {
  let indexHtml = fs.readFileSync(indexPage, "utf8");
  indexHtml = sanitizeHtmlLinks(indexHtml);

  const liveUrl = `${SITE_URL}/`;
  const indexBanner = `<div data-banner-injected="true" style="background:#f0f0f0;border-bottom:1px solid #ccc;padding:8px 16px;font-size:0.85em;font-family:sans-serif;color:#555;margin-bottom:15px;">This is the static index map of <a href="${liveUrl}" style="color:#333;">${SITE_NAME}</a>.</div>`;

  if (!indexHtml.includes('data-banner-injected="true"')) {
    if (indexHtml.match(/<body[^>]*>/)) {
      indexHtml = indexHtml.replace(/(<body[^>]*>)/, `$1\n${indexBanner}`);
    } else {
      indexHtml = `<div style="font-family:sans-serif;">${indexBanner}</div>\n` + indexHtml;
    }
  }

  fs.writeFileSync(indexPage, indexHtml, "utf8");
  console.log("Successfully decoded and matched all static/index.html navigation links.");

  // REQUIREMENT B: Add static index page to sitemap tracking
  const indexStat = fs.statSync(indexPage);
  sitemapEntries.unshift(`  <url>
    <loc>${SITE_URL}/static/index.html</loc>
    <lastmod>${indexStat.mtime.toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`);
}

// REQUIREMENT B: Track core home/landing page
const rootIndex = path.join(__dirname, "dist", "index.html");
if (fs.existsSync(rootIndex)) {
  const rootStat = fs.statSync(rootIndex);
  sitemapEntries.unshift(`  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${rootStat.mtime.toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);
}

// REQUIREMENT B: Compile and save sitemap.xml to the dist folder root
const sitemapPath = path.join(__dirname, "dist", "sitemap.xml");
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://sitemaps.org">
${sitemapEntries.join("\n")}
</urlset>`;

fs.writeFileSync(sitemapPath, sitemapXml, "utf8");
console.log("Successfully generated sitemap.xml at deployment root.");

console.log(`\nDone. All operations completed successfully.`);

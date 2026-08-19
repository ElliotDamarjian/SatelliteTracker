// Copies Cesium's prebuilt static assets (workers, textures, widget CSS)
// into public/cesium so they can be served as plain static files at
// runtime, avoiding any bundler-specific asset plugin configuration.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "cesium", "Build", "Cesium");
const dest = path.join(__dirname, "..", "public", "cesium");

if (!fs.existsSync(src)) {
  console.warn("cesium package not found, skipping asset copy");
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

console.log(`Copied Cesium static assets to ${dest}`);

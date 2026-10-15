#!/usr/bin/env node
/**
 * Regenerates every Android launcher icon and splash screen.
 *
 * The source art (public/icon-512.png) is a 512px canvas where the artwork only
 * occupies the middle 265x268px, the rest being a transparent margin. Two fixes
 * are applied here that a raw `capacitor-assets` run does not do:
 *
 *   1. The artwork is trimmed to its opaque bounds, otherwise the icon renders at
 *      roughly half size.
 *   2. capacitor-assets wraps both adaptive-icon layers in a 16.7% safe-zone inset
 *      and writes them at legacy 48dp sizes. Both are overridden: no inset, and the
 *      layers are written at the 108dp scale Android expects (432px at xxxhdpi).
 *
 * Usage: npm run icons
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(ROOT, "..", "public", "icon-512.png");
const RESOURCES = path.join(ROOT, "resources");
const RES = path.join(ROOT, "android", "app", "src", "main", "res");

// Opaque bounding box of the artwork inside the source canvas
const ART = { left: 123, top: 122, width: 265, height: 268 };
const BRAND = { r: 31, g: 119, b: 32, alpha: 1 };
const SPLASH_BG = { r: 5, g: 46, b: 22, alpha: 1 };
const DENSITIES = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

const ADAPTIVE_XML = `<?xml version="1.0" encoding="utf-8"?>
<!-- The artwork is a full-bleed rounded square. capacitor-assets wraps both layers in a
     16.7% safe-zone inset, which would shrink the icon back down, so no inset is used. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

async function writeResources() {
  fs.mkdirSync(RESOURCES, { recursive: true });
  const master = await sharp(SOURCE).extract(ART).resize(1024, 1024, { kernel: "lanczos3" }).png().toBuffer();

  fs.writeFileSync(path.join(RESOURCES, "icon.png"), master);
  fs.writeFileSync(path.join(RESOURCES, "icon-foreground.png"), master);
  fs.writeFileSync(
    path.join(RESOURCES, "icon-background.png"),
    await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BRAND } }).png().toBuffer()
  );

  const logoW = Math.round(2732 * 0.22);
  const logo = await sharp(SOURCE).extract(ART).resize(logoW, logoW, { kernel: "lanczos3" }).png().toBuffer();
  const offset = Math.round((2732 - logoW) / 2);
  fs.writeFileSync(
    path.join(RESOURCES, "splash.png"),
    await sharp({ create: { width: 2732, height: 2732, channels: 4, background: SPLASH_BG } })
      .composite([{ input: logo, top: offset, left: offset }])
      .png()
      .toBuffer()
  );
  console.log("resources/ written");
}

function runCapacitorAssets() {
  // Invoke the CLI through node directly: Node will not spawn the .cmd shim on
  // Windows, and shell:true would trigger a deprecation warning.
  const cli = require.resolve("@capacitor/assets/bin/capacitor-assets");
  execFileSync(
    process.execPath,
    [
      cli, "generate", "--android",
      "--iconBackgroundColor", "#1f7720",
      "--iconBackgroundColorDark", "#1f7720",
      "--splashBackgroundColor", "#052e16",
      "--splashBackgroundColorDark", "#052e16",
    ],
    { cwd: ROOT, stdio: "inherit" }
  );
}

async function fixAdaptiveIcons() {
  for (const name of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
    const file = path.join(RES, "mipmap-anydpi-v26", name);
    if (fs.existsSync(file)) fs.writeFileSync(file, ADAPTIVE_XML, "utf8");
  }

  const art = await sharp(SOURCE).extract(ART).png().toBuffer();
  for (const [name, scale] of Object.entries(DENSITIES)) {
    const size = Math.round(108 * scale);
    const dir = path.join(RES, "mipmap-" + name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "ic_launcher_foreground.png"),
      await sharp(art).resize(size, size, { kernel: "lanczos3" }).png().toBuffer()
    );
    fs.writeFileSync(
      path.join(dir, "ic_launcher_background.png"),
      await sharp({ create: { width: size, height: size, channels: 4, background: BRAND } }).png().toBuffer()
    );
  }
  console.log("adaptive icons fixed: no inset, 108dp layers for " + Object.keys(DENSITIES).join(", "));
}

(async () => {
  await writeResources();
  runCapacitorAssets();
  await fixAdaptiveIcons();
  console.log("\nDone. Run `npm run apk:release` to rebuild.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

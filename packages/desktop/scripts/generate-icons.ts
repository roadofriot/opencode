#!/usr/bin/env bun
import { $ } from "bun"
import fs from "node:fs"
import path from "node:path"
import sharp from "sharp"

const packageDir = import.meta.dirname
const sourceIcon = path.join(packageDir, "..", "app-icon.png")
const devIconsDir = path.join(packageDir, "..", "icons", "dev")
const betaIconsDir = path.join(packageDir, "..", "icons", "beta")
const prodIconsDir = path.join(packageDir, "..", "icons", "prod")

const sizes = [
  { name: "16x16.png", width: 16, height: 16 },
  { name: "32x32.png", width: 32, height: 32 },
  { name: "64x64.png", width: 64, height: 64 },
  { name: "128x128.png", width: 128, height: 128 },
  { name: "128x128@2x.png", width: 256, height: 256 },
  { name: "256x256.png", width: 256, height: 256 },
  { name: "512x512.png", width: 512, height: 512 },
  { name: "1024x1024.png", width: 1024, height: 1024 },
]

const windowsSizes = [
  { name: "Square16x16Logo.png", width: 16, height: 16 },
  { name: "Square30x30Logo.png", width: 30, height: 30 },
  { name: "Square44x44Logo.png", width: 44, height: 44 },
  { name: "Square71x71Logo.png", width: 71, height: 71 },
  { name: "Square89x89Logo.png", width: 89, height: 89 },
  { name: "Square107x107Logo.png", width: 107, height: 107 },
  { name: "Square142x142Logo.png", width: 142, height: 142 },
  { name: "Square150x150Logo.png", width: 150, height: 150 },
  { name: "Square284x284Logo.png", width: 284, height: 284 },
  { name: "Square310x310Logo.png", width: 310, height: 310 },
  { name: "StoreLogo.png", width: 50, height: 50 },
]

const androidSizes = [
  { name: "mipmap-mdpi/ic_launcher.png", width: 48, height: 48 },
  { name: "mipmap-mdpi/ic_launcher_round.png", width: 48, height: 48 },
  { name: "mipmap-mdpi/ic_launcher_foreground.png", width: 48, height: 48 },
  { name: "mipmap-hdpi/ic_launcher.png", width: 72, height: 72 },
  { name: "mipmap-hdpi/ic_launcher_round.png", width: 72, height: 72 },
  { name: "mipmap-hdpi/ic_launcher_foreground.png", width: 72, height: 72 },
  { name: "mipmap-xhdpi/ic_launcher.png", width: 96, height: 96 },
  { name: "mipmap-xhdpi/ic_launcher_round.png", width: 96, height: 96 },
  { name: "mipmap-xhdpi/ic_launcher_foreground.png", width: 96, height: 96 },
  { name: "mipmap-xxhdpi/ic_launcher.png", width: 144, height: 144 },
  { name: "mipmap-xxhdpi/ic_launcher_round.png", width: 144, height: 144 },
  { name: "mipmap-xxhdpi/ic_launcher_foreground.png", width: 144, height: 144 },
  { name: "mipmap-xxxhdpi/ic_launcher.png", width: 192, height: 192 },
  { name: "mipmap-xxxhdpi/ic_launcher_round.png", width: 192, height: 192 },
  { name: "mipmap-xxxhdpi/ic_launcher_foreground.png", width: 192, height: 192 },
]

const iosSizes = [
  { name: "AppIcon-20x20@1x.png", width: 20, height: 20 },
  { name: "AppIcon-20x20@2x.png", width: 40, height: 40 },
  { name: "AppIcon-20x20@3x.png", width: 60, height: 60 },
  { name: "AppIcon-29x29@1x.png", width: 29, height: 29 },
  { name: "AppIcon-29x29@2x.png", width: 58, height: 58 },
  { name: "AppIcon-29x29@3x.png", width: 87, height: 87 },
  { name: "AppIcon-40x40@1x.png", width: 40, height: 40 },
  { name: "AppIcon-40x40@2x.png", width: 80, height: 80 },
  { name: "AppIcon-40x40@3x.png", width: 120, height: 120 },
  { name: "AppIcon-60x60@1x.png", width: 60, height: 60 },
  { name: "AppIcon-60x60@2x.png", width: 120, height: 120 },
  { name: "AppIcon-60x60@3x.png", width: 180, height: 180 },
  { name: "AppIcon-76x76@1x.png", width: 76, height: 76 },
  { name: "AppIcon-76x76@2x.png", width: 152, height: 152 },
  { name: "AppIcon-83.5x83.5@2x.png", width: 167, height: 167 },
  { name: "AppIcon-1024x1024@1x.png", width: 1024, height: 1024 },
]

async function generateIcons(targetDir: string, sizes: Array<{ name: string; width: number; height: number }>, subDir?: string) {
  const outputDir = subDir ? path.join(targetDir, subDir) : targetDir
  await $`mkdir -p ${outputDir}`

  for (const size of sizes) {
    const outputPath = path.join(outputDir, size.name)
    await sharp(sourceIcon)
      .resize(size.width, size.height, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outputPath)
    console.log(`Generated ${outputPath}`)
  }
}

async function generateDockIcon(targetDir: string) {
  const dockPath = path.join(targetDir, "dock.png")
  await sharp(sourceIcon)
    .resize(128, 128, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(dockPath)
  console.log(`Generated ${dockPath}`)
}

async function generateIco(targetDir: string) {
  const icoPath = path.join(targetDir, "icon.ico")
  await sharp(sourceIcon)
    .resize(256, 256, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toFile(icoPath)
  console.log(`Generated ${icoPath}`)
}

async function generateIcns(targetDir: string) {
  const iconsetDir = path.join(targetDir, "icon.iconset")
  await $`mkdir -p ${iconsetDir}`

  const icnsSizes = [
    { name: "icon_16x16.png", width: 16, height: 16 },
    { name: "icon_16x16@2x.png", width: 32, height: 32 },
    { name: "icon_32x32.png", width: 32, height: 32 },
    { name: "icon_32x32@2x.png", width: 64, height: 64 },
    { name: "icon_128x128.png", width: 128, height: 128 },
    { name: "icon_128x128@2x.png", width: 256, height: 256 },
    { name: "icon_256x256.png", width: 256, height: 256 },
    { name: "icon_256x256@2x.png", width: 512, height: 512 },
    { name: "icon_512x512.png", width: 512, height: 512 },
    { name: "icon_512x512@2x.png", width: 1024, height: 1024 },
  ]

  for (const size of icnsSizes) {
    const outputPath = path.join(iconsetDir, size.name)
    await sharp(sourceIcon)
      .resize(size.width, size.height, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outputPath)
  }

  const icnsPath = path.join(targetDir, "icon.icns")
  await $`iconutil -c icns ${iconsetDir} -o ${icnsPath}`
  await $`rm -rf ${iconsetDir}`
  console.log(`Generated ${icnsPath}`)
}

async function main() {
  console.log("Generating icons from MindSparQ AI logo...")

  for (const targetDir of [devIconsDir, betaIconsDir, prodIconsDir]) {
    console.log(`\n=== Generating for ${path.basename(targetDir)} ===`)

    await generateIcons(targetDir, sizes)
    await generateIcons(targetDir, windowsSizes)
    await generateIcons(targetDir, androidSizes, "android")
    await generateIcons(targetDir, iosSizes, "ios")
    await generateDockIcon(targetDir)
    await generateIco(targetDir)
    await generateIcns(targetDir)

    const iconPngPath = path.join(targetDir, "icon.png")
    await sharp(sourceIcon)
      .resize(512, 512, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(iconPngPath)
    console.log(`Generated ${iconPngPath}`)
  }

  console.log("\n✅ All icons generated successfully!")
}

main().catch((err) => {
  console.error("Error generating icons:", err)
  process.exit(1)
})
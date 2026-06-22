import sharp from "sharp"
import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = join(import.meta.dir, "..", "desktop")
const CHANNELS = ["dev", "beta", "prod"] as const
const SVG_PATH = join(import.meta.dir, "mark.svg")

const SIZES = [16, 32, 64, 128, 256, 512] as const
const IOS_SIZES = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180] as const
const ANDROID_SIZES = [48, 72, 96, 144, 192, 512] as const

async function generatePng(svg: Buffer, size: number, outputPath: string) {
  await sharp(svg).resize(size, size).png().toFile(outputPath)
}

async function main() {
  const svg = readFileSync(SVG_PATH)

  for (const channel of CHANNELS) {
    const iconDir = join(ROOT, "icons", channel)

    console.log(`Generating icons for channel: ${channel}`)

    // Standard sizes
    for (const size of SIZES) {
      const name = size <= 128 ? `${size}x${size}.png` : `icon.png`
      const out = join(iconDir, name)
      await generatePng(svg, size, out)
      console.log(`  ${name} (${size}px)`)

      if (size === 128) {
        await generatePng(svg, 256, join(iconDir, `128x128@2x.png`))
        await generatePng(svg, 256, join(iconDir, "dock.png"))
        console.log(`  128x128@2x.png (256px)`)
        console.log(`  dock.png (256px)`)
      }
    }

    // iOS sizes
    mkdirSync(join(iconDir, "ios"), { recursive: true })
    for (const size of IOS_SIZES) {
      await generatePng(svg, size, join(iconDir, "ios", `AppIcon-${size}x${size}.png`))
    }
    console.log(`  ios/ (${IOS_SIZES.length} icons)`)

    // Android sizes
    mkdirSync(join(iconDir, "android"), { recursive: true })
    for (const size of ANDROID_SIZES) {
      await generatePng(svg, size, join(iconDir, "android", `icon-${size}x${size}.png`))
    }
    console.log(`  android/ (${ANDROID_SIZES.length} icons)`)

    // Windows store tiles
    const tileSizes: Record<string, number> = {
      "Square150x150Logo.png": 150,
      "Square310x310Logo.png": 310,
      "Square44x44Logo.png": 44,
      "Square71x71Logo.png": 71,
      "Square89x89Logo.png": 89,
      "Square107x107Logo.png": 107,
      "StoreLogo.png": 50,
    }
    for (const [name, size] of Object.entries(tileSizes)) {
      await generatePng(svg, size, join(iconDir, name))
    }
    console.log(`  ${Object.keys(tileSizes).length} Windows tile icons`)
  }

  // Also copy to resources/icons for build
  const resourceDir = join(ROOT, "resources", "icons")
  mkdirSync(resourceDir, { recursive: true })
  await generatePng(svg, 512, join(resourceDir, "icon.png"))
  await generatePng(svg, 256, join(resourceDir, "dock.png"))
  console.log(`\nResources: icon.png (512px), dock.png (256px)`)

  console.log("\n✅ All icons generated!")
}

main().catch(console.error)

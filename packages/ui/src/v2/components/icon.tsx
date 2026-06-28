import { onMount, type ComponentProps, splitProps } from "solid-js"

const icons = {
  edit: {
    viewBox: "0 0 16 16",
    body: `<path d="M13.5555 8.21534V13.5556H2.44434L2.44434 2.4445H7.78462M6.88878 9.11119C6.88878 9.11119 8.96327 9.0367 9.69678 8.3032L14.0301 3.96986C14.5824 3.4176 14.5824 2.52213 14.0301 1.96986C13.4778 1.4176 12.5824 1.4176 12.0301 1.96986L7.69678 6.3032C7.00513 6.99484 6.88878 9.11119 6.88878 9.11119Z" stroke="currentColor"/>`,
  },
  "folder-add-left": {
    viewBox: "0 0 16 16",
    body: `<path d="M7.5 13.3333H1.5V2H6.83333L8.83333 4H14.8333V6M10.1667 11.3333H15.5M12.8333 8.66667V14" stroke="currentColor" stroke-miterlimit="10" stroke-linecap="square"/>`,
  },
  "grid-plus": {
    viewBox: "0 0 16 16",
    body: `<path d="M13.9948 11.668H9.32812M11.6641 9.33203V13.9987M6.66667 9.33203V13.9987H2V9.33203H6.66667ZM6.66667 2V6.66667H2V2H6.66667ZM13.9948 2V6.66667H9.32812V2H13.9948Z" stroke="currentColor" stroke-miterlimit="10" stroke-linecap="square"/>`,
  },
  help: {
    viewBox: "0 0 16 16",
    body: `<path d="M6.33345 6.33349V5.00015H9.66679V7.00015L8.00015 8.00015V9.66679M8.27485 11.6819H7.71897M14.4446 8.00011C14.4446 11.5593 11.5593 14.4446 8.00011 14.4446C4.44094 14.4446 1.55566 11.5593 1.55566 8.00011C1.55566 4.44094 4.44094 1.55566 8.00011 1.55566C11.5593 1.55566 14.4446 4.44094 14.4446 8.00011Z" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "sidebar-right": {
    viewBox: "0 0 20 20",
    body: `<path d="M2.91536 2.91406H2.36536V2.36406H2.91536V2.91406ZM2.91536 17.0807V17.6307H2.36536V17.0807H2.91536ZM17.082 17.0807H17.632V17.6307H17.082V17.0807ZM17.082 2.91406V2.36406H17.632V2.91406H17.082ZM6.9987 2.91406H6.4487V2.36406H6.9987V2.91406ZM6.9987 17.0807V17.6307H6.4487V17.0807H6.9987ZM2.91536 2.91406H3.46536V17.0807H2.91536H2.36536V2.91406H2.91536ZM2.91536 17.0807V16.5307H17.082V17.0807V17.6307H2.91536V17.0807ZM17.082 17.0807H16.532V2.91406H17.082H17.632V17.0807H17.082ZM17.082 2.91406V3.46406H2.91536V2.91406V2.36406H17.082V2.91406ZM6.9987 2.91406H7.5487V17.0807H6.9987H6.4487V2.91406H6.9987ZM17.082 17.0807L17.082 17.6307L6.9987 17.6307V17.0807V16.5307L17.082 16.5307L17.082 17.0807ZM6.9987 2.91406V2.36406H17.082V2.91406V3.46406H6.9987V2.91406Z" fill="currentColor"/>`,
  },
  status: {
    viewBox: "0 0 20 20",
    body: `<path d="M2 10V18H18V10M2 10V2H18V10M2 10H18M5 6H9M5 14H9" stroke="currentColor"/>`,
  },
  "status-active": {
    viewBox: "0 0 20 20",
    body: `<path d="M18 2H2V10H18V2Z" fill="currentColor" fill-opacity="0.1"/><path d="M2 18H18V10H2V18Z" fill="currentColor" fill-opacity="0.1"/><path d="M2 10V18H18V10M2 10V2H18V10M2 10H18M5 6H9M5 14H9" stroke="currentColor"/>`,
  },
  "magnifying-glass": {
    viewBox: "0 0 16 16",
    body: `<path d="M14 14L10.3454 10.3454M6.88889 11.7778C9.58889 11.7778 11.7778 9.58889 11.7778 6.88889C11.7778 4.18889 9.58889 2 6.88889 2C4.18889 2 2 4.18889 2 6.88889C2 9.58889 4.18889 11.7778 6.88889 11.7778Z" stroke="currentColor"/>`,
  },
  menu: {
    viewBox: "0 0 16 16",
    body: `<path d="M2 8H14M2 4.664H14M2 11.336H14" stroke="currentColor"/>`,
  },
  plus: {
    viewBox: "0 0 16 16",
    body: `<path d="M8 2.88867V13.1109" stroke="currentColor" stroke-linejoin="round"/><path d="M2.88867 8H13.1109" stroke="currentColor" stroke-linejoin="round"/>`,
  },
  "settings-gear": {
    viewBox: "0 0 16 16",
    body: `<path d="M7.99998 1.3335L14 4.66683V11.3335L7.99998 14.6668L2 11.3335V4.66683L7.99998 1.3335Z" stroke="currentColor"/><path d="M9.99998 8.00016C9.99998 9.10476 9.10458 10.0002 7.99998 10.0002C6.89538 10.0002 5.99998 9.10476 5.99998 8.00016C5.99998 6.89556 6.89538 6.00016 7.99998 6.00016C9.10458 6.00016 9.99998 6.89556 9.99998 8.00016Z" stroke="currentColor"/>`,
  },
  "chevron-down": {
    viewBox: "0 0 16 16",
    body: `<path d="M5 6.5L8 9.5L11 6.5" stroke="currentColor"/>`,
  },
  close: {
    viewBox: "0 0 20 20",
    body: `<path d="M14.4446 5.55566L5.55566 14.4446M5.55566 5.55566L14.4446 14.4446" stroke="currentColor" stroke-linejoin="round"/>`,
  },
  "xmark-small": {
    viewBox: "0 0 16 16",
    body: `<path d="M4.25 11.75L11.75 4.25M11.75 11.75L4.25 4.25" stroke="currentColor"/>`,
  },
  "outline-chevron-down": {
    viewBox: "0 0 16 16",
    body: `<path d="M5 6.5L8 9.5L11 6.5" stroke="currentColor"/>`,
  },
  "outline-dots": {
    viewBox: "0 0 16 16",
    body: `<path d="M2.5 7.5H3.5V8.5H2.5V7.5Z" stroke="currentColor"/><path d="M7.5 7.5H8.5V8.5H7.5V7.5Z" stroke="currentColor"/><path d="M12.5 7.5H13.5V8.5H12.5V7.5Z" stroke="currentColor"/>`,
  },
  sun: {
    viewBox: "0 0 16 16",
    body: `<circle cx="8" cy="8" r="3" stroke="currentColor"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M12.95 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06" stroke="currentColor" stroke-linecap="round"/>`,
  },
  moon: {
    viewBox: "0 0 16 16",
    body: `<path d="M13.5 10A6 6 0 0 1 6 2.5a.5.5 0 0 0-.6-.6A6.5 6.5 0 1 0 14.1 10.6a.5.5 0 0 0-.6-.6z" stroke="currentColor" fill="none"/>`,
  },
  monitor: {
    viewBox: "0 0 16 16",
    body: `<rect x="1.5" y="2.5" width="13" height="9" rx="1" stroke="currentColor"/><path d="M5.5 13.5h5M8 11.5v2" stroke="currentColor" stroke-linecap="round"/>`,
  },
  terminal: {
    viewBox: "0 0 20 20",
    body: `<path d="M1.66663 5L7.49996 10L1.66663 15" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.8333 15H18.3333" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  "terminal-active": {
    viewBox: "0 0 20 20",
    body: `<path d="M1.66663 5L7.49996 10L1.66663 15" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.8333 15H18.3333" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M1.66663 5L7.49996 10L1.66663 15" fill="currentColor"/><path d="M10.8333 15H18.3333" fill="currentColor"/>`,
  },
  person_outline: {
    viewBox: "0 0 20 20",
    body: `<path d="M10 9C11.6569 9 13 7.65685 13 6C13 4.34315 11.6569 3 10 3C8.34315 3 7 4.34315 7 6C7 7.65685 8.34315 9 10 9Z" stroke="currentColor"/><path d="M16 17C16 14.2386 13.3137 12 10 12C6.68629 12 4 14.2386 4 17V18H16V17Z" stroke="currentColor"/><path d="M18 18V17C18 15.4477 16.821 14.0524 15.1707 13.1716" stroke="currentColor" stroke-linecap="round"/><path d="M18 8V10" stroke="currentColor" stroke-linecap="round"/><path d="M17 9H19" stroke="currentColor" stroke-linecap="round"/>`,
  },
  developer_mode: {
    viewBox: "0 0 20 20",
    body: `<path d="M7.5 14L3.5 10L7.5 6M12.5 14L16.5 10L12.5 6" stroke="currentColor" stroke-linecap="square"/>`,
  },
  bug: {
    viewBox: "0 0 20 20",
    body: `<path d="M8 2L8 4M8 14L8 16M2 8L4 8M14 8L16 8M3.75736 3.75736L5.17157 5.17157M10.8284 10.8284L12.2426 12.2426M3.75736 12.2426L5.17157 10.8284M10.8284 5.17157L12.2426 3.75736" stroke="currentColor" stroke-linecap="round"/><path d="M5 6C5 4.34315 6.34315 3 8 3C9.65685 3 11 4.34315 11 6V10C11 11.6569 9.65685 13 8 13C6.34315 13 5 11.6569 5 10V6Z" stroke="currentColor"/><path d="M4 8H2V10C2 11.6569 3.34315 13 5 13" stroke="currentColor" stroke-linecap="round"/><path d="M12 8H14V10C14 11.6569 12.6569 13 11 13" stroke="currentColor" stroke-linecap="round"/>`,
  },
  "scroll-text": {
    viewBox: "0 0 20 20",
    body: `<path d="M5 2H14V16H5V2Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 6H12M9 9H12M9 12H10" stroke="currentColor" stroke-linecap="round"/><path d="M3 6L5 4L3 2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 16L5 18L3 20" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  "play-circle": {
    viewBox: "0 0 20 20",
    body: `<path d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z" stroke="currentColor"/><path d="M6.5 5.5L11 8L6.5 10.5V5.5Z" fill="currentColor"/>`,
  },
  network: {
    viewBox: "0 0 20 20",
    body: `<circle cx="8" cy="4" r="1.5" stroke="currentColor"/><circle cx="4" cy="10" r="1.5" stroke="currentColor"/><circle cx="12" cy="10" r="1.5" stroke="currentColor"/><circle cx="8" cy="14" r="1.5" stroke="currentColor"/><path d="M8 5.5V8.5M5.5 9.5L6.5 5.5M10.5 9.5L9.5 5.5M5.5 10.5V12.5L8 12.5M10.5 10.5V12.5L8 12.5" stroke="currentColor" stroke-linecap="round"/>`,
  },
}

const spriteID = "mindsparq-v2-icon-sprite"
const symbol = (name: keyof typeof icons) => `mindsparq-v2-icon-${name}`
let spriteInserted = false

function ensureSprite() {
  if (spriteInserted) return
  if (typeof document === "undefined") return
  if (document.getElementById(spriteID)) {
    spriteInserted = true
    return
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.id = spriteID
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("width", "0")
  svg.setAttribute("height", "0")
  svg.style.position = "absolute"
  svg.style.overflow = "hidden"
  svg.innerHTML = Object.entries(icons)
    .map(
      ([name, icon]) =>
        `<symbol id="${symbol(name as keyof typeof icons)}" viewBox="${icon.viewBox}">${icon.body}</symbol>`,
    )
    .join("")
  document.body.insertBefore(svg, document.body.firstChild)
  spriteInserted = true
}

export interface IconProps extends ComponentProps<"svg"> {
  name: keyof typeof icons | (string & {})
  size?: "small" | "normal" | "large"
}

export function Icon(props: IconProps) {
  const [split, rest] = splitProps(props, ["name", "size"])
  const iconName = () => (icons[split.name as keyof typeof icons] ? (split.name as keyof typeof icons) : "plus")
  const icon = () => icons[iconName()]
  const pixelSize = split.size === "small" ? 14 : split.size === "large" ? 20 : 16
  onMount(ensureSprite)

  return (
    <svg
      {...rest}
      data-slot="icon-svg"
      width={pixelSize}
      height={pixelSize}
      viewBox={icon().viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={rest["aria-hidden"] ?? "true"}
    >
      <use href={`#${symbol(iconName())}`} />
    </svg>
  )
}

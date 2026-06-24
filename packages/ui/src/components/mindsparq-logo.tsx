import { createSignal, onMount } from "solid-js"

export interface MindSparqLogoProps {
  size?: number
  class?: string
  animated?: boolean
  showText?: boolean
}

export function MindSparqLogo(props: MindSparqLogoProps) {
  const { size = 64, class: className, animated = true, showText = false } = props
  const [isHovered, setIsHovered] = createSignal(false)
  const [isVisible, setIsVisible] = createSignal(false)

  onMount(() => {
    setIsVisible(true)
  })

  const containerClass = `
    inline-flex flex-col items-center gap-2
    ${animated ? "transition-all duration-300 ease-out" : ""}
    ${className ?? ""}
  `.trim()

  const logoClass = `
    relative
    ${animated ? "transition-all duration-300 ease-out" : ""}
    ${isHovered() ? "scale-105" : "scale-100"}
    ${isVisible() ? "opacity-100 scale-100" : "opacity-0 scale-90"}
  `.trim()

  return (
    <div class={containerClass} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div class={logoClass} style={{ width: `${size}px`, height: `${size}px` }}>
        <img
          src="/MindSparq AI.png"
          alt="MindSparQ AI"
          class="w-full h-full object-contain"
          style={{
            filter: isHovered() ? "drop-shadow(0 8px 24px rgba(139, 92, 246, 0.4))" : "drop-shadow(0 4px 16px rgba(139, 92, 246, 0.2))",
            transition: "filter 300ms ease-out, transform 300ms ease-out"
          }}
        />
        {animated && (
          <div
            class="absolute inset-0 rounded-full opacity-0 pointer-events-none"
            style={{
              background: "conic-gradient(from 0deg, #8b5cf6, #ec4899, #06b6d4, #8b5cf6)",
              animation: "mindsparq-rotate 3s linear infinite",
              transform: isHovered() ? "scale(1.2)" : "scale(1)",
              opacity: isHovered() ? 0.15 : 0,
              transition: "opacity 300ms ease-out, transform 300ms ease-out",
              "z-index": -1,
              "border-radius": "50%",
              filter: "blur(8px)"
            }}
          />
        )}
      </div>
      {showText && (
        <div
          class="text-center"
          style={{
            opacity: isVisible() ? 1 : 0,
            transform: isVisible() ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 400ms ease-out 200ms, transform 400ms ease-out 200ms"
          }}
        >
          <span class="text-xl font-semibold text-text-base">MindSparQ</span>
          <span class="text-lg font-medium text-accent-base ml-1">AI</span>
        </div>
      )}
      <style>{`
        @keyframes mindsparq-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export function MindSparqSplash(props: { size?: number; class?: string; pulse?: boolean }) {
  const { size = 80, class: className, pulse = true } = props
  const [isVisible, setIsVisible] = createSignal(false)

  onMount(() => {
    setIsVisible(true)
  })

  return (
    <div
      class={`inline-flex flex-col items-center ${className ?? ""}`}
      style={{
        width: `${size}px`,
        height: `${size * 1.25}px`,
        opacity: isVisible() ? 1 : 0,
        transform: isVisible() ? "scale(1)" : "scale(0.8)",
        transition: "opacity 500ms ease-out, transform 500ms ease-out"
      }}
    >
      <div
        class="relative"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          animation: pulse ? "mindsparq-pulse 2s ease-in-out infinite" : "none"
        }}
      >
        <img
          src="/MindSparq AI.png"
          alt="MindSparQ AI"
          class="w-full h-full object-contain"
          style={{
            filter: "drop-shadow(0 4px 20px rgba(139, 92, 246, 0.3))",
            animation: pulse ? "mindsparq-float 3s ease-in-out infinite" : "none"
          }}
        />
        <div
          class="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "conic-gradient(from 0deg, #8b5cf6, #ec4899, #06b6d4, #8b5cf6)",
            animation: "mindsparq-rotate 4s linear infinite",
            opacity: 0.1,
            "z-index": -1,
            "border-radius": "50%",
            filter: "blur(12px)"
          }}
        />
      </div>
      <style>{`
        @keyframes mindsparq-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes mindsparq-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes mindsparq-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
/**
 * Application-wide constants and configuration
 */
export const config = {
  // Base URL
  baseUrl: "https://mindsparq.ai",

  // GitHub
  github: {
    repoUrl: "https://github.com/anomalyco/mindsparq",
    starsFormatted: {
      compact: "160K",
      full: "160,000",
    },
  },

  // Social links
  social: {
    twitter: "https://x.com/mindsparq",
    discord: "https://discord.gg/mindsparq",
  },

  // Static stats (used on landing page)
  stats: {
    contributors: "900",
    commits: "13,000",
    monthlyUsers: "7.5M",
  },
} as const

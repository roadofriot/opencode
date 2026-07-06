/**
 * LocalDiscovery — probes well-known local AI server ports and returns
 * discovered model IDs that can be injected into the provider catalog.
 *
 * Supported servers:
 *   - Ollama (http://localhost:11434)
 *   - LM Studio (http://localhost:1234)
 *   - vLLM (http://localhost:8000)
 *   - llama.cpp HTTP server (http://localhost:8080)
 *
 * The discovery is intentionally fire-and-forget: if a server is not running
 * the probe times out quickly (1 second) and the result is silently ignored.
 */

const PROBE_TIMEOUT_MS = 1_000

export type LocalServerType = "ollama" | "lmstudio" | "vllm" | "llamacpp"

export type DiscoveredModel = {
  id: string
  label: string
  server: LocalServerType
  baseUrl: string
}

type LocalServer = {
  type: LocalServerType
  baseUrl: string
  /** Endpoint that returns a list of available models. */
  modelsEndpoint: string
  /** Extracts model IDs from the response body. */
  extractModels: (body: unknown) => string[]
}

const SERVERS: LocalServer[] = [
  {
    type: "ollama",
    baseUrl: "http://localhost:11434",
    modelsEndpoint: "/api/tags",
    extractModels(body) {
      if (!body || typeof body !== "object") return []
      const models = (body as Record<string, unknown>).models
      if (!Array.isArray(models)) return []
      return models
        .filter((m): m is { name: string } => m && typeof m.name === "string")
        .map((m) => m.name)
    },
  },
  {
    type: "lmstudio",
    baseUrl: "http://localhost:1234",
    modelsEndpoint: "/v1/models",
    extractModels: extractOpenAICompatibleModels,
  },
  {
    type: "vllm",
    baseUrl: "http://localhost:8000",
    modelsEndpoint: "/v1/models",
    extractModels: extractOpenAICompatibleModels,
  },
  {
    type: "llamacpp",
    baseUrl: "http://localhost:8080",
    modelsEndpoint: "/v1/models",
    extractModels: extractOpenAICompatibleModels,
  },
]

function extractOpenAICompatibleModels(body: unknown): string[] {
  if (!body || typeof body !== "object") return []
  const data = (body as Record<string, unknown>).data
  if (!Array.isArray(data)) return []
  return data
    .filter((m): m is { id: string } => m && typeof m.id === "string")
    .map((m) => m.id)
}

async function probeServer(server: LocalServer): Promise<DiscoveredModel[]> {
  const url = `${server.baseUrl}${server.modelsEndpoint}`
  const ctl = new AbortController()
  const id = setTimeout(() => ctl.abort(), PROBE_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctl.signal })
    clearTimeout(id)
    if (!res.ok) return []
    const body = await res.json()
    return server.extractModels(body).map((id) => ({
      id,
      label: id,
      server: server.type,
      baseUrl: server.baseUrl,
    }))
  } catch {
    clearTimeout(id)
    return []
  }
}

/**
 * Probes all known local server addresses concurrently and returns every
 * discovered model. Servers that are not running resolve to an empty array
 * within the probe timeout.
 */
export async function discoverLocalModels(): Promise<DiscoveredModel[]> {
  const results = await Promise.all(SERVERS.map(probeServer))
  return results.flat()
}

/**
 * Returns the base URL for a given discovered server type so the caller can
 * configure an OpenAI-compatible provider pointing at that server.
 */
export function baseUrlForServer(type: LocalServerType): string {
  return SERVERS.find((s) => s.type === type)?.baseUrl ?? "http://localhost:11434"
}

export * as LocalDiscovery from "./local-discovery"

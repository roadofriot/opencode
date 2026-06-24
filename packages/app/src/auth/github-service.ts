import type { GitHubRepo } from "./types"

let token: string | null = null
let cachedUser: { login: string; avatar: string; name: string } | null = null

const API_BASE = "https://api.github.com"

function headers() {
  if (!token) throw new Error("GitHub not authenticated")
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "MindSparQAI/1.0",
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...headers(), ...init?.headers } })
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
  return res.json()
}

export function initGitHubService(accessToken: string): void {
  token = accessToken
  cachedUser = null
}

export function clearGitHubService(): void {
  token = null
  cachedUser = null
}

export function isGitHubConnected(): boolean {
  return token !== null
}

export async function getGitHubUser(): Promise<{ login: string; avatar: string; name: string } | null> {
  if (!token) return null
  if (cachedUser) return cachedUser
  const data = await apiFetch<{ login: string; avatar_url: string; name: string | null }>("/user")
  cachedUser = { login: data.login, avatar: data.avatar_url, name: data.name ?? data.login }
  return cachedUser
}

export async function listRepos(): Promise<GitHubRepo[]> {
  const data = await apiFetch<any[]>("/user/repos?sort=updated&per_page=50")
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    private: r.private,
    htmlUrl: r.html_url,
    cloneUrl: r.clone_url,
    defaultBranch: r.default_branch,
  }))
}

export async function getRepoContents(owner: string, repo: string, path = ""): Promise<any[]> {
  return apiFetch<any[]>(`/repos/${owner}/${repo}/contents/${path}`)
}

export async function getFileContent(owner: string, repo: string, path: string): Promise<string | null> {
  try {
    const data = await apiFetch<any>(`/repos/${owner}/${repo}/contents/${path}`)
    if (data.content && data.encoding === "base64") {
      return atob(data.content.replace(/\n/g, ""))
    }
    return null
  } catch {
    return null
  }
}

export async function createGist(description: string, files: Record<string, { content: string }>, isPublic = false): Promise<string | null> {
  try {
    const data = await apiFetch<{ html_url: string }>("/gists", {
      method: "POST",
      body: JSON.stringify({ description, public: isPublic, files }),
    })
    return data.html_url
  } catch {
    return null
  }
}

export type CreateRepoOptions = {
  name: string
  description?: string
  private?: boolean
  autoInit?: boolean
  gitignoreTemplate?: string
  licenseTemplate?: string
}

export type CreateRepoResult = {
  id: number
  name: string
  fullName: string
  htmlUrl: string
  cloneUrl: string
  defaultBranch: string
}

export async function createRepository(options: CreateRepoOptions): Promise<CreateRepoResult> {
  const data = await apiFetch<{
    id: number
    name: string
    full_name: string
    html_url: string
    clone_url: string
    default_branch: string
  }>("/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name: options.name,
      description: options.description ?? "",
      private: options.private ?? false,
      auto_init: options.autoInit ?? true,
      gitignore_template: options.gitignoreTemplate,
      license_template: options.licenseTemplate,
    }),
  })
  return {
    id: data.id,
    name: data.name,
    fullName: data.full_name,
    htmlUrl: data.html_url,
    cloneUrl: data.clone_url,
    defaultBranch: data.default_branch,
  }
}

export async function createOrgRepository(
  org: string,
  options: CreateRepoOptions,
): Promise<CreateRepoResult> {
  const data = await apiFetch<{
    id: number
    name: string
    full_name: string
    html_url: string
    clone_url: string
    default_branch: string
  }>(`/orgs/${org}/repos`, {
    method: "POST",
    body: JSON.stringify({
      name: options.name,
      description: options.description ?? "",
      private: options.private ?? false,
      auto_init: options.autoInit ?? true,
      gitignore_template: options.gitignoreTemplate,
      license_template: options.licenseTemplate,
    }),
  })
  return {
    id: data.id,
    name: data.name,
    fullName: data.full_name,
    htmlUrl: data.html_url,
    cloneUrl: data.clone_url,
    defaultBranch: data.default_branch,
  }
}

export async function getUserOrganizations(): Promise<Array<{ login: string; avatarUrl: string }>> {
  const data = await apiFetch<Array<{ login: string; avatar_url: string }>>("/user/orgs")
  return data.map((org) => ({ login: org.login, avatarUrl: org.avatar_url }))
}

import { createSignal, Show, For, createEffect } from "solid-js"
import { Button } from "@opencode-ai/ui/button"
import { useAuth } from "@/context/auth"
import {
  createRepository,
  createOrgRepository,
  getUserOrganizations,
  isGitHubConnected,
  type CreateRepoResult,
} from "@/auth/github-service"

type DialogCreateRepoProps = {
  open: boolean
  onClose: () => void
  onCreated?: (repo: CreateRepoResult) => void
}

export function DialogCreateRepo(props: DialogCreateRepoProps) {
  const auth = useAuth()
  const [name, setName] = createSignal("")
  const [description, setDescription] = createSignal("")
  const [isPrivate, setIsPrivate] = createSignal(false)
  const [autoInit, setAutoInit] = createSignal(true)
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [createdRepo, setCreatedRepo] = createSignal<CreateRepoResult | null>(null)
  const [orgs, setOrgs] = createSignal<Array<{ login: string; avatarUrl: string }>>([])
  const [selectedOrg, setSelectedOrg] = createSignal<string | null>(null)
  const [showOrgPicker, setShowOrgPicker] = createSignal(false)

  createEffect(async () => {
    if (props.open && isGitHubConnected()) {
      try {
        const userOrgs = await getUserOrganizations()
        setOrgs(userOrgs)
      } catch {
        setOrgs([])
      }
    }
  })

  const resetForm = () => {
    setName("")
    setDescription("")
    setIsPrivate(false)
    setAutoInit(true)
    setError(null)
    setCreatedRepo(null)
    setSelectedOrg(null)
    setShowOrgPicker(false)
  }

  const handleClose = () => {
    resetForm()
    props.onClose()
  }

  const handleCreate = async () => {
    const repoName = name().trim()
    if (!repoName) {
      setError("Repository name is required")
      return
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(repoName)) {
      setError("Repository name can only contain letters, numbers, hyphens, dots, and underscores")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const options = {
        name: repoName,
        description: description().trim(),
        private: isPrivate(),
        autoInit: autoInit(),
      }

      const repo = selectedOrg()
        ? await createOrgRepository(selectedOrg()!, options)
        : await createRepository(options)

      setCreatedRepo(repo)
      props.onCreated?.(repo)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create repository")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Show when={props.open}>
      <div class="fixed inset-0 z-[10000] flex items-center justify-center">
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
        <div
          class="relative bg-background-base border border-border-base rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          style={{
            animation: "dialog-slide-in 200ms ease-out"
          }}
        >
          <Show
            when={!createdRepo()}
            fallback={
              <div class="p-6">
                <div class="flex flex-col items-center gap-4 text-center">
                  <div class="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <svg class="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 class="text-18-semibold text-text-base">Repository Created!</h2>
                  <p class="text-14-regular text-text-weak">
                    <span class="text-text-base font-medium">{createdRepo()!.fullName}</span> has been created successfully.
                  </p>
                  <div class="flex gap-3 w-full mt-2">
                    <Button
                      variant="secondary"
                      onClick={handleClose}
                      class="flex-1 justify-center"
                    >
                      Close
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        window.open(createdRepo()!.htmlUrl, "_blank")
                        handleClose()
                      }}
                      class="flex-1 justify-center"
                    >
                      Open on GitHub
                    </Button>
                  </div>
                </div>
              </div>
            }
          >
            <div class="p-6">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-18-semibold text-text-base">Create New Repository</h2>
                <button
                  onClick={handleClose}
                  class="p-1 rounded-md hover:bg-surface-raised-base-hover transition-colors text-text-weak hover:text-text-base cursor-pointer"
                >
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div class="flex flex-col gap-4">
                <Show when={orgs().length > 0}>
                  <div>
                    <label class="text-13-medium text-text-base mb-1.5 block">Owner</label>
                    <div class="flex gap-2">
                      <button
                        onClick={() => setShowOrgPicker(!showOrgPicker())}
                        class="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-base hover:border-border-strong transition-colors text-left cursor-pointer"
                      >
                        <Show
                          when={selectedOrg()}
                          fallback={
                            <span class="text-14-regular text-text-base">Personal ({auth.user()?.name ?? "User"})</span>
                          }
                        >
                          {(org) => (
                            <span class="text-14-regular text-text-base">{org()}</span>
                          )}
                        </Show>
                        <svg class="w-4 h-4 text-text-weak ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    <Show when={showOrgPicker()}>
                      <div class="mt-1 bg-surface-raised-base rounded-lg border border-border-base p-1 shadow-lg">
                        <button
                          onClick={() => { setSelectedOrg(null); setShowOrgPicker(false) }}
                          class="w-full text-left px-3 py-2 rounded-md text-14-regular hover:bg-background-hover transition-colors cursor-pointer"
                        >
                          Personal
                        </button>
                        <For each={orgs()}>
                          {(org) => (
                            <button
                              onClick={() => { setSelectedOrg(org.login); setShowOrgPicker(false) }}
                              class="w-full text-left px-3 py-2 rounded-md text-14-regular hover:bg-background-hover transition-colors cursor-pointer flex items-center gap-2"
                            >
                              <img src={org.avatarUrl} class="w-4 h-4 rounded-full" alt="" />
                              {org.login}
                            </button>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                </Show>

                <div>
                  <label class="text-13-medium text-text-base mb-1.5 block">
                    Repository name <span class="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name()}
                    onInput={(e) => setName(e.currentTarget.value)}
                    placeholder="my-awesome-project"
                    class="w-full px-3 py-2 rounded-lg border border-border-base bg-background-base text-14-regular text-text-base placeholder:text-text-weak focus:outline-none focus:border-accent-base focus:ring-1 focus:ring-accent-base transition-colors"
                  />
                  <Show when={name() && !/^[a-zA-Z0-9._-]+$/.test(name())}>
                    <p class="text-12-regular text-red-500 mt-1">Invalid characters in repository name</p>
                  </Show>
                </div>

                <div>
                  <label class="text-13-medium text-text-base mb-1.5 block">Description</label>
                  <textarea
                    value={description()}
                    onInput={(e) => setDescription(e.currentTarget.value)}
                    placeholder="Optional description"
                    rows={2}
                    class="w-full px-3 py-2 rounded-lg border border-border-base bg-background-base text-14-regular text-text-base placeholder:text-text-weak focus:outline-none focus:border-accent-base focus:ring-1 focus:ring-accent-base transition-colors resize-none"
                  />
                </div>

                <div class="flex items-center justify-between">
                  <div class="flex flex-col">
                    <span class="text-14-regular text-text-base">Private repository</span>
                    <span class="text-12-regular text-text-weak">Only you can see this repository</span>
                  </div>
                  <button
                    onClick={() => setIsPrivate(!isPrivate())}
                    class={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                      isPrivate() ? "bg-accent-base" : "bg-surface-raised-base"
                    }`}
                  >
                    <div
                      class={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        isPrivate() ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div class="flex items-center justify-between">
                  <div class="flex flex-col">
                    <span class="text-14-regular text-text-base">Initialize with README</span>
                    <span class="text-12-regular text-text-weak">Create an initial commit</span>
                  </div>
                  <button
                    onClick={() => setAutoInit(!autoInit())}
                    class={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                      autoInit() ? "bg-accent-base" : "bg-surface-raised-base"
                    }`}
                  >
                    <div
                      class={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        autoInit() ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <Show when={error()}>
                  <div class="rounded-lg border border-border-danger bg-danger-100 p-3">
                    <p class="text-12-regular text-text-danger">{error()}</p>
                  </div>
                </Show>

                <div class="flex gap-3 mt-2">
                  <Button
                    variant="secondary"
                    onClick={handleClose}
                    class="flex-1 justify-center"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreate}
                    disabled={loading() || !name().trim()}
                    class="flex-1 justify-center"
                  >
                    <Show when={!loading()} fallback={<LoadingSpinner />}>
                      Create Repository
                    </Show>
                  </Button>
                </div>
              </div>
            </div>
          </Show>
        </div>
      </div>
      <style>{`
        @keyframes dialog-slide-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </Show>
  )
}

function LoadingSpinner() {
  return (
    <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
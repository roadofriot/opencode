import type { DirectorySDK } from "@/context/sdk"
import { terminalWebSocketURL } from "@/utils/terminal-websocket-url"

/**
 * Executes a shell command silently by spawning a temporary PTY session,
 * writing the command via WebSocket, and cleaning up immediately.
 */
async function executeFileOperation(sdk: DirectorySDK, command: string): Promise<void> {
  const client = sdk.client
  const ptyRes = await client.pty.create({ title: "fs-operation" })
  if (ptyRes.error) throw new Error(String(ptyRes.error))
  const ptyID = ptyRes.data.id

  const ticketRes = await client.pty.connectToken({ ptyID }).catch(() => undefined)
  const ticket = ticketRes && !ticketRes.error ? ticketRes.data.ticket : undefined

  return new Promise<void>((resolve, reject) => {
    const wsUrl = terminalWebSocketURL({
      url: sdk.url,
      id: ptyID,
      directory: sdk.directory,
      cursor: 0,
      ticket,
    })
    const ws = new WebSocket(wsUrl.toString())
    let timer: any

    const cleanup = () => {
      clearTimeout(timer)
      ws.close()
      client.pty.remove({ ptyID }).catch(() => {})
    }

    ws.onopen = () => {
      ws.send(`${command}\n`)
      timer = setTimeout(() => {
        cleanup()
        resolve()
      }, 500)
    }

    ws.onclose = () => {
      cleanup()
      resolve()
    }

    ws.onerror = (e) => {
      cleanup()
      reject(e)
    }
  })
}

/** Creates an empty file at the target path. */
export async function createNewFile(sdk: DirectorySDK, parentDir: string, name: string) {
  const fullPath = parentDir ? `${parentDir}/${name}` : name
  await executeFileOperation(sdk, `touch "${fullPath}"`)
}

/** Creates a new directory (and parents) at the target path. */
export async function createNewFolder(sdk: DirectorySDK, parentDir: string, name: string) {
  const fullPath = parentDir ? `${parentDir}/${name}` : name
  await executeFileOperation(sdk, `mkdir -p "${fullPath}"`)
}

/** Renames (moves) a file or directory. */
export async function renameFileOrFolder(sdk: DirectorySDK, oldPath: string, newName: string) {
  const idx = oldPath.lastIndexOf("/")
  const parent = idx === -1 ? "" : oldPath.slice(0, idx)
  const newPath = parent ? `${parent}/${newName}` : newName
  await executeFileOperation(sdk, `mv "${oldPath}" "${newPath}"`)
}

/** Deletes (removes recursively) a file or directory. */
export async function deleteFileOrFolder(sdk: DirectorySDK, targetPath: string) {
  await executeFileOperation(sdk, `rm -rf "${targetPath}"`)
}

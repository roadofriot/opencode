import { ProviderError } from "./error"

/**
 * Default timeout (ms) for the initial response header from OpenAI-compatible APIs.
 * A separate per-chunk timeout is applied by wrapSseStreamWithTimeout.
 */
export const OPENAI_HEADER_TIMEOUT_DEFAULT = 10_000

/**
 * Wraps an SSE response so that each chunk read from the stream must arrive
 * within `ms` milliseconds. If a chunk times out the stream is aborted and a
 * ResponseStreamError is thrown so the caller can retry or surface the error.
 *
 * Returns the response unchanged when:
 * - `ms` is not a positive number
 * - the response has no body
 * - the content-type is not text/event-stream
 */
export function wrapSseStreamWithTimeout(res: Response, ms: number, ctl: AbortController): Response {
  if (typeof ms !== "number" || ms <= 0) return res
  if (!res.body) return res
  if (!res.headers.get("content-type")?.includes("text/event-stream")) return res

  const reader = res.body.getReader()
  const body = new ReadableStream<Uint8Array>({
    async pull(ctrl) {
      const part = await new Promise<Awaited<ReturnType<typeof reader.read>>>((resolve, reject) => {
        const id = setTimeout(() => {
          const err = new ProviderError.ResponseStreamError("SSE read timed out")
          ctl.abort(err)
          void reader.cancel(err)
          reject(err)
        }, ms)

        reader.read().then(
          (part) => {
            clearTimeout(id)
            resolve(part)
          },
          (err) => {
            clearTimeout(id)
            reject(err)
          },
        )
      })

      if (part.done) {
        ctrl.close()
        return
      }

      ctrl.enqueue(part.value)
    },
    async cancel(reason) {
      ctl.abort(reason)
      await reader.cancel(reason)
    },
  })

  return new Response(body, {
    headers: new Headers(res.headers),
    status: res.status,
    statusText: res.statusText,
  })
}

/**
 * Creates an AbortController that fires after `ms` milliseconds with a
 * HeaderTimeoutError. The returned `clear` function cancels the timer when the
 * response headers arrive in time.
 */
export function timeoutController(ms: number): { signal: AbortSignal; clear: () => void } {
  const ctl = new AbortController()
  const id = setTimeout(() => ctl.abort(new ProviderError.HeaderTimeoutError(ms)), ms)
  return {
    signal: ctl.signal,
    clear: () => clearTimeout(id),
  }
}

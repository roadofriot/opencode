import { Effect } from "effect"
import { PluginV2 } from "../../plugin"

export const GooglePlugin = PluginV2.define({
  id: PluginV2.ID.make("google"),
  effect: Effect.gen(function* () {
    return {
      "aisdk.sdk": Effect.fn(function* (evt) {
        if (evt.package !== "@ai-sdk/google") return
        const mod = yield* Effect.promise(() => import("@ai-sdk/google"))
        const options = { ...evt.options }
        if (!options.baseURL || options.baseURL.trim() === "https://generativelanguage.googleapis.com" || options.baseURL.trim() === "https://generativelanguage.googleapis.com/") {
          options.baseURL = "https://generativelanguage.googleapis.com/v1beta"
        }
        evt.sdk = mod.createGoogleGenerativeAI(options)
      }),
    }
  }),
})

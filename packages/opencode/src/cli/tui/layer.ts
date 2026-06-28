import { run as runTui, type TuiInput } from "@mindsparq-ai/tui"
import { Global } from "@mindsparq-ai/core/global"
import { Effect } from "effect"

export function run(input: TuiInput) {
  return runTui(input).pipe(Effect.provide(Global.defaultLayer))
}

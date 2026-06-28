import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { AgentV2 } from "@mindsparq-ai/core/agent"
import { FSUtil } from "@mindsparq-ai/core/fs-util"
import { SkillPlugin } from "@mindsparq-ai/core/plugin/skill"
import { SkillV2 } from "@mindsparq-ai/core/skill"
import { SkillDiscovery } from "@mindsparq-ai/core/skill/discovery"
import { testEffect } from "../lib/effect"

const it = testEffect(
  SkillV2.layer.pipe(
    Layer.provide(FSUtil.defaultLayer),
    Layer.provide(SkillDiscovery.defaultLayer),
    Layer.provideMerge(AgentV2.locationLayer),
  ),
)

describe("SkillPlugin.Plugin", () => {
  it.effect("registers the built-in customize-mindsparq skill", () =>
    Effect.gen(function* () {
      const skill = yield* SkillV2.Service
      yield* SkillPlugin.Plugin.effect.pipe(Effect.provideService(SkillV2.Service, skill))

      expect(yield* skill.list()).toContainEqual(
        expect.objectContaining({
          name: "customize-mindsparq",
          description: expect.stringContaining("mindsparq's own configuration"),
        }),
      )
    }),
  )
})

import { Context } from "effect"
import type { InstanceContext } from "@/project/instance-context"
import type { WorkspaceV2 } from "@mindsparq-ai/core/workspace"

export const InstanceRef = Context.Reference<InstanceContext | undefined>("~mindsparq/InstanceRef", {
  defaultValue: () => undefined,
})

export const WorkspaceRef = Context.Reference<WorkspaceV2.ID | undefined>("~mindsparq/WorkspaceRef", {
  defaultValue: () => undefined,
})

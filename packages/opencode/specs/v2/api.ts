// @ts-nocheck

import { Mindsparq } from "@mindsparq-ai/core"
import { ReadTool } from "@mindsparq-ai/core/tools"

const mindsparq = Mindsparq.make({})

mindsparq.tool.add(ReadTool)

mindsparq.tool.add({
  name: "bash",
  schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The command to run.",
      },
    },
    required: ["command"],
  },
  execute(input, ctx) {},
})

mindsparq.auth.add({
  provider: "openai",
  type: "api",
  value: process.env.OPENAI_API_KEY,
})

mindsparq.agent.add({
  name: "build",
  permissions: [],
  model: {
    id: "gpt-5-5",
    provider: "openai",
    variant: "xhigh",
  },
})

const sessionID = await mindsparq.session.create({
  agent: "build",
})

mindsparq.subscribe((event) => {
  console.log(event)
})

await mindsparq.session.prompt({
  sessionID,
  text: "hey what is up",
})

await mindsparq.session.prompt({
  sessionID,
  text: "what is up with this",
  files: [
    {
      mime: "image/png",
      uri: "data:image/png;base64,xxxx",
    },
  ],
})

await mindsparq.session.wait()

console.log(await mindsparq.session.messages(sessionID))

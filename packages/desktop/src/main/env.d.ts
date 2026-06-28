interface ImportMetaEnv {
  readonly OPENCODE_CHANNEL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "virtual:mindsparq-server" {
  export namespace Server {
    export const listen: typeof import("../../../mindsparq/dist/types/src/node").Server.listen
    export type Listener = import("../../../mindsparq/dist/types/src/node").Server.Listener
  }
  export namespace Config {
    export const get: typeof import("../../../mindsparq/dist/types/src/node").Config.get
    export type Info = import("../../../mindsparq/dist/types/src/node").Config.Info
  }
  export const bootstrap: typeof import("../../../mindsparq/dist/types/src/node").bootstrap
}

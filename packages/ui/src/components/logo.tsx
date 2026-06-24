import { type ComponentProps } from "solid-js"
import { MindSparqLogo, MindSparqSplash } from "./mindsparq-logo"

export const Mark = (props: { class?: string }) => {
  return <MindSparqLogo size={40} class={props.class} animated={false} />
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return <MindSparqSplash size={80} class={props.class} pulse={true} />
}

export const Logo = (props: { class?: string }) => {
  return <MindSparqLogo size={48} class={props.class} animated={true} showText={true} />
}


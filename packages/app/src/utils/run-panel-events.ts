let runPanelListeners: Array<() => void> = []

export function toggleRunPanel() {
  for (const listener of runPanelListeners) {
    listener()
  }
}

export function onRunPanelToggle(listener: () => void) {
  runPanelListeners.push(listener)
  return () => {
    runPanelListeners = runPanelListeners.filter((l) => l !== listener)
  }
}

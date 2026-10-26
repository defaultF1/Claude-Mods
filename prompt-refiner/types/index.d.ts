export type Mode = 'on' | 'off'
export type Depth = 'quick' | 'deep'
export type Settings = { mode: Mode; depth: Depth }

declare module 'claude-code' {
  interface PluginState {
    'prompt-refiner': { settings: Settings; last: string | null }
  }
}

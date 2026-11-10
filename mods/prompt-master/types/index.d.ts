export type Status = 'idle' | 'working'
export type Undo = string | null

declare module 'claude-code' {
  interface PluginState {
    'prompt-master': { status: Status; undo: Undo }
  }
}

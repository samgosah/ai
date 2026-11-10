import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Status, Undo } from '../types'

const status = atom({ plugin: 'prompt-master', key: 'status' } as const, 'idle' as Status)
const undo = atom({ plugin: 'prompt-master', key: 'undo' } as const, null as Undo)

const SYSTEM = `You are Prompt Master. You rewrite a user's rough prompt for an AI coding/assistant agent into a better prompt.
Rules:
- Keep the user's intent, facts, names, paths and constraints exactly. Never invent requirements.
- Make the goal explicit up front, then context, constraints, and what "done" looks like.
- Fix grammar and ambiguity; split run-ons into short bullets where it helps.
- If something essential is unclear, add one line at the end starting "Ask me first if:" listing it.
- Stay concise: no fluff, no preamble, no role-play lines like "You are an expert".
- Output ONLY the rewritten prompt text, nothing else.`

async function rewrite($: EngineInterface, given?: string): Promise<string> {
  if ((await read($, status)) === 'working') return 'Prompt Master is already running.'
  const draft = (given ?? (await $.prompt.read()).text).trim()
  if (!draft) {
    $.ui.toast('Type a rough prompt first, then hit Prompt Master.')
    return 'Nothing to rewrite.'
  }
  await update($, status, () => 'working')
  try {
    const r = await $.model.complete({
      model: 'sonnet',
      system: SYSTEM,
      prompt: `Rewrite this rough prompt:\n\n<rough_prompt>\n${draft}\n</rough_prompt>`,
      maxTokens: 2000,
      timeoutMs: 60000,
    })
    if (!r.isAnswered) {
      $.ui.toast(`Prompt Master failed: ${r.reason}`)
      return `Rewrite failed: ${r.reason}`
    }
    const text = r.text.trim().replace(/^<\/?rough_prompt>|<\/?rough_prompt>$/g, '').trim()
    await update($, undo, () => draft)
    const filled = await $.prompt.fill({ text, mode: 'replace' })
    if (!filled.isFilled) return text
    $.ui.toast('Prompt rewritten. Review it, then send.')
    return 'Rewritten prompt is in the box.'
  } finally {
    await update($, status, () => 'idle')
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'prompt-master',
      description: 'Rewrite your rough prompt (or the text after the command) into a better one',
    })
    return next(e)
  })

  on('command.run', { command: 'prompt-master' }, async ($, e) => {
    const text = await rewrite($, e.args.trim() || undefined)
    return { text }
  })

  // A sent prompt clears the undo copy.
  on('prompt.submit', ($, e, next) => {
    void update($, undo, () => null).catch(() => {})
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const s = await read($, status)
    const prev = await read($, undo)
    return (
      <Box flexDirection="row" gap={1}>
        <Button
          key="pm"
          label={s === 'working' ? '✨ Rewriting…' : '✨ Prompt Master'}
          onPress={() => { void rewrite($) }}
        />
        {prev !== null && s === 'idle' ? (
          <Button
            key="undo"
            label="Undo"
            onPress={async () => {
              await $.prompt.fill({ text: prev, mode: 'replace' })
              await update($, undo, () => null)
            }}
          />
        ) : null}
        {s === 'working' ? <Text dimColor>polishing your prompt</Text> : null}
      </Box>
    )
  })
}

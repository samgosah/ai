import type { EngineInterface as Engine, Register } from 'claude-code'

const SYSTEM = `You are Prompt Master. Rewrite the user's rough prompt into a better prompt for an AI coding assistant.
Rules:
- Keep the user's intent, facts, names, paths and constraints exactly. Never invent requirements.
- Make the goal explicit, add relevant context the user implied, state the expected output and what "done" looks like.
- Use short sections or bullets only when the task has several parts; keep simple asks to one or two sentences.
- Write in the user's voice (first person), in American English.
- Output ONLY the rewritten prompt. No preamble, no quotes, no commentary.`

// Typing "pm: <rough prompt>" rewrites it and sends the rewrite in one step.
const PREFIX = /^\s*pm:\s*/i

let isBusy = false
let original: string | null = null

async function rewrite($: Engine, rough: string) {
  try {
    const r = await $.model.complete({
      model: 'sonnet',
      system: SYSTEM,
      prompt: rough,
      maxTokens: 2000,
      timeoutMs: 60_000,
    })
    return r.isAnswered && r.text.trim() ? r.text.trim() : undefined
  } catch {
    return undefined
  }
}

// One click: the button above the prompt rewrites the draft in place.
async function improveDraft($: Engine) {
  if (isBusy) return
  const box = await $.prompt.read()
  if (!box.text.trim()) {
    $.ui.toast('Prompt Master: type a rough prompt first')
    return
  }
  isBusy = true
  $.ui.status('Prompt Master: rewriting…')
  try {
    const better = await rewrite($, box.text)
    if (!better) {
      $.ui.toast('Prompt Master: rewrite failed, draft left as is')
      return
    }
    const filled = await $.prompt.fill({ text: better, cursor: better.length })
    if (filled.isFilled) original = box.text
    $.ui.toast(filled.isFilled ? 'Prompt Master: draft rewritten, review and send' : 'Prompt Master: could not write to the prompt box')
  } finally {
    isBusy = false
    $.ui.status(undefined)
  }
}

async function undo($: Engine) {
  if (original === null) return
  const text = original
  original = null
  await $.prompt.fill({ text, cursor: text.length })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'pm',
      description: 'Prompt Master: rewrite a rough prompt, then put it in the box (or send it)',
    })
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || e.props.isWorking) return next(e)
    const { Box, Button } = $.ui.resolve(e)
    return (
      <Box>
        <Button key="pm" label="✨ Prompt Master" onPress={() => improveDraft($)} />
        {original !== null ? <Button key="undo" label="Undo" onPress={() => undo($)} /> : null}
      </Box>
    )
  })

  // /pm <rough>: fill the box for review; where the app owns the box, send it.
  on('command.run', { command: 'pm' }, async ($, e) => {
    const rough = e.args.trim()
    if (!rough) {
      await improveDraft($)
      return { text: 'Prompt Master: usage `/pm <rough prompt>`, or press the ✨ button.' }
    }
    const better = await rewrite($, rough)
    if (!better) return { text: 'Prompt Master: rewrite failed. Your prompt was not sent.' }
    const filled = await $.prompt.fill({ text: better, cursor: better.length })
    if (filled.isFilled) return { text: 'Prompt Master: rewritten prompt is in the box. Edit if needed, then send.' }
    void $.prompt.submit({ text: better, asUser: true })
    return { text: `Prompt Master rewrote your prompt:\n\n${better}` }
  })

  // "pm: <rough>": rewrite and send in one step; works on every surface, phone included.
  on('prompt.submit', ($, e, next) => {
    if (e.command || e.isMeta || !PREFIX.test(e.text)) return next(e)
    const rough = e.text.replace(PREFIX, '')
    return rewrite($, rough)
      .then(better => {
        if (!better) $.ui.toast('Prompt Master: rewrite failed, sent your original')
        return next({ ...e, text: better ?? rough })
      })
      .catch(() => next({ ...e, text: rough }))
  })
}

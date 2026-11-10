import { expect, test } from 'claude-code/testing'

test('pm: prefix rewrites the prompt before it is sent', async ($, on) => {
  on('model.complete', () => ({
    value: { isAnswered: true, text: 'Rewritten prompt.', usage: {} },
  }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  const sent = await $.prompt.submit({ text: 'pm: fix tests' })
  expect(sent.text).toBe('Rewritten prompt.')
})

test('a failed rewrite sends the original text without the prefix', async ($, on) => {
  on('model.complete', () => ({
    value: { isAnswered: false, reason: 'api-error', status: 500, error: 'x' },
  }))
  on('prompt.submit', (_, e) => ({ text: e.text }))

  const sent = await $.prompt.submit({ text: 'pm: fix tests' })
  expect(sent.text).toBe('fix tests')
})

test('a prompt without the prefix is left alone', async ($, on) => {
  on('model.complete', () => {
    throw new Error('should not be called')
  })
  on('prompt.submit', (_, e) => ({ text: e.text }))

  const sent = await $.prompt.submit({ text: 'just a normal prompt' })
  expect(sent.text).toBe('just a normal prompt')
})

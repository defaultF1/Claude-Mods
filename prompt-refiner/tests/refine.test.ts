import { expect, test } from 'claude-code/testing'

const typed = (text: string) =>
  ({ text, wait: false, origin: { kind: 'composer' } }) as const

const BAND = {
  plugin: 'prompt-refiner',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

// Stands in for the engine's store, the prompt's way into the session, and the turn.
function engine(on: Parameters<Parameters<typeof test>[1]>[1]) {
  const store = new Map<string, unknown>()
  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => {
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('prompt.submit', (_, e) => ({ text: e.text, context: e.context }))
  on('command.register', () => ({ value: { command: 'refine' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.status', () => ({ value: undefined }))

  return store
}

test('a typed prompt carries the refine protocol and keeps its text', async ($, on) => {
  engine(on)

  const out = await $.prompt.submit(typed('make a 30s reel about solar panels'))

  expect(out.text).toBe('make a 30s reel about solar panels')
  expect(out.context?.some(c => c.includes('complexity'))).toBe(true)
})

test('--go skips refinement once and is stripped', async ($, on) => {
  engine(on)

  const out = await $.prompt.submit(typed('just rename the file --go'))

  expect(out.text).toBe('just rename the file')
  expect(out.context ?? []).toEqual([])
})

test('/refine off stops it, /refine deep turns it back on', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await $.command.run({ command: 'refine', args: 'off' })
  expect((await $.prompt.submit(typed('write a script'))).context ?? []).toEqual([])

  await $.command.run({ command: 'refine', args: 'deep' })
  const out = await $.prompt.submit(typed('write a script'))
  expect(out.context?.some(c => c.includes('Up to 2 rounds'))).toBe(true)
})

test('the band buttons switch the refiner, on every surface', async ($, on) => {
  const store = engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    await ui.press({ key: 'off' })
    expect(store.get('mode')).toBe('off')
    expect((await $.prompt.submit(typed('write a script'))).context ?? []).toEqual([])

    await ui.press({ key: 'deep' })
    expect(store.get('mode')).toBe('on')
    expect(store.get('depth')).toBe('deep')

    await ui.press({ key: 'quick' })
    expect(store.get('depth')).toBe('quick')
    await ui.unmount()
  }
})

test('the band says how many questions the last prompt got', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await $.prompt.submit(typed('build me a landing page'))
  await $.tool.call({
    tool: 'AskUserQuestion',
    questions: [
      { question: 'Which stack?', header: 'Stack', multiSelect: false, options: [{ label: 'A', description: 'a' }, { label: 'B', description: 'b' }] },
      { question: 'Which tone?', header: 'Tone', multiSelect: false, options: [{ label: 'A', description: 'a' }, { label: 'B', description: 'b' }] },
    ],
  })
  await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer', category: null, explanation: null })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /Last:/ }))?.text).toBe('Last: asked 2 questions')
  await ui.unmount()
})

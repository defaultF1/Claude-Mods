import { expect, test } from 'claude-code/testing'

// Stands in for the engine's store and the prompt's way into the session.
function engine(on: Parameters<Parameters<typeof test>[1]>[1]) {
  const store = new Map<string, unknown>()
  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => {
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('prompt.submit', (_, e) => ({ text: e.text, context: e.context }))
}

const typed = (text: string) =>
  ({ text, wait: false, origin: { kind: 'composer' } }) as const

test('a typed prompt carries the refine protocol and keeps its text', async ($, on) => {
  engine(on)

  const out = await $.prompt.submit(typed('make a 30s reel about solar panels'))

  expect(out.text).toBe('make a 30s reel about solar panels')
  expect(out.context?.some(c => c.includes('prompt-refiner mod'))).toBe(true)
})

test('--go skips refinement once and is stripped', async ($, on) => {
  engine(on)

  const out = await $.prompt.submit(typed('just rename the file --go'))

  expect(out.text).toBe('just rename the file')
  expect(out.context ?? []).toEqual([])
})

test('/refine off stops it, /refine deep turns it back on', async ($, on) => {
  engine(on)
  on('command.register', () => ({ value: { command: 'refine' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await $.command.run({ command: 'refine', args: 'off' })
  expect((await $.prompt.submit(typed('write a script'))).context ?? []).toEqual([])

  await $.command.run({ command: 'refine', args: 'deep' })
  const out = await $.prompt.submit(typed('write a script'))
  expect(out.context?.some(c => c.includes('Up to 2 rounds'))).toBe(true)
})

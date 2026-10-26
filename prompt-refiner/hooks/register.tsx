import { atom, read, update } from 'claude-code'
import type { PromptOrigin, Register } from 'claude-code'

import type { Depth, Settings } from '../types'

const SKIP = /\s*--go\s*$/i
const TYPED: readonly PromptOrigin['kind'][] = ['composer', 'bridge', 'sdk']

// Each category names the gaps worth asking about for that kind of request.
const CATEGORIES = `
- Build / code: scope (what is in and out), where it lives (files, stack, repo), behaviour and edge cases, done-when (tests, how it is checked)
- Fix / debug: the symptom, how to reproduce it, expected vs actual, limits on the fix (no refactor, keep API)
- Video / reel / motion: platform and aspect ratio, length and pacing, style and references, assets / VO / music, deliverable (format, fps, file)
- Visual / design / image: look and mood, brand rules, size and format, how many variations
- Writing / copy / script: audience, voice and tone, length, format and call to action
- Research / analysis: the exact question, depth, sources to trust or avoid, output form
- Data / numbers: source, metric definitions, time range, output (table, chart, file)
- Automation / setup / config: trigger, where it runs, permissions and safety, how long it persists
- Plan / strategy / ideas: the goal, constraints, how options are judged, time horizon
- Other: goal, audience, constraints, output`

function protocol(depth: Depth): string {
  const rounds =
    depth === 'deep'
      ? 'Up to 2 rounds of up to 4 questions each; ask a second round only if the first answers opened a real new gap.'
      : 'One round of 1 to 4 questions.'

  return `[prompt-refiner mod: active for this message]
The person turned on prompt refinement. Before doing the work, refine the request with them:

1. Decide whether to refine by the message's complexity and how confusing it is, not by whether it is new or a follow-up.
   - Refine when it is complex (several parts, a sizeable deliverable, choices that would change the output a lot) or confusing (unclear goal, target or scope; vague words like "make it better"; two or more reasonable readings; a conflict with something said earlier). A follow-up that is complex or confusing gets refined too.
   - Skip straight to the work, with no mention of this mod, when it is simple and clear: a direct question, a small precise change, an answer to your own question, an approval, or chat.
   - If unsure, refine.

2. Build a context ledger, privately: every fact, constraint, name, number, file, path, link, preference and example the person gave, in this message and earlier in the conversation, plus what memory and the project already settle. Keep their exact words. Nothing in it may be dropped, merged away or softened later.

3. Categorise the request (pick the primary one, at most one secondary):${CATEGORIES}

4. Ask follow-up questions with the AskUserQuestion tool, before any other work (reading files to make the options sharper is fine). ${rounds}
   - Ask only about real gaps: never ask what the ledger already answers, and never ask what you can find out yourself.
   - Draw questions from the dimensions of the chosen category, the ones that change the output most first.
   - Each question's header is the dimension (max 12 chars); options are concrete, the best default first marked "(Recommended)", each with a one-line description of what it changes.
   - Say in one short line before the call: "Refining as <Category>: <n> questions."
   - If AskUserQuestion is not available, ask the same questions as a short numbered list grouped under the category and end your turn.

5. After the answers, write the refined prompt in this shape, then do the work from it without asking again:
   **Refined prompt (<Category>)**
   - Goal: one sentence
   - Your context: every ledger item, in the person's words where possible
   - Decisions: each answer, as a fact
   - Constraints: what must and must not happen
   - Deliverable / done when: what comes out and how it is checked
   If an answer contradicts something said earlier, ask which one stands instead of choosing.

Never let refinement lose anything: the original message stays the source of truth, and the refined prompt only adds to it.`
}

function settingsOf(mode: unknown, depth: unknown): Settings {
  return {
    mode: mode === 'off' ? 'off' : 'on',
    depth: depth === 'deep' ? 'deep' : 'quick',
  }
}

const settingsAtom = atom(
  { plugin: 'prompt-refiner', key: 'settings' } as const,
  { mode: 'on', depth: 'quick' },
)
const lastAtom = atom({ plugin: 'prompt-refiner', key: 'last' } as const, null)

export const register: Register = on => {
  // Whether the running turn carries the protocol, and how many questions it asked.
  let isRefining = false
  let asked = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'refine',
      description: 'Prompt refiner: on | off | quick | deep | status',
    })
    const stored = settingsOf(await $.store.get('mode'), await $.store.get('depth'))
    await update($, settingsAtom, () => stored)
    $.ui.status(undefined)

    return next(e)
  })

  on('command.run', { command: 'refine' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const settings = { ...(await read($, settingsAtom)) }

    if (arg === 'on' || arg === 'off') {
      settings.mode = arg
    } else if (arg === 'quick' || arg === 'deep') {
      settings.depth = arg
      settings.mode = 'on'
    } else if (arg !== '' && arg !== 'status') {
      return { text: 'Usage: /refine on | off | quick | deep | status' }
    }

    await $.store.set('mode', settings.mode)
    await $.store.set('depth', settings.depth)
    await update($, settingsAtom, () => settings)

    return {
      text:
        settings.mode === 'on'
          ? `Prompt refiner is on (${settings.depth}). End a prompt with --go to skip it once.`
          : 'Prompt refiner is off. /refine on turns it back on.',
    }
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.command || e.isMeta || e.turnId || !TYPED.includes(e.origin.kind)) {
      return next(e)
    }

    isRefining = false
    asked = 0

    if (SKIP.test(e.text)) {
      await update($, lastAtom, () => 'skipped with --go')

      return next({ ...e, text: e.text.replace(SKIP, '') })
    }

    const settings = await read($, settingsAtom)

    if (settings.mode === 'off') {
      return next(e)
    }

    isRefining = true

    return next({ ...e, context: [...(e.context ?? []), protocol(settings.depth)] })
  })

  on('tool.call', { tool: 'AskUserQuestion' }, ($, e, next) => {
    if (isRefining) {
      asked += e.questions.length
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (isRefining) {
      const note =
        asked > 0
          ? `asked ${asked} question${asked === 1 ? '' : 's'}`
          : 'no questions needed (clear prompt)'
      await update($, lastAtom, () => note)
      isRefining = false
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const settings = await read($, settingsAtom)
    const last = await read($, lastAtom)
    const isOn = settings.mode === 'on'

    const apply = async (change: Partial<Settings>) => {
      const nextSettings = { ...settings, ...change }
      await $.store.set('mode', nextSettings.mode)
      await $.store.set('depth', nextSettings.depth)
      await update($, settingsAtom, () => nextSettings)
    }

    return (
      <Box flexDirection="row" gap={1}>
        <Text bold>Refiner</Text>
        <Button
          key="on"
          label="On"
          variant={isOn ? 'primary' : 'secondary'}
          onPress={() => apply({ mode: 'on' })}
        />
        <Button
          key="off"
          label="Off"
          variant={isOn ? 'secondary' : 'primary'}
          onPress={() => apply({ mode: 'off' })}
        />
        <Text dimColor>|</Text>
        <Button
          key="quick"
          label="Quick"
          dimColor={!isOn}
          variant={isOn && settings.depth === 'quick' ? 'primary' : 'secondary'}
          onPress={() => apply({ mode: 'on', depth: 'quick' as Depth })}
        />
        <Button
          key="deep"
          label="Deep"
          dimColor={!isOn}
          variant={isOn && settings.depth === 'deep' ? 'primary' : 'secondary'}
          onPress={() => apply({ mode: 'on', depth: 'deep' as Depth })}
        />
        {last !== null && <Text dimColor>Last: {last}</Text>}
      </Box>
    )
  })
}

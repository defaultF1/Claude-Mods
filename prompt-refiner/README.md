# prompt-refiner

Before Claude acts on a complex or unclear request, it categorises the request (Build, Fix, Video/reel, Visual, Writing, Research, Data, Automation, Plan, Other), asks 1-4 follow-up questions drawn from that category's dimensions, then writes a **Refined prompt** (goal, your context in your own words, decisions, constraints, done-when) and works from it.

Nothing you typed is rewritten: your prompt goes through as-is, and the refine instructions ride beside it as hidden context. Claude keeps a ledger of every detail from the whole conversation and never asks about what is already answered.

A row above the prompt box controls it:

```
Refiner  [On] [Off] | [Quick] [Deep]   Last: asked 2 questions
```

- **On / Off**: turn it on or off (remembered across sessions)
- **Quick** (default): one round of 1-4 questions; **Deep**: up to two rounds
- **Last**: what happened to your previous message (questions asked, none needed, or skipped with `--go`)

The same settings work as commands: `/refine on | off | quick | deep | status`. End a prompt with `--go` to skip refinement for that one message.

Whether it asks depends on the prompt, not on whether it is new or a follow-up: complex requests (several parts, a big deliverable, choices that change the result) and confusing ones (unclear goal or scope, vague words, more than one reading) get questions; simple, clear ones (a direct question, a small precise change, an approval, chat) go straight to the work.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install prompt-refiner --marketplace defaultF1/Claude-Mods
```

Answer `y` to add the marketplace, then pick the user scope so it loads in every session.

From a shell:

```
claude plugin install prompt-refiner --marketplace defaultF1/Claude-Mods
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `defaultF1/Claude-Mods`, then Add plugin.

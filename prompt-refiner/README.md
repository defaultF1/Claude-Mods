# prompt-refiner

Before Claude acts on a new request, it categorises the request (Build, Fix, Video/reel, Visual, Writing, Research, Data, Automation, Plan, Other), asks 1-4 follow-up questions drawn from that category's dimensions, then writes a **Refined prompt** (goal, your context in your own words, decisions, constraints, done-when) and works from it.

Nothing you typed is rewritten: your prompt goes through as-is, and the refine instructions ride beside it as hidden context. Claude keeps a ledger of every detail from the whole conversation and never asks about what is already answered.

- `/refine on` / `/refine off`: turn it on or off (remembered across sessions)
- `/refine quick` (default): one round of 1-4 questions
- `/refine deep`: up to two rounds
- `/refine status`: show the current setting
- End a prompt with `--go` to skip refinement for that one message.

Answers, approvals and small follow-ups skip refinement on their own.

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

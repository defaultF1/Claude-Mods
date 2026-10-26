# Claude Mods

Mods for [Claude Code](https://claude.com/claude-code). This repository is a plugin marketplace: add it once, then install any mod in it.

| Mod | What it does |
| --- | --- |
| [prompt-refiner](prompt-refiner/) | Before Claude acts on a new request, it categorises it, asks 1-4 follow-up questions, then works from a refined prompt that keeps every detail you gave. `/refine on \| off \| quick \| deep`, end a prompt with `--go` to skip once. |

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install prompt-refiner --marketplace defaultF1/Claude-Mods
```

Answer `y` to add the marketplace, then pick the user scope so the mod loads in every session.

From a shell:

```
claude plugin install prompt-refiner --marketplace defaultF1/Claude-Mods
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `defaultF1/Claude-Mods`, then Add plugin.

# best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/aleep1990/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/aleep1990/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**STARSHATTER** — a neon void-defense arcade game. You are the last light-ship
*Aurora*, alone against the void. Survive 10 waves of void-spawned hunters —
darts that chase, weavers that strafe and shoot, bulwarks that soak fire,
splitters that burst into mites — then shatter the Hollow Star itself.

- **Complete game**: a goal (survive all 10 waves), rules, score with a combo
  multiplier, 3 hulls, power-ups (Aegis shield, Overdrive, Trident spread,
  +1 hull), a start, a pause, a victory screen and a game-over screen with
  restart.
- **Controls**: WASD / arrows to move, mouse to aim, hold click or Space to
  fire. P pauses, M mutes, R restarts.
- **Original everything**: original art (all drawn in code), original
  synthesized WebAudio sounds and music, original names. No assets, no
  network requests — the whole game is static files under `game/`.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser and play.

## Shots

`shots.json` lists the four staged screenshots in `screenshots/` (cover first):
dense combat, the title screen, the Hollow Star boss fight, and the victory
screen. Each is a real render of the game's own code, staged with
`?shot=<name>&seed=1`.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) — a STARSHATTER entry for the [best-game-01](https://make.fun/bounty/best-game-01) bounty.</sub>

# OUTPOST

A rough-around-the-edges 2D wave-defense shooter in the style of late-90s arcade
games (*Smash TV* / *Crimsonland* with a military skin). Vanilla JS + Canvas,
zero dependencies, zero asset files — all sprites are drawn procedurally and all
audio is synthesized with the Web Audio API.

## Run

```sh
python3 -m http.server 8000
```

then open <http://localhost:8000>. (Any static file server works; ES modules
just can't be loaded from `file://`.)

## Controls

| Input | Action |
|---|---|
| WASD / arrows | Move |
| Mouse | Aim / fire |
| 1–4 / wheel | Switch weapon |
| R | Reload |
| P | Pause |
| M | Mute |

## Features

- Endless escalating waves with a budget-based wave director
- 4 weapons: M9 sidearm (infinite ammo), MP5 SMG, M870 shotgun, M72 LAW rocket
- Enemies with **visible armor**: plates spark, crack, and break off as debris;
  riot-shield bearers block frontal fire and must be flanked (or rocketed)
- Powerups: health, armor vest, ammo, weapon crates, rapid fire, double damage
- Fully synthesized SFX + ambient drone, screen shake, shell casings,
  persistent blood/scorch decals, CRT scanline overlay
- High score persisted in `localStorage`

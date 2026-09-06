# Lumen Swap

A minimalistic 3-color puzzle platformer built strictly around **Black (#000000)**, **White (#FFFFFF)**, and **Red (#FF0000)**.

Every visual element on screen serves a dual purpose as both stark minimalist art and an active gameplay mechanic.

---

## The 3-Color Mechanics Matrix

| Color / Role | White Form (`#FFFFFF`) | Red Form (`#FF0000`) |
| :--- | :--- | :--- |
| **Black Void (`#000000`)** | Background & phase-through air | Background & phase-through air |
| **White Platforms (`#FFFFFF`)** | **Solid (Walkable)** | **Ghost (Phase-through)** |
| **Red Platforms (`#FF0000`)** | **Ghost (Phase-through)** | **Solid (Walkable)** |
| **Red Hazards (Spikes / Lasers)** | **Lethal (Instant Shatter)** | **Absorb (Recharges Lumen Fuel)** |

---

## Controls

| Action | Keyboard | Gamepad | Mobile Touch |
| :--- | :--- | :--- | :--- |
| **Move Left / Right** | `A` / `D` or `←` / `→` | Left Stick / D-Pad | `←` / `→` buttons |
| **Jump** | `Space`, `W`, or `↑` | Button `A` / `Cross` | `JUMP` button |
| **Color Swap** | `Shift`, `J`, `X`, `C`, `Enter` | `B`, `X`, `L1`, `R1` | `SWAP` button |
| **Quick Restart** | `R` | — | — |
| **Pause / Resume** | `Esc` or `P` | `Start` | — |
| **Level Editor** | `E` | — | — |

---

## Running Locally

```bash
# Install dependencies
npm.cmd install

# Start local development server
npm.cmd run dev

# Build for production
npm.cmd run build
```

## Plan: Subtle sound effects

Synthesize tiny tones in-browser with the WebAudio API — no audio files to download, no API costs, instant playback, and matches the "minimal & subtle" style. A mute toggle persists per-user.

### What you'll hear

- **UI clicks**: very soft tick on primary buttons (Spin, Save, Accept/Decline, etc.)
- **Page transitions**: gentle paper-turn whoosh when navigating between routes
- **Spin the Wheel**: rising whoosh when spin starts, soft chime when the wheel lands
- **XP awarded**: short 3-note sparkle when a read earns XP
- **Streak milestone**: slightly bigger 4-note fanfare every 5-day streak

All sounds are ~0.05–0.5s, low-volume (gain ~0.04). Nothing intrusive.

### Settings

A new "Sounds" toggle in the Profile page (next to Theme/Font Size). Defaults to **on**. Stored in `localStorage` so it works pre-login and across reloads.

### Technical details

**New file: `src/lib/sounds.ts`**
- Lazy-initialized `AudioContext` (created on first user interaction so browsers allow it)
- `isSoundEnabled()` / `setSoundEnabled()` backed by `localStorage` key `curio_sound_enabled`
- Internal `tone({ freq, duration, type, gain, sweepTo, delay })` helper that schedules an oscillator + gain envelope
- Exports `Sfx.click()`, `Sfx.page()`, `Sfx.spinStart()`, `Sfx.spinLand()`, `Sfx.xp()`, `Sfx.streak()`

**Wire-up points**

| File | Change |
|------|--------|
| `src/components/ScrollToTop.tsx` | Call `Sfx.page()` on every route change |
| `src/pages/Spin.tsx` | `Sfx.spinStart()` when spin begins; `Sfx.spinLand()` after the rotation completes |
| `src/hooks/useReader.ts` | `Sfx.xp()` after XP is granted; `Sfx.streak()` when `streakBonus > 0` |
| `src/components/ui/button.tsx` | Wrap `onClick` to play `Sfx.click()` for non-disabled, non-`ghost`/`link` variants (keeps nav links quiet) |
| `src/pages/Profile.tsx` | Add a "Sounds" switch row using the existing `Switch` component; reads/writes via `isSoundEnabled` / `setSoundEnabled` |

No new dependencies. No network requests. No edge functions. Fully removable per-user via the toggle.

# Illustration audit and prompts

## The existing style

Every illustration in `frontend/assets/images/Illustration*.webp` shares one language:

- Flat 2D vector, no gradients, no shading, no texture.
- Thick, even, black outlines with rounded joins and caps. Interior detail lines are slightly thinner.
- White fills. One accent colour only: Doyo blue `#00BAF0` (it reads slightly deeper, about `#0AAEE8`, on
  the artwork). No other colours, no greys.
- Behind the subject, two or three large flat blue angular "shards": tilted parallelograms with sharp
  corners, partly hidden by the subject, never outlined.
- People: simple friendly faces (dot eyes, single-line nose, small smile), black hair, calm upright poses,
  Pakistani dress. Women wear a dupatta over the head and a kurta with blue trim and a small embroidered
  neckline. Men wear a kurta with a blue placket, or a polo with blue collar and cuffs and a blue cap when
  they are workers.
- Objects are drawn the same way: white with a double outline (black outside, blue inside).
- Transparent background, subject centred, landscape roughly 3:2, generous empty margin.

## Where each one is used

| File | Shows | Used on | Verdict |
|---|---|---|---|
| `Illustration1` | A woman and a man, customers | Onboarding slide 1 ("Just tell Doyo") | Keep. Works as "the people Doyo is for" |
| `Illustration2` | Woman holding a phone with a tick, shield behind | Onboarding slide 3 ("Pay when it's finished") | Keep for now; a PayPal-specific one would fit better (prompt B) |
| `Illustration3` | Globe with language bubbles | Splash, language | Keep |
| `Illustration4` | Worker with spray and squeegee, customer with phone | Splash, role choice | Keep |
| `Illustration5` | Wi-Fi off | Offline overlay | Keep |
| `Illustration6` | Refresh arrows | Update required | Keep |
| `Illustration7` | Worker with broom beside a calendar and clock | Booking history empty state, onboarding slide 2 ("Doyo negotiates") | Keep for history. Onboarding needs its own (prompt A) |

Unused files that can be deleted before the repo goes public: `Background.webp`, `Pattern.png`,
`EmailBackground.png`, `EmailCardBackground.png`, `Google.svg`, `BarberServicesIcon.png`,
`BarberServicesCombinedIcon-v4*.png`, `BarberServicesWorkerIcon.png`, `BookingHistoryBarber-centered.png`,
`FurnitureMovePickIcon*.png`, `HomeServicesWorkerIcon-no-pattern.png`, `HomeServicesZigzagPattern-clean.png`,
`ShiftingServicesIcon-outlined.png`, `VehicleServicesWorkerIcon-v2.png` (about 15 MB together).

## Genuine gaps

Only two. Everything else in the app already has art or does not need it.

1. **The agent negotiating.** The product's main idea has no picture. Wanted for onboarding slide 2, the
   website and the video.
2. **Paying through PayPal after the job.** Wanted for onboarding slide 3 and the Link PayPal screen, which
   currently shows only a logo tile.

Generate at 2x, export as WebP with transparency, about 1440 x 1080, and keep the file under 100 KB like the
others.

### Prompt A: Doyo negotiating (save as `Illustration8.webp`)

```
Flat 2D vector illustration, landscape 4:3, transparent background, subject centred with wide empty margins.

Composition: three figures in a row, seen from the waist up, all facing the viewer. On the left, a young
Pakistani woman customer wearing a white dupatta over her head with a blue border and a white kurta with a
small blue embroidered neckline; she holds a smartphone in one hand and looks relaxed. On the right, a
Pakistani male service worker in a white polo shirt with a blue collar, blue sleeve cuffs and a blue
baseball cap, one hand raised in a friendly open-palm gesture. Between them, slightly higher, a large
rounded speech bubble containing a simple chat mark: three short horizontal lines and a
small tick. From that centre bubble, one smaller speech bubble points toward the customer and one toward
the worker; the customer-side bubble contains a down arrow, the worker-side bubble contains a handshake
drawn as two simple clasped hands. No text, no numbers, no currency symbols, no logos.

Style: thick uniform black outlines with rounded corners and rounded line ends, slightly thinner black
lines for interior details, pure white fills, exactly one accent colour, a flat bright blue #00BAF0, used
for clothing trim, the phone, and a thin inner outline on the speech bubbles. Simple friendly faces: small
dot eyes, a single curved line for the nose, a small smile, solid black hair. Behind the figures, three
large flat blue #00BAF0 angular shards shaped like tilted parallelograms with sharp corners, no outline,
partly hidden behind the figures and bubbles.

Lighting: none. Completely flat colour, no gradients, no shadows, no highlights, no texture, no 3D.
Perspective: straight-on, no depth.

Negative: no gradients, no shading, no drop shadows, no extra colours, no grey, no skin tone fill other
than white, no background scenery, no text or letters, no watermark, no photorealism, no 3D render, no
robot, no thin sketchy lines, no cropped heads.
```

### Prompt B: Pay after the job (save as `Illustration9.webp`)

```
Flat 2D vector illustration, landscape 4:3, transparent background, subject centred with wide empty margins.

Composition: a young Pakistani man customer, seen from the waist up, wearing a white kurta with a blue
button placket and a blue band collar, smiling and holding a smartphone toward the viewer with one hand.
The phone screen shows a large simple tick inside a circle. To his right, at shoulder height, a large
rounded wallet card drawn as a white rounded rectangle with a blue stripe across its top third and two
small rounded chips, and beside it a round coin with a simple tick on it. A short dotted curved arrow runs
from the phone to the coin. No text, no numbers, no currency symbols, no brand logos, no letter P.

Style: thick uniform black outlines with rounded corners and rounded line ends, slightly thinner black
lines for interior details, pure white fills, exactly one accent colour, a flat bright blue #00BAF0, used
for the kurta trim, the phone body, the card stripe and a thin inner outline on the coin. Simple friendly
face: small dot eyes, a single curved line for the nose, a small smile, solid black hair. Behind the
figure, three large flat blue #00BAF0 angular shards shaped like tilted parallelograms with sharp corners,
no outline, partly hidden behind the figure and the card.

Lighting: none. Completely flat colour, no gradients, no shadows, no highlights, no texture, no 3D.
Perspective: straight-on, no depth.

Negative: no gradients, no shading, no drop shadows, no extra colours, no grey, no skin tone fill other
than white, no background scenery, no text or letters, no logos, no watermark, no photorealism, no 3D
render, no thin sketchy lines, no cropped head.
```

Once generated, swap them in at `frontend/screens/OnboardingScreen.tsx` (slides 2 and 3) and
`frontend/screens/LinkPayPalScreen.tsx`.

```markdown
# Design System Strategy: Studio Georgina

## 1. Overview & Creative North Star: "The Curated Canvas"
This design system is built to transform a digital interface into a high-end editorial experience. Our Creative North Star is **"The Curated Canvas."** Rather than treating the website as a container for information, we treat every viewport as a gallery wall.

The goal is to move beyond the "template" look of modern SaaS. We achieve this through **intentional asymmetry**, where elements are not always perfectly centered but balanced through weight and color. We embrace **expansive white space** not as "empty" space, but as a luxury material that allows the art to breathe. By overlapping pastel color blocks with crisp, high-contrast typography, we create a rhythmic, sophisticated flow that feels human and artisanal rather than mechanical.

---

## 2. Colors & Tonal Architecture
The palette centers on soft, atmospheric pastels contrasted against a professional charcoal (`on-surface: #323233`).

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. Traditional lines create "boxes" that feel restrictive and dated.
- **Definition through Color:** Boundaries must be defined solely through background color shifts. For example, a section using `surface-container-low (#f6f3f2)` sitting on a `surface (#fcf9f8)` background provides enough visual distinction without the "clutter" of a line.
- **Color Blocks:** Use `primary-container (#b5e8d2)`, `secondary-container (#ffdad7)`, and `tertiary-container (#dadafa)` as oversized, asymmetric background blocks to anchor different content types (e.g., Mint for "Galleries," Blush for "Biography").

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine vellum paper.
- **Nesting:** Place a `surface-container-highest (#e4e2e2)` card inside a `surface-container-low` section to create a soft, natural depth.
- **The Glass & Gradient Rule:** For floating navigation or modal overlays, use **Glassmorphism**. Combine `surface` colors at 70% opacity with a `backdrop-filter: blur(20px)`.
- **Signature Textures:** Use subtle linear gradients for primary CTAs, transitioning from `primary (#386857)` to `primary-container (#b5e8d2)` at a 45-degree angle. This adds "soul" and a tactile, ink-like quality.

---

## 3. Typography: Editorial Authority
The typography system relies on the interplay between the architectural **Epilogue** and the functional, clean **Manrope**.

- **Display & Headlines (Epilogue):** These are the "voice" of Studio Georgina. Use `display-lg` (3.5rem) for hero statements. The heavy weight of Epilogue against the pastel blocks creates a "brutalist-light" aesthetic that feels contemporary.
- **Body & Titles (Manrope):** Manrope provides a neutral, sophisticated balance. Maintain generous line-heights (1.6 or higher) in `body-lg` to ensure the text feels as airy as the layout.
- **Labels:** Use `label-md` (0.75rem) in all-caps with increased letter-spacing (0.05rem) for secondary metadata, mimicking the small placards found in physical art galleries.

---

## 4. Elevation & Depth: Tonal Layering
In this system, we reject the heavy drop-shadows of the 2010s. We convey hierarchy through light and layers.

- **The Layering Principle:** Depth is achieved by "stacking" the surface-container tiers.
- *Base:* `surface`
- *Mid-Ground:* `surface-container-low`
- *High-Ground/Interactive:* `surface-container-highest` or `surface-container-lowest` (pure white).
- **Ambient Shadows:** If a floating effect is required (e.g., a floating Action Button), use a shadow with a 32px blur, 4% opacity, and a color hex of `#323233` (the `on-surface` token) to mimic natural ambient light.
- **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline-variant (#b3b2b1)` at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components
All components should feel like custom-designed objects rather than library defaults.

- **Buttons:**
- **Primary:** No border. Background: `primary (#386857)`. Text: `on-primary (#e5fff2)`. Use `rounded-md (0.375rem)` to keep it feeling architectural, not "bubbly."
- **Secondary:** Use `secondary-container (#ffdad7)` for the background. This provides a soft, "blush" feel that is inviting but distinct.
- **Cards:** Forbid the use of divider lines. Separate the header, body, and footer using the Spacing Scale (e.g., `8 (2.75rem)` gap) or by placing the footer on a slightly different `surface-container` tier.
- **Input Fields:** Use a "bottom-fill" approach. Instead of a full box, use a `surface-container-high` background with a slightly darker `outline-variant` bottom edge. Focus states should transition the background to `primary-container`.
- **Chips:** For art categories, use `full` roundedness and `tertiary-container` backgrounds.
- **Art Frames (Custom Component):** When displaying artwork, use an intentional "off-center" padding within a `surface-container-lowest` block to simulate a physical mat and frame.

---

## 6. Do’s and Don’ts

### Do:
- **Embrace Asymmetry:** If you have three images, make one larger and offset it vertically from the others.
- **Use the Spacing Scale Religiously:** Use large values like `16 (5.5rem)` and `20 (7rem)` between sections to create that premium, editorial breathing room.
- **Tone-on-Tone:** Use `on-primary-container` text on `primary-container` backgrounds for a sophisticated, low-contrast look.

### Don’t:
- **Don’t use 1px Dividers:** They cut the "canvas" and make the design look like a standard corporate dashboard.
- **Don’t Center Everything:** Modern minimalist art is about balance, not symmetry. Avoid the "center-aligned hero" cliché where possible.
- **Don’t use Pure Black Shadows:** Always use a tint of the `on-surface` color to ensure the shadow feels integrated into the environment.
- **Don’t Overcrowd:** If a section feels "full," it is already too crowded. Increase the spacing to the next tier in the scale.

---

*Director's Note: Every element must earn its place on the screen. If a design choice feels "standard," question it. We are not building a website; we are curating an experience for Studio Georgina.*```
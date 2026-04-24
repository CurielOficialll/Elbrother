---
name: Elbrother POS
colors:
  surface: '#111316'
  surface-dim: '#111316'
  surface-bright: '#37393d'
  surface-container-lowest: '#0c0e11'
  surface-container-low: '#1a1c1f'
  surface-container: '#1e2023'
  surface-container-high: '#282a2d'
  surface-container-highest: '#333538'
  on-surface: '#e2e2e6'
  on-surface-variant: '#bac9cd'
  inverse-surface: '#e2e2e6'
  inverse-on-surface: '#2f3034'
  outline: '#859397'
  outline-variant: '#3b494c'
  surface-tint: '#00daf8'
  primary: '#baf2ff'
  on-primary: '#00363f'
  primary-container: '#00e0ff'
  on-primary-container: '#005f6d'
  inverse-primary: '#006877'
  secondary: '#c5ffca'
  on-secondary: '#003916'
  secondary-container: '#05f476'
  on-secondary-container: '#006a2f'
  tertiary: '#ffe2da'
  on-tertiary: '#5c1900'
  tertiary-container: '#ffbda7'
  on-tertiary-container: '#9d3100'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#a5eeff'
  primary-fixed-dim: '#00daf8'
  on-primary-fixed: '#001f25'
  on-primary-fixed-variant: '#004e5a'
  secondary-fixed: '#65ff90'
  secondary-fixed-dim: '#00e46d'
  on-secondary-fixed: '#00210a'
  on-secondary-fixed-variant: '#005323'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59c'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#832700'
  background: '#111316'
  on-background: '#e2e2e6'
  surface-variant: '#333538'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  body-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.5'
  price-display:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
  price-sm:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  touch-target-min: 48px
  gutter: 16px
  margin-edge: 24px
  card-padding: 20px
---

## Brand & Style

The design system for Elbrother captures the high-energy, vibrant spirit of a Latin American bodega while maintaining the structural integrity of a professional financial tool. The brand personality is "Electric Efficiency"—blending the neighborhood warmth and neon-lit aesthetic of local commerce with a mission-critical reliability.

The chosen style is a hybrid of **High-Contrast / Bold** and **Corporate Modern**. It utilizes a dark mode primary environment to ensure that the vivid accent colors pop, mimicking the glow of a storefront neon sign at night. Elements are oversized for physical interaction in high-velocity retail environments, ensuring that "professional" never means "boring." The aesthetic is clean and organized, but with the rhythmic intensity characteristic of Latin culture.

## Colors

The palette is optimized for visibility under various lighting conditions, common in bodega environments. 

- **Neon Blue (Primary):** Used for primary actions, active states, and navigation highlights. It provides the "electric" core of the interface.
- **Electric Green (Success):** Reserved for "Complete Sale," "Paid," and positive inventory fluctuations.
- **Vivid Orange (Alerts):** Used for "Delete," "Void," "Low Stock," and urgent notifications.
- **Charcoal Gray (Backgrounds):** The canvas is a deep, slightly cool charcoal to reduce eye strain during long shifts and provide maximum contrast for the neon accents.

High-contrast white (#FFFFFF) is used exclusively for critical text, while a muted silver-gray (#94A3B8) is used for secondary metadata.

## Typography

This design system uses a dual-font strategy to balance legibility with a technical, "business-tool" edge.

- **Inter** handles all UI labels, body text, and headings. Its high x-height and clean apertures ensure readability at an arm's length from the POS terminal. Headings are set to Extra Bold to establish a clear hierarchy.
- **Space Grotesk** is used exclusively for numeric data, prices, and quantities. This monospaced-leaning geometric sans provides a distinct visual "bracket" around financial figures, making them instantly identifiable amidst textural content.

All price displays should use the `price-display` or `price-sm` styles to ensure columns of numbers align vertically for quick scanning.

## Layout & Spacing

The layout utilizes a **fluid grid** optimized for tablet and touch-terminal aspect ratios (typically 4:3 or 16:10). The spacing rhythm is based on an 8px base unit.

A 12-column grid is standard, but the primary POS screen is split into two functional zones:
1.  **The Transaction Zone (6-8 columns):** A flexible area for the product grid or list.
2.  **The Checkout Zone (4-6 columns):** A fixed sidebar for the receipt tape and total actions.

Touch targets never drop below 48px in height. For the product grid, a generous 16px gutter ensures that accidental taps are minimized during fast-paced service.

## Elevation & Depth

To maintain the "Modern Business" feel, the system avoids traditional shadows in favor of **Tonal Layers** and **Low-Contrast Outlines**.

Depth is communicated through color stepping:
- **Level 0 (Background):** Charcoal Gray (#121417).
- **Level 1 (Cards/Containers):** Charcoal Surface (#1A1C1E).
- **Level 2 (Active Elements/Modals):** Lighter Gray (#26292E) with a 1px solid border in the Primary Neon Blue (at 20% opacity).

Interactive elements like buttons use a subtle "Inner Glow" (a 1px semi-transparent top border) to appear slightly tactile without becoming skeuomorphic. When a modal is active, a heavy 60% black backdrop blur is applied to focus the operator's attention.

## Shapes

The shape language is **Soft (Level 1)**. This uses a 0.25rem (4px) base radius. This tighter rounding maintains the "professional tool" aesthetic, feeling more precise and engineered than highly rounded consumer apps.

- **Standard Buttons/Inputs:** 4px radius.
- **Product Cards:** 8px radius (Large).
- **Notification Toasts:** 8px radius (Large).

The sharp-yet-slightly-softened edges reflect the clean lines mentioned in the brief, echoing the industrial feel of modern hardware.

## Components

**Buttons:**
Primary action buttons (e.g., "Pay") use a solid Neon Blue fill with black text for maximum contrast. Secondary buttons use a "Ghost" style with a 2px Neon Blue border. All buttons include a subtle "press" micro-interaction where the element scales to 98% on tap.

**Product Chips/Cards:**
Large, square-ish cards for the product grid. They feature a top-aligned label and a bottom-aligned `price-sm` value. In-stock items have a 2px subtle charcoal border; out-of-stock items are desaturated to 40% opacity.

**Lists (Receipt Tape):**
The "Receipt" component uses a monospaced layout. Each row has a minimum height of 64px to allow for easy "swipe-to-delete" gestures.

**Inputs:**
Large text fields with a 2px bottom-border only in the inactive state, shifting to a full Neon Blue outline when focused. The cursor and label remain Neon Blue.

**Keypad:**
An oversized numeric keypad for custom price entry. Each key is a "Surface Level 2" container with centered `headline-lg` typography.

**Status Indicators:**
Small, high-saturation circular dots (Electric Green or Vivid Orange) placed next to inventory counts or system connection status.
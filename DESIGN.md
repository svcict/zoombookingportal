---
name: Zoom Booking Portal
description: Ayala Foundation staff self-serve Zoom meetings on two shared accounts.
colors:
  signal-blue: "#0433FF"
  signal-blue-hover: "#0320AF"
  signal-blue-pressed: "#021B7A"
  blue-wash: "#EFF6FF"
  blue-tint: "#DBEAFE"
  ink: "#101828"
  body-ink: "#2D2E33"
  slate-text: "#6A7282"
  muted-text: "#99A1AF"
  placeholder-text: "#5F6775"
  hairline: "#E5E7EB"
  field-border: "#D1D5DC"
  canvas: "#F7F9FA"
  canvas-auth: "#F0F2F5"
  surface: "#FFFFFF"
  surface-muted: "#F9FAFB"
  field-fill-legacy: "#F0F2F4"
  intake-header: "#2D2E33"
  success: "#008236"
  success-wash: "#F0FDF4"
  danger: "#E7000B"
  danger-strong: "#C10007"
  danger-wash: "#FEF2F2"
  warning: "#BB4D00"
  warning-wash: "#FFFBEB"
  host-key-orange: "#FF7B00"
typography:
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: "32px"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: "24px"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  body-small:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: "16px"
    letterSpacing: "0.05em"
  badge:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: "16px"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.surface}"
    typography: "{typography.body-small}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.signal-blue-hover}"
  button-primary-pressed:
    backgroundColor: "{colors.signal-blue-pressed}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "10px 14px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "20px"
  badge-confirmed:
    backgroundColor: "{colors.success-wash}"
    textColor: "{colors.success}"
    typography: "{typography.badge}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-cancelled:
    backgroundColor: "{colors.danger-wash}"
    textColor: "{colors.danger-strong}"
    typography: "{typography.badge}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  nav-tab-active:
    backgroundColor: "{colors.blue-wash}"
    textColor: "{colors.signal-blue}"
    typography: "{typography.body-small}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
---

# Design System: Zoom Booking Portal

## Overview

**Creative North Star: "The Front Desk"**

The portal is the Ayala Foundation's reception desk for Zoom. A staff member walks up, says what they need, and leaves a minute later with a join link, an Outlook invite and, if they need it, the Host Key. The interface acts like a good receptionist: calm, quick, never showy, always clear about what happens next. Most of the screen is quiet cool white and grey. One electric blue says "this is where you act", and it also appears as a soft accent so the desk feels like the Foundation's own, not a generic form.

Density is that of a working tool: compact type (mostly 11–14px), tight but breathable spacing, and information grouped into rounded white cards on a pale canvas. Status is never left to guesswork. Confirmed, cancelled, completed, live, available and busy each have a fixed color and wording. Flourishes are rare and earned: confetti once when a booking succeeds, a pulsing LIVE badge, a gentle zoom-in on dialogs.

**Key Characteristics:**
- One brand blue for actions, selection and accents, on a cool near-white canvas.
- Inter throughout. Hierarchy comes from weight (bold and extrabold) more than size.
- White cards with thin hairline borders and the faintest shadow. Depth is a hint, not a feature.
- Generous rounding (12–16px), with fully round pills for status and chips.
- Uppercase, letter-spaced micro-labels above fields and sections.
- Green, red and amber reserved for meaning (success, failure or destructive, caution). Never decoration.

## Colors

A single saturated blue does the brand work against cool, slightly blue-tinged greys. The semantic colors appear only when a state needs them.

### Primary
- **Signal Blue** (`signal-blue`): primary buttons, the selected date and time in the picker, the active nav tab's text, links, focus rings, the selected-row text color, and accent icons in card headers. Hover darkens to **Deep Signal Blue** (`signal-blue-hover`); press darkens further to **Midnight Signal** (`signal-blue-pressed`).
- **Blue Wash** (`blue-wash`) and **Blue Tint** (`blue-tint`): tinted icon tiles, the active nav tab background, invitee chips, in-range days in the calendar, and text selection.

### Neutral
- **Ink** (`ink`): headings, meeting titles and primary values.
- **Body Ink** (`body-ink`): the page's default text color. It is also used as a solid surface for the dark header band of the intake form (`intake-header`).
- **Slate Text** (`slate-text`): secondary text, helper copy, labels and metadata. This is the most used text color in the app.
- **Muted Text** (`muted-text`): disabled and past (greyed-out) times and days only. It is too light for anything people need to read.
- **Placeholder Text** (`placeholder-text`): input placeholders, set globally in `src/index.css` to stay at least 4.5:1 on every field background (white, `canvas`, `field-fill-legacy`).
- **Hairline** (`hairline`): card borders and dividers. **Field Border** (`field-border`): input and secondary-button borders.
- **Canvas** (`canvas`): page background of the staff app and admin portal. **Canvas Auth** (`canvas-auth`): the sign-in and session screens.
- **Surface** (`surface`): cards, dialogs and inputs. **Surface Muted** (`surface-muted`): inset panels inside cards, such as expanded meeting details and dialog summaries.

### Semantic
- **Success** (`success`, on `success-wash`): Confirmed status, "This time is available", sync active.
- **Danger** (`danger` / `danger-strong`, on `danger-wash`): Cancelled status, blocked or past times, errors, and the destructive "Cancel meeting" button.
- **Warning** (`warning`, on `warning-wash`): caution notices and the "slot unavailable" dialog.
- **Host Key Orange** (`host-key-orange`): only the Host Key notice in the intake form, which marks that a privileged code is being handed out.

### Named Rules
**The Meaning-Only Rule.** Green, red and amber always mean something: success, failure or destructive, caution. Never use them to decorate or to tell categories apart.

**The One Blue Rule.** There is exactly one brand blue and its two darker states. Don't introduce other blues (such as Zoom's own `#0B5CFF` or Microsoft's `#0078D4`) except inside a third-party logo.

## Typography

**Body Font:** Inter (self-hosted via @fontsource, weights 400–800), falling back to `ui-sans-serif, system-ui, sans-serif`.

**Character:** One neutral, highly legible sans-serif for everything, including what would elsewhere be "mono" (meeting IDs and times use Inter too). Personality comes from weight: bold for anything you scan for, extrabold for page titles and big numbers.

### Hierarchy
- **Headline** (800, 24px, tight tracking): page and dialog headings like "Welcome, …", and big numbers such as the calendar date.
- **Title** (700, 16px): card and section titles, meeting titles, dialog titles.
- **Body** (400–600, 14px): form values, dialog copy, main readable text.
- **Body Small** (500–700, 12px): the workhorse size. Meeting metadata, button labels, list rows, helper text.
- **Label** (700, 11px, uppercase, 0.05em tracking): micro-labels above fields and sections ("DATE & TIME RANGE", "BOOKED BY", "ZOOM PASSCODE").
- **Badge** (700, 11px): status pills (Confirmed, Cancelled, Completed, LIVE).

### Named Rules
**The Weight-Not-Size Rule.** Build hierarchy with weight and color before reaching for a bigger size. Most of the UI lives between 11px and 16px. Above 24px is reserved for rare numeric emphasis.

**The Label Rule.** Field and section labels are 11px, bold, uppercase, letter-spaced, in Slate Text. Values under them are sentence case in Ink.

## Layout

- **Staff app:** a sticky white top header (logo, Dashboard and Schedule tabs, timezone clock, notifications, profile) over the pale canvas. Content sits in a centred container with 24px gaps.
- **Dashboard:** on wide screens (xl), a 5-column grid. The calendar spans 3 columns. My Meetings spans 2 and stays pinned (sticky) as you scroll.
- **Booking flow:** a single column of cards (meeting topic, date and time range, intake form, confirmation), each a self-contained step.
- **Admin portal:** same header pattern, with its own tabs (Admins, Zoom API, M365, Security Logs).
- **Rhythm:**
  - card padding 20–24px
  - inner groups 12–16px apart
  - field label to field 8px
  - chip and pill gaps 6–8px
- **Responsive:** grids collapse to one column below xl. The time picker stacks its calendar above the hour, minute and AM/PM columns below the sm breakpoint. Pages never scroll horizontally (`overflow-x: hidden` on the root). The layout must hold on phones, since staff often book from one.

### Named Rules
**The Card-Per-Job Rule.** Each distinct job (pick a time, add invitees, review settings) gets its own card. Don't merge unrelated controls into one card, and don't nest cards more than one level deep. Use Surface Muted for an inset panel instead.

## Elevation & Depth

Mostly flat, with depth only as a hint. Cards sit on the canvas with a hairline border and the faintest shadow. Floating layers (popovers, the time-picker panel, dropdowns) get a medium shadow. Only modal dialogs get a deep shadow, over a dimmed and lightly blurred backdrop (black at 50% with a small backdrop blur). Modals render on `document.body` so sticky page elements can never paint over the backdrop.

### Shadow Vocabulary
- **Resting card** (`0 1px 2px 0 rgb(0 0 0 / 0.05)`): every card and resting button.
- **Hairline lift** (`0 1px rgb(0 0 0 / 0.05)`): inputs and small controls.
- **Floating panel** (`0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): popovers, the open date-time picker, the directory-search dropdown.
- **Modal** (`0 25px 50px -12px rgb(0 0 0 / 0.25)`): dialogs only.

### Named Rules
**The Border-First Rule.** Separate surfaces with a 1px hairline before adding shadow. A shadow heavier than "resting card" means the element floats above the page, so it must actually be a popover or modal.

## Shapes

The form language is soft and friendly but not bubbly:
- **12px:** buttons, inputs, inset panels, icon tiles.
- **16px:** cards and dialogs.
- **6–8px:** small inner elements such as nav tabs, time-column options and close buttons.
- **Fully round:** status pills, invitee chips, avatars and the selected calendar day.

Borders are always 1px (2px only for the active date-time trigger), in Hairline or Field Border.

## Components

### Buttons
Confident and compact: bold 12–14px labels, 12px corners, never all-caps (except the picker's small text-only CANCEL / NEXT / BACK / APPLY actions).
- **Shape:** 12px corners (`rounded.lg`). 10px × 16px padding, or 14px tall for full-width primary actions.
- **Primary:** Signal Blue with white bold text and a resting-card shadow. Hover goes to Deep Signal Blue, press to Midnight Signal. Disabled is grey (`#D1D5DC`) with not-allowed cursor.
- **Secondary:** white with a Field Border outline and Ink text. Hover fills `#F3F4F6`.
- **Danger:** solid red (`danger`), hover `danger-strong`, for confirming destructive actions inside a dialog. Use a red text-only link (with a trash icon) to *start* a destructive action.
- **Icon button:** 32px square, 8px corners, grey icon, grey hover fill.
- **Focus:** a 2px Signal Blue ring at 40% (`focus-visible`), never the browser's default black outline.

### Status badges
- **Style:** a fully round pill, 11px bold, with a tinted background, a matching 1px border and a 12px leading icon.
- **States:** Confirmed (success), Cancelled (danger), Completed (grey `#F3F4F6` / slate), LIVE (solid red with white text, pulsing white dot).

### Cards / Containers
- **Corner style:** 16px.
- **Background:** Surface. Inset sub-panels use Surface Muted with a Hairline border and 12px corners.
- **Shadow:** resting card (see Elevation).
- **Border:** 1px Hairline. On hover for clickable meeting cards, the border tints toward Signal Blue at 40%.
- **Internal padding:** 20px (24px on larger cards).

### Inputs / Fields
- **Standard (decided):** white field, 1px Field Border, 12px corners, 14px text, 10px × 14px padding. Placeholder in Placeholder Text (never lighter). Leading 16px icon in Slate Text where helpful (search, invitees, host).
- **Focus:** a 2px Signal Blue ring, with the border shifting to Signal Blue.
- **Error:** red helper text under the field and a red border. Disabled: Surface Muted fill, not-allowed cursor.
- **Legacy:** the booking form's grey-filled, borderless fields (`field-fill-legacy`) predate this decision. Migrate them to the standard when those screens are next touched. Don't create new ones.

### Navigation
- **Header tabs:** 12px medium text with a leading icon, 8px corners. Active is Blue Wash with Signal Blue text. Inactive is Slate Text with a grey hover. The header is white and sticky with a bottom Hairline.
- **Segmented control** (calendar Day / Week / Month): a grey track with the active segment as a white pill and Signal Blue text.

### Dialogs
A white 16px-cornered panel, max width about 448px, 24px padding. It opens with a tinted 44px icon tile (red for destructive, amber for caution) and an × close button. It has a Title, one line of plain explanation, an optional Surface Muted summary panel, and the action row last. The safe choice ("Keep meeting") gets focus first. Escape and backdrop clicks close it unless an action is in flight. Errors show inline inside the dialog, never as a browser `alert()`.

### Date-time range picker (signature component)
A trigger field (white, 2px Signal Blue border) opens a panel with a month calendar beside hour (12, 1 … 11), minute (5-minute steps) and AM/PM columns, in two steps: 1. Start, then 2. End.
- The selected value is a solid Signal Blue chip.
- Past days and times are Muted Text and can't be clicked.
- Column scrollbars are hidden, and the selected value is kept in view.
- Under the columns, a live availability pill (checking, available or blocked) says whether the slot is free. Apply waits until it knows.

## Do's and Don'ts

### Do:
- **Do** use Signal Blue for every primary action and for the selected state. Blue Wash or Blue Tint for accent tiles and highlights is fine.
- **Do** label fields and sections with the 11px bold uppercase letter-spaced label in Slate Text.
- **Do** put each job in its own white 16px card with a Hairline border on the Canvas background.
- **Do** show every booking state with the fixed badge vocabulary (Confirmed, Cancelled, Completed, LIVE) and the fixed availability wording ("This time is available", "This time has already passed").
- **Do** gray out and disable anything in the past instead of letting people pick it and showing an error afterwards.
- **Do** use the standard white bordered input for all new fields.
- **Do** confirm destructive actions in a dialog that names the meeting and says what will happen.

### Don't:
- **Don't** use browser `alert()` or `confirm()`. Use an inline message or a dialog.
- **Don't** introduce a second brand blue, or use green, red or amber decoratively.
- **Don't** add shadows heavier than "resting card" to anything that doesn't float above the page.
- **Don't** create new grey-filled borderless inputs.
- **Don't** use type larger than 24px except for rare numeric emphasis, or lighter than 400.
- **Don't** let sticky page elements paint over a modal. Render modals on `document.body`.

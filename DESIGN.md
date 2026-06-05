MedExplain AI Design System

Version: 1.0

This document is the single source of truth for all frontend design decisions.

Every page, component, screen, modal, form, dashboard, and interaction must follow this design system.

No exceptions.

⸻

Brand Principles

The product should feel:

* Calm
* Trustworthy
* Professional
* Human
* Healthcare-focused
* Modern
* Accessible
* Premium

The application should reduce anxiety.

Users should feel guided and informed.

The interface must never feel overwhelming.

⸻

Color System

Primary

Used for headings, important text, icons.

#2B2724

Secondary

Used for supporting text, descriptions, borders.

#A19890

Accent

Used for:

* Primary buttons
* Active states
* Important actions
* Highlights

#FF6E5C

Background

Used for page backgrounds.

#FDF6F3

Surface

Used for:

* Cards
* Modals
* Dropdowns
* Tables

#FFFFFF

Success

#22C55E

Warning

#F59E0B

Error

#EF4444

⸻

Typography

Heading Font

Spectral

Weights:

* 400
* 500
* 600
* 700

Body Font

Inter

Weights:

* 400
* 500
* 600

⸻

Typography Scale

Display

48px

Used on:

* Landing pages
* Hero sections

H1

36px

H2

30px

H3

24px

H4

20px

Body

16px

Small

14px

Caption

12px

⸻

Spacing System

Never use random spacing.

Only use:

8px
16px
24px
32px
48px
64px

⸻

Border Radius

Small

10px

Medium

18px

Large

28px

Never use sharp corners.

⸻

Shadows

Cards

0 4px 12px rgba(0,0,0,0.05)

Modals

0 10px 30px rgba(0,0,0,0.1)

Dropdowns

0 8px 20px rgba(0,0,0,0.08)

⸻

Buttons

Primary Button

Background:

#FF6E5C

Text:

#FFFFFF

Radius:

18px

Height:

48px

Hover:

Opacity 90%

⸻

Secondary Button

Background:

transparent

Border:

1px solid #A19890

Text:

#2B2724

⸻

Cards

Every card must use:

Background:

#FFFFFF

Radius:

18px

Padding:

24px

Shadow:

Card Shadow

⸻

Inputs

Height

48px

Radius

10px

Border

1px solid #E5E7EB

Focus

#FF6E5C

All forms must have labels.

No placeholder-only forms.

⸻

Header Rules

All pages must use the same header structure.

Header Height

72px

Layout:

Logo | Navigation | User Actions

Navigation alignment must be consistent across all pages.

No page may create its own header variation.

⸻

Footer Rules

All pages must use the same footer.

Sections:

* Company
* Product
* Resources
* Legal

Bottom row:

Copyright
Terms
Privacy

All footers must align consistently.

⸻

Navigation Rules

Desktop:

Left sidebar or top navigation.

Mobile:

Bottom navigation only.

Items:

* Home
* Reports
* Chat
* Doctors
* Profile

Icons must remain consistent across pages.

⸻

Dashboard Rules

Patient Dashboard

Doctor Dashboard

Admin Dashboard

Must share:

* Same card system
* Same spacing
* Same typography
* Same widget layout

Dashboard cards must never have different styles.

⸻

Tables

All tables must use:

Header Background:

#FDF6F3

Row Padding:

16px

Border Radius:

10px

⸻

Modals

All modals must use:

Background:

#FFFFFF

Radius:

18px

Padding:

32px

Close Button:

Top Right

⸻

Empty States

Every page must provide:

* Icon
* Title
* Description
* Call To Action

No blank pages.

⸻

Loading States

Every page must provide:

* Skeleton loaders
* Loading indicators

No blank screens while loading.

⸻

Error States

Every page must provide:

* Clear explanation
* Retry action

Never expose technical errors to users.

⸻

Accessibility

All pages must support:

* Keyboard navigation
* Screen readers
* Focus indicators
* Proper contrast ratios
* Semantic HTML

⸻

Mobile Rules

Mobile First.

Supported widths:

* 320px
* 375px
* 390px
* 414px
* 768px

No horizontal scrolling.

No overflow.

No clipped content.

⸻

Animations

Allowed:

* Fade In
* Fade Out
* Slide Up
* Slide Down

Duration:

200ms
300ms

Do not use excessive animations.

⸻

Forbidden

Do NOT use:

* Neon colors
* Glassmorphism
* Cyberpunk effects
* Random gradients
* Multiple design systems
* Different button styles
* Different card styles
* Different spacing systems
* Different typography scales

⸻

Development Rules

Before creating any page:

1. Check this file.
2. Follow this file.
3. Reuse existing components.
4. Maintain consistency.

Every new page must feel like it belongs to the same application.

If a design decision conflicts with this document, this document wins.
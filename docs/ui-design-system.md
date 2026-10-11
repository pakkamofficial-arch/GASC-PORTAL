# Government College Connect — UI Design System & Component Guidelines

**Institution:** Government Arts & Science College, Kuthalam, Mayiladuthurai District, Tamil Nadu  
**Brand Language:** Academic, Dignified, Restrained, High-Contrast, WCAG AA Accessible  
**Target Platform:** Android (Optimized for standard phones, compact displays, high density screens & tablets)  
**Primary Font:** Inter  
**Tamil Font:** Noto Sans Tamil  

---

## 1. Design Philosophy & Academic Identity

Unlike generic corporate or consumer SaaS apps, collegiate management tools for government institutions require:
1. **Dignity & Trust:** A restrained visual style reflecting Tamil Nadu Directorate of Collegiate Education standards.
2. **Clarity over Flash:** Elimination of gratuitous glassmorphism, floating cards, high-contrast glow borders, and emojis as UI icons.
3. **Information Density with Breathing Room:** Structured tabular rows, clear dividers, explicit status labels, and meaningful visual groupings rather than putting every single item in its own card.
4. **Legibility on Real Hardware:** Tested for low-to-mid range Android devices, bright sunlight readability, and full support for Tamil script conjunct glyphs (*அறிவே ஆற்றல்*).

---

## 2. Color Palette & WCAG Contrast Tokens

```text
┌──────────────────────┬───────────┬──────────────────────────────────────────┐
│ Token                │ Hex Code  │ Purpose / Role                           │
├──────────────────────┼───────────┼──────────────────────────────────────────┤
│ primary              │ #176B3A   │ Primary Tamil Nadu collegiate dark green │
│ primaryDark          │ #0E4624   │ Top institutional header banner & emblem │
│ secondary            │ #2E7D4F   │ Secondary green actions and accents      │
│ background           │ #F1F8F1   │ Light mint screen canvas                 │
│ surface              │ #FFFFFF   │ Clean white card & sheet surface         │
│ text                 │ #202820   │ Deep readable body and title text (AA)   │
│ textSecondary        │ #687268   │ Accessible descriptive metadata (AA)     │
│ border               │ #DCE7DC   │ Crisp, subtle section borders            │
│ divider              │ #E4EDE4   │ List row dividers                        │
│ success              │ #1B8A46   │ Verified, Present, Approved status       │
│ warning              │ #C88308   │ Pending, Partial, Condonation warnings   │
│ error                │ #D32F2F   │ Absent, Rejected, Overdue status         │
│ info                 │ #1976D2   │ Informational indicators                 │
│ tint                 │ #E6F3E6   │ Soft mint container highlight            │
└──────────────────────┴───────────┴──────────────────────────────────────────┘
```

---

## 3. Typography System

Fonts are bundled via `@expo-google-fonts/inter` and `@expo-google-fonts/noto-sans-tamil` to guarantee deterministic offline rendering without runtime latency.

| Scale Token | Font Family | Size | Weight | Line Height | Usage Example |
|---|---|---|---|---|---|
| `title` | `Inter_700Bold` | 28 px | Bold (700) | 34 px | Screen titles (Login, Portal Title) |
| `metric` | `Inter_700Bold` | 26 px | Bold (700) | 30 px | Key numbers (92.4%, ₹1,200, 48) |
| `xxl` | `Inter_600SemiBold` | 24 px | Semibold (600) | 28 px | Primary section headings |
| `xl` | `Inter_600SemiBold` | 20 px | Semibold (600) | 26 px | Modal and group headers |
| `lg` | `Inter_600SemiBold` | 18 px | Semibold (600) | 24 px | Main header titles |
| `md` | `Inter_600SemiBold` | 16 px | Semibold (600) | 22 px | Primary button labels |
| `base` | `Inter_400Regular` | 15 px | Regular (400) | 22 px | Primary body text & form inputs |
| `sm` | `Inter_500Medium` | 13 px | Medium (500) | 18 px | Form input labels & table headers |
| `xs` | `Inter_500Medium` | 12 px | Medium (500) | 16 px | Minimum size for metadata & badges |
| `tamilHeader`| `NotoSansTamil_700Bold` | 12 px | Bold (700) | 16 px | *அறிவே ஆற்றல்*, *தமிழ்நாடு அரசு* |

---

## 4. Component Library Architecture

All shared components reside in `mobile/src/components/`:
* **`Header`**: Official bilingual banner (*GOVERNMENT OF TAMIL NADU* / *தமிழ்நாடு அரசு*), college name, affiliation, back navigation, and right action buttons.
* **`Button`**: Primary, Secondary, Outline, Danger, Ghost variants. Native vector icon support via `Ionicons`. Full loading spinner and disabled state.
* **`Input`**: Standard and secure password input with accessible show/hide toggle (`Ionicons`), field labels, validation error messages, and helper hints.
* **`Card`**: Non-glowing, restrained border card with subtle elevation (`0.05` shadow opacity) designed to group form sections and dashboard summaries.
* **`Badge`**: Status indicator pill with WCAG-compliant high-contrast foreground and soft tinted background (`success`, `warning`, `error`, `info`, `neutral`).
* **`StatCard`**: Clean academic quantitative display featuring prominent numbers, descriptive labels, and thematic icons.
* **`EmptyState`**: Purpose-built state for zero-record lists with academic iconography, helpful explanation, and call-to-action button.
* **`SearchFilterBar`**: Search input with instant clear button and integrated filter triggers.
* **`ListRow`**: Unified row component for tabular lists, student directories, timetable slots, and audit logs.
* **`SectionHeader`**: Clean section title with subtle subtitle and "View All ›" action trigger.

---

## 5. Mobile Ergonomics & Responsive Rules

* **Touch Targets:** Minimum 44×44 px for all touchable icons, buttons, and row items.
* **Keyboard Avoidance:** Scroll views configured with keyboard dismissal and padding to ensure form fields remain visible when the Android soft keyboard is active.
* **Density & Orientation:** Compact flex layouts preventing text clipping on 360px viewport widths up to 10" Android tablets.
* **Predictive Back Navigation:** Standard Android hardware back button and header back arrow support with predictable step-by-step history unwind.

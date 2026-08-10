# Nalanda TNPSC — Navigation System

| | |
|---|---|
| **Document Owner** | UX Design / Frontend Architecture |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | Every file in `docs/`, with `docs/InformationArchitecture.md` as the structural authority (nav trees, breadcrumb examples, route map) and `docs/UI_Design_System.md` §23/§30/§31 as the visual/interaction authority this document builds on |

### Scope Note

`docs/InformationArchitecture.md` already defines **what** exists in each surface's navigation (the trees, the modules, the route map). This document is the **interaction-design layer on top** — how each nav element actually behaves: hover/active states, collapse mechanics, transitions — and it introduces three elements not yet specified anywhere: **Search**, **Quick Actions**, and **Keyboard Shortcuts**. Where a section below only restates structure already covered, it says so briefly and moves directly to what's new.

---

## 1. Website Navigation

**Structure:** unchanged from `docs/InformationArchitecture.md` §3 and `docs/Landing_Page_Design.md` §1–§2.

**Interaction depth added here:** the "Exams" link expands into a lightweight dropdown (not a full mega-menu — eight exam categories fit comfortably in a simple list, and a mega-menu would overstate the complexity of what's being navigated) on hover (desktop) or tap (mobile), listing all eight categories with a one-line description each. The Navbar's transparent-to-solid scroll transition is exactly as specified in `docs/Landing_Page_Design.md` §2 and is not re-derived here.

---

## 2. Dashboard Navigation

**Structure:** unchanged from `docs/InformationArchitecture.md` §4 (top bar + persistent left sidebar).

**Interaction depth added here:**
- **Active-item indicator:** the current section's sidebar icon switches from outline to filled (per `docs/UI_Design_System.md` §23's single filled-icon rule) and its label takes on `primary-600` weight — no background pill or heavy highlight box, keeping the indicator subtle.
- **Sidebar collapse:** a small toggle at the sidebar's base collapses it to an icon-only rail (labels hidden, tooltips shown on hover) — a persistent user preference, not reset on every session, for power users (Divya, using a laptop for serious study) who want more horizontal reading room in Learn/Practice.
- **Exam-goal switcher:** the persistent chip in the top bar (per `docs/InformationArchitecture.md` recommendation #4) opens a small dropdown listing all the user's active exam goals plus a "Manage exam goals" link routing to Settings — switching goals triggers a brief content-refresh transition (`motion-fast` cross-fade) across the main content area, not a full page reload.

---

## 3. Admin Navigation

**Structure:** unchanged from `docs/InformationArchitecture.md` §5 (role-aware sidebar).

**Interaction depth added here:**
- **Role-based visibility is a hard filter, not a disabled/grayed state** — a `content_editor` never sees the Subscriptions & Payments or User Management sections in their sidebar at all, rather than seeing them grayed out and inaccessible. Showing-but-disabling would only invite confusion ("why can't I click this?") with zero benefit, since these roles are fixed and known at login.
- **Nested sub-navigation:** Content Management expands into its own second-level list (Notes, Videos, Question Bank, Mock Tests, Live Exams, Current Affairs) via an inline expand/collapse within the sidebar itself, rather than a separate page — keeping deep admin navigation to at most two clicks from any sidebar state.

---

## 4. Mobile Navigation

**Structure:** unchanged from `docs/InformationArchitecture.md` §6 (5-tab bottom bar + "More").

**Interaction depth added here:** see §5 (Bottom Navigation) and §6 (Side Navigation, tablet variant) below for the detailed mechanics this section's structure relies on.

---

## 5. Bottom Navigation (Mobile)

**Anatomy:** 5 tabs — Home, Learn, Practice, Analytics, More (per `docs/InformationArchitecture.md` §6) — fixed to the bottom of the viewport.

**Tap targets:** each tab occupies an equal-width segment of the bar, with a minimum 44×44px touch target (per `docs/UI_Design_System.md` §28) regardless of how the icon/label visually renders within it.

**Icon states:** outline icon + label for inactive tabs, filled icon + `primary-600` label for the active tab — the single filled/active rule established in `docs/UI_Design_System.md` §23, applied consistently here.

**Badge indicators:** a small dot (not a numeric count, to avoid an anxious "47 unread" feeling) appears on the Home tab's icon when unread notifications exist, and on the More tab when any of its nested sections (Community replies, new Live Exam schedule) have unseen updates — a numeric badge is reserved specifically for the Notifications bell within Home, where an exact count is genuinely useful, not for the tab bar itself.

**Hide-on-scroll:** during long-form content scrolling (Learn's reading view, a long Current Affairs article) the tab bar recedes downward on scroll-down and reappears on scroll-up — maximizing reading space without permanently hiding navigation, using the glassmorphism treatment (`docs/UI_Design_System.md` §20) when it reappears over scrolled content.

**Full-screen suppression:** entirely hidden during an active timed Practice/Live Exam session (per `docs/UI_Design_System.md` §28), reappearing immediately on submission.

---

## 6. Side Navigation (Desktop/Tablet)

**Desktop:** full persistent sidebar with icon + label per item (per `docs/InformationArchitecture.md` §4), collapsible to an icon-only rail (§2 above).

**Tablet:** defaults to the collapsed icon-only rail immediately (rather than starting expanded and requiring the user to manually collapse it), expandable via tap — preserving content width on a tablet's more constrained horizontal space by default, per `docs/UI_Design_System.md` §29.

**Section grouping:** a thin divider line (not a heavy visual break) separates the core content modules (Dashboard, Learn, Practice, Live Exams, Current Affairs, Analytics) from the secondary modules (Community, Bookmarks, Payments, Settings) within the same sidebar — a single visual grouping cue, never more than one divider, keeping the sidebar scannable rather than fragmented into many small sections.

**Hover-expand (collapsed state only):** hovering over a collapsed icon-only rail item shows its label in a small tooltip after a brief delay (~300ms, avoiding tooltip-flicker on quick mouse passes) — desktop-only, since hover has no equivalent on touch devices.

---

## 7. Search

**Trigger:** a search icon in the Dashboard top bar (`docs/InformationArchitecture.md` §4) and the Website Navbar, plus the global keyboard shortcut `Cmd/Ctrl + K` on desktop (§10) — opening the same search experience regardless of entry point.

**Layout:** a centered overlay modal (not a full-page navigation, so context is never lost — closing search returns exactly to where the user was) with a single input field at the top and results grouped by content type beneath it as the user types.

**Live results:** results begin appearing after a short debounce (~200ms) once at least 2 characters are entered — grouped into labeled sections (Topics, Notes, Questions, Current Affairs), each showing at most 3–4 results with a "See all results in [category]" link if more exist, so the overlay never becomes an overwhelming, unscannable wall of matches.

**Empty/no-results state:** a calm message ("No results for '...'") with a suggestion to check spelling or try a broader term, plus — importantly — a fallback offer to **"Ask AI"** with the same query, handing off directly into the AI doubt-resolution chatbot (`docs/UserJourney.md` Screen 8) for a query that didn't match indexed content but might still be answerable conversationally.

**Recent searches:** when the search input is empty (freshly opened, nothing typed yet), the overlay shows the user's last 3–5 searches as quick-tap chips instead of a blank input — useful for a user re-finding something they searched for recently.

**Keyboard navigation within results:** arrow keys move a highlighted selection through the grouped results, `Enter` opens the highlighted result, `Esc` closes the overlay — full keyboard operability, not just a mouse-driven experience, consistent with the accessibility requirements in `docs/UI_Design_System.md` §31.

**Scope:** searches across Topics/Subtopics (`docs/Database.md` §4.2), Study Materials, Questions (title/tag match only, never surfacing `isCorrect` or answer content in a search preview — the same answer-leakage prevention already established in `docs/API.md` §5), and Current Affairs — not across Community posts or Admin content, which are scoped to their own in-module search if needed later.

---

## 8. Breadcrumbs

**Visual style:** a single-line, `body-small`, `text-secondary` trail (`Learn > General Science > Physics > Laws of Motion`), each segment except the last tappable to jump directly back to that level — the current page's segment is rendered in `text-primary` and is not a link (it's already where the user is).

**When shown:** only on pages **3 or more levels deep** (per the rule already established in `docs/InformationArchitecture.md` §4) — Dashboard, Notifications, Bookmarks, and other shallow pages rely on the sidebar's active-state highlight alone (§2) rather than a redundant one-segment breadcrumb that would add clutter without adding wayfinding value.

**Truncation rule:** on narrow viewports (mobile, where breadcrumbs are shown at all — mostly within Learn's reading view), a path longer than 3 segments collapses the middle into an ellipsis chip (`Learn > … > Laws of Motion`), tappable to reveal the collapsed intermediate levels in a small dropdown, rather than wrapping onto a second line or truncating with a hard cut that hides real navigational information.

**Interaction:** tapping any non-current segment navigates directly there — never a confirmation step, since breadcrumb navigation is inherently low-risk (moving up a content hierarchy, not a destructive action).

---

## 9. Quick Actions

Two distinct implementations, matched to each platform's conventions:

### Desktop — Command Palette
- **Trigger:** `Cmd/Ctrl + K` (the same shortcut that also opens Search, §7 — Quick Actions and Search share one entry point and one overlay, distinguished by what the user types: a plain query returns content results, while typing an action-like phrase, e.g., "start mock," surfaces matching commands above the content results).
- **Available actions (representative):** "Start a Mock Test," "Go to Bookmarks," "Ask AI a question," "View today's Study Plan," "Switch exam goal," "Open Settings" — a curated, small set of high-frequency actions, not an exhaustive menu of every possible app action, keeping it fast to scan.
- **Rationale:** a deliberate Linear-influenced choice (`docs/UI_Design_System.md`'s design thesis) for the desktop-using power segment — a full-time aspirant like Divya, navigating the product for hours daily, benefits disproportionately from never needing to reach for the mouse.

### Mobile — Quick Actions Sheet
- **Trigger:** a long-press on the Home tab icon (matching standard iOS/Android app-shortcut conventions) or a small floating "+"-style button available specifically on the Dashboard's home screen.
- **Available actions:** a shorter, touch-optimized subset of the desktop list — "Start a Mock Test," "Ask AI," "View today's tasks" — surfaced as a bottom sheet (per `docs/UI_Design_System.md` §28's bottom-sheet convention for mobile contextual actions), not a command-palette-style text interface, which doesn't translate naturally to touch.

---

## 10. Keyboard Shortcuts

Desktop-only (no equivalent required on mobile, where touch gestures are primary):

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + K` | Open Search / Quick Actions (§7, §9) |
| `Esc` | Close any open modal, dialog, or overlay |
| `←` / `→` | Navigate between questions in the Practice question palette (`docs/Smart_Practice.md`) |
| `Enter` | Confirm the highlighted choice in Search/Quick Actions, or submit the current form field |
| `B` (while viewing a question or note) | Toggle bookmark on the current item |
| `?` | Open a keyboard-shortcuts reference overlay (a simple cheat-sheet modal, for discoverability — shortcuts that can't be discovered don't get used) |

**Principle:** every shortcut listed here maps to an action also reachable by mouse/tap — keyboard shortcuts are an **acceleration layer for power users**, never the only way to perform an action, preserving full accessibility for users who don't or can't use them.

---

## 11. Responsive Behaviour (Consolidated)

| Nav Element | Desktop | Tablet | Mobile |
|---|---|---|---|
| Primary navigation | Full persistent sidebar + top bar | Collapsed icon-only rail by default, expandable | Bottom tab bar (5 items + More) |
| Website Navbar | Full link row | Secondary links collapse to overflow menu | Hamburger → full-screen nav sheet |
| Breadcrumbs | Full trail | Full trail | Truncated with collapsible ellipsis |
| Search / Quick Actions | `Cmd/Ctrl+K` overlay | Tap search icon → same overlay | Tap search icon → same overlay, full-screen on mobile rather than a centered modal |
| Keyboard Shortcuts | Fully available | Available if an external keyboard is connected | Not applicable |
| Admin nested sub-nav | Inline sidebar expand/collapse | Same, within the collapsed rail's expanded state | Admin Panel is not optimized for mobile use (per `docs/InformationArchitecture.md`, an internal tool primarily used on desktop) |

---

## Recommendations

1. **Keep Search and Quick Actions sharing one entry point and one overlay** (§7, §9) rather than building them as two separate features with two separate triggers — splitting them would double the interface surface a user has to learn for two closely related "get me somewhere fast" needs.
2. **Never let a keyboard shortcut become the only path to an action.** The principle stated in §10 should be treated as a hard constraint during implementation review, not a soft guideline — it's what keeps the shortcut system purely additive rather than accessibility-regressive.
3. **Extend the Search index to Community threads only after the Community module itself has enough real content to make that search meaningful** — indexing an near-empty module at launch would return search results that undersell the product; this is a sequencing note, not a scope exclusion.
4. **Reuse the exact breadcrumb truncation pattern (§8) anywhere else a deep hierarchy might appear in the future** (e.g., a future Admin content-tree view) rather than inventing a second truncation convention.

---

*End of Document.*

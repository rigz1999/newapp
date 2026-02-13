# UI/UX Review: Finixar

**Date:** 2026-02-13
**Reviewer:** Claude (automated code review)
**Scope:** Full codebase review -- 106+ components, design system, layouts, routing, landing page, dashboard, forms, modals, and common components.

---

## Overall Assessment

Solid foundation with clear domain-driven architecture, but real structural and consistency issues that will compound as the product matures.

---

## What Works Well

### 1. Information Architecture
The navigation structure is logical and well-organized. Seven primary sections (Dashboard, Coupons, Projets, Investisseurs, Souscriptions, Paiements, Journal d'audit) map directly to the user's mental model of investment management workflows. Role-based routing (emetteur vs admin vs member) correctly limits scope. The sidebar collapse/expand with localStorage persistence and responsive auto-collapse at <1400px is a practical touch.

### 2. Loading States
The skeleton loading system (Skeleton.tsx) is well-designed with DashboardSkeleton, CardSkeleton, StatCardSkeleton, and TableSkeleton variants that match the actual content layout. The Dashboard avoids a skeleton flash on return visits by checking localStorage cache first. This is a detail many apps miss.

### 3. Global Search (Cmd+K)
The GlobalSearch component is well-executed: parallel searches across 6 entity types, grouped results with type-specific icons, text highlighting, filter tabs, recent search history, and mobile-responsive layout.

### 4. Accessibility Foundations
Focus-visible ring styles, SkipToContent component, VisuallyHidden, useFocusTrap hook, aria-labels on navigation items and form inputs, and motion-reduce:transition-none on sidebar animations. More than most apps at this stage attempt.

### 5. Landing Page
Professional and conversion-oriented. The "Excel vs Finixar" comparison section is effective for the target audience. SEO meta tags and structured data are handled programmatically. The zig-zag feature layout with real screenshots is a standard but effective pattern.

---

## Issues and Concerns

### 1. Dead/Duplicate Code: Two Sidebar Components
- **Layout.tsx** is the active sidebar (collapsible, tooltips, search, role-based nav, real-time profile)
- **Sidebar.tsx** is an older, unused component with a different API and different color references (finixar-navy, finixar-purple, finixar-teal)

**Recommendation:** Delete Sidebar.tsx.

### 2. Inconsistent Color System
The Tailwind config has a well-structured semantic color system but it isn't used consistently:
- Pagination.tsx and GlobalSearch.tsx use `bg-finixar-teal` (a backwards-compat alias) instead of `bg-finixar-brand-blue`
- The landing page hardcodes `#2E62FF` instead of using design tokens, creating a different blue than the app (`#1f5eea`)
- DashboardStats.tsx mixes semantic tokens with raw Tailwind colors

The backwards-compatibility aliases in tailwind.config.js are a maintenance trap.

**Recommendation:** Remove all backwards-compat aliases and migrate to semantic tokens.

### 3. Monolithic Components
- **Dashboard.tsx** is 941 lines with 12 state variables, 12 parallel Supabase queries, data aggregation, and 5 modal states. The fetchData function alone is 428 lines.
- **Projects.tsx** is 1603 lines. The create-project modal is ~880 lines of inline JSX.

**Recommendation:** Extract data fetching into custom hooks, extract modals into separate components.

### 4. Modal Pattern Issues
No shared modal system. Each component implements its own escape key handling, backdrop click handling, and scroll locking independently.

**Recommendation:** Create a shared Modal wrapper component.

### 5. Form UX Problems
- Currency input field has a 110-line custom handler for cursor management -- brittle and likely breaks with assistive tech
- No form-level validation summary when fields are missing
- Uses `autoComplete="nope"` (non-standard, browsers treat as "on")

**Recommendation:** Simplify currency input, add form-level error summary, fix autoComplete values.

### 6. Login Page: Minimal
- Uses a generic LogIn icon instead of the Finixar logo
- No OAuth/SSO buttons despite supporting Microsoft and Google OAuth
- `autoComplete="off"` on password field harms password manager UX

### 7. Mobile Responsiveness Gaps
- No mobile drawer/overlay for the sidebar. At phone widths, the 80px collapsed sidebar still takes significant space.
- No hamburger menu in the app shell (the landing page has one, the app doesn't).

**Recommendation:** Add a slide-out drawer with overlay for mobile viewports.

### 8. Missing Breadcrumbs
Breadcrumbs.tsx exists but isn't rendered in Layout.tsx. For deeply nested routes like `/echeance/:projectId/:trancheId/:date`, users lose spatial context.

**Recommendation:** Integrate Breadcrumbs into the Layout component.

### 9. Dark Mode: Declared but Non-Functional
ThemeContext.tsx exists with light/dark/system preference tracking. However, all components use hardcoded light-mode classes (bg-white, text-slate-900). No `dark:` variants exist.

**Recommendation:** Either implement dark mode or remove the toggle to avoid misleading users.

### 10. Toast System Duplication
- `components/common/Toast.tsx` -- custom hook-based toast (appears unused)
- `utils/toast.tsx` -- the actually used toast system

**Recommendation:** Delete the unused Toast.tsx component.

### 11. Delete Button Prominence
Project cards show a red delete button at the same visual level as "View details." Destructive actions should be in a secondary menu.

**Recommendation:** Move delete to an ellipsis/context menu.

---

## Summary Table

| Area | Rating | Notes |
|---|---|---|
| Information Architecture | Strong | Clear domain-driven navigation |
| Visual Design | Adequate | Clean and professional, but generic |
| Design System Consistency | Weak | Color aliases hide drift; semantic tokens underused |
| Component Architecture | Weak | Monolithic components; no shared modal system |
| Forms & Input Handling | Mixed | Accessible labels but brittle custom inputs |
| Loading & Error States | Strong | Good skeleton system, error boundaries |
| Mobile Experience | Weak | No mobile navigation drawer |
| Accessibility | Good Foundation | ARIA labels, focus management, but dark mode non-functional |
| Landing Page | Strong | Professional, conversion-focused |
| Code Hygiene | Needs Attention | Dead code (Sidebar, Toast), duplicate systems |

---

## Priority Actions

1. **Extract monolithic components** -- Split Dashboard.tsx and Projects.tsx into data hooks + presentation
2. **Unify color system** -- Remove backwards-compat aliases, migrate to semantic tokens
3. **Add mobile navigation** -- Slide-out drawer for <768px viewports
4. **Resolve dark mode** -- Implement or remove
5. **Delete dead code** -- Sidebar.tsx, common/Toast.tsx

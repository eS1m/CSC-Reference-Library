# Modal Refactor Plan

## Goal
Unify all 17 modals in the system under a single architecture:
- **Generic `Modal.jsx`** for simple modals (info/warning/danger/success variants)
- **Dedicated modal files** in `src/components/modals/` for complex modals
- Preserve all existing behavior; only improve styling to match the unified design

---

## Phase 1: Create Generic Modal Component

### New File: `src/components/Modal.jsx`
Props:
- `isOpen` (boolean)
- `onClose` (function)
- `title` (string)
- `variant` — `'info' | 'warning' | 'danger' | 'success'`
- `icon` (optional override)
- `children` (body content)
- `actions` (React node for footer buttons)
- `size` — `'sm' | 'md' | 'lg'` (default: md)

Features:
- Auto-assigns icon and accent color based on variant
- Backdrop click to close
- Close (×) button in header
- Slide-up + fade-in animations
- Responsive

### New File: `src/css/shared/modal.css`
Base styles extracted from current modal CSS files:
- `.modal-overlay`
- `.modal-content`
- `.modal-header`
- `.modal-close`
- `.modal-body`
- `.modal-actions`
- Variant classes: `.modal-info`, `.modal-warning`, `.modal-danger`, `.modal-success`

---

## Phase 2: Refactor Simple Modals (use generic Modal)

Each becomes a thin wrapper or inline usage of `<Modal />`.

| # | Modal | Current Location | New Location | Variant |
|---|-------|-----------------|--------------|---------|
| 1 | LockModal | `src/components/LockModal.jsx` | Refactor to use `Modal` shell | info |
| 2 | No Role | `src/components/ProtectedRoute.jsx` | `src/components/modals/NoRoleModal.jsx` | warning |
| 3 | Pending Approval | `src/pages/login.jsx` | `src/components/modals/PendingApprovalModal.jsx` | warning |
| 4 | First-Time Google | `src/pages/login.jsx` | `src/components/modals/FirstTimeGoogleModal.jsx` | info |
| 5 | Registration Success | `src/pages/register.jsx` | `src/components/modals/RegistrationSuccessModal.jsx` | success |
| 6 | Upload Warning | `src/pages/lgu/upload-u.jsx` | `src/components/modals/UploadWarningModal.jsx` | warning |
| 7 | Action Plan Success | `src/pages/lgu/action-plan-u.jsx` | `src/components/modals/ActionPlanSuccessModal.jsx` | success |
| 8 | Validation Error | `src/pages/lgu/action-plan-u.jsx` | `src/components/modals/ValidationErrorModal.jsx` | warning |
| 9 | Reset Progress | `src/pages/admin/dashboard-a.jsx` | `src/components/modals/ResetProgressModal.jsx` | danger |
| 10 | Drive Delete | `src/pages/admin/drive-browser-a.jsx` | `src/components/modals/DriveDeleteModal.jsx` | danger |
| 11 | Delete Recommendation | `src/pages/prime/recommendations-p.jsx` | `src/components/modals/DeleteRecommendationModal.jsx` | danger |

---

## Phase 3: Extract Complex Modals (dedicated files)

These have custom layouts (forms, iframes, dynamic states) and warrant their own files.

| # | Modal | Current Location | New Location |
|---|-------|-----------------|--------------|
| 12 | Deletion Action (Approve/Reject) | `src/components/DeletionRequestsPage.jsx` | `src/components/modals/DeletionActionModal.jsx` |
| 13 | Request Deletion (with textarea) | `src/pages/lgu/view-u.jsx` | `src/components/modals/RequestDeletionModal.jsx` |
| 14 | Document Preview (iframe) | `src/pages/lgu/action-plan-u.jsx` | `src/components/modals/DocumentPreviewModal.jsx` |
| 15 | Review Submission | `src/pages/prime/review-p.jsx` | `src/components/modals/ReviewSubmissionModal.jsx` |

---

## Phase 4: CSS Consolidation

### Files to create:
- `src/css/shared/modal.css` — base modal + variant styles

### Files to clean up / remove redundant rules from:
- `src/css/lock-modal.css` → keep only LockModal-specific tweaks
- `src/css/lgu/uupload.css` → remove modal rules
- `src/css/lgu/uview.css` → remove modal rules
- `src/css/lgu/action-plan-u.css` → remove modal rules
- `src/css/prime/review-p.css` → remove modal rules
- `src/css/prime/recommendations-p.css` → remove modal rules
- `src/css/admin/drive-browser-a.css` → remove modal rules
- `src/css/shared/deletion-requests.css` → remove modal rules

---

## Files Modified (estimated)
- **New:** ~17 JSX files in `src/components/modals/`
- **New:** `src/components/Modal.jsx`
- **New:** `src/css/shared/modal.css`
- **Modified:** 12 pages/components that currently inline modals
- **Modified:** 8 CSS files (cleanup)

## Rollback Strategy
If issues arise, each phase is independent. Phase 1 can be reverted by restoring the original `LockModal.jsx` and removing `Modal.jsx`. Phases 2-4 can be reverted page-by-page.

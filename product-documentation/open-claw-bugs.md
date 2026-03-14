# Open Claude Bugs

Tracked bugs and planned fixes identified during Claude-assisted development.

---

## Bug #1 — UX | Email Verification

**Problem:** After clicking the email verification link, user lands on a blank Firebase page that says "Your email has been verified" with zero CTA. No button, no redirect back to the app. User has to manually navigate back to trytruleado.com/login.

**Fix:** Add a "Continue to sign in →" button or auto-redirect to `/login` after 3 seconds.

**Status:** Open

---

## Bug #2 — UX | Login Page

**Problem:** Google and GitHub OAuth buttons are visible but disabled/grayed out with no explanation.

**Fix:** Show a "Coming soon" tooltip on hover so users know it's intentional.

**Status:** Open

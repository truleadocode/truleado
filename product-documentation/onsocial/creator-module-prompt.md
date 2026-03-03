# Module: Creator Discovery

You are implementing a new module inside an existing production application.

Follow existing architecture and conventions strictly.

Do NOT redesign billing system.
Do NOT modify unrelated modules.
Do NOT change Premium Token logic outside scope.

---

# 1️⃣ MODULE LOCATION

Add a new module:

```
Agency → Creator Discovery
```

Route should follow existing agency routing pattern.

Swagger documentation exists at:

```
product-documentation\onsocial\swagger.html
```

UI reference screenshots exist under:

```
product-documentation\onsocial\*.png
```

Match UI closely to those screenshots.

---

# 2️⃣ BUSINESS RULES (DO NOT CHANGE)

We use **Premium Tokens (internal currency)**.

Agencies:

* Buy Premium Tokens from us.
* Never see OnSocial pricing.
* Never interact with OnSocial billing.

Our system:

* Uses a single global OnSocial API key.
* Deducts Premium Tokens internally.
* Pays OnSocial from our global account.

Search is FREE.
Unlock / Export / Import consume Premium Tokens.

Use existing Premium Token infrastructure in the project.

---

# 3️⃣ REQUIRED ONSOCIAL ENDPOINTS

You must use:

* `/search/newv1/`
* `/search/unhide/`
* `/exports/new/`
* `/account/info/`

Do NOT use `auto_unhide=true` by default.

---

# 4️⃣ FEATURES TO IMPLEMENT

---

## A. SEARCH

Use `/search/newv1/`.

Requirements:

* Support Instagram / TikTok / YouTube
* Build dynamic filters based on Swagger definitions
* Hidden influencers must be visually locked
* Contact info must not be shown if hidden
* Each hidden influencer must show Unlock button

Search must NOT deduct Premium Tokens.

---

## B. UNLOCK

Use `/search/unhide/`.

Flow:

1. User selects hidden influencers.
2. Calculate Premium Token usage:

   * 1 Premium Token = 50 without contact
   * 1 Premium Token = 25 with contact
3. Deduct Premium Tokens.
4. Call OnSocial unlock endpoint.
5. Store unlock record.
6. Unlock validity = 30 days.
7. Update UI state.

Use existing token deduction utilities.
If improvement is required, refactor cleanly within current architecture.

---

## C. EXPORT

Use `/exports/new/`.

Requirements:

* Allow export by filters OR selected influencers
* Show estimated Premium Token usage before confirmation
* Deduct Premium Tokens
* Trigger OnSocial export
* Track export history
* Store export reference in DB
* Provide download functionality

---

## D. IMPORT TO CREATOR DATABASE

After Unlock or Export, allow:

> “Import to Creator Database”

Requirements:

* Deduct Premium Tokens (same pricing logic)
* Upsert into existing `agency_creators` table
* Preserve notes if record exists
* Tag `source = "discovery"`
* Redirect to Creator Database after success

Inspect existing Creator DB implementation before coding.

---

## E. AUTO-SAVE SEARCH

Allow:

* Save filter configuration
* Store platform + filters JSON
* Load saved searches
* Re-run saved searches

Use existing per-agency configuration patterns.

---

# 5️⃣ TOKEN PRICING STRATEGY (CONFIG-DRIVEN)

Implement configurable pricing support for:

* Basic Tokens
* Premium Tokens

Pricing must NOT be hardcoded.

System must support:

* Multiple third-party providers (example: Apify)
* Store:

  * Provider name
  * Token type (basic / premium)
  * Internal cost per token
  * Markup or final agency price
* Pricing editable via DB or admin config
* Ability to compute final token cost dynamically if multiple providers contribute

Do not over-engineer.
Keep solution clean and extensible.

---

# 6️⃣ PERMISSIONS (ENFORCE RBAC)

Only:

* Agency Admin
* Account Manager
* Operator

Can:

* Unlock
* Export
* Import
* Spend Premium Tokens

Use existing RBAC middleware.

---

# 7️⃣ PERFORMANCE REQUIREMENTS

* Implement caching wherever possible
* Avoid redundant OnSocial calls
* Debounce search requests
* Ensure high performance
* Follow existing caching patterns

---

# 8️⃣ FILE STRUCTURE RULES

* Follow existing agency module structure
* Reuse OnSocial service wrapper if available
* Reuse token service
* Follow folder naming conventions
* Do NOT introduce new architectural patterns unnecessarily

---

# 9️⃣ ACCEPTANCE CRITERIA

* Search works without token deduction
* Hidden influencers handled correctly
* Unlock deducts Premium Tokens
* Export deducts Premium Tokens
* Import deducts Premium Tokens
* No double deduction
* RBAC enforced correctly
* Saved searches persist
* Works with existing agency token balance
* UI matches reference screenshots
* Performance optimized

---

# 10️⃣ IMPLEMENTATION MODE

Act as a senior architect with strong production experience.

Before coding:

* Inspect existing token system
* Inspect Creator DB implementation
* Inspect OnSocial service wrapper
* Follow current patterns

Then implement cleanly.

---

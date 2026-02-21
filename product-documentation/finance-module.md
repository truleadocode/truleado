# 📘 PRODUCT REQUIREMENTS DOCUMENT

# Finance Module – Campaign Management System

---

# 1. Overview

The Finance Module enables agencies to manage, track, control, and audit campaign-level financials including:

* Campaign budget management
* Creator payouts
* Manual expenses
* Payment tracking
* Multi-currency handling with FX conversion
* Profitability tracking
* Budget enforcement (soft & hard limits)
* Audit logs
* Financial reporting & exports

This module converts campaigns into financially accountable units with full transparency and control.

---

# 2. Objectives

1. Ensure strict budget tracking per campaign
2. Prevent uncontrolled overspending
3. Track committed vs paid amounts
4. Provide full auditability
5. Track profitability (Revenue vs Spend)
6. Enable exportable financial reporting
7. Maintain accurate multi-currency support

---

# 3. Definitions

| Term             | Meaning                                    |
| ---------------- | ------------------------------------------ |
| Total Budget     | Maximum spend allowed for campaign         |
| Committed        | Accepted creator proposals not yet paid    |
| Paid             | Completed payments                         |
| Manual Expense   | Non-creator campaign cost                  |
| Revenue          | Client contract value                      |
| Remaining Budget | Budget left after commitments and expenses |
| Soft Limit       | Allow overspend with warning               |
| Hard Limit       | Block overspend actions                    |

---

# 4. Core Functional Requirements

---

# 4.1 Campaign Budget

## Creation

At campaign creation OR edit mode:

Fields:

* Total Budget (Required)
* Currency (Auto-set from Agency Locale, non-editable)
* Budget Control Type:

  * Soft Limit
  * Hard Limit
* Client Contract Value (Revenue)

Currency is locked to Agency default currency.

---

# 4.2 Financial Calculations Engine

System must automatically calculate:

```
Committed = Sum of accepted creator agreements (status = committed)
Paid = Sum of all payments marked as paid
Other Expenses = Sum of manual expenses
Total Spend = Paid + Other Expenses
Remaining Budget = Total Budget - (Committed + Other Expenses)
Profit = Revenue - Total Spend
Margin % = (Profit / Revenue) * 100
```

All values update in real time.

---

# 4.3 Budget Enforcement

## Soft Limit Mode

* At 80% usage → Yellow warning
* At 100% → Red warning
* Allow overspend

## Hard Limit Mode

Block:

* Accepting creator proposal if exceeding budget
* Adding manual expense exceeding budget

Display blocking modal:
"Budget exceeded. Increase budget or remove expenses."

---

# 4.4 Creator Payments Integration

When proposal is accepted:

* Amount becomes Committed
* Deducted from Remaining

Creator payment statuses:

* Committed
* Paid
* Cancelled

In Finance Tab:

| Creator | Deliverable | Amount | Currency | FX Rate | Status | Action |

Actions:

* Mark As Paid
* Upload Payment Proof (optional)
* Cancel Agreement

On Mark As Paid:

* Move amount from Committed → Paid
* Record paid_at timestamp
* Log audit entry

---

# 4.5 Multi-Currency Handling

System must support:

* Creator proposals in different currencies
* Conversion into Campaign currency using FX rate at time of acceptance

Store:

* Original currency
* Original amount
* FX rate used
* Converted amount

FX rate source must be reliable and stored permanently (no recalculation later).

Finance UI displays:

* Original + Converted amounts

---

# 4.6 Manual Expenses

Agency users can add:

Fields:

* Expense Name
* Category (dropdown)

  * Ad Spend
  * Travel
  * Shipping
  * Production
  * Platform Fees
  * Miscellaneous
* Amount
* Currency
* Converted amount (if different currency)
* Receipt upload
* Notes
* Payment Status (Unpaid / Paid)

Receipts stored in Supabase Storage.

Manual expenses affect:

* Committed (if unpaid)
* Paid (if marked paid)

---

# 4.7 Finance Overview Section (Campaign Overview Tab)

Displayed above Campaign Brief.

Must show:

Cards:

* Total Budget
* Committed
* Paid
* Other Expenses
* Remaining Budget
* Revenue
* Profit
* Margin %

Donut Chart:

Segments:

* Paid
* Committed
* Remaining

Color scheme:

* Paid: Blue
* Committed: Orange
* Remaining: Green

---

# 4.8 Finance Tab (Detailed View)

Sections:

## A. Summary Header

Real-time summary strip with key financial metrics.

---

## B. Creator Payments Table

Filters:

* Status
* Paid / Unpaid
* Creator

Export CSV option.

---

## C. Manual Expenses Table

* Filter by category
* Filter by status
* Download receipts
* Edit / Delete expense (if unpaid)

---

## D. Audit Log

Chronological log:

| Timestamp | Action | User | Details |

Tracked actions:

* Budget created
* Budget edited
* Proposal accepted
* Payment marked paid
* Expense added
* Expense deleted
* Currency conversion recorded

---

# 4.9 Permissions & Roles

Admin:

* Edit budget
* Change control type
* Add expenses
* Mark paid

Finance Manager:

* Add expenses
* Mark paid

Campaign Manager:

* View only

Audit logs cannot be edited.

---

# 4.10 Reporting & Export

Finance Tab must allow:

* Export campaign finance report (PDF)
* Export CSV (detailed ledger)

PDF includes:

* Budget summary
* Creator payments
* Expense breakdown
* Profit calculation

---

# 5. Data Model (Supabase Schema)

## campaigns

* id
* total_budget
* currency
* budget_control_type
* client_contract_value

## creator_agreements

* id
* campaign_id
* creator_id
* original_amount
* original_currency
* fx_rate
* converted_amount
* status
* paid_at

## campaign_expenses

* id
* campaign_id
* name
* category
* original_amount
* original_currency
* fx_rate
* converted_amount
* receipt_url
* status
* paid_at
* created_by

## campaign_finance_logs

* id
* campaign_id
* action_type
* metadata_json
* performed_by
* created_at

---

# 6. Non-Functional Requirements

* Real-time updates
* All calculations server-side validated
* No client-side-only financial logic
* Immutable financial logs
* Decimal precision handling
* Proper rounding rules (bankers rounding)

---

# 7. Edge Cases

* Cancelling creator agreement:

  * Remove from committed
  * Log action
* Editing budget:

  * Log old vs new
* Deleting unpaid expense:

  * Remove from calculations
* Prevent negative budget display

---

# 8. UI/UX Requirements

* Sticky finance summary
* Color-coded status badges
* Warning banners at thresholds
* Clear visual difference between committed and paid
* Clean enterprise dashboard layout

---

# 9. Success Metrics

* Zero overspend in hard mode
* Accurate margin calculation
* Exportable financial reporting
* Clear audit compliance

---

# 10. Acceptance Criteria

✔ Budget deducted correctly on proposal acceptance
✔ Paid updates correctly
✔ Manual expenses affect totals
✔ Hard limit blocks overspend
✔ Soft limit shows warnings
✔ Profit calculated correctly
✔ FX rates stored and consistent
✔ Full audit log available
✔ Finance overview visible on campaign page
✔ Finance tab fully functional

---

# 🚀 Strategic Impact

This Finance Module transforms your product from:

> Campaign Tracker
> to
> Campaign Financial Operating System

You now control:

* Spend
* Commitments
* Profitability
* Risk
* Audit compliance

---

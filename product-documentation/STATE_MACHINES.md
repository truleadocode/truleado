# Truleado – State Machines

> **Last Updated**: March 2026
> **Purpose**: This document defines all state machines used in Truleado.
> State transitions are validated **server-side only**.

---

## Approval unit (Phase 1)

**Only the Deliverable can reach "Fully Approved" status.** Campaigns and Projects are **containers** and **approval sources**; they do not have a "Fully Approved" state. Campaign status `APPROVED` means "campaign-level review complete" (the campaign as an approval source has been satisfied), not that the campaign itself is the approval target. The approval target is always the **Deliverable**; when a deliverable reaches `APPROVED`, it is **Fully Approved**.

---

## 1. Campaign State Machine

Campaigns are **containers** and **approval sources**. Campaign status reflects workflow stage, not final approval of content; only deliverables can be Fully Approved.

### States

| State | Description |
|-------|-------------|
| `DRAFT` | Campaign created but not started |
| `ACTIVE` | Campaign is running, content being created |
| `IN_REVIEW` | Content submitted, awaiting campaign-level approvals |
| `APPROVED` | Campaign-level review complete (all deliverables have passed campaign-level approval; approval unit remains the deliverable) |
| `COMPLETED` | Campaign execution finished |
| `ARCHIVED` | Read-only historical record |

### Valid Transitions

```
┌─────────┐
│  DRAFT  │
└────┬────┘
     │ activateCampaign()
     ▼
┌─────────┐
│ ACTIVE  │
└────┬────┘
     │ submitCampaignForReview()
     ▼
┌───────────┐
│ IN_REVIEW │
└────┬──────┘
     │ approveCampaign()
     ▼
┌──────────┐
│ APPROVED │
└────┬─────┘
     │ completeCampaign()
     ▼
┌───────────┐
│ COMPLETED │
└────┬──────┘
     │ archiveCampaign()
     ▼
┌──────────┐
│ ARCHIVED │ (terminal state - read-only)
└──────────┘
```

### Transition Matrix

| From | To | Mutation | Required Role |
|------|----|----------|---------------|
| DRAFT | ACTIVE | `activateCampaign` | Admin, Account Manager |
| ACTIVE | IN_REVIEW | `submitCampaignForReview` | Admin, Account Manager, Operator |
| IN_REVIEW | APPROVED | `approveCampaign` | Admin, Account Manager |
| APPROVED | COMPLETED | `completeCampaign` | Admin, Account Manager |
| COMPLETED | ARCHIVED | `archiveCampaign` | Admin, Account Manager |

### Rules

- No backward transitions allowed
- Archived campaigns are immutable
- All transitions are audit-logged

---

## 2. Deliverable State Machine

**Deliverable is the only entity that can reach "Fully Approved"** (status `APPROVED`). Campaigns and Projects act only as containers and approval sources.

### States

| State | Description |
|-------|-------------|
| `PENDING` | Deliverable created, no content uploaded |
| `SUBMITTED` | Content uploaded, awaiting review |
| `INTERNAL_REVIEW` | Under internal agency review |
| `CLIENT_REVIEW` | Under client review |
| `APPROVED` | **Fully Approved** – final approval granted (only deliverable can reach this) |
| `REJECTED` | Content rejected, needs revision |

### Valid Transitions

```
┌─────────┐
│ PENDING │
└────┬────┘
     │ uploadDeliverableVersion() + submitDeliverableForReview()
     ▼
┌───────────┐
│ SUBMITTED │
└────┬──────┘
     │ (auto-transition or manual)
     ▼
┌─────────────────┐
│ INTERNAL_REVIEW │
└────┬────────────┘
     │
     ├──────────────────────┐
     │                      │
     ▼                      ▼
┌───────────────┐    ┌──────────┐
│ CLIENT_REVIEW │    │ REJECTED │◄────────┐
└────┬──────────┘    └──────────┘         │
     │                    │               │
     │                    │ (re-submit)   │
     │                    ▼               │
     │              ┌─────────┐           │
     │              │ PENDING │───────────┘
     │              └─────────┘
     │
     ├──────────────────────┐
     │                      │
     ▼                      ▼
┌──────────┐          ┌──────────┐
│ APPROVED │          │ REJECTED │
└──────────┘          └──────────┘
```

### Transition Matrix

| From | To | Action | Required Role |
|------|----|--------|---------------|
| PENDING | SUBMITTED | Upload + Submit | Operator |
| SUBMITTED | INTERNAL_REVIEW | Auto or Manual | System |
| INTERNAL_REVIEW | CLIENT_REVIEW | Internal Approve | Internal Approver |
| INTERNAL_REVIEW | REJECTED | Internal Reject | Internal Approver |
| CLIENT_REVIEW | APPROVED | Client Approve | Client User (approver) |
| CLIENT_REVIEW | REJECTED | Client Reject | Client User (approver) |
| REJECTED | PENDING | Re-upload | Operator |

### Rules

- Rejected deliverables can be re-submitted (creates new version)
- Approved deliverables are locked
- Each transition creates an approval record

---

## 3. Campaign Creator Status

### States

| State | Description |
|-------|-------------|
| `INVITED` | Creator added to campaign, pending acceptance |
| `ACCEPTED` | Creator confirmed participation |
| `REMOVED` | Creator removed from campaign |

### Valid Transitions

```
┌─────────┐
│ INVITED │
└────┬────┘
     │
     ├───────────────┐
     │               │
     ▼               ▼
┌──────────┐   ┌─────────┐
│ ACCEPTED │   │ REMOVED │
└────┬─────┘   └─────────┘
     │
     ▼
┌─────────┐
│ REMOVED │
└─────────┘
```

### Transition Matrix

| From | To | Action | Who Can Perform |
|------|----|--------|-----------------|
| INVITED | ACCEPTED | Accept invite | Creator |
| INVITED | REMOVED | Remove creator | Admin, Account Manager |
| ACCEPTED | REMOVED | Remove creator | Admin, Account Manager |

---

## 4. Payment Status

### States

| State | Description |
|-------|-------------|
| `PENDING` | Payment created, not yet processed |
| `PAID` | Payment completed |

### Valid Transitions

```
┌─────────┐
│ PENDING │
└────┬────┘
     │ markPaymentPaid()
     ▼
┌──────┐
│ PAID │ (terminal state)
└──────┘
```

### Rules

- Payments are immutable once created
- No reversals allowed in system
- Manual adjustments require new payment record

---

## 5. Creator Agreement Status

Creator agreements track the compensation committed to a creator for a specific campaign. They are internal financial planning records (not Razorpay payments).

### States

| State | Description |
|-------|-------------|
| `committed` | Agreement created; amount locked for planning purposes |
| `paid` | Creator has been paid; terminal state |
| `cancelled` | Agreement cancelled before payment; terminal state |

### Valid Transitions

```
┌───────────┐
│ committed │
└─────┬─────┘
      │
      ├────────────────────────┐
      │                        │
      ▼                        ▼
┌──────┐               ┌───────────┐
│ paid │ (terminal)    │ cancelled │ (terminal)
└──────┘               └───────────┘
```

### Transition Matrix

| From | To | Mutation | Required Role |
|------|----|----------|---------------|
| committed | paid | `markCreatorAgreementPaid` | Admin, Account Manager |
| committed | cancelled | `cancelCreatorAgreement` | Admin, Account Manager |

### Rules

- Only one agreement per creator per campaign (unique constraint: `campaign_id` + `creator_id`).
- Paid and cancelled agreements are immutable.
- All transitions are recorded in `campaign_finance_logs`.
- Cancelling an agreement does not affect `campaign_expenses` or legacy `payments`.

---

## 6. Campaign Expense Status

Expenses represent actual cash outflows against a campaign budget.

### States

| State | Description |
|-------|-------------|
| `pending_receipt` | Expense logged; awaiting receipt upload for verification |
| `approved` | Expense verified and counted against budget |
| `rejected` | Expense rejected and excluded from budget calculations |

### Valid Transitions

```
┌─────────────────┐
│ pending_receipt │
└────────┬────────┘
         │
         ├──────────────────────────┐
         │                          │
         ▼                          ▼
┌──────────┐                 ┌──────────┐
│ approved │ (terminal)      │ rejected │ (terminal)
└──────────┘                 └──────────┘
```

### Transition Matrix

| From | To | Mutation | Required Role |
|------|----|----------|---------------|
| pending_receipt | approved | `approveExpense` | Admin, Account Manager |
| pending_receipt | rejected | `rejectExpense` | Admin, Account Manager |

### Rules

- Only `approved` expenses count toward budget utilisation and finance summary totals.
- `pending_receipt` expenses are visible in the expense list but do not reduce available budget.
- Hard budget enforcement checks the sum of `approved` expenses only.
- All status transitions are recorded in `campaign_finance_logs`.
- Rejected expenses cannot be re-submitted; a new expense must be created.

---

## 7. Agency Subscription State Machine

Tracks the subscription lifecycle of an agency from trial through active subscription or expiry.

### States

| State | Description |
|-------|-------------|
| `trial` | Default state. 30-day free trial from agency creation |
| `active` | Paid subscription is current |
| `expired` | Trial ended or subscription lapsed without renewal |
| `cancelled` | Agency explicitly cancelled subscription |

### Valid Transitions

```
┌────────┐
│ trial  │
└───┬────┘
    │
    ├──────────────────────────┐
    │ upgrade()                │ trial_end_date passed
    ▼                          ▼
┌────────┐              ┌─────────┐
│ active │              │ expired │
└───┬────┘              └─────────┘
    │
    ├──────────────────────────┐
    │ cancel()                 │ subscription_end_date passed
    ▼                          ▼
┌───────────┐           ┌─────────┐
│ cancelled │           │ expired │
└───────────┘           └─────────┘
    │
    │ re-subscribe()
    ▼
┌────────┐
│ active │
└────────┘
```

### Transition Matrix

| From | To | Trigger | Who |
|------|-----|---------|-----|
| trial | active | Payment verified via Razorpay | Agency Admin |
| trial | expired | `trial_end_date` passes (system) | System / Admin |
| active | expired | `subscription_end_date` passes | System / Admin |
| active | cancelled | Explicit cancellation | Agency Admin / Truleado Admin |
| cancelled | active | New subscription payment | Agency Admin |
| expired | active | New subscription payment | Agency Admin |

### Rules

- All new agencies start in `trial` state with `trial_end_date = created_at + 30 days`
- Truleado admin can extend trial periods via admin dashboard
- `subscription_status` is stored on `agencies` table
- Status does not auto-update on the DB; the application checks dates at runtime and the admin dashboard manages status changes

---

## 8. Team Invitation State Machine

Tracks the lifecycle of a team invite sent to a prospective agency member.

### States

| State | Description |
|-------|-------------|
| `pending` | Invitation sent, awaiting acceptance |
| `accepted` | Invitee signed up and joined the agency |
| `revoked` | Admin cancelled the invitation before it was accepted |
| `expired` | 7-day window passed without acceptance |

### Valid Transitions

```
┌─────────┐
│ pending │
└────┬────┘
     │
     ├──────────────┬──────────────┐
     │              │              │
     ▼              ▼              ▼
┌──────────┐  ┌─────────┐  ┌─────────┐
│ accepted │  │ revoked │  │ expired │
└──────────┘  └─────────┘  └─────────┘
(terminal)    (terminal)   (terminal)
```

### Transition Matrix

| From | To | Trigger | Who |
|------|-----|---------|-----|
| pending | accepted | Invitee signs up with invite token | Invitee (auto) |
| pending | revoked | Admin revokes invitation | Agency Admin |
| pending | expired | 7 days pass without acceptance | System |

### Rules

- Only one `pending` invitation per (agency_id, email) — enforced by unique partial index
- Invitation token is a secure random hex string (32 bytes)
- Accept link format: `/signup?invite_token=<token>`
- On signup, if invite token matches a pending invitation, the user is auto-added to the agency with the specified role
- Revoked invitations cannot be re-activated; a new invitation must be sent
- Expired invitations are not automatically cleaned up; they remain as historical records

---

## 9. Email OTP State Machine (Creator Portal Auth)

Tracks the lifecycle of a one-time password used for creator portal authentication.

### States

| State | Description |
|-------|-------------|
| `created` | OTP generated and sent; awaiting verification |
| `verified` | OTP correctly entered within TTL; session issued |
| `expired` | OTP TTL elapsed before verification |
| `locked` | Maximum failed attempts (5) reached |

### Valid Transitions

```
┌─────────┐
│ created │
└────┬────┘
     │
     ├──────────────────────────┬──────────────┐
     │ correct OTP within TTL   │ TTL elapsed  │ 5 failed attempts
     ▼                          ▼              ▼
┌──────────┐             ┌─────────┐    ┌────────┐
│ verified │             │ expired │    │ locked │
└──────────┘             └─────────┘    └────────┘
(terminal)               (terminal)    (terminal)
```

### Transition Matrix

| From | To | Trigger | Condition |
|------|-----|---------|-----------|
| created | verified | Correct OTP submitted | `attempt_count < 5` AND `expires_at > now()` |
| created | expired | Any verification attempt | `expires_at ≤ now()` |
| created | locked | Failed OTP attempt | `attempt_count` reaches 5 |

### Rules

- OTP is a 6-digit numeric code
- OTP stored as bcrypt hash; never in plain text
- TTL: 10 minutes from creation
- Max attempts: 5 (tracked via `attempt_count` column)
- Each failed attempt increments `attempt_count`
- `email_otps` table is accessed exclusively via service role key (no RLS policies)
- On successful verification, a custom Firebase token is issued for the creator session
- Multiple OTPs can exist per email simultaneously; the most recent valid one is used

---

## 10. Discovery Export State Machine

Tracks the lifecycle of a bulk export job from creator discovery.

### States

| State | Description |
|-------|-------------|
| `pending` | Export job created; credits deducted; awaiting processing |
| `processing` | OnSocial API call in progress |
| `completed` | Export finished; download URL available |
| `failed` | Export failed; credits refunded |

### Valid Transitions

```
┌─────────┐
│ pending │
└────┬────┘
     │ processing starts
     ▼
┌────────────┐
│ processing │
└─────┬──────┘
      │
      ├──────────────────────────┐
      │ export complete          │ API error / timeout
      ▼                          ▼
┌───────────┐            ┌────────┐
│ completed │            │ failed │
└───────────┘            └────────┘
(terminal)               (terminal)
```

### Transition Matrix

| From | To | Trigger | Effect |
|------|-----|---------|--------|
| pending | processing | Export job picked up | — |
| processing | completed | OnSocial export finishes | `download_url` set |
| processing | failed | API error | Credits refunded; `error_message` set |

### Rules

- Credits are deducted synchronously **before** the export job is created
- If the export fails, credits are refunded to `agencies.credit_balance`
- `discovery_exports` records are append-only (no soft-delete)
- `filter_snapshot` stores the search filters used at export time for audit purposes
- Export download URLs are provided by OnSocial and may have their own expiry

---

## 11. Implementation Guidelines

### Server-Side Validation

```typescript
// Example: Campaign state transition
function validateTransition(currentStatus: string, newStatus: string): void {
  const allowedTransitions: Record<string, string[]> = {
    'draft': ['active'],
    'active': ['in_review'],
    'in_review': ['approved'],
    'approved': ['completed'],
    'completed': ['archived'],
    'archived': [], // terminal state
  };

  if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
    throw new InvalidStateError(
      `Cannot transition from ${currentStatus} to ${newStatus}`
    );
  }
}
```

### Audit Logging

Every state transition MUST:
1. Log the before state
2. Log the after state
3. Record the actor
4. Record the timestamp
5. Include any relevant metadata

---

**End of State Machines Document**

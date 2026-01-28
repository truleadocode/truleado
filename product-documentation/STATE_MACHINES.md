# Truleado – State Machines

> **Purpose**: This document defines all state machines used in Truleado.
> State transitions are validated **server-side only**.

---

## 1. Campaign State Machine

### States

| State | Description |
|-------|-------------|
| `DRAFT` | Campaign created but not started |
| `ACTIVE` | Campaign is running, content being created |
| `IN_REVIEW` | Content submitted, awaiting approvals |
| `APPROVED` | All content approved |
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

### States

| State | Description |
|-------|-------------|
| `PENDING` | Deliverable created, no content uploaded |
| `SUBMITTED` | Content uploaded, awaiting review |
| `INTERNAL_REVIEW` | Under internal agency review |
| `CLIENT_REVIEW` | Under client review |
| `APPROVED` | Final approval granted |
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

## 5. Implementation Guidelines

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

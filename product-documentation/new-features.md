# 🧩 Next to DO


## ✅ PHASE 0 — Agency & User Onboarding (BLOCKER FOR EVERYTHING)

### Task 0.1 — Signup Flow: Agency Choice

* Update signup flow to **force user to choose one option**:

  * **Create a new Agency**
  * **Join an existing Agency**
* This screen must appear immediately after authentication.

---

### Task 0.2 — Create New Agency Flow

* Collect:

  * Agency Name
* On submission:

  * Create Agency record
  * Generate unique `agency_code`
  * Assign user as **Agency Admin**
  * Attach user to agency
* Redirect user to **Agency Homepage**

---

### Task 0.3 — Join Existing Agency Flow

* Allow user to enter **Agency Code**
* Validate code
* On success:

  * Attach user to agency
  * Redirect user to **Agency Homepage**
* On failure:

  * Show clear error message

---

### Task 0.4 — Access Guard (Very Important)

* Block access to **all product features** unless:

  * `user.agency_id` exists
* If user is not in an agency:

  * Force redirect to **Agency Selection Screen**

---

### Task 0.5 — Agency Admin User Management

* Agency Admin can:

  * Invite users
  * Share Agency Code
* User belongs to **only one agency** (for now)

---

## ✅ PHASE 1 — Core Domain Structure

### Task 1.1 — Deliverable as Approval Unit

* Ensure **Deliverable** is the only entity that can reach:

  * `Fully Approved` status
* Campaigns and Projects act only as:

  * Containers
  * Approval sources

---

## ✅ PHASE 2 — Approval System (Deliverable-Centric)

### Task 2.1 — Campaign-Level Approvers (Mandatory)

* While creating a Campaign:

  * Require at least one Campaign Approver
* Rules:

  * Multiple approvers act **in parallel**
  * **ALL must approve**
* Store approval state per Deliverable

---

### Task 2.2 — Project-Level Approvers (Optional)

* Allow project approvers to be added:

  * During Project creation
  * Via **Project Page → Actions → Add Approvers**
* Rules:

  * Multiple approvers act independently
  * **ANY ONE approval is sufficient**
* If no project approvers:

  * Skip this stage

---

### Task 2.3 — Client-Level Approval (Mandatory)

* Client approval is **always required**
* Deliverable moves to client approval after:

  * Campaign approval
  * Project approval (if applicable)
* Approval from **ANY ONE client approver** is sufficient

---

### Task 2.4 — Approval Flow State Machine

* Implement Deliverable approval stages:

  * Pending Campaign Approval
  * Pending Project Approval (optional)
  * Pending Client Approval
  * Fully Approved
* Persist:

  * Approval level
  * Approver
  * Timestamp

---

### Task 2.5 — Approval Visibility

* Show for each Deliverable:

  * Current approval stage
  * Pending approvers
  * Completed approvals
  * Approval history timeline

---

## 🐛 Known bugs (to fix later)

### Create Contact — "non-empty query" (fixed)

- **Was**: Client detail Contacts tab used `queries.createContact` / `updateContact` / `deleteContact` (those are mutations) → "GraphQL operations must contain a non-empty `query`" on contact CRUD.
- **Fix**: Use `mutations.createContact`, `mutations.updateContact`, `mutations.deleteContact` in `src/app/(dashboard)/dashboard/clients/[id]/page.tsx`. Resolved.

### Approval system — eligibility & UI state (fix with approval overhaul)

* **Who can approve**: Currently all users can see and use Approve/Reject on a deliverable. This should be restricted so that:
  * Only **Campaign approvers** (assigned on the campaign) can approve at Campaign level.
  * Only **Project approvers** (assigned on the project) can approve at Project level.
  * Only **Client approvers** (to be defined via Client Contacts / `is_client_approver`) can approve at Client level.
* **Buttons after approval**: After a user approves internally (Campaign level), the Approve/Reject buttons still stay visible for everyone. They should:
  * Be **hidden** for users who have already approved at the current stage (or when the stage is complete).
  * Be **hidden** for users who are not eligible to approve at the current stage.
* **Status after internal approval**: After all Campaign approvers have approved, the deliverable status should update correctly to:
  * **Pending Project Approval** if the project has project approvers.
  * **Pending Client Approval** for agency users (client approval stage) if the project has no project approvers.
* **When to fix**: Do a **single pass** to fix the approval system end-to-end (eligibility checks, UI visibility, status transitions). Phase 3 Contacts and client portal (magic-link) are already implemented.

---

## ✅ PHASE 3 — Client & Contacts (CRM Foundation)

### Task 3.1 — Contacts Data Model

* Create separate `contacts` table
* Each contact belongs to a Client
* Fields:

  * First Name
  * Last Name
  * Email
  * Mobile Number
  * Address
  * Department
  * Notes
  * Client ID

---

### Task 3.2 — Client Approvers

* Allow marking contacts as:

  * `is_client_approver`
* Client-level approval must use **only these contacts**

---

### Task 3.3 — Client Contacts UI

* Add **Contacts tab** on Client page

  * List contacts
  * Add / edit / delete contacts
  * Toggle approver status

---

### Task 3.4 — Global Contacts Page

* Expose **Contacts** as left-side menu item
* CRM-style list:

  * Filter by client
  * Filter by department
  * Filter by approver status

---

## ✅ PHASE 4 — Notifications & Communication (Implemented)

### Task 4.1 — Approval Notifications

* Trigger **email + in-app notifications** when:

  * Approval is requested
  * Approval is completed
  * Approval is rejected (if supported)
* Notifications must include:

  * Deliverable name
  * Approval level
  * Action required

**Implementation:** Novu integrated. Workflows `approval-requested`, `approval-approved`, `approval-rejected` triggered from deliverable mutations. In-app via Novu Inbox in header. Email uses agency SMTP when configured (see Phase 5). See `notification-service-implementation.md`.

---

## ✅ PHASE 5 — Agency Email Infrastructure (Implemented)

### Task 5.1 — Agency Email Configuration

* In Agency Settings:

  * Configure SMTP / email provider
  * From name & from email
* All system emails must:

  * Use agency-defined email settings

**Implementation:** Settings → Notifications; agency admin SMTP form. Saves to `agency_email_config` and syncs to Novu Custom SMTP integration per agency. Trigger overrides use `integrationIdentifier` so emails send via agency SMTP.

---

### Task 5.2 — Email Service Abstraction

* Build email service layer that:

  * Supports agency-level config
  * Can be extended later for inbound mail

**Implementation:** Novu handles delivery; agency config pushed to Novu on save. `src/lib/novu/` (client, trigger, integrations, subscriber).

---

## ✅ PHASE 6 — Future-Proofing: Built-in Mailbox

### Task 6.1 — Mailbox-Ready Architecture

* Design email tables & services to support:

  * User mailboxes inside the product
  * Inbound + outbound emails later
* No UI required yet, but:

  * Schema & services must not block future rollout

---

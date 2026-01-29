Perfect — here’s a **clean, execution-ready Markdown task list**, ordered **exactly in the sequence it must be built**.
This is suitable for **Cursor agent execution, Jira import, or internal tech planning**.

---

# 🧩 Product Implementation Tasks (Ordered & Mandatory)

> **Golden rule:** No user should be able to use the product without being part of an Agency.
> **Approvals are Deliverable-centric, not Campaign/Project-centric.**

---

## ✅ PHASE 0 — Agency & User Onboarding (BLOCKER FOR EVERYTHING)

**Implementation status:** Implemented. See product-documentation README changelog and TECHNICAL_LLD §4 (Auth & Onboarding). Routes: `/choose-agency`, `/create-agency`, `/join-agency`. GraphQL: `createUser`, `joinAgencyByCode`; Agency `agencyCode`. Login waits for user+agencies then redirects to `/dashboard` or `/choose-agency`.

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

## ✅ PHASE 4 — Notifications & Communication

### Task 4.1 — Approval Notifications

* Trigger **email + in-app notifications** when:

  * Approval is requested
  * Approval is completed
  * Approval is rejected (if supported)
* Notifications must include:

  * Deliverable name
  * Approval level
  * Action required

---

## ✅ PHASE 5 — Agency Email Infrastructure

### Task 5.1 — Agency Email Configuration

* In Agency Settings:

  * Configure SMTP / email provider
  * From name & from email
* All system emails must:

  * Use agency-defined email settings

---

### Task 5.2 — Email Service Abstraction

* Build email service layer that:

  * Supports agency-level config
  * Can be extended later for inbound mail

---

## ✅ PHASE 6 — Future-Proofing: Built-in Mailbox

### Task 6.1 — Mailbox-Ready Architecture

* Design email tables & services to support:

  * User mailboxes inside the product
  * Inbound + outbound emails later
* No UI required yet, but:

  * Schema & services must not block future rollout

---

## 🧠 Final Notes for Engineering

* User must **always belong to an Agency**
* Deliverable is the **only approval target**
* Client approval is **mandatory**
* Campaign approvals = ALL required
* Project approvals = ANY one required
* Client approvals = ANY one required

---

If you want next, I can:

* Convert this **1:1 into Jira Epics & Stories**
* Produce **DB schema diagrams**
* Or generate a **Cursor execution checklist per phase**

This is a very solid, scalable foundation 👌

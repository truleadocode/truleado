# Jira Board Alignment — TRULEADO

Use this doc to sync the **TRULEADO** Jira project with current codebase and progress. When the Atlassian MCP is available in a Cursor chat, the agent can use it to create/update issues; otherwise use this as a manual or script reference.

---

## 1. Epics (create if missing)

| Epic key / title | Description |
|------------------|-------------|
| **TRULEADO — Phase 0: Agency & Onboarding** | Signup, create/join agency, agency code, access guard. Blocker for all features. |
| **TRULEADO — Phase 1: Core Domain** | Deliverable as approval unit; campaigns/projects as containers. |
| **TRULEADO — Phase 2: Approval System** | Campaign/Project/Client approvers, flow state machine, approval visibility. |
| **TRULEADO — Phase 3: Client & Contacts** | Contacts data model, client approvers, Contacts UI, global Contacts page. |
| **TRULEADO — Phase 4: Notifications** | Approval notifications (email + in-app). |
| **TRULEADO — Phase 5: Email Infrastructure** | Agency email config, email service abstraction. |
| **TRULEADO — Bugs & Tech Debt** | Known bugs and fixes (e.g. approval eligibility). |

---

## 2. Tickets to mark DONE (already implemented)

Move these to **Done** (and into **Active Sprint** if they’re in Backlog). Create them if they don’t exist.

### Phase 0 — Agency & Onboarding
| Summary | Description |
|---------|-------------|
| **Signup flow: Agency choice** | After auth, user chooses Create new Agency or Join existing Agency. Routes: `/choose-agency`, `/create-agency`, `/join-agency`. |
| **Create new agency flow** | Agency name → create agency, generate `agency_code`, assign Agency Admin, attach user, redirect to dashboard. |
| **Join existing agency by code** | Enter agency code → validate → attach user to agency → redirect. `joinAgencyByCode` mutation. |
| **Access guard (no agency)** | Block dashboard until user has agency; redirect to `/choose-agency` if `agencies.length === 0`. |
| **Agency admin: share agency code** | Agency code visible/shareable (e.g. Settings). |
| **createUser mutation & auth flow** | GraphQL `createUser` for Firebase→Supabase user + auth_identities; login waits for user+agencies then redirects. |

### Phase 1 — Core Domain
| Summary | Description |
|---------|-------------|
| **Deliverable as approval unit** | Only Deliverable reaches "Fully Approved". Campaign/Project status labels: "Review complete" vs "Fully Approved". Shared helpers in `src/lib/campaign-status.ts`. |

### Phase 2 — Approval System
| Summary | Description |
|---------|-------------|
| **Campaign-level approvers (mandatory)** | Create campaign requires ≥1 campaign approver; `createCampaign(approverUserIds)`. All must approve. |
| **Project-level approvers (optional)** | `project_approvers` table; add/remove via Project page. Any one can approve. Mutations: `addProjectApprover`, `removeProjectApprover`. |
| **Client-level approval (mandatory)** | Client approval stage always required; any one client approver. (Client approvers from contacts in Phase 3.) |
| **Approval flow state machine** | Deliverable statuses: Pending Campaign → Pending Project (optional) → Pending Client → Fully Approved. Migration `00011_phase2_approval_system.sql`. |
| **Approval visibility on deliverable** | Current stage, pending approvers (by level), approval history timeline, workflow strip. Deliverable detail page. |
| **Edit Campaign: manage approvers** | Campaign detail page: Campaign approvers section + "Manage approvers" dialog. `assignUserToCampaign` / `removeUserFromCampaign`. |
| **Edit Project: manage approvers** | Project detail: "Manage approvers" dialog with multi-select. Same ApproverPicker UX. |
| **ApproverPicker component** | Shared UI: agency users list, search, multi-select, Select all/Clear. Used in Create Campaign, Edit Campaign, Edit Project. |
| **Create Campaign: approver selection** | New campaign form uses ApproverPicker; ≥1 approver required. |

### Deliverables & UX (no phase)
| Summary | Description |
|---------|-------------|
| **Deliverable detail: layout, preview, versions** | Layout rearrangement, file/version selection for preview, pop-out and maximize preview. |
| **Deliverable: caption edit & audit** | Caption per version, edit with audit trail (`deliverable_version_caption_audit`). |
| **Deliverable: hashtag highlighting** | Hashtags in captions rendered as badges. |
| **Approval: GraphQL enum fix** | Frontend sends `INTERNAL`/`PROJECT`/`CLIENT` for `approvalLevel` (not lowercase). |
| **Approvals happen here callout** | Deliverable detail banner explaining who approves at each stage (campaign/project/client). |
| **SUBMITTED status: allow campaign approval** | Deliverable in SUBMITTED can be approved by campaign approvers (same as INTERNAL_REVIEW); pending approvers shown. |

---

## 3. Bug ticket (create, keep in Backlog)

| Summary | Description |
|---------|-------------|
| **Approval system: restrict by role + hide buttons after approval** | (1) Only campaign/project/client approvers can approve at each level. (2) Hide Approve/Reject for ineligible users and once current stage is complete. (3) Ensure status moves to Pending Project Approval or Pending Client Approval after internal approval. Fix with Phase 3 (Client Contacts) and single approval-system pass. See `new-features.md` § Known bugs. |

---

## 4. Next: Active Sprint (Phase 3)

Create these and put them in **Active Sprint** (or move from Backlog).

| Summary | Description |
|---------|-------------|
| **Phase 3.1 — Contacts data model** | Create `contacts` table: belongs to Client; fields: first_name, last_name, email, mobile, address, department, notes, client_id. Migration + GraphQL types. |
| **Phase 3.2 — Client approvers** | Contacts: `is_client_approver` flag. Client-level approval uses only these contacts. |
| **Phase 3.3 — Client Contacts UI** | Contacts tab on Client page: list, add/edit/delete contacts, toggle approver status. |
| **Phase 3.4 — Global Contacts page** | Contacts in sidebar; CRM-style list; filters: client, department, approver status. |

---

## 5. Backlog (later phases)

Create and leave in **Backlog** (or appropriate backlog board).

### Phase 4 — Notifications
- Approval notifications (email + in-app): requested, completed, rejected; include deliverable name, level, action.

### Phase 5 — Email
- Agency email configuration (SMTP / provider, from name/email).
- Email service abstraction (agency-level config, extensible).

### Phase 6 — Future
- Mailbox-ready architecture (tables/services for inbound/outbound, no UI yet).

---

## 6. MCP verification

- **Atlassian MCP** is in `mcp.json` with 28 tools. In a **new Cursor chat**, ask: *"Do you have Atlassian or Jira MCP tools? List them."*
- If yes, ask: *"Update Jira for project TRULEADO using product-documentation/JIRA_ALIGNMENT.md."*
- This file is the single source of truth for what’s done, what’s next, and the approval bug.

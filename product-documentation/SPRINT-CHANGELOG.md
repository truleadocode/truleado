# Sprint Changelog

This document summarizes all features, improvements, and bug fixes introduced in this sprint. Intended for QA testers and non-technical stakeholders.

---

## New Features

### 1. Onboarding Wizard
- New 7-step onboarding wizard modal guides new agencies through initial setup
- Covers agency profile, locale, team invites, branding, and sample data
- Sample data can be seeded (and later removed) to help users explore the platform
- Sample data management card added to Settings page

### 2. Agency Settings Page
- Full agency profile editing: name, website, description, logo upload
- Contact information: email, phone
- Business address fields
- Logo upload with preview

### 3. Trial System
- Agencies automatically get a 30-day free trial on creation
- Trial status tracked in the database with start/end dates
- Admin can view and manage trial status per agency

### 4. Admin Dashboard
- Password-protected admin panel at a private URL
- View all agencies with trial/subscription status
- Manage subscription plans and pricing
- View and edit individual agency details

### 5. Team Invitations
- Batch invite team members by email with role assignment
- Auto-accept invitations when invited users sign up
- Invitation status tracking (pending, accepted, expired)

### 6. Subscription & Billing (Razorpay)
- Subscription plans with tiered pricing (Starter, Growth, Enterprise)
- Multi-currency billing: INR for India-based agencies, USD for international
- Razorpay payment integration for subscription purchases
- Billing page shows current plan, usage, and upgrade options

### 7. Security & Appearance Settings
- Security settings page (password management, session info)
- Appearance settings page (theme preferences)

### 8. Edit Campaign (from list and detail views)
- "Edit Campaign" button in the campaigns list 3-dot menu now works
- Navigates to campaign detail and auto-opens the edit drawer
- Campaign detail page "Edit Campaign" button opens a full edit form covering all campaign fields

### 9. Edit Project + Edit Budget
- "Edit Project" in the project header dropdown now opens a full edit sheet
- 7-section edit form: core details, budget, scope, KPIs, approvals, documents, internal notes
- "Edit Budget" shortcut button on the Budget tab opens the same edit sheet
- All fields pre-populated from current project data

### 10. Project Budget Allocation Tracking
- Project budget tab now shows how budget is allocated across campaigns
- Summary metrics: Total Planned, Allocated, Unallocated with utilization percentage
- Progress bar with color coding (green/yellow/red based on utilization)
- Warnings when campaigns exceed project budget or when no project budget is set
- Handles currency conversion when campaigns use different currencies
- Draft and archived campaigns shown but excluded from allocation totals

### 11. Campaign Finance Status on Project Budget Tab
- Campaign allocation table now shows per-campaign finance breakdown
- Columns: Budget, Committed, Paid, Expenses, Remaining, Utilization
- Mini progress bar per campaign showing budget utilization
- Totals row aggregating all campaign finances
- Red highlighting when a campaign is over budget

### 12. Budget Visualization Redesign (Project Overview)
- Replaced individual horizontal bar charts with a donut pie chart for budget category breakdown
- Categories shown: Influencer Budget, Agency Fee, Production, Boosting, Contingency
- Interactive legend with color-coded dots and formatted amounts
- iPhone Storage-style segmented bar showing campaign allocation
- Each campaign shown as a colored segment proportional to its budget
- Hover tooltips showing campaign name and amount
- Unallocated budget shown as gray segment

### 13. Split Influencers & Deliverables Tabs
- Campaign detail previously had a combined "Influencers & Deliverables" tab
- Now split into two separate tabs: "Influencers" and "Deliverables"
- Each tab has its own dedicated view with relevant actions

### 14. Get Started Checklist Improvements
- Moved Get Started checklist to the top of the dashboard
- Added progress bar showing completion status
- Auto-detects completed steps (e.g., agency profile, first client, first project)

### 15. Create Project Sheet
- Full multi-section project creation form
- 7 sections: Core Details, Budget, Scope, KPI Targets, Approvals, Documents, Internal
- Client search with project manager and contact assignment
- Budget calculator with live total

### 16. Campaign Budget Config Dialog
- Shows project budget context when setting campaign budgets
- Displays project total planned and unallocated amounts
- Warns when campaign budget would exceed project allocation

---

## Bug Fixes

### Authentication & Signup
- Redesigned signup/login flow with email verification to eliminate race conditions
- Fixed unauthenticated fetch for invite token lookup on signup page
- Fixed invitation insert logic (replaced upsert with select-then-insert)

### Dashboard & UI
- Dashboard greeting now shows first name instead of email prefix
- Removed unnecessary Shield illustration from choose-agency page

### Currency & Formatting
- Centralized currency formatting into a shared utility (no more scattered formatting logic)
- Multi-currency support: INR for India, USD for rest of world
- Fixed hardcoded INR fallbacks across finance components — now uses agency locale currency
- Fixed currency defaults and rate display on campaign finance pages
- Fixed approvals tab showing incorrect pending count

### Onboarding & Sample Data
- Fixed resilient has_dummy_data queries and detailed seed error messages
- Fixed orphaned dummy data cleanup before seeding (prevents duplicate key errors)
- Cleanup now matches dummy data by name/email in addition to is_dummy flag
- Fixed timezone and languageCode passing to updateAgencyLocale during onboarding
- Fixed is_primary_contact flag on non-primary dummy contacts

---

## Testing Notes

### Key Flows to Test
1. **New agency onboarding**: Sign up → onboarding wizard → seed sample data → explore dashboard
2. **Edit project**: Projects → open project → "Edit Project" from header dropdown → modify fields → save
3. **Edit campaign**: Campaigns list → 3-dot menu → Edit → edit drawer opens → modify → save
4. **Budget tracking**: Create project with budget → create campaigns with budgets → verify allocation on project Budget tab
5. **Finance overview**: Project Budget tab → verify Committed/Paid/Expenses/Remaining columns per campaign
6. **Budget visualization**: Project Overview tab → verify pie chart and segmented allocation bar
7. **Team invites**: Settings → Team → invite by email → verify new user can sign up and auto-join
8. **Subscription flow**: Settings → Billing → select plan → complete Razorpay payment
9. **Admin panel**: Access admin URL → verify agency list, trial management, plan editing

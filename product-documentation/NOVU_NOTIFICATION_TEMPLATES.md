# Novu Notification Templates

This document contains all HTML email templates and In-App notification configurations for Truleado's Novu workflows.

## Important Notes

### Variable Format
All variables in Novu templates use the format: `{{payload.variableName}}`

### URL Handling
- **baseUrl + actionUrl**: All workflows now pass `baseUrl` (full origin like `https://app.truleado.com`) and `actionUrl` (relative path like `/dashboard/deliverables/123`)
- **Email templates**: Use `{{payload.baseUrl}}{{payload.actionUrl}}` for CTA buttons
- **In-App notifications**: Can use just `{{payload.actionUrl}}` (relative) since they're rendered in-app
- **Magic Links**: Authentication workflows pass complete Firebase magic links directly

### Current Payload Variables by Workflow

| Workflow | Variables Passed |
|----------|------------------|
| deliverable-comment | recipientName, deliverableTitle, campaignName, commentByName, message, baseUrl, actionUrl |
| deliverable-rejected-creator | creatorName, deliverableTitle, approverName, comment, baseUrl, actionUrl |
| deliverable-approved-creator | creatorName, deliverableTitle, approverName, comment, baseUrl, actionUrl |
| deliverable-assigned | creatorName, deliverableTitle, campaignName, dueDate, baseUrl, actionUrl |
| creator-magic-link | email, link, expiresInMinutes |
| proposal-rejected | creatorName, campaignName, reason, baseUrl, actionUrl |
| proposal-countered | creatorName, campaignName, rateAmount, rateCurrency, baseUrl, actionUrl |
| proposal-accepted | creatorName, campaignName, baseUrl, actionUrl |
| proposal-sent | creatorName, campaignName, rateAmount (formatted), rateCurrency, actionUrl (full URL) |
| client-magic-link | email, magicLink, expiresInMinutes, sentAt |
| approval-rejected | deliverableId, deliverableTitle, decidedByName, comment, baseUrl, actionUrl |
| approval-approved | deliverableId, deliverableTitle, decidedByName, comment, baseUrl, actionUrl |
| approval-requested | deliverableId, deliverableTitle, campaignId, approvalLevel, baseUrl, actionUrl |
| version-uploaded | recipientName, deliverableTitle, campaignName, creatorName, versionNumber, baseUrl, actionUrl |

---

## 1. deliverable-comment

### Payload Variables
```json
{
  "recipientName": "string",
  "deliverableTitle": "string",
  "campaignName": "string",
  "commentByName": "string",
  "message": "string",
  "actionUrl": "string (full URL with baseUrl prepended)"
}
```

### Email Template

**Subject:** New comment on "{{payload.deliverableTitle}}"

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Comment on Deliverable</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">New Comment</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                Hi {{payload.recipientName}},
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                <strong>{{payload.commentByName}}</strong> left a comment on <strong>"{{payload.deliverableTitle}}"</strong> in the campaign <strong>{{payload.campaignName}}</strong>.
              </p>
              <!-- Comment Box -->
              <div style="background-color: #f4f4f5; border-left: 4px solid #6366f1; padding: 16px 20px; margin: 0 0 24px; border-radius: 0 4px 4px 0;">
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #52525b; font-style: italic;">
                  "{{payload.message}}"
                </p>
              </div>
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #6366f1;">
                    <a href="{{payload.actionUrl}}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      View & Reply
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
                You're receiving this because you're part of this deliverable workflow.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### In-App Notification

**Configuration:** Use full action URL (notification click opens deliverable)

```json
{
  "body": "{{payload.commentByName}} commented on \"{{payload.deliverableTitle}}\": \"{{payload.message}}\"",
  "avatar": null,
  "redirect": {
    "url": "{{payload.actionUrl}}"
  }
}
```

---

## 2. deliverable-rejected-creator

### Payload Variables
```json
{
  "creatorName": "string",
  "deliverableTitle": "string",
  "approverName": "string",
  "comment": "string",
  "baseUrl": "string",
  "actionUrl": "string"
}
```

### Email Template

**Subject:** Revision requested for "{{payload.deliverableTitle}}"

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deliverable Revision Requested</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
              <div style="display: inline-block; padding: 6px 12px; background-color: #fef2f2; border-radius: 4px; margin-bottom: 16px;">
                <span style="font-size: 13px; font-weight: 600; color: #dc2626;">REVISION REQUESTED</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">{{payload.deliverableTitle}}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                Hi {{payload.creatorName}},
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                <strong>{{payload.approverName}}</strong> has requested revisions on your deliverable.
              </p>
              <!-- Feedback Box -->
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px 20px; margin: 0 0 24px; border-radius: 0 4px 4px 0;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #991b1b; text-transform: uppercase;">Feedback</p>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #7f1d1d;">
                  {{payload.comment}}
                </p>
              </div>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                Please review the feedback and upload a revised version.
              </p>
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #6366f1;">
                    <a href="{{payload.baseUrl}}{{payload.actionUrl}}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      View Deliverable
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
                You're receiving this because this deliverable is assigned to you.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### In-App Notification

**Configuration:** Use primary action button + notification redirect

```json
{
  "body": "{{payload.approverName}} requested revisions on \"{{payload.deliverableTitle}}\". Feedback: {{payload.comment}}",
  "avatar": null,
  "redirect": {
    "url": "{{payload.actionUrl}}"
  },
  "primaryAction": {
    "label": "View & Revise",
    "redirect": {
      "url": "{{payload.actionUrl}}"
    }
  }
}
```

---

## 3. deliverable-approved-creator

### Payload Variables
```json
{
  "creatorName": "string",
  "deliverableTitle": "string",
  "approverName": "string",
  "comment": "string (optional)",
  "baseUrl": "string",
  "actionUrl": "string"
}
```

### Email Template

**Subject:** Your deliverable "{{payload.deliverableTitle}}" was approved!

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deliverable Approved</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
              <div style="display: inline-block; padding: 6px 12px; background-color: #f0fdf4; border-radius: 4px; margin-bottom: 16px;">
                <span style="font-size: 13px; font-weight: 600; color: #16a34a;">APPROVED</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">{{payload.deliverableTitle}}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                Hi {{payload.creatorName}},
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                Great news! <strong>{{payload.approverName}}</strong> has approved your deliverable.
              </p>
              <!-- Comment Box (shows if comment exists) -->
              <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px 20px; margin: 0 0 24px; border-radius: 0 4px 4px 0;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #166534; text-transform: uppercase;">Comment</p>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #166534;">
                  {{payload.comment}}
                </p>
              </div>
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #16a34a;">
                    <a href="{{payload.baseUrl}}{{payload.actionUrl}}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      View Deliverable
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
                You're receiving this because this deliverable is assigned to you.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### In-App Notification

**Configuration:** Simple notification with redirect

```json
{
  "body": "Your deliverable \"{{payload.deliverableTitle}}\" was approved by {{payload.approverName}}!",
  "avatar": null,
  "redirect": {
    "url": "{{payload.actionUrl}}"
  }
}
```

---

## 4. deliverable-assigned

### Payload Variables
```json
{
  "creatorName": "string",
  "deliverableTitle": "string",
  "campaignName": "string",
  "dueDate": "string (optional, ISO date)",
  "baseUrl": "string",
  "actionUrl": "string"
}
```

### Email Template

**Subject:** New deliverable assigned: "{{payload.deliverableTitle}}"

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Deliverable Assigned</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
              <div style="display: inline-block; padding: 6px 12px; background-color: #eff6ff; border-radius: 4px; margin-bottom: 16px;">
                <span style="font-size: 13px; font-weight: 600; color: #2563eb;">NEW ASSIGNMENT</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">{{payload.deliverableTitle}}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                Hi {{payload.creatorName}},
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                You've been assigned a new deliverable for the campaign <strong>{{payload.campaignName}}</strong>.
              </p>
              <!-- Details Box -->
              <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 0 0 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="font-size: 13px; color: #71717a; text-transform: uppercase; font-weight: 600;">Campaign</span>
                      <p style="margin: 4px 0 0; font-size: 15px; color: #18181b;">{{payload.campaignName}}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="font-size: 13px; color: #71717a; text-transform: uppercase; font-weight: 600;">Deliverable</span>
                      <p style="margin: 4px 0 0; font-size: 15px; color: #18181b;">{{payload.deliverableTitle}}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="font-size: 13px; color: #71717a; text-transform: uppercase; font-weight: 600;">Due Date</span>
                      <p style="margin: 4px 0 0; font-size: 15px; color: #18181b;">{{payload.dueDate}}</p>
                    </td>
                  </tr>
                </table>
              </div>
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #6366f1;">
                    <a href="{{payload.baseUrl}}{{payload.actionUrl}}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      View Deliverable
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
                You're receiving this because you're a creator for this campaign.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### In-App Notification

**Configuration:** Use primary action button

```json
{
  "body": "You've been assigned a new deliverable: \"{{payload.deliverableTitle}}\" for {{payload.campaignName}}. Due: {{payload.dueDate}}",
  "avatar": null,
  "redirect": {
    "url": "{{payload.actionUrl}}"
  },
  "primaryAction": {
    "label": "View Assignment",
    "redirect": {
      "url": "{{payload.actionUrl}}"
    }
  }
}
```

---

## 5. creator-magic-link

### Payload Variables
```json
{
  "email": "string",
  "link": "string (full Firebase magic link URL)",
  "expiresInMinutes": "number (60)"
}
```

### Email Template

**Subject:** Sign in to Creator Portal

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to Creator Portal</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">Sign in to Creator Portal</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #3f3f46; text-align: center;">
                Click the button below to securely sign in to your Creator Portal.
              </p>
              <p style="margin: 0 0 32px; font-size: 14px; line-height: 1.5; color: #71717a; text-align: center;">
                This link will expire in {{payload.expiresInMinutes}} minutes.
              </p>
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background-color: #6366f1;">
                    <a href="{{payload.link}}" target="_blank" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Sign In
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 32px 0 0; font-size: 14px; line-height: 1.5; color: #71717a; text-align: center;">
                If you didn't request this link, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #71717a; text-align: center;">
                This magic link was requested for: {{payload.email}}
              </p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                If the button doesn't work, copy and paste this URL into your browser:<br>
                <span style="word-break: break-all;">{{payload.link}}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### In-App Notification

**Not applicable** - Magic links are email-only for authentication.

---

## 6. proposal-rejected

### Payload Variables
```json
{
  "creatorName": "string",
  "campaignName": "string",
  "reason": "string",
  "baseUrl": "string",
  "actionUrl": "string"
}
```

### Email Template

**Subject:** {{payload.creatorName}} declined the proposal for "{{payload.campaignName}}"

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposal Declined</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
              <div style="display: inline-block; padding: 6px 12px; background-color: #fef2f2; border-radius: 4px; margin-bottom: 16px;">
                <span style="font-size: 13px; font-weight: 600; color: #dc2626;">PROPOSAL DECLINED</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">{{payload.campaignName}}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                <strong>{{payload.creatorName}}</strong> has declined the proposal for <strong>{{payload.campaignName}}</strong>.
              </p>
              <!-- Reason Box -->
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px 20px; margin: 0 0 24px; border-radius: 0 4px 4px 0;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #991b1b; text-transform: uppercase;">Reason</p>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #7f1d1d;">
                  {{payload.reason}}
                </p>
              </div>
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #6366f1;">
                    <a href="{{payload.baseUrl}}{{payload.actionUrl}}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      View Campaign
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
                You're receiving this because you manage this campaign.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### In-App Notification

**Configuration:** Simple notification with redirect

```json
{
  "body": "{{payload.creatorName}} declined the proposal for \"{{payload.campaignName}}\". Reason: {{payload.reason}}",
  "avatar": null,
  "redirect": {
    "url": "{{payload.actionUrl}}"
  }
}
```

---

## 7. proposal-countered

### Payload Variables
```json
{
  "creatorName": "string",
  "campaignName": "string",
  "rateAmount": "number (optional, in smallest currency unit)",
  "rateCurrency": "string (optional, e.g., 'INR', 'USD')",
  "baseUrl": "string",
  "actionUrl": "string"
}
```

### Email Template

**Subject:** {{payload.creatorName}} countered the proposal for "{{payload.campaignName}}"

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposal Counter Received</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
              <div style="display: inline-block; padding: 6px 12px; background-color: #fef3c7; border-radius: 4px; margin-bottom: 16px;">
                <span style="font-size: 13px; font-weight: 600; color: #d97706;">COUNTER PROPOSAL</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">{{payload.campaignName}}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                <strong>{{payload.creatorName}}</strong> has submitted a counter proposal for <strong>{{payload.campaignName}}</strong>.
              </p>
              <!-- Rate Box -->
              <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 16px 20px; margin: 0 0 24px; border-radius: 0 4px 4px 0;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #92400e; text-transform: uppercase;">Proposed Rate</p>
                <p style="margin: 0; font-size: 20px; font-weight: 600; color: #78350f;">
                  {{payload.rateCurrency}} {{payload.rateAmount}}
                </p>
              </div>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                Review the counter proposal and respond to the creator.
              </p>
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #6366f1;">
                    <a href="{{payload.baseUrl}}{{payload.actionUrl}}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Review Counter
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
                You're receiving this because you manage this campaign.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### In-App Notification

**Configuration:** Use primary action button

```json
{
  "body": "{{payload.creatorName}} countered the proposal for \"{{payload.campaignName}}\" with {{payload.rateCurrency}} {{payload.rateAmount}}",
  "avatar": null,
  "redirect": {
    "url": "{{payload.actionUrl}}"
  },
  "primaryAction": {
    "label": "Review",
    "redirect": {
      "url": "{{payload.actionUrl}}"
    }
  }
}
```

---

## 8. proposal-accepted

### Payload Variables
```json
{
  "creatorName": "string",
  "campaignName": "string",
  "baseUrl": "string",
  "actionUrl": "string"
}
```

### Email Template

**Subject:** {{payload.creatorName}} accepted the proposal for "{{payload.campaignName}}"

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposal Accepted</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
              <div style="display: inline-block; padding: 6px 12px; background-color: #f0fdf4; border-radius: 4px; margin-bottom: 16px;">
                <span style="font-size: 13px; font-weight: 600; color: #16a34a;">PROPOSAL ACCEPTED</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">{{payload.campaignName}}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                Great news! <strong>{{payload.creatorName}}</strong> has accepted the proposal for <strong>{{payload.campaignName}}</strong>.
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                You can now assign deliverables to this creator.
              </p>
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #16a34a;">
                    <a href="{{payload.baseUrl}}{{payload.actionUrl}}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      View Campaign
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
                You're receiving this because you manage this campaign.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### In-App Notification

**Configuration:** Simple notification with redirect

```json
{
  "body": "{{payload.creatorName}} accepted the proposal for \"{{payload.campaignName}}\"! You can now assign deliverables.",
  "avatar": null,
  "redirect": {
    "url": "{{payload.actionUrl}}"
  }
}
```

---

## 9. proposal-sent

### Payload Variables
```json
{
  "creatorName": "string",
  "campaignName": "string",
  "rateAmount": "string (formatted, e.g., '₹500')",
  "rateCurrency": "string (e.g., 'INR')",
  "actionUrl": "string (full URL)"
}
```

### Email Template

**Subject:** You've received a proposal for "{{payload.campaignName}}"

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Proposal</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
              <div style="display: inline-block; padding: 6px 12px; background-color: #eff6ff; border-radius: 4px; margin-bottom: 16px;">
                <span style="font-size: 13px; font-weight: 600; color: #2563eb;">NEW PROPOSAL</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">{{payload.campaignName}}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                Hi {{payload.creatorName}},
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                You've received a new proposal for the campaign <strong>{{payload.campaignName}}</strong>.
              </p>
              <!-- Rate Box -->
              <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 0 0 24px; border-radius: 0 4px 4px 0;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #1e40af; text-transform: uppercase;">Proposed Rate</p>
                <p style="margin: 0; font-size: 24px; font-weight: 700; color: #1e3a8a;">
                  {{payload.rateAmount}}
                </p>
              </div>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                Review the proposal details and respond at your convenience.
              </p>
              <!-- CTA Buttons -->
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #6366f1;">
                    <a href="{{payload.actionUrl}}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      View Proposal
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
                You're receiving this because you're a creator in our network.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### In-App Notification

**Configuration:** Use primary and secondary action buttons

```json
{
  "body": "You've received a new proposal for \"{{payload.campaignName}}\" at {{payload.rateAmount}}",
  "avatar": null,
  "redirect": {
    "url": "{{payload.actionUrl}}"
  },
  "primaryAction": {
    "label": "View Proposal",
    "redirect": {
      "url": "{{payload.actionUrl}}"
    }
  }
}
```

---

## 10. client-magic-link

### Payload Variables
```json
{
  "email": "string",
  "magicLink": "string (full Firebase magic link URL)",
  "expiresInMinutes": "number (60)",
  "sentAt": "string (ISO timestamp)"
}
```

### Email Template

**Subject:** Sign in to Approve Deliverables

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to Client Portal</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">Sign in to Client Portal</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #3f3f46; text-align: center;">
                Click the button below to securely sign in and review deliverables awaiting your approval.
              </p>
              <p style="margin: 0 0 32px; font-size: 14px; line-height: 1.5; color: #71717a; text-align: center;">
                This link will expire in {{payload.expiresInMinutes}} minutes.
              </p>
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background-color: #6366f1;">
                    <a href="{{payload.magicLink}}" target="_blank" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Sign In & Review
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 32px 0 0; font-size: 14px; line-height: 1.5; color: #71717a; text-align: center;">
                If you didn't request this link, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #71717a; text-align: center;">
                This magic link was requested for: {{payload.email}}
              </p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                If the button doesn't work, copy and paste this URL into your browser:<br>
                <span style="word-break: break-all;">{{payload.magicLink}}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### In-App Notification

**Not applicable** - Magic links are email-only for authentication.

---

## 11. approval-rejected

### Payload Variables
```json
{
  "deliverableId": "string",
  "deliverableTitle": "string",
  "decidedByName": "string",
  "comment": "string (optional)",
  "baseUrl": "string",
  "actionUrl": "string"
}
```

### Email Template

**Subject:** Approval rejected for "{{payload.deliverableTitle}}"

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Approval Rejected</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
              <div style="display: inline-block; padding: 6px 12px; background-color: #fef2f2; border-radius: 4px; margin-bottom: 16px;">
                <span style="font-size: 13px; font-weight: 600; color: #dc2626;">REJECTED</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">{{payload.deliverableTitle}}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                <strong>{{payload.decidedByName}}</strong> has rejected the deliverable <strong>"{{payload.deliverableTitle}}"</strong>.
              </p>
              <!-- Feedback Box -->
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px 20px; margin: 0 0 24px; border-radius: 0 4px 4px 0;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #991b1b; text-transform: uppercase;">Feedback</p>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #7f1d1d;">
                  {{payload.comment}}
                </p>
              </div>
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #6366f1;">
                    <a href="{{payload.baseUrl}}{{payload.actionUrl}}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      View Deliverable
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
                You're receiving this because you're part of this approval workflow.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### In-App Notification

**Configuration:** Use primary action button

```json
{
  "body": "{{payload.decidedByName}} rejected \"{{payload.deliverableTitle}}\": {{payload.comment}}",
  "avatar": null,
  "redirect": {
    "url": "{{payload.actionUrl}}"
  },
  "primaryAction": {
    "label": "View",
    "redirect": {
      "url": "{{payload.actionUrl}}"
    }
  }
}
```

---

## 12. approval-approved

### Payload Variables
```json
{
  "deliverableId": "string",
  "deliverableTitle": "string",
  "decidedByName": "string",
  "comment": "string (optional)",
  "baseUrl": "string",
  "actionUrl": "string"
}
```

### Email Template

**Subject:** "{{payload.deliverableTitle}}" has been approved

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deliverable Approved</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
              <div style="display: inline-block; padding: 6px 12px; background-color: #f0fdf4; border-radius: 4px; margin-bottom: 16px;">
                <span style="font-size: 13px; font-weight: 600; color: #16a34a;">APPROVED</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">{{payload.deliverableTitle}}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                <strong>{{payload.decidedByName}}</strong> has approved the deliverable <strong>"{{payload.deliverableTitle}}"</strong>.
              </p>
              <!-- Comment Box -->
              <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px 20px; margin: 0 0 24px; border-radius: 0 4px 4px 0;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #166534; text-transform: uppercase;">Comment</p>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #166534;">
                  {{payload.comment}}
                </p>
              </div>
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #16a34a;">
                    <a href="{{payload.baseUrl}}{{payload.actionUrl}}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      View Deliverable
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
                You're receiving this because you're part of this approval workflow.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### In-App Notification

**Configuration:** Simple notification with redirect

```json
{
  "body": "{{payload.decidedByName}} approved \"{{payload.deliverableTitle}}\": {{payload.comment}}",
  "avatar": null,
  "redirect": {
    "url": "{{payload.actionUrl}}"
  }
}
```

---

## 13. approval-requested

### Payload Variables
```json
{
  "deliverableId": "string",
  "deliverableTitle": "string",
  "campaignId": "string",
  "approvalLevel": "string ('internal', 'project', 'client')",
  "baseUrl": "string",
  "actionUrl": "string"
}
```

### Email Template

**Subject:** Approval requested for "{{payload.deliverableTitle}}"

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Approval Requested</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
              <div style="display: inline-block; padding: 6px 12px; background-color: #fef3c7; border-radius: 4px; margin-bottom: 16px;">
                <span style="font-size: 13px; font-weight: 600; color: #d97706;">APPROVAL NEEDED</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">{{payload.deliverableTitle}}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                A deliverable is awaiting your approval. Please review and provide your decision.
              </p>
              <!-- Details Box -->
              <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 0 0 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="font-size: 13px; color: #71717a; text-transform: uppercase; font-weight: 600;">Deliverable</span>
                      <p style="margin: 4px 0 0; font-size: 15px; color: #18181b;">{{payload.deliverableTitle}}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="font-size: 13px; color: #71717a; text-transform: uppercase; font-weight: 600;">Approval Level</span>
                      <p style="margin: 4px 0 0; font-size: 15px; color: #18181b; text-transform: capitalize;">{{payload.approvalLevel}}</p>
                    </td>
                  </tr>
                </table>
              </div>
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #6366f1;">
                    <a href="{{payload.baseUrl}}{{payload.actionUrl}}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Review & Approve
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
                You're receiving this because you're an approver for this deliverable.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### In-App Notification

**Configuration:** Use primary and secondary action buttons for approve/reject

```json
{
  "body": "\"{{payload.deliverableTitle}}\" is awaiting your {{payload.approvalLevel}} approval",
  "avatar": null,
  "redirect": {
    "url": "{{payload.actionUrl}}"
  },
  "primaryAction": {
    "label": "Review",
    "redirect": {
      "url": "{{payload.actionUrl}}"
    }
  }
}
```

---

## 14. version-uploaded

### Payload Variables
```json
{
  "recipientName": "string",
  "deliverableTitle": "string",
  "campaignName": "string",
  "creatorName": "string",
  "versionNumber": "number",
  "baseUrl": "string",
  "actionUrl": "string"
}
```

### Email Template

**Subject:** New version uploaded for "{{payload.deliverableTitle}}"

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Version Uploaded</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
              <div style="display: inline-block; padding: 6px 12px; background-color: #eff6ff; border-radius: 4px; margin-bottom: 16px;">
                <span style="font-size: 13px; font-weight: 600; color: #2563eb;">NEW VERSION</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">{{payload.deliverableTitle}}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                Hi {{payload.recipientName}},
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                <strong>{{payload.creatorName}}</strong> has uploaded a new version of <strong>"{{payload.deliverableTitle}}"</strong> for the campaign <strong>{{payload.campaignName}}</strong>.
              </p>
              <!-- Version Box -->
              <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 0 0 24px; border-radius: 0 4px 4px 0;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #1e40af; text-transform: uppercase;">Version Number</p>
                <p style="margin: 0; font-size: 24px; font-weight: 700; color: #1e3a8a;">
                  v{{payload.versionNumber}}
                </p>
              </div>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                Review the new version and provide feedback or submit for approval.
              </p>
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #6366f1;">
                    <a href="{{payload.baseUrl}}{{payload.actionUrl}}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Review Version
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
                You're receiving this because you're part of the agency team managing this campaign.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### In-App Notification

**Configuration:** Use primary action button

```json
{
  "body": "{{payload.creatorName}} uploaded v{{payload.versionNumber}} of \"{{payload.deliverableTitle}}\" for {{payload.campaignName}}",
  "avatar": null,
  "redirect": {
    "url": "{{payload.actionUrl}}"
  },
  "primaryAction": {
    "label": "Review",
    "redirect": {
      "url": "{{payload.actionUrl}}"
    }
  }
}
```

---

## Novu Workflow Configuration Summary

| Workflow ID | Email | In-App | Action Buttons |
|-------------|-------|--------|----------------|
| deliverable-comment | Yes | Yes | None (redirect only) |
| deliverable-rejected-creator | Yes | Yes | View & Revise |
| deliverable-approved-creator | Yes | Yes | None (redirect only) |
| deliverable-assigned | Yes | Yes | View Assignment |
| creator-magic-link | Yes | No | N/A |
| proposal-rejected | Yes | Yes | None (redirect only) |
| proposal-countered | Yes | Yes | Review |
| proposal-accepted | Yes | Yes | None (redirect only) |
| proposal-sent | Yes | Yes | View Proposal |
| client-magic-link | Yes | No | N/A |
| approval-rejected | Yes | Yes | View |
| approval-approved | Yes | Yes | None (redirect only) |
| approval-requested | Yes | Yes | Review |
| version-uploaded | Yes | Yes | Review |

---

## Testing Checklist

For each workflow:
- [ ] Verify all payload variables are being passed from code
- [ ] Test email rendering in different email clients (Gmail, Outlook, Apple Mail)
- [ ] Test In-App notification display
- [ ] Verify action URLs work correctly (localhost, staging, production)
- [ ] Test with missing optional variables (graceful degradation)
- [ ] Verify subject lines display correctly with variable substitution

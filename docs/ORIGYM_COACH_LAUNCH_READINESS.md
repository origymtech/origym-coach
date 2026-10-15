# OriGym Coach V1 launch readiness

## Account access and recovery

### Current production controls

- Sign-up requires a one-use invite code.
- Passkey and password sign-in are enabled.
- An administrator can issue a one-use, 24-hour password-reset code from **Admin → Users**.
- The user redeems that code from **Sign in with password → Have a reset code from your admin?**.
- Recovery codes must be given to the verified account holder only. Do not send them to an unverified address or in a public/support thread.

### Before student launch

- Require an email address for every new account.
- Verify that address before it becomes a recovery destination.
- Provide an automated **Forgot password** email with a single-use, short-lived reset link.
- Record the provider, sender domain, retention and support escalation path in the privacy notice.

### Support procedure: lost access

1. Confirm the person against the enrolment record using OriGym's approved support process.
2. In **Admin → Users**, open the relevant user and issue a password-reset code.
3. Give the code only through the approved verified-contact channel.
4. Ask the user to set a new password and immediately add a replacement passkey.
5. Record the support case reference outside the training data. Do not put personal verification details in the Coach activity log.

## Student invite message

**Subject:** Your OriGym Coach invitation

Hello [First name],

You have been invited to OriGym Coach. Use the one-time code below to create your profile:

**[INVITE CODE]**

1. Go to `https://coach.origym.co.uk`
2. Select **Create new profile**
3. Enter your name, email address, password and invite code
4. Read and accept the Terms of Use and Privacy Notice
5. Add a passkey when prompted for quicker future sign-in

Keep your invite code private. It works once.

If you need help, contact [SUPPORT CONTACT].

## Technical readiness

### Confirmed

- Cloud Run resolves the production tenant from the served hostname.
- Runtime records and training-state documents are tenant-scoped PostgreSQL records.
- Cloud SQL has daily backups, seven-day retention, point-in-time recovery and retained backups on deletion.
- Query Insights is enabled.
- Alerts are configured for repeated Cloud Run 5xx errors and sustained Cloud SQL CPU pressure.

### Still required

- Perform and document a restore to a temporary Cloud SQL instance, then remove the temporary instance. Attempted on 8 October 2026 using automated backup `1791428400000`; Google Cloud returned HTTP 503 twice before creating an instance. Retry from the Cloud Console or CLI during the next maintenance window.
- Verify that `tech@origym.co.uk` receives and acknowledges a test monitoring alert.
- Run a staff test: invite, password sign-in, passkey sign-in, password reset, workout sync and account deletion.
- Obtain legal review and approval of the published Terms of Use and Privacy Notice before inviting students.

### Product and mobile review

- The settings screen no longer includes the upstream Android download, app-pairing, update or openGym attribution sections.
- OriGym branding, app icon and favicon are live.
- Test the current production app on iPhone Safari, Android Chrome and a desktop browser before release. Cover registration, sign-in, an interrupted workout, sync, password reset, text scaling and keyboard-only navigation.
- Log defects with device, browser version, screen, expected behaviour and a screenshot.

## Legal sign-off checklist

- Confirm controller identity and contact details.
- Confirm data categories, purposes, lawful basis, retention and deletion process.
- Confirm processor/subprocessor disclosures: Google Cloud, Cloudflare and any selected email provider.
- Confirm user rights and the route for access, correction, export and deletion requests.
- Publish approved immutable document versions in OriGym Coach and retain acceptance records.

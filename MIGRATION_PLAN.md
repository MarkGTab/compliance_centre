# Compliance Centre — migration off Base44 (rough plan)

**Status:** draft v2 for estimating (updated with answers 29 Oct) · **Source reviewed:** `safe-fiery-guard-flow.zip` (Base44 export of
"RiskRegister Pro", 29 Oct 2026) · **Author:** Claude Code for mg@tabhq.com

## 1. What we're migrating

| Part | Size | Base44 dependency |
|---|---|---|
| React frontend (React 18, Vite, Tailwind, shadcn/ui, React Query, Recharts) | ~40 pages, ~15k lines excl. `components/ui` | `@base44/sdk` for **every** read/write (≈ 300 call sites), auth, file upload, AI, realtime |
| Entities (`base44/entities/*.jsonc`) | 29 schemas | Base44's hosted database + row-level security rules |
| Functions (`base44/functions/*/entry.ts`) | 26 Deno functions | Base44 runtime, `asServiceRole`, `Core.SendEmail` |
| Workflows (`base44/workflows/*.jsonc`) | 15 (13 cron, 2 entity-change triggers) | Base44 scheduler / event bus |

Platform services in use, and the replacement for each:

| Base44 service | Used for | Replacement |
|---|---|---|
| `base44.auth.*` (email/password, OTP, Google, invites, reset) | Login, Register, ForgotPassword, ResetPassword, OAuthConsent pages | **Cloudflare Access** (Entra + `@tabhq.com`), JWT verified server-side, same as `reporting`'s `src/Auth/Identity.php`. All six auth pages are **deleted**, not ported |
| `entities.X.list/filter/get/create/update/delete/bulk*` | All data | REST API on our own DB (see §3) |
| `entities.X.subscribe` (realtime, 21 uses) | Live refresh of registers/top bar | Drop it: React Query refetch on focus or after mutation. No websockets needed |
| `Core.SendEmail` (15 uses) | All notifications | Our mailer (Laravel Mail via the existing M365/SMTP setup) |
| `Core.UploadFile` (4 uses) | Policy/insurance docs, gift evidence, meeting packs | **S3 + the existing `doc_store` table** (see §3a) |
| `Core.InvokeLLM` (6 uses) | AI assists: risk wording, register/conflict import parsing, policy/insurance/gift doc extraction | Server-side Anthropic API proxy (same pattern as `reporting`'s `InsightsProxy`) |
| Scheduler + entity triggers | 15 workflows | Cron (Laravel scheduler) + model observers |

## 2. People, departments and roles: reuse existing tables

The Base44 app keeps its own copy of staff (`Employee`), departments (`Department`) and logins (`User`).
All three overlap with the TAB staff directory that already exists (`tab_employees` on the `narrative`
connection, exposed as `vw_tab_employees` in `reporting`).

### Employee → `tab_employees` (reuse, no copy)

| Base44 `Employee` field | Existing source | Notes |
|---|---|---|
| `id` | `tab_employees.id` | **Every owner/assignee FK in the app points here** (≈ 25 fields across 15 entities) |
| `full_name` | `given_names` + `family_name` | |
| `job_title` | `title` | Confirm `title` is the job title, not Mr/Ms |
| `department` | `department_id` | |
| `line_manager` | `line_manager_id` | |
| `status` (Active/Leaver) | `end_date` / `disabled` / `deleted_at` | Leaver = `end_date <= today` or `disabled = 1` (confirm the rule) |
| `mobile` | `work_number` / `phone_number` | |
| `email` | `tab_employees` email column | ✅ **Confirmed: exists on the base table** (just not exposed in `vw_tab_employees`). Used for notifications and to map the Cloudflare Access identity to an employee |
| `linked_user`, `requires_login` | n/a | Not needed: Cloudflare Access means every employee can sign in, with no separate user records or invites |

### Department → existing departments table + small extension

`tab_employees.department_id` already points at a departments table. Confirm its name and columns
(`vw_tab_employees.department` gives the name). Two Base44 fields don't exist there: `head` (→
employee) and `line_of_defence` (First/Second/Third). Either add them as columns or keep them in a
`cc_department_settings` extension table (recommended, so the shared table isn't touched).

### User / roles / permissions → new, small, keyed by email

* `User.role` (`admin | risk_team | department_head | read_only`) → `cc_user_role (email, role)`.
  (`reporting/sql_definitions/rbac.sql` has unused `rbac_role`/`rbac_user_role` that could be reused
  instead if you want one RBAC for both apps.)
* `Permission` (per-user, per-section `can_view`/`can_edit`, 33 sections) → `cc_permission (email,
  section, can_view, can_edit)`.

### Functions that disappear because of this

`migrateEmployeesFromUsers`, `migrateRegistersToEmployees`, `inviteEmployeeUsers`, plus the
test-data tooling `getTestDataCounts` and `deleteAllTestData`. That's **5 of the 26 functions not
ported**. `is_test_data` is dropped from every table (use a staging DB instead).

## 3. New tables (compliance schema)

**Recommendation:** a new `compliance` schema on the same Azure MySQL server as `narrative`, so
joins to `tab_employees` are cheap. Every `->Employee` column becomes `char(36)` holding a
`tab_employees.id`; every `->User` audit column (`last_modified_by`, `ChangeLog.user`) becomes the
editor's **email**.

| # | Table | From entity | Fields | Notes |
|---|---|---|---|---|
| 1 | `cc_risk` | Risk | 29 | self-FK `parent_risk`; scores calculated server-side |
| 2 | `cc_risk_category` | RiskCategory | 6 | |
| 3 | `cc_appetite` | Appetite | 8 | |
| 4 | `cc_control` | Control | 14 | `linked_risks` array → join table `cc_control_risk` |
| 5 | `cc_action` | Action | 10 | |
| 6 | `cc_incident` | Incident | 12 | |
| 7 | `cc_kri` / `cc_kri_reading` | KRI / KRIReading | 19 / 7 | `KRIReading.kri` is a bare string: make it a real FK |
| 8 | `cc_emerging_risk` | EmergingRisk | 7 | |
| 9 | `cc_third_party` | ThirdParty | 7 | |
| 10 | `cc_policy` | Policy | 18 | carries the gift/hospitality thresholds |
| 11 | `cc_insurance_policy` | InsurancePolicy | 19 | `linked_risks` → `cc_insurance_risk` |
| 12 | `cc_gift_declaration` | GiftHospitalityDeclaration | 28 | |
| 13 | `cc_conflict` | ConflictOfInterest | 10 | `person` is free text: consider an employee FK |
| 14 | `cc_committee` / `cc_standing_member` | Committee / StandingMember | 4 / 5 | |
| 15 | `cc_meeting` | Meeting | 14 | `attendees`/`apologies` arrays duplicate `Attendance`: drop them, use 16 |
| 16 | `cc_attendance` | Attendance | 7 | |
| 17 | `cc_decision` / `cc_decision_recusal` | Decision / DecisionRecusal | 6 / 5 | |
| 18 | `cc_board_action` | BoardAction | 11 | |
| 19 | `cc_attestation_campaign` | AttestationCampaign | 19 | 3 audience arrays → `cc_campaign_audience (campaign, type, value)` |
| 20 | `cc_attestation_response` | AttestationResponse | 16 | `user` dropped, `employee` kept |
| 21 | `cc_report_definition` | ReportDefinition | 11 | |
| 22 | `cc_change_log` | ChangeLog | 9 | append-only audit trail |
| 23 | `cc_user_role`, `cc_permission`, `cc_department_settings` | User / Permission / Department | — | §2 |

**About 26 tables** (21 entity tables + 4 join tables + roles/permissions). Plus standard `id`,
`created_at`, `updated_at`, `created_by`. Base44 adds `created_date`, `created_by` and `id`
implicitly, and the UI sorts on `-created_date`.

## 3a. Documents → S3 + `doc_store`

Answer: docs live in S3 via the `doc_store` table used across the platform (`narrative-qldb`
connection; model `App\Models\Ledger\DocStore` in `tabhq/main`, written through
`LedgerService::insert` so the ledger change-log applies). `doc_store` is already polymorphic,
so **no new columns are needed**:

| `doc_store` column | Compliance use |
|---|---|
| `doc_for` | compliance table name, e.g. `cc_policy`, `cc_insurance_policy`, `cc_gift_declaration`, `cc_meeting` |
| `doc_for_id` | the record's id |
| `doc_usage` | tags, e.g. `["Compliance", "Policy document"]` / `["Compliance", "Meeting pack"]` |
| `s3_path` | `compliance/<table>/<id>/<uuid>.<ext>` in the existing private bucket |
| `status` | `private` (served via `temporaryUrl`, as `DocStore::getS3TempUrl()` does) |
| `created_by` | `{ "account_id": "<editor email>", "created_at": … }` |

The Base44 URL fields `Policy.policy_document`, `InsurancePolicy.policy_document`,
`GiftHospitalityDeclaration.submission_document` and `Meeting.pack_attachment` are **dropped**:
documents are looked up by `doc_for`/`doc_for_id`, which also allows more than one document per record
(e.g. policy versions). `Control.evidence_link` stays a plain URL column (it links out, e.g. to
SharePoint). The policy/insurance "AI extract from document" assists read the file from S3
server-side.

## 4. New fields on EXISTING tables

**Result: none required.** For the record:

| Table | Field | Why | Needed? |
|---|---|---|---|
| `tab_employees` | ~~`work_email`~~ | — | ✅ **Not needed**: the email column already exists |
| `doc_store` | — | — | ✅ **Not needed**: `doc_for` / `doc_for_id` / `doc_usage` cover it (§3a) |
| departments table | `head_employee_id`, `line_of_defence` | Department owner + 3 lines of defence | Optional: avoided by `cc_department_settings` |

Everything else lives in the new `compliance` schema. No change to `reporting` views is needed for
the app itself. Exposing compliance data to `reporting` dashboards later (e.g. KRIs on the TV
rotation) would need new `rpt_*` views, built on the admin side.

## 5. Functions → backend jobs

| Kind | Functions | Replacement |
|---|---|---|
| **Scheduled (13)** | attestationReminderEscalate, reissueRecurringAttestations, remindBoardActions, notifyOverdueBoardActions, notifyOverdueActionOwners, giftCumulativeCheck, monthlyGiftDigest, insuranceRenewalReminders, updateInsuranceStatuses, weeklyInsuranceDigest, policyReviewReminders, updatePolicyStatuses, weeklyPolicyDigest | Scheduled commands, same cron times (Europe/London) |
| **On change (2)** | notifyGiftApproval, notifyGiftBreach | Model observer on gift declaration (status → BREACH / approval required) |
| **Called by UI (6)** | issueAttestationCampaign, submitAttestation, getPublicAttestation, submitPublicAttestation, savePermissions, handleEmployeeLeaver | API endpoints |
| **Dropped (5)** | migrate×2, inviteEmployeeUsers, getTestDataCounts, deleteAllTestData | §2 |

Most are small (50–130 lines) and of the same shape: load rows, filter by date, send email. The
shared `loadPeople()` helper (copied into every function) becomes one query on `tab_employees`.

**Leavers:** `handleEmployeeLeaver` is currently triggered by hand. Once people come from
`tab_employees`, it can run automatically on a nightly check of `end_date`.

## 6. Security / design decisions to make

1. **Public attestation magic links** (`/attest/<token>`, no login). Behind Cloudflare Access a
   public path needs its own **Bypass** application, which suppresses identity (see `reporting`
   CLAUDE.md). **Recommend dropping magic links**: every attestee is staff with Entra, so the email
   links to a signed-in "My Attestations" page and the signature is the verified identity, which is
   stronger audit evidence. This removes 2 functions and the public page.
2. **Read access is wide open in Base44.** Almost every entity has `read: true`, so any signed-in
   user can read *all* conflicts of interest, gift declarations and attestation responses via the
   API, whatever the UI hides. The migration is the moment to enforce section permissions
   **server-side**.
3. **Server-side authorisation.** Today the per-section `Permission` check is client-side only
   (`src/lib/permissions.js`). The API must enforce it.

## 7. Recommended target stack (to confirm)

* **Frontend: keep the React app.** Replace `@base44/sdk` with a thin `api` client exposing the same
  shape (`entities.Risk.list/filter/get/create/update/delete`). Most pages then need little or no
  change, which is the biggest single time-saver. (Rewriting it in Vue to match `reporting` would
  roughly double the frontend effort for no functional gain.)
* **Backend: Laravel** (the team already runs Laravel 10 in `tabhq/main`): migrations, Eloquent, mail,
  scheduler, policies for authorisation. A generic resource controller covers most CRUD.
* **Hosting:** same pattern as `reporting`: Apache + Cloudflare Tunnel/Access, GitHub Actions deploy.
* **Repo:** `compliance_centre` (this one).

## 8. Workstreams and rough effort

Estimates are developer-days for one developer who knows the stack, working with AI assistance.
Ranges reflect the open questions in §9.

| # | Workstream | Days |
|---|---|---|
| 0 | Setup: repo layout, Laravel skeleton, DB/schema, Cloudflare Access app, CI/deploy, dev/staging | 2–3 |
| 1 | Schema: ~26 migrations + models + relations, enums as constants | 3–4 |
| 2 | API: generic CRUD (list/filter/sort/bulk), server-side scoring, change-log, authorisation (roles + section permissions) | 4–6 |
| 3 | Frontend swap: SDK → API client adapter, AuthContext → `/api/me`, delete 6 auth pages, remove realtime, fix call sites | 4–6 |
| 4 | People integration: employees/departments from `tab_employees`, pickers, email mapping, leaver handling | 2–3 |
| 5 | Jobs + emails: 13 scheduled, 2 observers, 6 endpoints, email templates | 5–7 |
| 6 | Attestations rework (signed-in flow instead of magic link) | 2–3 |
| 7 | Files + AI: S3 upload/download via `doc_store` (+ ledger change-log), Anthropic proxy for 6 AI assists | 2–3 |
| 8 | ~~Data migration~~ (Base44 data is test data): seed reference data only (risk categories, committees, appetite, section permissions) | 1 |
| 9 | Testing, UAT with Compliance/Risk, parallel run, cutover | 5–8 |
| | **Total** | **≈ 30–43 days (≈ 6–9 weeks for one developer)** |

**Ways to bring it down:**
* Real registers can be loaded through the app's existing Excel import features (risk register,
  conflicts, employees) once it's live, so no Base44 export is needed.
* Phase it. **Phase 1:** Risk, Controls, KRIs, Actions, Incidents, Policies, Insurance (the
  registers). **Phase 2:** Board governance and attestations. **Phase 3:** report builder and AI
  assists.

## 9. Open questions (these move the estimate)

1. ~~Work email on `tab_employees`?~~ ✅ Exists.
2. ~~Live or test data?~~ ✅ Test data: no migration.
3. ~~File storage?~~ ✅ S3 + `doc_store`.
4. Email: which sending route (M365 SMTP / Graph, or the mailer `main` uses)?
5. Happy to drop magic-link attestations in favour of sign-in?
6. Laravel backend, or the lighter `reporting`-style PHP front controller?
7. Who in Compliance/Risk does UAT, and is a parallel run with Base44 needed?

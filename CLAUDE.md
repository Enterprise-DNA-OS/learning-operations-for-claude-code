# Learning Operations for Claude Code

A trusted operator desk for training demand, production capacity, investment and outcome reviews. Read docs/cli.md before a write. All answers start from the current CLI records.

## Recurring jobs

| Ask | Route |
|---|---|
| `/people` | Read the learning team, available hours and labour rates. |
| `/intake` | Read all requests and their decision status. |
| `/demand-review` | Prepare the weekly demand triage in priority and waiting-time order. |
| `/projects` | Read the learning production portfolio. |
| `/capacity-plan` | Plan the next four weeks from net weekly hours and assigned work. |
| `/allocations` | Read weekly project assignments. |
| `/time` | Read recorded production time. |
| `/budget-review` | Compare approved budgets with labour and external commitments. |
| `/costs` | Read external commitments and paid costs. |
| `/delivery-due` | Review delivery milestones and their evidence. |
| `/impact-review` | Review planned measurements and observed outcomes. |
| `/compliance` | Check purpose, retention reviews, accountable owners and safety training briefs. |
| `/attention` | Read stale requests, late milestones, budget exceptions and overdue evaluations. |
| `/history` | Read preserved Cognota source fields. |
| `/weekly-review` | Prepare the Monday demand, capacity, budget and impact meeting. |
| `/insights` | Answer ten cross-record business questions. |
| `/request` | Read a request with its projects, notes and original export fields. |
| `/add` | Read docs/cli.md. Write the operator-approved fields to a private JSON file, then add one record. Do not invent evidence or people. |
| `/amend-request` | Complete the owner, purpose, retention review date and safety brief before a decision. |
| `/decide-request` | Read the request and compliance checks. Record the explicit operator decision and reason. |
| `/start-project` | Read the approved request and plan, then record the operator decision to start. |
| `/complete-project` | Read milestones and evidence first. Complete only an active project whose delivery has been accepted. |
| `/complete-milestone` | Read the milestone, inspect the evidence, and record the operator acceptance. |
| `/pay-cost` | Record a payment already made elsewhere using its evidence. This command transfers no money. |
| `/log` | Append the operator-approved note to a request. |
| `/import` | Read docs/replace-cognota.md. Preview the actual export with --dry-run and check counts and mapped headers. Then run the import with an actor. Preserve the same workspace name across runs. |
| `/export` | Export the complete business record and audit history to an ignored local file. Keep it private. |
| `/draft-weekly-review` | Read demand-review, capacity-plan and budget-review first. Then write a draft with impact and overdue exceptions. Present the result in chat. |
| `/draft-brief` | Read the request, projects, notes and any source export. Produce a brief for human review. |
| `/customise` | Add a field or business rule through a migration. |
| `/new-view` | Add a read-only report. |

## Operating rules

- One CLI: scripts/learning.mjs. Do not create a second workflow path.
- Never invent an assessment, payment, decision, observed result or source record.
- Request approvals require an owner, purpose and retention review date. Safety work also needs risk, worker input and delivery method evidence.
- A project is approved work, not permission for someone to perform a hazardous activity. A database check is not a competence assessment.
- Use integer cents and explicit currencies. Never add different currencies together. Rates are captured on each allocation and time record.
- Weekly capacity is net of leave, public holidays and other duties as entered by the operator.
- An ambiguous reference lists candidates and stops. Use an exact code.
- Import previews roll back. Source updates preserve local decisions. Every raw source field remains in the history and audit trail.
- Actor labels are declared by the operator, not authenticated identity. Shared use needs separately configured access and backup controls.
- Drafts stay in drafts/. Nothing emails, pays a supplier, publishes a course or changes an outside system.
- Personal records, exports and credentials never go into Git. Retention reviews require a human decision, not automatic deletion.
- New schema changes use a new migration. Never disable a check to make a test pass.
- Tests and demo use a disposable local database and ignore DATABASE_URL. Production setup runs migrate only, never seed.

Built and supported through Omni by Enterprise DNA. https://enterprisedna.co/omni/instead-of/cognota

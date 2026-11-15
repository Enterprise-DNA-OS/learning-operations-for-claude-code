# CLI reference

Every command uses `npm run learning -- <command>`. Add `--json` for machine output. Flags use `--name=value`; unknown flags, duplicate flags and extra positional arguments fail. Partial UUIDs and case-insensitive names resolve only when unambiguous. Exact codes win.

Read commands: people, intake, demand-review, projects, capacity-plan, allocations, time, budget-review, costs, delivery-due, impact-review, compliance, attention, history, weekly-review, insights. `request <reference>` includes source fields, notes and projects.

## Writes

Every write requires `--actor=<operator>`. This is an audit label, not authentication. `add <entity> --file=<file.json>` accepts only the documented fields below. Relationship fields accept a code, partial UUID or unique name. Codes may be supplied or are generated. Dates are ISO YYYY-MM-DD, numbers are JSON numbers, money is nonnegative integer cents, and booleans are true or false.

- people: code, name, role, weekly_hours, hourly_cents, currency, active
- requests: code, title, business_unit, owner_id, purpose, priority, status, submitted_on, needed_on, review_on, safety_related, risk_brief, worker_input, delivery_method, decision
- projects: code, title, request_id, owner_id, start_on, due_on, budget_cents, currency, measure, baseline, target, measure_unit, direction, evaluation_on
- allocations: code, project_id, person_id, week_on, hours
- time_entries: code, project_id, person_id, worked_on, hours, note
- costs: code, title, project_id, amount_cents, evidence
- milestones: code, title, project_id, due_on
- outcomes: code, project_id, measured_on, actual, evidence
- notes: code, request_id, body

Project currency is fixed and must match assigned people. Rate snapshots are taken automatically. Weekly allocations must start on Monday, overlap the project dates and fit remaining capacity. Work dates cannot be in the future or before the project starts. Daily time cannot exceed 24 hours across records.

- `amend-request <request> --file=<file.json>` changes owner_id, purpose, review_on, risk_brief, worker_input, delivery_method or priority.
- `decide-request <request> --status=<status> --reason=<reason>` records the decision. Status: in_review, approved, waitlisted, declined, completed or cancelled. Resolve open projects before withdrawing a request.
- `start-project <project>` moves planned work to active.
- `complete-milestone <milestone> --evidence=<reference>` accepts delivery evidence.
- `complete-project <project>` requires active work and completed milestones. It sets the completion date to today.
- `pay-cost <cost> --evidence=<receipt>` marks an existing commitment paid. It transfers no money.
- `log <request> --text=<note>` appends a note.
- `import cognota <file.csv> --workspace=<account> [--map=<map.json>] [--dry-run]` imports requests and preserves raw fields. Preview needs no actor and rolls back. See the switch guide.
- `export` writes all records and audit history to exports/. It is a snapshot, not a database restore tool.
- `draft-brief <request>` and `draft-weekly-review` write uniquely named Markdown files under drafts/. Nothing sends.

For an outcome, add to outcomes after completing the project. It records an observed actual value and evidence against the planned measure, baseline and target. It does not compute financial ROI. Correct append-only records through a reviewed corrective migration with retained audit evidence.

`npm run view` renders three read-only HTML reports. `npm run docs` renders a training brief for each request and an investment review for each project. OUTPUT_DIR redirects all generated artifacts. Change brand.json for branding.

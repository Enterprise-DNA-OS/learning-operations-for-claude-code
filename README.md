# Learning Operations for Claude Code

Training requests, production capacity, budgets and outcome evidence in a database you own. A free operator desk for the record-based part of Cognota.

## Three ways to use it

**Do it yourself.** Free under the MIT licence. Install the database, try fictional records and bring your request export. Works with Claude Code, Codex, OpenCode or Cursor.

**We customise it.** Enterprise DNA brings your Cognota records across and builds your fields, approval rules and reports. A web front end, another stack and your existing learning systems can be part of your version. One setup fee, then a retainer.

**We run it for you.** Omni by Enterprise DNA installs, connects and operates your version. One setup fee, then a monthly retainer. [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=cognota&utm_medium=github).

Cognota lists a starting platform and support price of $25,000 per annum on its [pricing page](https://cognota.com/pricing/), checked 15 November 2026. The page does not identify the dollar currency. This is a vendor starting price, not a verified customer invoice. Confirm currency and scope on your quote.

## Quick start

Node 22.15 or newer. Windows, Linux or macOS. No database server is needed for the local trial.

```bash
npm install
npm test
npm run demo
```

Demo creates a new isolated database and branded reports under `.data/demo-<id>`. It never reads DATABASE_URL. For a persistent fictional working copy:

```bash
npm run migrate
npm run seed
npm run learning -- weekly-review
npm run learning -- insights --json
npm run view
npm run docs
```

Start an empty real database with migrate only. DATA_DIR selects local PGlite storage. DATABASE_URL selects PostgreSQL 15 or newer. Remote database certificates are verified. Protect the credentials and data folder.

## What ships

31 slash commands cover demand triage, weekly capacity, delivery milestones, cost commitments, observed outcomes, compliance reviews, imports, drafts and customisation. Three branded read-only HTML reports and two document types run from the data. Edit brand.json for the business name, logo and colours.

Approvals require a named owner, purpose and retention review date. Safety-related requests also require a documented risk brief, worker input and delivery approach. The capacity check refuses overbooking. Completing a project requires evidenced milestones. Observed outcomes need a completed project, evidence and a measurement date. Time records, outcome observations and audit history are append-only through ordinary writes.

The forecast is the greater of planned labour and actual labour, plus paid and committed external costs. It is a planning estimate, not an accounting forecast. A paid cost replaces its commitment instead of being counted twice. Labour rates are captured when work is allocated or time recorded. Different currencies remain separate. Weekly capacity is entered net of absence and other duties.

This is a trusted operator workspace. An actor label records who the operator says acted, not authenticated identity. Generic database roles have no default access. The database owner can administer the records and audit trail. Configure authentication, access roles, backups and retention before shared use.

## Bring your Cognota requests

```bash
npm run learning -- import cognota ./imports/requests.csv --workspace=our-team --map=examples/header-map.json --dry-run --json
npm run learning -- import cognota ./imports/requests.csv --workspace=our-team --map=examples/header-map.json --actor=Operator
npm run learning -- history
npm run learning -- export
```

[The switch guide](docs/replace-cognota.md) explains the export, field mapping and reconciliation. A single command imports a saved CSV once its headers are mapped. The example file is synthetic, not a captured vendor export. Unknown columns are preserved. Imports start local requests in review and retain the vendor status separately. Reimports update source history without overwriting local decisions. Projects, attachments, allocations and learning content need a separate mapping and reconciliation.

## Ten questions to ask today

These are answered by `npm run learning -- insights`. They join the business records across workflow boundaries. They are not a claim that Cognota cannot build an equivalent custom report.

1. Which urgent requests have waited over two weeks?
2. Which safety requests lack a complete brief?
3. Who has spare design hours next week?
4. Which projects exceed their budget before all bills are paid?
5. Which overdue milestones belong to high-priority requests?
6. Which completed projects still lack their outcome evidence?
7. Where did a measured outcome miss its target?
8. Which request records need a retention decision?
9. Which business units have the most undecided demand?
10. Where is actual labour already above the allocation estimate?

## Your first hour: ten things to ask for

1. Show urgent training requests awaiting a decision.
2. Explain what evidence the chemical handling brief still needs.
3. Show the next four weeks of available design hours.
4. Find the project whose commitments exceed its budget.
5. Read the overdue delivery milestones with their project owners.
6. List completed work with no observed outcome yet.
7. Draft the weekly learning meeting without sending it.
8. Preview our request export and compare the source row count.
9. Put our name and logo on the training brief.
10. Use /customise to add our approval rule and /new-view for our report.

## Commands and scope

Read [the CLI reference](docs/cli.md), [compliance checks](docs/compliance.md), [research](docs/research.md) and [why there is no front end](docs/why-no-front-end.md). Recipes live in .claude/commands, with CLAUDE.md and AGENTS.md for every supported coding agent.

The base does not deliver courses, assess worker competence, provide a talent marketplace, collect learner responses, pay suppliers or connect to a learning platform. It keeps the operator's demand and production records. Enterprise DNA scopes integrations and team screens in a custom version. Retain your learning delivery system during the switch.

The GitHub workflow runs tests and demo on Windows and Linux and domain checks against PostgreSQL. `npm run test:postgres` requires TEST_DATABASE_URL for a disposable local database. A workflow file alone is not proof that a hosted run passed.

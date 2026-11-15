# Replace the learning operations record desk

## Export and preserve the source

In Cognota Requests, select the relevant records, open More Actions and choose Export by Form for the applicable request forms. Export Legacy Requests is also available for legacy forms. Keep exports for every form and preserve the original files. These steps are described in [Reviewing Intake Requests](https://help.cognota.com/en/articles/15118202-reviewing-intake-requests), checked 15 November 2026.

The public help page confirms CSV export but does not establish a universal header set. The example is synthetic. Inspect your real headers. Keep a stable request identifier, including across form exports. If the export omits one, obtain it from the source before importing. Do not use row numbers or titles as invented identifiers.

## Map, preview and import

Copy examples/header-map.json to an ignored imports folder and set id, title, business_unit and status to the exact column names in the file. Only id and title are required. Common Request ID/ID and Request Name/Request Title/Name headers work without a map, but are convenience aliases, not a vendor schema claim.

```bash
npm run learning -- import cognota ./imports/requests.csv --workspace=our-team --map=imports/map.json --dry-run --json
npm run learning -- import cognota ./imports/requests.csv --workspace=our-team --map=imports/map.json --actor=Operator --json
```

The preview reports inserted, updated and unchanged counts, then rolls back all records and audit entries. Any malformed row, missing stable ID, duplicate ID or bad mapping rejects the entire file. Keep the same workspace value for the same source account. Repeating a file creates no duplicate requests. Changed source rows update the archive with previous versions retained in audit history. They never overwrite local request decisions or notes.

## What maps

A source ID plus workspace identifies one request. The title and business unit initialise the local record. Every CSV column, including unfamiliar form fields, is preserved in source history. Source status is retained as supplied. All imported local requests begin in review, so source approval does not invent a local owner or business decision. Use amend-request to record owner, purpose and retention review date, then decide-request after reviewing the source.

## Reconcile before switching

Compare source rows, distinct IDs and importer counts for each form. Read history and request details. Confirm custom fields, line breaks and non-ASCII characters survived. Resolve purpose, owner, date and safety checks. Reconcile a representative sample with the original source. Keep the old system available until the owner accepts the result.

This importer brings request records only. It does not claim to import project plans, allocations, attachments, discussions, content packages or learner results. Export those separately and map them through the documented add commands or a reviewed extension. Enterprise DNA includes that work in the agreed customisation. Export creates a complete JSON copy of this database's business records and audit history; a tested database backup remains the recovery method.

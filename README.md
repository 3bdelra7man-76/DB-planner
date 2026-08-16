# DB Schema Planner

![React](https://img.shields.io/badge/React-18-177e89)
![TypeScript](https://img.shields.io/badge/TypeScript-5-2f70c6)
![Vite](https://img.shields.io/badge/Vite-8-d1495b)
![Local First](https://img.shields.io/badge/Local--first-JSON-dca92f)

DB Schema Planner is a local-first visual workspace for designing JSON database schemas. It gives you a diagram canvas for tables and relationships, focused editing panels for schema details, and a JSON export workflow when the plan is ready.

The app is intended as a private planning tool: no backend, no account, no cloud sync, and no database connection required. Drafts are saved in browser storage, and exported schemas can be imported again later.

## What It Does

| Area | Description |
| --- | --- |
| Visual canvas | Drag tables, enums, and notes around a grid-based planning board. |
| Table design | Add tables, fields, types, primary keys, uniqueness, required flags, defaults, descriptions, and indexes. |
| Relationships | Connect fields between tables directly on the canvas and edit relationship metadata in the inspector. |
| JSON workflow | Preview, copy, export, and import schema JSON. |
| Validation | See warnings for duplicate names, missing primary keys, invalid enum links, and mismatched relationship field types. |
| Templates | Start from Auth, Shop, or CMS example schemas instead of a blank page. |

## Interface Overview

The planner is organized as a three-panel workspace:

```text
+----------------+--------------------------------+----------------------+
| Create/Health   | Visual schema canvas           | Inspector/JSON/Issues |
| Templates       | Tables, enums, notes, links    | Edit selected item    |
+----------------+--------------------------------+----------------------+
```

- Left rail: create tables, enums, notes, and load starter templates.
- Center canvas: move schema elements, inspect table fields, and connect relationships.
- Right panel: edit the selected item, inspect validation issues, or preview the exported JSON.
- Top toolbar: rename the project, start blank, import JSON, copy JSON, and export JSON.

## Export Format

The exported file is a versioned JSON document. It stores both schema structure and canvas positions so the design can be imported back into the planner.

```json
{
  "version": 1,
  "project": {
    "name": "Local Schema Plan",
    "updatedAt": "2026-08-16T00:00:00.000Z"
  },
  "tables": [
    {
      "id": "table_users",
      "name": "users",
      "description": "People who can sign in and own records.",
      "position": { "x": 80, "y": 90 },
      "fields": [
        {
          "id": "field_users_id",
          "name": "id",
          "type": "uuid",
          "primaryKey": true,
          "required": true,
          "unique": true,
          "default": "generated",
          "description": ""
        }
      ],
      "indexes": []
    }
  ],
  "relations": [],
  "enums": [],
  "notes": []
}
```

## Supported Field Types

```text
uuid
string
text
integer
decimal
boolean
date
datetime
json
enum
relation
```

## Getting Started

Install dependencies:

```bash
npm install
```

Run the local development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```text
src/
  App.tsx       Main planner interface and interactions
  schema.ts    Schema factories, validation, import normalization, constants
  types.ts     TypeScript schema model
  styles.css   Application layout and visual styling
```

## Design Goals

- Keep schema planning visual, fast, and local.
- Make JSON export predictable and easy to re-import.
- Prefer direct manipulation on the canvas while keeping detailed controls available.
- Show validation feedback before export.
- Stay lightweight enough to run as a private local tool.

## Notes

- Browser `localStorage` is used for draft persistence.
- Exported JSON is the source of truth for portability.
- SQL or migration generation is not included yet, but the schema model leaves room for future exporters.

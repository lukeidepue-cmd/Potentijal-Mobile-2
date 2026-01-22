# Supabase Schema Inventory

This document tracks the existing database schema and identifies gaps compared to the full app documentation.

## Instructions for Cursor

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Table editor**
3. List all existing tables and their key columns below
4. Compare with the requirements in `APP_DOCUMENTATION.md` and `ROADMAP.md`
5. Note any gaps that need to be addressed

## Existing Tables

_To be filled in after inspecting Supabase dashboard_

### Example Format:
```
### profiles
- id (uuid, primary key, references auth.users)
- username (text, unique)
- display_name (text)
- ... (list all columns)
```

## Gaps vs. Documentation

_List tables/features mentioned in documentation that don't exist yet_

## Notes

_Any other observations about the existing schema_



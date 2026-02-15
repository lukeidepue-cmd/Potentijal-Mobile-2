# TestSprite frontend testing – runbook

Use this when running **Frontend Testing** of this project with the TestSprite MCP Server.

## Before you start

1. **Start the app (Expo web):**
   ```bash
   cd my-first-app
   npx expo start --web --port 8081
   ```
   Wait until the app is available at **http://localhost:8081**.

2. **Cursor / TestSprite:**  
   - TestSprite MCP Server must be installed and configured (with your API key).  
   - In Cursor: **Settings → Tools & Integration → MCP** – disable “Run in Sandbox” for TestSprite (e.g. set to “Ask Every Time” or “Run Everything”).

## Magic command (in IDE chat)

In a chat where the AI has access to the **TestSprite MCP tools**, say:

```
Can you conduct Frontend Testing of this project using TestSprite MCP Server?
Use these settings:
- Type: frontend
- Scope: codebase (full project)
- Project path: c:\Users\lukei\hello-node\my-first-app
- App URL: http://localhost:8081
- localPort: 8081
```

Or shorter:

```
Can you test this project with TestSprite? Frontend testing, codebase scope. Project path: c:\Users\lukei\hello-node\my-first-app. The app runs at http://localhost:8081 (Expo web).
```

## When the TestSprite config page opens

Fill in:

- **Testing type:** Frontend  
- **Scope:** Codebase (or Code Diff if you only want recent changes)  
- **Application URL:** `http://localhost:8081`  
- **Test account (if needed):** If the app has login, add test credentials.  
- **PRD:** Upload an existing PRD if you have one (optional; TestSprite can generate from the codebase).

## After the run

Reports and artifacts will appear under:

- `my-first-app/testsprite_tests/`
  - `TestSprite_MCP_Test_Report.md` – human-readable report  
  - `TestSprite_MCP_Test_Report.html` – HTML report  
  - `tmp/test_results.json` – raw results  
  - Individual test case files (e.g. `TC001_*.py` or similar)

## Tech context (for the AI)

- **Stack:** Expo (React Native) with `expo start --web` → web build.
- **Port:** 8081 (Expo web default when using `--port 8081`).
- **Auth:** App uses Supabase; if tests need a logged-in user, provide test credentials in the config portal.

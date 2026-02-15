# Frontend testing status

**Date:** 2026-02-15  
**Requested:** Frontend testing via TestSprite MCP Server

---

## 1. TestSprite MCP Server – not available in this session

The **TestSprite MCP Server** was not available to the AI in this chat. No TestSprite tools (e.g. to launch tests or generate reports) were exposed, so automated TestSprite frontend testing could not be run from here.

**What you can do:**

1. **Install and configure TestSprite MCP** (if not already):
   - Add the TestSprite MCP Server in Cursor (e.g. in MCP / Cursor settings).
   - Configure your TestSprite API key as required by the server.

2. **Allow the server to run** (required for TestSprite):
   - **Settings → Tools & Integration → MCP**
   - For the TestSprite server, set “Run in Sandbox” to **“Ask Every Time”** or **“Run Everything”** (sandbox can block TestSprite from running tests).

3. **Start a new chat** and ensure the TestSprite MCP tools are enabled for that chat, then say:
   ```
   Can you conduct Frontend Testing of this project using TestSprite MCP Server?
   Use these settings:
   - Type: frontend
   - Scope: codebase (full project)
   - Project path: c:\Users\lukei\hello-node\my-first-app
   - App URL: http://localhost:8081
   - localPort: 8081
   ```

Full steps are in [TESTSPRITE_FRONTEND_RUN.md](./TESTSPRITE_FRONTEND_RUN.md).

---

## 2. Expo web startup – current failure

When starting the app for testing with:

```bash
cd my-first-app
npx expo start --web --port 8081
```

the process **crashed** during the web bundle with:

```text
ReferenceError: window is not defined
    at getValue (...\@react-native-async-storage\async-storage\lib\commonjs\AsyncStorage.js:63:52)
    ...
    at getItemAsync (...\@supabase\auth-js\dist\main\lib\helpers.js:129:33)
```

So **Supabase auth** is using **AsyncStorage** during **server-side rendering**, where `window` does not exist. Until this is fixed (e.g. guard AsyncStorage/auth for web/SSR or use a web-safe storage path), the app will not be available at `http://localhost:8081` for TestSprite or manual browser testing.

**Recommendation:** Fix the `window is not defined` / SSR issue for Expo web (e.g. in auth/AsyncStorage usage) so that `expo start --web --port 8081` runs successfully, then run TestSprite frontend testing as in the runbook.

---

## Summary

| Item                         | Status |
|------------------------------|--------|
| TestSprite MCP in this chat  | Not available – enable in Cursor and re-run in a new chat |
| Expo web on port 8081        | Fails on startup (SSR / `window` in AsyncStorage) |
| Next step                    | 1) Fix Expo web SSR/auth; 2) Enable TestSprite MCP and run frontend tests per runbook |

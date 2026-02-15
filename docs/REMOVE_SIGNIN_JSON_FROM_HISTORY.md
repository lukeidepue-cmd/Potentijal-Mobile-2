# Remove signin.json from Git history and revoke the leaked session

`signin.json` (with a Supabase auth session) was committed and pushed. Do these two things.

---

## Step 1: Revoke the leaked session (Supabase)

So the tokens in history can't be used even if someone has a clone.

**Option A – Delete the affected user(s)**  
You can delete the user(s) whose tokens were in `signin.json`. That invalidates all their sessions and tokens.  
- Supabase Dashboard → **Authentication** → **Users** → select the user → **Delete user**.  
- You can then sign up again with the **same email**; Supabase will create a new user (new ID, new tokens). Any data tied to the old user ID (e.g. in `profiles`, workouts) may need to be re-linked or re-created depending on your schema.

**Option B – Sign out everywhere**  
Alternatively, sign in as that user in the app and choose “Sign out on all devices” so the refresh token is revoked. The user account and data stay; only sessions are cleared.

---

## Step 2: Remove signin.json from Git history

Git will **refuse** to run `filter-branch` if you have **unstaged changes**. Fix that first, then run the rewrite.

### 2a. Stash or commit your current work

**Either stash (recommended if you're mid-work):**
```powershell
git stash push -m "WIP before removing signin.json from history"
```

**Or commit everything:**
```powershell
git add -A
git commit -m "WIP before history rewrite"
```

### 2b. Run the history rewrite

**In Git Bash** (not PowerShell, so the inner quotes work):

```bash
cd /c/Users/lukei/hello-node/my-first-app

# Optional: silence the filter-branch warning
export FILTER_BRANCH_SQUELCH_WARNING=1

# Remove signin.json from every commit
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch signin.json" --prune-empty HEAD
```

**In PowerShell** you can run the same by invoking bash:

```powershell
$env:FILTER_BRANCH_SQUELCH_WARNING=1
bash -c 'git filter-branch --force --index-filter "git rm --cached --ignore-unmatch signin.json" --prune-empty HEAD'
```

### 2c. Clean up and verify

```powershell
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

Check that `signin.json` is gone from history:

```powershell
git log --all --full-history -- signin.json
```

You should get **no output**. If you still see commits, the rewrite didn’t apply; fix unstaged changes and run 2b again.

### 2d. Force-push

```powershell
git push origin main --force
```

### 2e. Restore your work (if you stashed)

```powershell
git stash pop
```

---

## Summary

1. **Revoke:** Delete the user(s) in Supabase (or sign out everywhere). You can re-register with the same email afterward.
2. **Stash or commit** so you have no unstaged changes.
3. **Run filter-branch** (in Git Bash or via `bash -c` in PowerShell).
4. **Verify** with `git log --all --full-history -- signin.json` (no output).
5. **Force-push:** `git push origin main --force`.
6. **Restore** with `git stash pop` if you stashed.

`signin.json` is already in `.gitignore`, so it won’t be committed again.

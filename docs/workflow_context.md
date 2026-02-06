## Workflow context (how we build InsightfulOps)

This repo is **docs-first**, **incremental**, and **test-backed**.

### Principles

- **Docs are source of truth**: before implementing, read the relevant doc(s) in `docs/`.
- **Small, coherent slices**: ship work in thin vertical increments (one “unit” per PR).
- **Security by default**: tenant isolation + RLS + server-side guards; never accept `company_id` from clients.
- **Tests with every slice**: at minimum, happy path + one auth/role failure for new endpoints/behaviors.
- **Keep docs current**: update `docs/checklist.md` and any affected docs as part of the same PR.

### Branch + PR flow

- **Always sync `main` first**: `git checkout main && git pull --ff-only`.
- Create a feature branch (`feat/...`, `fix/...`, `chore/...`) and work there.
- Keep PRs small and focused (avoid bundling unrelated changes).
- PR description should include:
  - **Summary** (what/why)
  - **Test plan** (commands run + key manual checks)
  - **Notes** (tradeoffs, follow-ups)

### “Done” definition

An item can be marked complete in `docs/checklist.md` only when:

- The code is merged to `main`
- Relevant tests/lint/typecheck pass (locally + CI, when present)

### Environment + credentials

- **Never commit secrets** (no `.env` values; keep `.env.example` names only).
- Some operations (like `git push` to GitHub) may require running commands locally if auth is unavailable in the agent environment.

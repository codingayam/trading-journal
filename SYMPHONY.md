# Symphony setup

This repository is configured for the upstream Symphony Elixir runner.

- Linear project: `Trading Journal`
- Linear project slug: `trading-journal-9d4d0298c64a`
- Poll interval: `600000` ms (10 minutes)
- Workflow file: `WORKFLOW.md`
- Local env file: `.env.symphony` (git-ignored)
- Runtime clone: `.symphony/runtime/symphony`
- Workspaces: `.symphony/workspaces`
- Optional upstream skills copied: `commit`, `push`, `pull`, `land`, `linear`

## Runtime install

The upstream setup expects `mise`:

```sh
curl https://mise.run | sh
~/.local/bin/mise --version
```

Then install/build Symphony:

```sh
scripts/bootstrap-symphony-runtime
```

## Run

```sh
scripts/run-symphony
```

The dashboard/API will be available on port `4000` unless `SYMPHONY_PORT` is changed.
The runner passes Symphony's required preview acknowledgement flag explicitly.
Worker Codex turns run with `danger-full-access` because this workflow requires unattended git metadata writes for branch, commit, push, and PR handoff.

## Repository source

Symphony workspaces clone from `SYMPHONY_SOURCE_REPO`, currently set in `.env.symphony` to `https://github.com/codingayam/trading-journal.git`. Keep this pointed at the GitHub remote so worker branches can push and open PRs.

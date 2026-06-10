# Symphony setup

This repository is configured for the upstream Symphony Elixir runner.

- Linear project: `Trading Journal`
- Linear project slug: `trading-journal-9d4d0298c64a`
- Poll interval: `3600000` ms (1 hour)
- Workflow file: `WORKFLOW.md`
- Local env file: `.env.symphony` (git-ignored)
- Runtime clone: `.symphony/runtime/symphony`
- Workspaces: `~/code/symphony-workspaces` by default
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

## Repository source

This repo currently has no Git remote, so `WORKFLOW.md` clones from the local path in `SYMPHONY_SOURCE_REPO`. Add a Git remote and update `.env.symphony` if you want Symphony workspaces to clone from GitHub instead.

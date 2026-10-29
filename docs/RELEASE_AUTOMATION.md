# GitHub Actions: release-only configuration

This repository uses GitHub Actions **only** to publish finished, versioned extension packages. The previously active automatic regression workflow is preserved at `docs/disabled-workflows/regression.yml`, outside the executable `.github/workflows` directory. Regression tests run outside GitHub Actions.

## How releases are requested

1. ChatGPT/Codex synchronizes and checks the latest `main` commit and performs the required tests outside GitHub Actions.
2. Update `manifest.json` to a **new** version (if needed); commit changes to `main`.
3. Read the resulting, current `main` commit SHA. Update `release/request.json` with `version` matching `manifest.json`, `source_sha` equal to the immediately preceding `main` commit, and a fresh `request_id`. Commit this request **alone** to `main`.
4. Only the change to `release/request.json` starts `.github/workflows/release.yml`. The workflow checks the request, skips superseded or already published versions, builds the versioned ZIP and Vivaldi CSS, creates their SHA-256 files, and publishes a GitHub Release.
5. Verify the release exists and exposes all four assets. Do not describe an untested version as fully validated.

**Important:** GitHub Actions must remain disabled in repository settings until the user re-enables them after reviewing this configuration. No automatic tests, pull-request triggers, GitHub Copilot, AI services, or paid services should be introduced. GitHub Actions releases use the standard Ubuntu runner. Public repository status is unchanged.

The initial `release/request.json` entry is a bootstrap record, not a request to republish the already existing release. Use a fresh `request_id` when publishing a new version.

## Local verification commands

```sh
node --test tests/*.test.mjs
bash scripts/build-release.sh
```

The packaging script performs necessary ZIP integrity checks on GitHub; it does **not** execute the regression suite. A successful GitHub release build is not evidence that live Vivaldi/ChatGPT behavior was tested.

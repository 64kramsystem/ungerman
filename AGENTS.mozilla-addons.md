# Mozilla add-ons

- Target recent Firefox and Thunderbird; older-version compatibility is not required.
- Run browser and Thunderbird tests headlessly in disposable profiles. Use Playwright MCP for Firefox debugging and Marionette for Thunderbird; retain any more specific per-site debugging instructions.
- Headless Firefox can play audible media. Set `firefoxUserPrefs["media.volume_scale"] = "0.0"` when launching media tests; embedded players can override page-level muting.
- To test an installed extension with Playwright Firefox, launch a disposable persistent context with `--start-debugger-server`, `devtools.debugger.remote-enabled=true`, and `devtools.debugger.prompt-connection=false`, then use web-ext's `RemoteFirefox.installTemporaryAddon`. Page-script injection alone does not test extension installation, permissions, or isolation.
- Navigating Playwright pages to `about:debugging` or `moz-extension:` URLs can stall in Firefox; use the supported remote installation path and verify the chosen test harness against the installed browser.
- Serialize structured Firefox console output with `JSON.stringify(value, null, 2)`.
- For startup diagnosis, set `MOZ_LOG` and `MOZ_LOG_FILE` at launch and collect the `.child-N` logs too. `about:logging` covers the running session. On macOS, fully quit the intended instance or use a separate `--profile` with `--no-remote`; otherwise launching may focus an existing instance without applying the environment.
- Do not count HTTP requests from occurrences of `:authority <host>` in `nsHttp:5` logs: HPACK can index that header after its first occurrence. Classify requests using their URLs instead.
- A locked Firefox test profile can cause immediate exits and empty logs. Wait for the owned test processes to exit before reusing the profile or removing a stale `.parentlock`; never terminate unrelated browser processes.
- Before changing stream capture, read the add-on's `docs/stream-capture-design.md`. After a related breakage fix, update it very concisely and reassess the capture strategy.
- When bumping add-on versions in npm metadata, update only the project's root `version` fields in `package.json` and `package-lock.json`, including `packages[""].version`; preserve unrelated dependency versions and download URLs.
- Commit release changes without updating the version, then run `publish_mozilla_addons <repo_name>:<new_semver> [...]`; allow time for signing and publication.

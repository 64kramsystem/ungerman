# Ungerman

A small Thunderbird extension that stops reply-prefix stacking when the
subject already starts with `AW: ` (the German "Antwort" prefix).

## Why

On a German-localized Thunderbird, replying to a message whose subject already
starts with `AW: ` produces `AW: AW: ...`. On a non-German Thunderbird replying
to the same message, you get `Re: AW: ...`. Ungerman strips the outer prefix
so the subject stays `AW: ...`.

Examples (subject in the compose window):

| Before              | After       |
|---------------------|-------------|
| `AW: AW: Foo`       | `AW: Foo`   |
| `Re: AW: Foo`       | `AW: Foo`   |
| `Antwort: AW: Foo`  | `AW: Foo`   |
| `AW: Foo`           | `AW: Foo`   |
| `Re: Foo`           | `Re: Foo`   |

It only acts on reply tabs (`details.type === "reply"`), never on new mail or
forwards.

## Install

1. Build the package:
   ```
   ./build-xpi.sh
   ```
2. In Thunderbird: *Add-ons and Themes* → gear icon → *Install Add-on From File…*
   → pick `ungerman.xpi`.

For temporary install during development: *Add-ons Manager* → gear icon →
*Debug Add-ons* → *Load Temporary Add-on* → pick `manifest.json`.

Requires Thunderbird 78 or newer.

## Tests

Pure subject logic lives in `subject.js` and is covered by `subject.test.js`
using Node's built-in test runner:

```
node --test subject.test.js
```

No dependencies; requires Node 18+.

## Files

- `manifest.json` — MailExtension manifest (v2).
- `subject.js` — pure `unstackSubject` function; loaded as a background script
  in Thunderbird and `require`d from tests in Node.
- `background.js` — wires `unstackSubject` to `tabs.onCreated` /
  `compose.getComposeDetails` / `compose.setComposeDetails`.
- `subject.test.js` — unit tests for `unstackSubject`.
- `build-xpi.sh` — packages the three runtime files into `ungerman.xpi`.

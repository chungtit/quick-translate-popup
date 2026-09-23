# Translate Selection

A tiny Chrome extension: select any text on a page, press a keyboard shortcut, and a translation appears in a small popup right next to the selection. No account, no API key, no popup window — just the text.

## Files

```
translate-selection/
├── manifest.json   # extension config, permissions, keyboard shortcut
└── background.js   # grabs the selection, calls Google Translate, shows the popup
```

## Install (unpacked extension)

1. Put `manifest.json` and `background.js` together in a folder (e.g. `translate-selection`).
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and pick the folder from step 1.
5. The extension now appears in the list. Done.

Works the same way in Edge (`edge://extensions`), Brave (`brave://extensions`), and other Chromium browsers.

## Use

1. Select some text on any web page.
2. Press **Ctrl+Shift+V** (Windows/Linux) or **Cmd+Shift+V** (Mac).
3. The translation pops up under the selection.
4. Click anywhere, press **Esc**, or scroll to dismiss it.

If the shortcut doesn't fire, another extension may already be using it. Go to `chrome://extensions/shortcuts` and set a different key combination for "Translate selected text".

> The extension can't run on Chrome's own pages (`chrome://…`), the Chrome Web Store, or PDF viewer tabs — that's a Chrome restriction, not a bug.

## Change the target language

Open `background.js` and find this line:

```js
"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q="
```

Change `tl=vi` to the language you want, using a Google Translate language code:

| Language | Code | Language | Code |
|---|---|---|---|
| English | `en` | Japanese | `ja` |
| French | `fr` | Korean | `ko` |
| Spanish | `es` | Chinese (Simplified) | `zh-CN` |
| German | `de` | Chinese (Traditional) | `zh-TW` |
| Portuguese | `pt` | Arabic | `ar` |
| Italian | `it` | Hindi | `hi` |
| Russian | `ru` | Vietnamese | `vi` |

`sl=auto` auto-detects the source language, so you only ever need to change `tl`.

Optionally update the fallback message (`"Không thể dịch (translation failed)."`) in `background.js` and the `name` / `description` in `manifest.json` to match.

After editing, go to `chrome://extensions` and click the **reload** (↻) icon on the extension card.

## Change the shortcut

Either edit `suggested_key` in `manifest.json` and reload, or set it in the browser at `chrome://extensions/shortcuts` (the browser setting overrides the manifest).


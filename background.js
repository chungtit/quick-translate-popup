// Languages offered in the popup's dropdown (Google Translate codes)
const LANGS = {
  vi: "Tiếng Việt",
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  pt: "Português",
  it: "Italiano",
  ru: "Русский",
  ja: "日本語",
  ko: "한국어",
  "zh-CN": "中文 (简体)",
  "zh-TW": "中文 (繁體)",
  ar: "العربية",
  hi: "हिन्दी"
};
const DEFAULT_TL = "vi";

async function getTargetLang() {
  const { tl } = await chrome.storage.local.get({ tl: DEFAULT_TL });
  return LANGS[tl] ? tl : DEFAULT_TL;
}

async function translate(text, tl) {
  try {
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
      encodeURIComponent(tl) + "&dt=t&q=" + encodeURIComponent(text);
    const data = await (await fetch(url)).json();
    return data[0].map((p) => p[0]).join("");
  } catch (e) {
    return "Translation failed.";
  }
}

// The popup asks for a re-translation when the user picks another language
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "translate") return;
  (async () => {
    const tl = LANGS[msg.tl] ? msg.tl : DEFAULT_TL;
    await chrome.storage.local.set({ tl });
    sendResponse({ translated: await translate(msg.text, tl) });
  })();
  return true; // keep the channel open for the async response
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "translate-selection") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  // 1. Grab the selected text and where it is on the page
  let sel;
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const s = window.getSelection();
        const text = s.toString().trim();
        if (!text || s.rangeCount === 0) return null;
        const r = s.getRangeAt(0).getBoundingClientRect();
        return { text, x: r.left, y: r.bottom, w: r.width };
      }
    });
    sel = res?.result;
  } catch (e) {}
  if (!sel) return;

  // 2. Translate into the remembered target language
  const tl = await getTargetLang();
  const translated = await translate(sel.text, tl);

  // 3. Show the popup next to the selection
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [sel, translated, tl, LANGS],
    func: (sel, translated, tl, langs) => {
      document.getElementById("__translate_popup")?.remove();

      const box = document.createElement("div");
      box.id = "__translate_popup";
      Object.assign(box.style, {
        position: "fixed",
        left: Math.max(8, Math.min(sel.x, window.innerWidth - 340)) + "px",
        top: sel.y + 8 + "px",
        maxWidth: "320px",
        padding: "10px 12px",
        background: "#1f1f1f",
        color: "#fff",
        font: "14px/1.45 system-ui, sans-serif",
        borderRadius: "8px",
        boxShadow: "0 4px 16px rgba(0,0,0,.3)",
        zIndex: "2147483647"
      });

      const text = document.createElement("div");
      text.textContent = translated;
      text.style.whiteSpace = "pre-wrap";

      // Small language selector in the bottom-right corner
      const select = document.createElement("select");
      for (const [code, name] of Object.entries(langs)) {
        const opt = document.createElement("option");
        opt.value = code;
        opt.textContent = name;
        opt.selected = code === tl;
        select.appendChild(opt);
      }
      Object.assign(select.style, {
        display: "block",
        marginLeft: "auto",
        marginTop: "8px",
        padding: "2px 4px",
        font: "12px system-ui, sans-serif",
        color: "#ddd",
        background: "#333",
        border: "1px solid #555",
        borderRadius: "4px",
        cursor: "pointer"
      });
      select.addEventListener("change", () => {
        text.textContent = "…";
        chrome.runtime.sendMessage(
          { type: "translate", text: sel.text, tl: select.value },
          (res) => { text.textContent = res?.translated ?? "Translation failed."; }
        );
      });

      box.append(text, select);
      document.body.appendChild(box);

      // Flip above the selection if it would run off the bottom
      if (sel.y + 8 + box.offsetHeight > window.innerHeight) {
        box.style.top = "";
        box.style.bottom = window.innerHeight - sel.y + 24 + "px";
      }

      const close = (e) => {
        if (e && e.target instanceof Node && box.contains(e.target)) return; // ignore clicks inside the popup
        box.remove();
        document.removeEventListener("mousedown", close);
        document.removeEventListener("keydown", onKey);
        window.removeEventListener("scroll", close);
      };
      const onKey = (e) => e.key === "Escape" && close();
      setTimeout(() => {
        document.addEventListener("mousedown", close);
        document.addEventListener("keydown", onKey);
        window.addEventListener("scroll", close, { passive: true });
      }, 0);
    }
  });
});

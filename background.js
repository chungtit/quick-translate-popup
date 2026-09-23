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

  // 2. Translate (Google Translate's free endpoint)
  let translated = "";
  try {
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=" +
      encodeURIComponent(sel.text);
    const data = await (await fetch(url)).json();
    translated = data[0].map((p) => p[0]).join("");
  } catch (e) {
    translated = "Không thể dịch (translation failed).";
  }

  // 3. Show the popup next to the selection
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [sel, translated],
    func: (sel, translated) => {
      document.getElementById("__vi_translate_popup")?.remove();

      const box = document.createElement("div");
      box.id = "__vi_translate_popup";
      box.textContent = translated;
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
        zIndex: "2147483647",
        whiteSpace: "pre-wrap"
      });
      // Flip above the selection if it would run off the bottom
      document.body.appendChild(box);
      if (sel.y + 8 + box.offsetHeight > window.innerHeight) {
        box.style.top = "";
        box.style.bottom = window.innerHeight - sel.y + 24 + "px";
      }

      const close = () => {
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

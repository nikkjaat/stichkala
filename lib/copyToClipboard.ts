/**
 * Copy text to clipboard. Works on HTTPS, localhost, and LAN HTTP (dev:lan)
 * where navigator.clipboard is often unavailable.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) return false;

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard?.writeText &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      /* fall through to legacy copy */
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.cssText =
      "position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none";
    document.body.appendChild(textarea);

    if (navigator.userAgent.match(/ipad|iphone/i)) {
      textarea.contentEditable = "true";
      textarea.readOnly = false;
      const range = document.createRange();
      range.selectNodeContents(textarea);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      textarea.setSelectionRange(0, value.length);
    } else {
      textarea.select();
      textarea.setSelectionRange(0, value.length);
    }

    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

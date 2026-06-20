export const CHAT_UI_REOPEN = "___chatio-chat-widget-open___";
export function parseStylesSrc(scriptSrc = null) {
  try {
    const _url = new URL(scriptSrc);
    _url.pathname = _url.pathname
      .replace("chatio-chat-widget.js", "chatio-chat-widget.min.css")
      .replace(
        "chatio-chat-widget.min.js",
        "chatio-chat-widget.min.css"
      );
    return _url.toString();
  } catch {
    return "";
  }
}

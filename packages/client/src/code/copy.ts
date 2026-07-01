/**
 * Copy-to-clipboard for code blocks (Phase 08). One delegated listener per deck
 * handles every `[data-copy]` button: it reads the sibling Shiki block's text and
 * writes it to the clipboard, flashing "Copied" on success.
 */
export function bindCopyButtons(root: HTMLElement): () => void {
  const onClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>("[data-copy]");
    if (!button) return;
    const body = button.closest(".as-code-body");
    const code = body?.querySelector(".shiki code") ?? body?.querySelector(".shiki");
    const text = code?.textContent ?? "";
    if (!text || !navigator.clipboard) return;
    void navigator.clipboard.writeText(text).then(() => {
      button.classList.add("as-copied");
      const label = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.classList.remove("as-copied");
        if (label != null) button.textContent = label;
      }, 1200);
    });
  };
  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}

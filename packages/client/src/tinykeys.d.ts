// tinykeys ships declarations at `dist/tinykeys.d.ts` but its package.json
// `exports` map has no `types` condition, so TS can't resolve them under
// node/bundler resolution. This ambient declaration covers the surface we use.
declare module "tinykeys" {
  export interface KeyBindingMap {
    [keybinding: string]: (event: KeyboardEvent) => void;
  }
  export interface KeyBindingOptions {
    timeout?: number;
    event?: "keydown" | "keyup";
  }
  export function tinykeys(
    target: Window | HTMLElement,
    keyBindingMap: KeyBindingMap,
    options?: KeyBindingOptions,
  ): () => void;
}

export interface Greeting {
  name: string;
  emoji?: string;
}

// #region greet
export function greet({ name, emoji = "👋" }: Greeting): string {
  return `${emoji} Hello, ${name}!`;
}
// #endregion greet

console.log(greet({ name: "astro-slides" }));

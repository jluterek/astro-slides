import type { ReactNode } from "react";

/**
 * Reveals its children at the *same* step as the preceding `<Click>` (i.e. `at="+0"`).
 * The remark-clicks plugin resolves `at` to the previous click's index at compile time.
 */
export interface AfterProps {
  at?: number | string;
  anim?: string;
  children?: ReactNode;
}

export function After({ at = 1, anim, children }: AfterProps) {
  const className = anim ? `as-click as-anim-${anim}` : "as-click";
  return (
    <span className={className} data-click={Number(at)}>
      {children}
    </span>
  );
}

export default After;

import type { ReactNode } from "react";

/**
 * Reveals its children at a click step. `at` is resolved to an absolute step index
 * at MDX compile time by the remark-clicks plugin (ADR-0008), so this component is a
 * static wrapper: it emits the `[data-click]` contract and the runtime toggles
 * `.as-click-shown` by `?step=N`. No hydration required.
 */
export interface ClickProps {
  /** Resolved absolute step index (set as a string by remark-clicks at compile time). */
  at?: number | string;
  /** Range end for `at="[start,end]"` — element hides again after this step. */
  to?: number | string;
  /** Reveal animation (fade | up | down | left | right | scale). */
  anim?: string;
  children?: ReactNode;
}

export function Click({ at = 1, to, anim, children }: ClickProps) {
  const className = anim ? `as-click as-anim-${anim}` : "as-click";
  return (
    <span
      className={className}
      data-click={Number(at)}
      data-click-to={to != null ? Number(to) : undefined}
    >
      {children}
    </span>
  );
}

export default Click;

import type { ReactNode } from "react";

/**
 * Reveals its children one step at a time. Resolution happens at compile time: the
 * remark-clicks plugin wraps each child (grouped by `every`) in a resolved `<Click>`,
 * so this component is a pass-through. Authoring the split in remark (not here) keeps
 * step numbering deterministic and robust to how MDX groups block children.
 */
export interface ClicksProps {
  every?: number | string;
  anim?: string;
  children?: ReactNode;
}

export function Clicks({ children }: ClicksProps) {
  return <>{children}</>;
}

export default Clicks;

import { atom, type WritableAtom } from "nanostores";

/**
 * Per-deck reactive state. Each deck on a page owns its own store so multiple
 * decks can coexist; interactive islands (overview, presenter mode) subscribe to
 * these atoms rather than reaching into the DOM.
 */
export interface DeckStore {
  readonly deck: string;
  readonly total: number;
  readonly slide: WritableAtom<number>;
  readonly step: WritableAtom<number>;
  readonly overview: WritableAtom<boolean>;
}

export interface DeckStoreInit {
  deck: string;
  total: number;
  slide: number;
  step: number;
}

export function createDeckStore(init: DeckStoreInit): DeckStore {
  return {
    deck: init.deck,
    total: init.total,
    slide: atom(init.slide),
    step: atom(init.step),
    overview: atom(false),
  };
}

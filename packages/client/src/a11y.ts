/**
 * Screen-reader announcements. A polite `aria-live` region is updated on every
 * slide change so assistive tech reads out the new position.
 */

export interface Announcer {
  announce(message: string): void;
}

export function createAnnouncer(region: HTMLElement): Announcer {
  return {
    announce(message) {
      // Clearing first guarantees repeated/identical messages still fire.
      region.textContent = "";
      region.textContent = message;
    },
  };
}

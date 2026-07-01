import plantumlEncoder from "plantuml-encoder";

/**
 * PlantUML encoding (ADR-0011). The diagram source is deflate+base64 encoded at build
 * time and turned into a `<server>/svg/<encoded>` URL rendered as an `<img>`. The
 * server is configurable (default the public plantuml.com); self-host to avoid rate
 * limits. Nothing ships to the client but the image URL.
 */

export const DEFAULT_PLANTUML_SERVER = "https://www.plantuml.com/plantuml";

/** Wrap bare source in `@startuml/@enduml` if the author omitted them. */
function ensureUmlWrapper(source: string): string {
  const trimmed = source.trim();
  if (/@start\w+/.test(trimmed)) return trimmed;
  return `@startuml\n${trimmed}\n@enduml`;
}

export function plantumlUrl(
  source: string,
  server = DEFAULT_PLANTUML_SERVER,
  format = "svg",
): string {
  const encoded = plantumlEncoder.encode(ensureUmlWrapper(source));
  return `${server.replace(/\/$/, "")}/${format}/${encoded}`;
}

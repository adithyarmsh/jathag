import type { ReactNode } from "react";
import en from "../messages/en.json";

// All of the site's words live in messages/<language>.json.
// Only English exists today; another language is added by adding its file here
// (same keys, translated text). No translation library is needed yet.
export type Messages = typeof en;

const messages = { en } satisfies Record<string, Messages>;

export function getMessages(lang: keyof typeof messages = "en"): Messages {
  return messages[lang];
}

// Text in [square brackets] inside a message is drawn with `mark`, so a
// translator can move the highlighted words to wherever their language needs them.
export function richText(text: string, mark: (part: string, key: number) => ReactNode): ReactNode[] {
  return text.split(/\[([^\]]+)\]/).map((part, i) => (i % 2 === 1 ? mark(part, i) : part));
}

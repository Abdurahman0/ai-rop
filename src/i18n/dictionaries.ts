import en from "./en.json";
import ru from "./ru.json";
import uz from "./uz.json";

export type Locale = "en" | "ru" | "uz";

export const locales: Locale[] = ["en", "ru", "uz"];

export const dictionaries = {
  en,
  ru,
  uz,
} as const;

export type TranslationKey = string;

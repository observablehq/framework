const rtlLanguages = new Set([
  "ar",
  "fa",
  "he",
  "ks",
  "ku",
  "ps",
  "sd",
  "ug",
  "ur",
  "yi"
]);

export interface FrameworkMessages {
  home: string;
  contents: string;
  untitled: string;
  search: string;
  toggleSidebar: string;
  previousPage: string;
  nextPage: string;
  footerPrefix: string;
  footerDatePreposition: string;
}

const frameworkMessages: Record<string, FrameworkMessages> = {
  en: {
    home: "Home",
    contents: "Contents",
    untitled: "Untitled",
    search: "Search",
    toggleSidebar: "Toggle sidebar",
    previousPage: "Previous page",
    nextPage: "Next page",
    footerPrefix: "Built with",
    footerDatePreposition: "on"
  },
  fr: {
    home: "Accueil",
    contents: "Sommaire",
    untitled: "Sans titre",
    search: "Rechercher",
    toggleSidebar: "Basculer la barre latérale",
    previousPage: "Page précédente",
    nextPage: "Page suivante",
    footerPrefix: "Créé avec",
    footerDatePreposition: "le"
  },
  ar: {
    home: "الرئيسية",
    contents: "المحتويات",
    untitled: "بدون عنوان",
    search: "بحث",
    toggleSidebar: "تبديل الشريط الجانبي",
    previousPage: "الصفحة السابقة",
    nextPage: "الصفحة التالية",
    footerPrefix: "أُنشئ باستخدام",
    footerDatePreposition: "في"
  }
};

export function getFrameworkLanguage(locale?: string | null, lang?: string | null): string | undefined {
  return languageSubtag(lang) ?? languageSubtag(locale);
}

export function getFrameworkDirection(
  locale?: string | null,
  lang?: string | null
): "ltr" | "rtl" | undefined {
  const language = getFrameworkLanguage(locale, lang);
  return language ? (rtlLanguages.has(language) ? "rtl" : "ltr") : undefined;
}

export function getFrameworkLocale(locale?: string | null, lang?: string | null): string {
  return locale ?? lang ?? "en-US";
}

export function getFrameworkMessages(locale?: string | null, lang?: string | null): FrameworkMessages {
  const language = getFrameworkLanguage(locale, lang);
  return (language && frameworkMessages[language]) || frameworkMessages.en;
}

function languageSubtag(tag?: string | null): string | undefined {
  const match = tag?.trim().match(/^([A-Za-z]{2,3})(?:[-_]|$)/);
  return match?.[1].toLowerCase();
}

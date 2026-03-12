"use server"

import { sdk } from "@lib/config"
import { getCacheOptions } from "./cookies"

export type Locale = {
  code: string
  name: string
}

const DEFAULT_LOCALES: Locale[] = [
  { code: "en-US", name: "English" },
  { code: "zh-TW", name: "繁體中文" },
  { code: "zh-CN", name: "简体中文" },
]

const normalizeLocaleCode = (code: string) => code.trim().toLowerCase()

const mergeLocales = (backendLocales: Locale[] = []): Locale[] => {
  const mergedLocaleMap = new Map<string, Locale>()

  for (const locale of backendLocales) {
    if (!locale?.code) {
      continue
    }

    mergedLocaleMap.set(normalizeLocaleCode(locale.code), locale)
  }

  for (const locale of DEFAULT_LOCALES) {
    mergedLocaleMap.set(normalizeLocaleCode(locale.code), locale)
  }

  const defaultLocaleCodeSet = new Set(
    DEFAULT_LOCALES.map((locale) => normalizeLocaleCode(locale.code))
  )

  const defaultOrderedLocales = DEFAULT_LOCALES.map(
    (locale) => mergedLocaleMap.get(normalizeLocaleCode(locale.code)) ?? locale
  )

  const additionalLocales = Array.from(mergedLocaleMap.entries())
    .filter(([code]) => !defaultLocaleCodeSet.has(code))
    .map(([, locale]) => locale)

  return [...defaultOrderedLocales, ...additionalLocales]
}

/**
 * Fetches available locales from the backend.
 * Always returns a non-empty locale list by merging backend locales
 * with frontend defaults (English, 繁體中文, 简体中文).
 */
export const listLocales = async (): Promise<Locale[]> => {
  const next = {
    ...(await getCacheOptions("locales")),
  }

  return sdk.client
    .fetch<{ locales: Locale[] }>(`/store/locales`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ locales }) => mergeLocales(locales))
    .catch(() => mergeLocales())
}

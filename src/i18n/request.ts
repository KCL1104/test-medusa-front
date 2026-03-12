import { cookies } from "next/headers"
import { getRequestConfig } from "next-intl/server"

const SUPPORTED_LOCALES = ["en-US", "zh-TW", "zh-CN"] as const
const DEFAULT_LOCALE = "en-US"

function normalizeLocale(raw: string | undefined): string {
  if (!raw) return DEFAULT_LOCALE
  if (SUPPORTED_LOCALES.includes(raw as any)) return raw
  // Handle partial matches like "en" -> "en-US", "zh" -> "zh-CN"
  const lower = raw.toLowerCase()
  if (lower.startsWith("zh-tw") || lower === "zh-hant") return "zh-TW"
  if (lower.startsWith("zh")) return "zh-CN"
  if (lower.startsWith("en")) return "en-US"
  return DEFAULT_LOCALE
}

export default getRequestConfig(async () => {
  const store = await cookies()
  const raw = store.get("_medusa_locale")?.value
  const locale = normalizeLocale(raw)

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})

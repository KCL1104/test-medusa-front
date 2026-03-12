"use server"

import { sdk } from "@lib/config"
import { revalidateTag } from "next/cache"
import { cookies as nextCookies } from "next/headers"
import { getAuthHeaders, getCacheTag, getCartId, removeCartId } from "./cookies"

const LOCALE_COOKIE_NAME = "_medusa_locale"

const getLocaleUpdateErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (!error || typeof error !== "object") {
    return ""
  }

  const candidate = error as {
    message?: unknown
    response?: {
      data?: {
        message?: unknown
      }
    }
  }

  if (typeof candidate.message === "string") {
    return candidate.message
  }

  if (typeof candidate.response?.data?.message === "string") {
    return candidate.response.data.message
  }

  return ""
}

const isStaleCartLocaleUpdateError = (error: unknown): boolean => {
  const message = getLocaleUpdateErrorMessage(error).toLowerCase()

  if (!message) {
    return false
  }

  return (
    message.includes("already completed") ||
    (message.includes("cart") && message.includes("not found"))
  )
}

/**
 * Gets the current locale from cookies
 */
export const getLocale = async (): Promise<string | null> => {
  try {
    const cookies = await nextCookies()
    return cookies.get(LOCALE_COOKIE_NAME)?.value ?? null
  } catch {
    return null
  }
}

/**
 * Sets the locale cookie
 */
export const setLocaleCookie = async (locale: string) => {
  const cookies = await nextCookies()
  cookies.set(LOCALE_COOKIE_NAME, locale, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: false, // Allow client-side access
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

/**
 * Updates the locale preference via SDK and stores in cookie.
 * Also updates the cart with the new locale if one exists.
 */
export const updateLocale = async (localeCode: string): Promise<string> => {
  await setLocaleCookie(localeCode)

  // Update cart with the new locale if a cart exists
  const cartId = await getCartId()
  if (cartId) {
    const headers = {
      ...(await getAuthHeaders()),
    }

    try {
      await sdk.store.cart.update(cartId, { locale: localeCode }, {}, headers)
    } catch (error) {
      if (!isStaleCartLocaleUpdateError(error)) {
        throw error
      }

      const message = getLocaleUpdateErrorMessage(error) || "stale cart"
      console.warn(
        `[locale-switch] Cleared stale cart during locale update. cart_id=${cartId} locale=${localeCode} reason=${message}`
      )
      await removeCartId()
    } finally {
      const cartCacheTag = await getCacheTag("carts")
      if (cartCacheTag) {
        revalidateTag(cartCacheTag)
      }
    }
  }

  // Revalidate relevant caches to refresh content
  const productsCacheTag = await getCacheTag("products")
  if (productsCacheTag) {
    revalidateTag(productsCacheTag)
  }

  const categoriesCacheTag = await getCacheTag("categories")
  if (categoriesCacheTag) {
    revalidateTag(categoriesCacheTag)
  }

  const collectionsCacheTag = await getCacheTag("collections")
  if (collectionsCacheTag) {
    revalidateTag(collectionsCacheTag)
  }

  return localeCode
}

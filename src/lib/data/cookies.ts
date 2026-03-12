import "server-only"
import { cookies as nextCookies } from "next/headers"

const STAR_VAULTS_UID_COOKIE = "_medusa_platform_uid"
const STAR_VAULTS_TOKEN_COOKIE = "_medusa_platform_token"

export type StarVaultsAuthContext = {
  starVaultsUid?: string
  starVaultsToken?: string
}

export const getAuthHeaders = async (): Promise<
  { authorization: string } | {}
> => {
  try {
    const cookies = await nextCookies()
    const token = cookies.get("_medusa_jwt")?.value

    if (!token) {
      return {}
    }

    return { authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}

export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch (error) {
    return ""
  }
}

export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[] } | {}> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const cacheTag = await getCacheTag(tag)

  if (!cacheTag) {
    return {}
  }

  return { tags: [`${cacheTag}`] }
}

export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeAuthToken = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", "", {
    maxAge: -1,
  })
}

export const getStarVaultsAuthContext = async (): Promise<StarVaultsAuthContext> => {
  const cookies = await nextCookies()

  return {
    starVaultsUid: cookies.get(STAR_VAULTS_UID_COOKIE)?.value,
    starVaultsToken: cookies.get(STAR_VAULTS_TOKEN_COOKIE)?.value,
  }
}

export const setStarVaultsAuthContext = async ({
  starVaultsUid,
  starVaultsToken,
}: StarVaultsAuthContext) => {
  const cookies = await nextCookies()
  const cookieOptions = {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  }

  if (starVaultsUid) {
    cookies.set(STAR_VAULTS_UID_COOKIE, starVaultsUid, cookieOptions)
  } else {
    cookies.set(STAR_VAULTS_UID_COOKIE, "", { maxAge: -1 })
  }

  if (starVaultsToken) {
    cookies.set(STAR_VAULTS_TOKEN_COOKIE, starVaultsToken, cookieOptions)
  } else {
    cookies.set(STAR_VAULTS_TOKEN_COOKIE, "", { maxAge: -1 })
  }
}

export const removeStarVaultsAuthContext = async () => {
  const cookies = await nextCookies()
  cookies.set(STAR_VAULTS_UID_COOKIE, "", {
    maxAge: -1,
  })
  cookies.set(STAR_VAULTS_TOKEN_COOKIE, "", {
    maxAge: -1,
  })
}

export const getCartId = async () => {
  const cookies = await nextCookies()
  return cookies.get("_medusa_cart_id")?.value
}

export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeCartId = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", "", {
    maxAge: -1,
  })
}

import { completePlatformLogin } from "@lib/data/customer"
import { redirect } from "next/navigation"

type CallbackPageProps = {
  params: {
    countryCode: string
  }
  searchParams: {
    code?: string | string[]
    token?: string | string[]
    exchange_token?: string | string[]
    exchangeToken?: string | string[]
    "exchange-token"?: string | string[]
  }
}

const getStringValue = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

export default async function PlatformCallbackPage({
  params,
  searchParams,
}: CallbackPageProps) {
  const code = getStringValue(searchParams.code)
  const token =
    getStringValue(searchParams.token) ||
    getStringValue(searchParams.exchange_token) ||
    getStringValue(searchParams.exchangeToken) ||
    getStringValue(searchParams["exchange-token"])

  try {
    await completePlatformLogin({ code, token })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Platform login failed"
    redirect(
      `/${params.countryCode}/account?platform_oauth_error=${encodeURIComponent(errorMessage)}`
    )
  }

  redirect(`/${params.countryCode}/account`)
}

"use client"

import { isManual, isStarVaults, isStripeLike } from "@lib/constants"
import { initiatePaymentSession, placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import { useTranslations } from "next-intl"
import { usePathname, useSearchParams } from "next/navigation"
import React, { useEffect, useState } from "react"
import ErrorMessage from "../error-message"

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  "data-testid": string
}

const STAR_VAULTS_PROVIDER_ID = "pp_chainup_platform"
const STAR_VAULTS_CHECKOUT_STATE_STORAGE_KEY_PREFIX = "chainup_checkout_state"
const STAR_VAULTS_AUTO_RETRY_STORAGE_KEY_PREFIX = "chainup_checkout_auto_retry_used"
const STAR_VAULTS_CHECKOUT_STATE_RETURNED = "returned"
const STAR_VAULTS_CHECKOUT_STATE_REDIRECTING = "redirecting"

const getStarVaultsCheckoutStateStorageKey = (cartId?: string) =>
  `${STAR_VAULTS_CHECKOUT_STATE_STORAGE_KEY_PREFIX}:${cartId || "unknown"}`

const getStarVaultsAutoRetryStorageKey = (cartId?: string) =>
  `${STAR_VAULTS_AUTO_RETRY_STORAGE_KEY_PREFIX}:${cartId || "unknown"}`

const getStarVaultsPayPageUrl = (paymentCollection?: any) => {
  if (!paymentCollection?.payment_sessions?.length) {
    return undefined
  }

  const session =
    paymentCollection.payment_sessions.find(
      (session: any) =>
        session.status === "pending" && session.provider_id === STAR_VAULTS_PROVIDER_ID
    ) ??
    paymentCollection.payment_sessions.find(
      (session: any) => session.provider_id === STAR_VAULTS_PROVIDER_ID
    )

  return typeof session?.data?.pay_page_url === "string"
    ? session.data.pay_page_url
    : undefined
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
}) => {
  const t = useTranslations("Checkout.PaymentButton")

  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1

  const paymentSession =
    cart.payment_collection?.payment_sessions?.find(
      (session) => session.status === "pending"
    ) ?? cart.payment_collection?.payment_sessions?.[0]

  switch (true) {
    case isStripeLike(paymentSession?.provider_id):
      return (
        <StripePaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case isManual(paymentSession?.provider_id):
      return (
        <ManualTestPaymentButton notReady={notReady} data-testid={dataTestId} />
      )
    case isStarVaults(paymentSession?.provider_id):
      return (
        <StarVaultsPaymentButton
          cart={cart}
          notReady={notReady}
          data-testid={dataTestId}
        />
      )
    default:
      return <Button disabled>{t("selectPaymentMethod")}</Button>
  }
}

const StripePaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const t = useTranslations("Checkout.PaymentButton")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) => {
        setErrorMessage(err.message)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const stripe = useStripe()
  const elements = useElements()
  const card = elements?.getElement("card")

  const session = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )

  const disabled = !stripe || !elements ? true : false

  const handlePayment = async () => {
    setSubmitting(true)

    if (!stripe || !elements || !card || !cart) {
      setSubmitting(false)
      return
    }

    await stripe
      .confirmCardPayment(session?.data.client_secret as string, {
        payment_method: {
          card: card,
          billing_details: {
            name:
              cart.billing_address?.first_name +
              " " +
              cart.billing_address?.last_name,
            address: {
              city: cart.billing_address?.city ?? undefined,
              country: cart.billing_address?.country_code ?? undefined,
              line1: cart.billing_address?.address_1 ?? undefined,
              line2: cart.billing_address?.address_2 ?? undefined,
              postal_code: cart.billing_address?.postal_code ?? undefined,
              state: cart.billing_address?.province ?? undefined,
            },
            email: cart.email,
            phone: cart.billing_address?.phone ?? undefined,
          },
        },
      })
      .then(({ error, paymentIntent }) => {
        if (error) {
          const pi = error.payment_intent

          if (
            (pi && pi.status === "requires_capture") ||
            (pi && pi.status === "succeeded")
          ) {
            onPaymentCompleted()
          }

          setErrorMessage(error.message || null)
          return
        }

        if (
          (paymentIntent && paymentIntent.status === "requires_capture") ||
          paymentIntent.status === "succeeded"
        ) {
          return onPaymentCompleted()
        }

        return
      })
  }

  return (
    <>
      <Button
        disabled={disabled || notReady}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid={dataTestId}
      >
        {t("placeOrder")}
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-payment-error-message"
      />
    </>
  )
}

const ManualTestPaymentButton = ({ notReady }: { notReady: boolean }) => {
  const t = useTranslations("Checkout.PaymentButton")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) => {
        setErrorMessage(err.message)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const handlePayment = () => {
    setSubmitting(true)

    onPaymentCompleted()
  }

  return (
    <>
      <Button
        disabled={notReady}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        data-testid="submit-order-button"
      >
        {t("placeOrder")}
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="manual-payment-error-message"
      />
    </>
  )
}

const StarVaultsPaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const t = useTranslations("Checkout.PaymentButton")
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const hasQueryReturnFlag = searchParams.get("chainup_return") === "1"
  const starVaultsCheckoutStateStorageKey = getStarVaultsCheckoutStateStorageKey(cart.id)
  const starVaultsAutoRetryStorageKey = getStarVaultsAutoRetryStorageKey(cart.id)

  const starVaultsSession =
    cart.payment_collection?.payment_sessions?.find(
      (session) => session.status === "pending" && isStarVaults(session.provider_id)
    ) ??
    cart.payment_collection?.payment_sessions?.find((session) =>
      isStarVaults(session.provider_id)
    )

  const payPageUrl =
    typeof starVaultsSession?.data?.pay_page_url === "string"
      ? starVaultsSession.data.pay_page_url
      : undefined

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [forceRedirectToPay, setForceRedirectToPay] = useState(false)
  const [resolvedPayPageUrl, setResolvedPayPageUrl] = useState<string | undefined>(
    payPageUrl
  )
  const [hasReturnedFromStarVaults, setHasReturnedFromStarVaults] =
    useState(hasQueryReturnFlag)

  useEffect(() => {
    setResolvedPayPageUrl(payPageUrl)
  }, [payPageUrl])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const storedCheckoutState = window.sessionStorage.getItem(
      starVaultsCheckoutStateStorageKey
    )

    if (hasQueryReturnFlag) {
      window.sessionStorage.setItem(
        starVaultsCheckoutStateStorageKey,
        STAR_VAULTS_CHECKOUT_STATE_RETURNED
      )
      setHasReturnedFromStarVaults(true)
      return
    }

    setHasReturnedFromStarVaults(
      storedCheckoutState === STAR_VAULTS_CHECKOUT_STATE_RETURNED
    )
  }, [starVaultsCheckoutStateStorageKey, hasQueryReturnFlag])

  const createStarVaultsReturnPage = () => {
    if (typeof window === "undefined") {
      return undefined
    }

    return `${window.location.origin}${pathname}`
  }

  const resolveStarVaultsPayPageUrl = async (reinitializeSession = false) => {
    if (!reinitializeSession && resolvedPayPageUrl) {
      return resolvedPayPageUrl
    }

    const starVaultsReturnPage = createStarVaultsReturnPage()
    const refreshedSession = await initiatePaymentSession(cart, {
      provider_id: STAR_VAULTS_PROVIDER_ID,
      ...(starVaultsReturnPage
        ? {
            data: {
              return_page: starVaultsReturnPage,
            },
          }
        : {}),
    })

    const refreshedPayPageUrl =
      getStarVaultsPayPageUrl(refreshedSession?.cart?.payment_collection) ??
      getStarVaultsPayPageUrl(refreshedSession?.payment_collection)

    const nextPayPageUrl = refreshedPayPageUrl ?? resolvedPayPageUrl
    if (!nextPayPageUrl) {
      throw new Error(t("missingPaymentUrl"))
    }

    setResolvedPayPageUrl(nextPayPageUrl)
    return nextPayPageUrl
  }

  const onPaymentCompleted = async () => {
    try {
      await placeOrder()
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(starVaultsCheckoutStateStorageKey)
        window.sessionStorage.removeItem(starVaultsAutoRetryStorageKey)
      }
    } catch (err: any) {
      const message = err?.message || t("failedToComplete")
      if (message.includes("was not authorized with the provider")) {
        setErrorMessage(t("paymentNotCompleted"))
        setHasReturnedFromStarVaults(false)
        setForceRedirectToPay(true)

        if (typeof window !== "undefined") {
          const hasAutoRetried =
            window.sessionStorage.getItem(starVaultsAutoRetryStorageKey) === "1"

          if (!hasAutoRetried) {
            window.sessionStorage.setItem(starVaultsAutoRetryStorageKey, "1")
            await redirectToStarVaultsPayment({
              reinitializeSession: true,
              resetAutoRetry: false,
            })
            return
          }
        }
        return
      }

      setErrorMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  const redirectToStarVaultsPayment = async ({
    reinitializeSession = false,
    resetAutoRetry = false,
  }: {
    reinitializeSession?: boolean
    resetAutoRetry?: boolean
  }) => {
    try {
      const nextPayPageUrl = await resolveStarVaultsPayPageUrl(reinitializeSession)

      if (typeof window === "undefined") {
        return
      }

      if (resetAutoRetry) {
        window.sessionStorage.removeItem(starVaultsAutoRetryStorageKey)
      }

      window.sessionStorage.setItem(
        starVaultsCheckoutStateStorageKey,
        STAR_VAULTS_CHECKOUT_STATE_REDIRECTING
      )
      setHasReturnedFromStarVaults(false)
      setForceRedirectToPay(false)
      window.location.assign(nextPayPageUrl)
    } catch (err: any) {
      setErrorMessage(
        err?.message || t("missingPaymentUrl")
      )
      setSubmitting(false)
    }
  }

  const handlePayment = async () => {
    setSubmitting(true)
    setErrorMessage(null)

    const shouldRedirectToPay = !hasReturnedFromStarVaults || forceRedirectToPay
    if (shouldRedirectToPay) {
      await redirectToStarVaultsPayment({
        reinitializeSession: forceRedirectToPay,
        resetAutoRetry: !forceRedirectToPay,
      })
      return
    }

    await onPaymentCompleted()
  }

  return (
    <>
      <Button
        disabled={notReady}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        data-testid={dataTestId}
      >
        {forceRedirectToPay
          ? t("retryPayment")
          : !hasReturnedFromStarVaults
            ? t("continueToPayment")
            : t("placeOrder")}
      </Button>
      <ErrorMessage error={errorMessage} data-testid="chainup-payment-error-message" />
    </>
  )
}

export default PaymentButton

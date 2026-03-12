"use client"

import { isChainup, isManual, isStripeLike } from "@lib/constants"
import { placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import { useSearchParams } from "next/navigation"
import React, { useEffect, useState } from "react"
import ErrorMessage from "../error-message"

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  "data-testid": string
}

const CHAINUP_NOT_AUTHORIZED_MESSAGE =
  "ChainUp payment is not completed yet. Please continue payment and try again."
const CHAINUP_RETURN_STORAGE_KEY_PREFIX = "chainup_checkout_returned"

const getChainupReturnStorageKey = (cartId?: string) =>
  `${CHAINUP_RETURN_STORAGE_KEY_PREFIX}:${cartId || "unknown"}`

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
}) => {
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
    case isChainup(paymentSession?.provider_id):
      return (
        <ChainupPaymentButton
          cart={cart}
          notReady={notReady}
          data-testid={dataTestId}
        />
      )
    default:
      return <Button disabled>Select a payment method</Button>
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
        Place order
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-payment-error-message"
      />
    </>
  )
}

const ManualTestPaymentButton = ({ notReady }: { notReady: boolean }) => {
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
        Place order
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="manual-payment-error-message"
      />
    </>
  )
}

const ChainupPaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const searchParams = useSearchParams()
  const hasQueryReturnFlag = searchParams.get("chainup_return") === "1"
  const chainupReturnStorageKey = getChainupReturnStorageKey(cart.id)

  const chainupSession =
    cart.payment_collection?.payment_sessions?.find(
      (session) => session.status === "pending" && isChainup(session.provider_id)
    ) ??
    cart.payment_collection?.payment_sessions?.find((session) =>
      isChainup(session.provider_id)
    )

  const payPageUrl =
    typeof chainupSession?.data?.pay_page_url === "string"
      ? chainupSession.data.pay_page_url
      : undefined

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [forceRedirectToPay, setForceRedirectToPay] = useState(false)
  const [hasReturnedFromChainup, setHasReturnedFromChainup] =
    useState(hasQueryReturnFlag)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const hasStoredReturnFlag =
      window.sessionStorage.getItem(chainupReturnStorageKey) === "1"

    if (hasQueryReturnFlag || hasStoredReturnFlag) {
      window.sessionStorage.setItem(chainupReturnStorageKey, "1")
      setHasReturnedFromChainup(true)
      return
    }

    setHasReturnedFromChainup(false)
  }, [chainupReturnStorageKey, hasQueryReturnFlag])

  const onPaymentCompleted = async () => {
    await placeOrder()
      .then(() => {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(chainupReturnStorageKey)
        }
      })
      .catch((err) => {
        const message = err?.message || "Failed to complete ChainUp payment"
        if (message.includes("was not authorized with the provider")) {
          setErrorMessage(CHAINUP_NOT_AUTHORIZED_MESSAGE)
          setForceRedirectToPay(true)
          return
        }

        setErrorMessage(message)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const redirectToChainupPayment = () => {
    if (!payPageUrl) {
      setErrorMessage(
        "Missing ChainUp payment page URL. Please go back and select ChainUp again."
      )
      setSubmitting(false)
      return
    }

    window.sessionStorage.setItem(chainupReturnStorageKey, "1")
    window.location.assign(payPageUrl)
  }

  const handlePayment = () => {
    setSubmitting(true)
    setErrorMessage(null)

    const shouldRedirectToPay = !hasReturnedFromChainup || forceRedirectToPay
    if (shouldRedirectToPay) {
      redirectToChainupPayment()
      return
    }

    onPaymentCompleted()
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
        {!hasReturnedFromChainup || forceRedirectToPay
          ? "Continue to ChainUp payment"
          : "Place order"}
      </Button>
      <ErrorMessage error={errorMessage} data-testid="chainup-payment-error-message" />
    </>
  )
}

export default PaymentButton

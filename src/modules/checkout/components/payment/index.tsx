"use client"

import { RadioGroup } from "@headlessui/react"
import { isStarVaults, isStripeLike, paymentInfoMap } from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"
import { CheckCircleSolid, CreditCard } from "@medusajs/icons"
import { Button, Container, Heading, Text, clx } from "@medusajs/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import PaymentContainer, {
  StripeCardContainer,
} from "@modules/checkout/components/payment-container"
import Divider from "@modules/common/components/divider"
import { useTranslations } from "next-intl"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

const SERVER_ACTION_MISMATCH_TOKEN = "Failed to find Server Action"

const getCheckoutErrorMessage = (err: unknown, storefrontUpdatedMessage: string) => {
  const message =
    err instanceof Error ? err.message : "Failed to initialize payment session"

  if (message.includes(SERVER_ACTION_MISMATCH_TOKEN)) {
    return storefrontUpdatedMessage
  }

  return message
}

const Payment = ({
  cart,
  availablePaymentMethods,
  hasStarVaultsSession,
}: {
  cart: any
  availablePaymentMethods: any[]
  hasStarVaultsSession: boolean
}) => {
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession: any) => paymentSession.status === "pending"
  )
  const hasActiveStarVaultsSession = isStarVaults(activeSession?.provider_id)
  const t = useTranslations("Checkout.Payment")

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardBrand, setCardBrand] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? ""
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "payment"

  const shouldBlockStarVaultsSelection = (method?: string) => {
    return (
      isStarVaults(method) &&
      !hasStarVaultsSession &&
      !hasActiveStarVaultsSession
    )
  }

  const setPaymentMethod = async (method: string) => {
    setError(null)

    if (shouldBlockStarVaultsSelection(method)) {
      setSelectedPaymentMethod("")
      setError(t("signInRequired"))
      return
    }

    setSelectedPaymentMethod(method)

    if (isStripeLike(method)) {
      try {
        await initiatePaymentSession(cart, {
          provider_id: method,
        })
        router.refresh()
      } catch (err: any) {
        const message = getCheckoutErrorMessage(err, t("storefrontUpdated"))
        setError(message)
        if (message === t("storefrontUpdated")) {
          router.refresh()
        }
      }
    }
  }

  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  const paymentReady =
    (activeSession && cart?.shipping_methods.length !== 0) || paidByGiftcard

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const createStarVaultsReturnPage = useCallback(() => {
    if (typeof window === "undefined") {
      return undefined
    }

    return `${window.location.origin}${pathname}`
  }, [pathname])

  const handleEdit = () => {
    router.push(pathname + "?" + createQueryString("step", "payment"), {
      scroll: false,
    })
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      if (!selectedPaymentMethod && !paidByGiftcard) {
        throw new Error("Please select a payment method.")
      }

      const shouldInputCard =
        isStripeLike(selectedPaymentMethod) && !activeSession

      const checkActiveSession =
        activeSession?.provider_id === selectedPaymentMethod

      if (
        shouldBlockStarVaultsSelection(selectedPaymentMethod) &&
        !checkActiveSession
      ) {
        throw new Error(t("signInRequired"))
      }

      if (!checkActiveSession) {
        const starVaultsReturnPage = isStarVaults(selectedPaymentMethod)
          ? createStarVaultsReturnPage()
          : undefined

        await initiatePaymentSession(cart, {
          provider_id: selectedPaymentMethod,
          ...(starVaultsReturnPage
            ? {
                data: {
                  return_page: starVaultsReturnPage,
                },
              }
            : {}),
        })
      }

      if (!shouldInputCard) {
        router.push(
          pathname + "?" + createQueryString("step", "review"),
          {
            scroll: false,
          }
        )
        if (!checkActiveSession) {
          router.refresh()
        }
        return
      }

      if (!checkActiveSession) {
        router.refresh()
      }
    } catch (err: any) {
      const message = getCheckoutErrorMessage(err, t("storefrontUpdated"))
      setError(message)
      if (message === t("storefrontUpdated")) {
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none":
                !isOpen && !paymentReady,
            }
          )}
        >
          {t("payment")}
          {!isOpen && paymentReady && <CheckCircleSolid />}
        </Heading>
        {!isOpen && paymentReady && (
          <Text>
            <button
              onClick={handleEdit}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
              data-testid="edit-payment-button"
            >
              {t("edit")}
            </button>
          </Text>
        )}
      </div>
      <div>
        <div className={isOpen ? "block" : "hidden"}>
          {!paidByGiftcard && availablePaymentMethods?.length && (
            <>
              <RadioGroup
                value={selectedPaymentMethod}
                onChange={(value: string) => setPaymentMethod(value)}
              >
                {availablePaymentMethods.map((paymentMethod) => (
                  <div key={paymentMethod.id}>
                    {(() => {
                      const isPaymentMethodDisabled =
                        shouldBlockStarVaultsSelection(paymentMethod.id)

                      return isStripeLike(paymentMethod.id) ? (
                        <StripeCardContainer
                          paymentProviderId={paymentMethod.id}
                          selectedPaymentOptionId={selectedPaymentMethod}
                          paymentInfoMap={paymentInfoMap}
                          setCardBrand={setCardBrand}
                          setError={setError}
                          setCardComplete={setCardComplete}
                          disabled={isPaymentMethodDisabled}
                        />
                      ) : (
                        <PaymentContainer
                          paymentInfoMap={paymentInfoMap}
                          paymentProviderId={paymentMethod.id}
                          selectedPaymentOptionId={selectedPaymentMethod}
                          disabled={isPaymentMethodDisabled}
                        />
                      )
                    })()}
                  </div>
                ))}
              </RadioGroup>
              {!hasStarVaultsSession &&
                !hasActiveStarVaultsSession &&
                availablePaymentMethods.some((method) =>
                  isStarVaults(method.id)
                ) && (
                  <Text className="txt-small text-ui-fg-subtle mt-2">
                    {t("signInRequired")}
                  </Text>
                )}
            </>
          )}

          {paidByGiftcard && (
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                {t("paymentMethod")}
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method-summary"
              >
                {t("giftCard")}
              </Text>
            </div>
          )}

          <ErrorMessage
            error={error}
            data-testid="payment-method-error-message"
          />

          <Button
            size="large"
            className="mt-6"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={
              (isStripeLike(selectedPaymentMethod) && !cardComplete) ||
              (!selectedPaymentMethod && !paidByGiftcard)
            }
            data-testid="submit-payment-button"
          >
            {!activeSession && isStripeLike(selectedPaymentMethod)
              ? ` ${t("enterCardDetails")}`
              : t("continueToReview")}
          </Button>
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {cart && paymentReady && activeSession ? (
            <div className="flex items-start gap-x-1 w-full">
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  {t("paymentMethod")}
                </Text>
                <Text
                  className="txt-medium text-ui-fg-subtle"
                  data-testid="payment-method-summary"
                >
                  {paymentInfoMap[activeSession?.provider_id]?.title ||
                    activeSession?.provider_id}
                </Text>
              </div>
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  {t("paymentDetails")}
                </Text>
                <div
                  className="flex gap-2 txt-medium text-ui-fg-subtle items-center"
                  data-testid="payment-details-summary"
                >
                  <Container className="flex items-center h-7 w-fit p-2 bg-ui-button-neutral-hover">
                    {paymentInfoMap[selectedPaymentMethod]?.icon || (
                      <CreditCard />
                    )}
                  </Container>
                  <Text>
                    {isStripeLike(selectedPaymentMethod) && cardBrand
                      ? cardBrand
                      : t("anotherStep")}
                  </Text>
                </div>
              </div>
            </div>
          ) : paidByGiftcard ? (
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                {t("paymentMethod")}
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method-summary"
              >
                {t("giftCard")}
              </Text>
            </div>
          ) : null}
        </div>
      </div>
      <Divider className="mt-8" />
    </div>
  )
}

export default Payment

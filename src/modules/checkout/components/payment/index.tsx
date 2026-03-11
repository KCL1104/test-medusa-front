"use client"

import { RadioGroup } from "@headlessui/react"
import { isChainup, isStripeLike, paymentInfoMap } from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"
import { CheckCircleSolid, CreditCard } from "@medusajs/icons"
import { Button, Container, Heading, Text, clx } from "@medusajs/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import PaymentContainer, {
  StripeCardContainer,
} from "@modules/checkout/components/payment-container"
import Divider from "@modules/common/components/divider"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

const MISSING_CHAINUP_SESSION_MESSAGE =
  "ChainUp requires Platform sign-in before checkout."
const SERVER_ACTION_MISMATCH_TOKEN = "Failed to find Server Action"
const SERVER_ACTION_MISMATCH_MESSAGE =
  "Storefront was just updated. Please refresh and choose your payment method again."

const getCheckoutErrorMessage = (err: unknown) => {
  const message =
    err instanceof Error ? err.message : "Failed to initialize payment session"

  if (message.includes(SERVER_ACTION_MISMATCH_TOKEN)) {
    return SERVER_ACTION_MISMATCH_MESSAGE
  }

  return message
}

const Payment = ({
  cart,
  availablePaymentMethods,
  hasPlatformSession,
}: {
  cart: any
  availablePaymentMethods: any[]
  hasPlatformSession: boolean
}) => {
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession: any) => paymentSession.status === "pending"
  )
  const hasActiveChainupSession = isChainup(activeSession?.provider_id)

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

  const shouldBlockChainupSelection = (method?: string) => {
    return isChainup(method) && !hasPlatformSession && !hasActiveChainupSession
  }

  const setPaymentMethod = async (method: string) => {
    setError(null)

    if (shouldBlockChainupSelection(method)) {
      setSelectedPaymentMethod("")
      setError(MISSING_CHAINUP_SESSION_MESSAGE)
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
        const message = getCheckoutErrorMessage(err)
        setError(message)
        if (message === SERVER_ACTION_MISMATCH_MESSAGE) {
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
        shouldBlockChainupSelection(selectedPaymentMethod) &&
        !checkActiveSession
      ) {
        throw new Error(MISSING_CHAINUP_SESSION_MESSAGE)
      }

      if (!checkActiveSession) {
        await initiatePaymentSession(cart, {
          provider_id: selectedPaymentMethod,
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
      const message = getCheckoutErrorMessage(err)
      setError(message)
      if (message === SERVER_ACTION_MISMATCH_MESSAGE) {
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
          Payment
          {!isOpen && paymentReady && <CheckCircleSolid />}
        </Heading>
        {!isOpen && paymentReady && (
          <Text>
            <button
              onClick={handleEdit}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
              data-testid="edit-payment-button"
            >
              Edit
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
                        shouldBlockChainupSelection(paymentMethod.id)

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
              {!hasPlatformSession &&
                !hasActiveChainupSession &&
                availablePaymentMethods.some((method) =>
                  isChainup(method.id)
                ) && (
                  <Text className="txt-small text-ui-fg-subtle mt-2">
                    {MISSING_CHAINUP_SESSION_MESSAGE}
                  </Text>
                )}
            </>
          )}

          {paidByGiftcard && (
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                Payment method
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method-summary"
              >
                Gift card
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
              ? " Enter card details"
              : "Continue to review"}
          </Button>
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {cart && paymentReady && activeSession ? (
            <div className="flex items-start gap-x-1 w-full">
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  Payment method
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
                  Payment details
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
                      : "Another step will appear"}
                  </Text>
                </div>
              </div>
            </div>
          ) : paidByGiftcard ? (
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                Payment method
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method-summary"
              >
                Gift card
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

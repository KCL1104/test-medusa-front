"use client"

import { transferCart } from "@lib/data/customer"
import { ExclamationCircleSolid } from "@medusajs/icons"
import { StoreCart, StoreCustomer } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useTranslations } from "next-intl"

function CartMismatchBanner(props: {
  customer: StoreCustomer
  cart: StoreCart
}) {
  const { customer, cart } = props
  const t = useTranslations("Layout.CartMismatchBanner")
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [actionKey, setActionKey] = useState<"retrySync" | "syncing">("retrySync")

  if (!customer || !!cart.customer_id) {
    return
  }

  const handleSubmit = async () => {
    try {
      setIsPending(true)
      setActionKey("syncing")

      await transferCart()
      router.refresh()
    } catch {
      setActionKey("retrySync")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex items-center justify-center small:p-4 p-2 text-center bg-orange-300 small:gap-2 gap-1 text-sm mt-2 text-orange-800">
      <div className="flex flex-col small:flex-row small:gap-2 gap-1 items-center">
        <span className="flex items-center gap-1">
          <ExclamationCircleSolid className="inline" />
          {t("syncError")}
        </span>

        <span>·</span>

        <Button
          variant="transparent"
          className="hover:bg-transparent active:bg-transparent focus:bg-transparent disabled:text-orange-500 text-orange-950 p-0 bg-transparent"
          size="base"
          disabled={isPending}
          onClick={handleSubmit}
        >
          {t(actionKey)}
        </Button>
      </div>
    </div>
  )
}

export default CartMismatchBanner

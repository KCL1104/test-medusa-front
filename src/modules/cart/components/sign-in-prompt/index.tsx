import { Button, Heading, Text } from "@medusajs/ui"
import { getTranslations } from "next-intl/server"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const SignInPrompt = async () => {
  const t = await getTranslations("Cart.SignInPrompt")
  return (
    <div className="bg-white flex items-center justify-between">
      <div>
        <Heading level="h2" className="txt-xlarge">
          {t("alreadyHaveAccount")}
        </Heading>
        <Text className="txt-medium text-ui-fg-subtle mt-2">
          {t("signInForBetter")}
        </Text>
      </div>
      <div>
        <LocalizedClientLink href="/account">
          <Button variant="secondary" className="h-10" data-testid="sign-in-button">
            {t("signIn")}
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default SignInPrompt

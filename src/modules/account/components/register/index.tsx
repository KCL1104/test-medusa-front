"use client"

import { startStarVaultsLogin } from "@lib/data/customer"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import { useTranslations } from "next-intl"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const t = useTranslations("Account.Register")

  return (
    <div
      className="max-w-sm flex flex-col items-center"
      data-testid="register-page"
    >
      <h1 className="text-large-semi uppercase mb-6">
        {t("becomeAMember")}
      </h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-4">
        {t("createAccountDescription")}
      </p>
      <form className="w-full" action={startStarVaultsLogin}>
        <span className="text-center text-ui-fg-base text-small-regular block mb-6">
          {t("agreeToTerms")}{" "}
          <LocalizedClientLink
            href="/content/privacy-policy"
            className="underline"
          >
            {t("privacyPolicy")}
          </LocalizedClientLink>{" "}
          and{" "}
          <LocalizedClientLink
            href="/content/terms-of-use"
            className="underline"
          >
            {t("termsOfUse")}
          </LocalizedClientLink>
          .
        </span>
        <SubmitButton className="w-full" data-testid="register-button">
          {t("signUpWithStarVaults")}
        </SubmitButton>
      </form>
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        {t("alreadyMember")}{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="underline"
        >
          {t("signIn")}
        </button>
        .
      </span>
    </div>
  )
}

export default Register

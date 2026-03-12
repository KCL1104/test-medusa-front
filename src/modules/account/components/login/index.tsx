import { startStarVaultsLogin } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { getTranslations } from "next-intl/server"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = async ({ setCurrentView }: Props) => {
  const t = await getTranslations("Account.Login")

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center"
      data-testid="login-page"
    >
      <h1 className="text-large-semi uppercase mb-6">{t("welcomeBack")}</h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-8">
        {t("signInDescription")}
      </p>
      <form className="w-full" action={startStarVaultsLogin}>
        <SubmitButton
          data-testid="platform-sign-in-button"
          className="w-full"
        >
          {t("signInWithStarVaults")}
        </SubmitButton>
      </form>
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        {t("notMember")}{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="underline"
          data-testid="register-button"
        >
          {t("joinUs")}
        </button>
        .
      </span>
    </div>
  )
}

export default Login

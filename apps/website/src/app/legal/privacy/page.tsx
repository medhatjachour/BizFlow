import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How BizFlow collects, stores, and uses customer and operational data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-black tracking-tight">Privacy Policy</h1>
      <p className="mt-3 text-sm text-foreground/65">Effective date: September 2, 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-7 text-foreground/80">
        <p>
          This is the privacy policy for BizFlow, the business software, customer account, download, licensing, and support service
          available at www.bizflow.medhatjachour.tech. It explains what personal information BizFlow collects, why we use it, and the choices available to you.
        </p>
        <h2 className="pt-4 text-xl font-bold text-foreground">Information we collect</h2>
        <p>
          When you create an account, we collect your email address, name if provided, encrypted password credential,
          account session data, and the sign-in method you choose. When you use Google Sign-In, Google provides your
          Google account identifier, verified email address, and profile name. We do not receive or store your Google password.
        </p>
        <h2 className="pt-4 text-xl font-bold text-foreground">Google Sign-In data</h2>
        <p>
          BizFlow requests only the Google OpenID Connect scopes <code className="rounded bg-white/10 px-1">openid</code>,{" "}
          <code className="rounded bg-white/10 px-1">email</code>, and <code className="rounded bg-white/10 px-1">profile</code>.
          When you choose Continue with Google, we access your Google account&apos;s unique subject identifier, verified email address, and display name.
          We use this information only to create or link your BizFlow account and sign you in. BizFlow does not access Gmail, Google Drive, Calendar,
          Contacts, or any other Google service.
        </p>
        <p>
          We store the Google subject identifier, verified email address, display name, account link, and the time the link was created in our customer database.
          Google authorization codes and access tokens are used only during sign-in and are not stored. We do not request or store refresh tokens,
          and we do not sell, rent, use for advertising, or allow humans to read Google user data except where necessary to provide support you request.
        </p>
        <p>
          When you buy or evaluate BizFlow, we collect order and payment status, purchased product, license key,
          download requests, support tickets and messages, and custom work requests. To enforce a one-device license,
          we also store a device fingerprint, optional device name, and activation time. We do not use these records for
          advertising profiling.
        </p>
        <h2 className="pt-4 text-xl font-bold text-foreground">How we use information</h2>
        <p>
          We use account and transaction information to authenticate you, fulfill purchases, issue and protect licenses,
          provide downloads, answer support requests, prepare requested edits or custom work, prevent fraud and abuse,
          and maintain service security. We use email to deliver account, license, password reset, purchase, and support notices.
        </p>
        <p>
          Payment card data is handled by Stripe. BizFlow does not store full card numbers or CVC values.
          Stripe sends us limited checkout details needed for fulfillment and accounting under its own privacy policy.
        </p>
        <p>
          We use cookies only for account authentication, OAuth sign-in protection, and consent-gated analytics where enabled.
          Authentication cookies are HTTP-only. Operational logs may include request IDs, route, status, and error metadata,
          but never plaintext passwords, payment card data, or Google access tokens.
        </p>
        <h2 className="pt-4 text-xl font-bold text-foreground">Sharing, retention, and security</h2>
        <p>
          We share data only with service providers needed to operate BizFlow: Google processes the sign-in you initiate, Stripe processes payments,
          email providers deliver transactional messages, and hosting providers store and transmit our service data. We do not sell or transfer Google user data
          to third parties for advertising, creditworthiness, or unrelated purposes. We retain account, order, license, and support records while your account
          or license is active and as needed for legal, tax, security, and dispute obligations. We use encrypted transport, password hashing, HTTP-only session cookies,
          OAuth state validation, restricted administrative access, and limited-access operational systems to protect data.
        </p>
        <h2 className="pt-4 text-xl font-bold text-foreground">Your choices and contact</h2>
        <p>
          You may request access, correction, export, deletion, or withdrawal of optional Google Sign-In access by contacting support from the email address on your account.
          We delete the Google identity link and associated account data on a verified deletion request unless we must retain a limited record for legal, tax,
          fraud-prevention, or dispute purposes. You can also disconnect BizFlow from your Google account through Google Account permissions. To make a privacy request,
          open a <a href="/support" className="font-semibold text-biz-300 underline underline-offset-2">BizFlow support ticket</a>. When we materially change how
          BizFlow uses Google user data, we will update this policy&apos;s effective date and notify affected account holders by email or in-product notice before the change takes effect.
        </p>
      </section>
    </main>
  );
}

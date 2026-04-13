export const STRIPE_PAYMENT_LINK =
  process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK?.trim() ?? "https://stripe.com/in/payments/payment-methods";

export function openStripePaymentLink(onMissingLink?: () => void) {
  if (!STRIPE_PAYMENT_LINK) {
    onMissingLink?.();
    return;
  }

  window.open(STRIPE_PAYMENT_LINK, "_blank", "noopener,noreferrer");
}

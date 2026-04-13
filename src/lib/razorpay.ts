let isRazorpayLoaded = false;

export interface RazorpayOrderConfig {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOrderConfig) => { open: () => void };
  }
}

export async function loadRazorpayCheckout(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (window.Razorpay || isRazorpayLoaded) return true;

  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      isRazorpayLoaded = true;
      resolve(true);
    };

    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}
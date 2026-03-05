import Stripe from "stripe";
import https from "https";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createNodeHttpClient(https),
  });
  const { plan = "starter" } = req.body;

  const plans = {
    starter: {
      name: "Campio Starter — Full Learning Path",
      amount: 1900, // $19.00
      mode: "payment",
    },
    pro: {
      name: "Campio Pro",
      amount: 2900, // $29.00
      mode: "subscription",
    },
  };

  const selected = plans[plan] || plans.starter;
  const base = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: selected.mode,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: selected.name },
            unit_amount: selected.amount,
            ...(selected.mode === "subscription" && { recurring: { interval: "month" } }),
          },
          quantity: 1,
        },
      ],
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/pricing`,
      metadata: { plan },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return res.status(500).json({ error: "Failed to create checkout session", detail: err.message });
  }
}

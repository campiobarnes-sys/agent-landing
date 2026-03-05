export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { plan = "starter" } = req.body;

  const plans = {
    starter: { name: "Campio Starter — Full Learning Path", amount: 1900, mode: "payment" },
    pro: { name: "Campio Pro", amount: 2900, mode: "subscription" },
  };

  const selected = plans[plan] || plans.starter;
  const base = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;
  const key = process.env.STRIPE_SECRET_KEY;

  try {
    const params = new URLSearchParams();
    params.append("mode", selected.mode);
    params.append("success_url", `${base}/success?session_id={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url", `${base}/pricing`);
    params.append("payment_method_types[0]", "card");
    params.append("line_items[0][quantity]", "1");
    params.append("line_items[0][price_data][currency]", "usd");
    params.append("line_items[0][price_data][product_data][name]", selected.name);
    params.append("line_items[0][price_data][unit_amount]", String(selected.amount));

    if (selected.mode === "subscription") {
      params.append("line_items[0][price_data][recurring][interval]", "month");
    }

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Stripe error:", data);
      return res.status(500).json({ error: "Failed to create checkout session", detail: data?.error?.message });
    }

    return res.status(200).json({ url: data.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return res.status(500).json({ error: "Failed to create checkout session", detail: err.message });
  }
}

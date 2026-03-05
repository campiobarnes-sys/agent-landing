export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { plan = "starter" } = req.body;

  const plans = {
    starter: { name: "Campio Starter — Full Learning Path", amount: 1900, mode: "payment" },
    pro: { name: "Campio Pro", amount: 2900, mode: "subscription" },
  };

  const selected = plans[plan] || plans.starter;
  const base = "https://www.campioai.com";

  // Use test key when STRIPE_TEST_MODE=true, else live
  const testMode = process.env.STRIPE_TEST_MODE === "true";
  const key = testMode
    ? process.env.STRIPE_SECRET_KEY_TEST
    : process.env.STRIPE_SECRET_KEY;

  try {
    const parts = [
      `mode=${selected.mode}`,
      `success_url=${encodeURIComponent(base + "/success")}%3Fsession_id%3D{CHECKOUT_SESSION_ID}`,
      `cancel_url=${encodeURIComponent(base + "/pricing")}`,
      `payment_method_types[0]=card`,
      `line_items[0][quantity]=1`,
      `line_items[0][price_data][currency]=usd`,
      `line_items[0][price_data][product_data][name]=${encodeURIComponent(selected.name)}`,
      `line_items[0][price_data][unit_amount]=${selected.amount}`,
      `metadata[plan]=${plan}`,
    ];

    if (selected.mode === "subscription") {
      parts.push("line_items[0][price_data][recurring][interval]=month");
    }

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: parts.join("&"),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Stripe error:", JSON.stringify(data));
      return res.status(500).json({ error: "Failed to create checkout session", detail: data?.error?.message });
    }

    return res.status(200).json({ url: data.url, test: testMode });
  } catch (err) {
    console.error("Checkout error:", err);
    return res.status(500).json({ error: "Failed to create checkout session", detail: err.message });
  }
}

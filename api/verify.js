import Stripe from "stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { session_id } = req.body;

  if (!session_id) return res.status(400).json({ error: "Missing session_id" });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === "paid" || session.status === "complete") {
      return res.status(200).json({
        success: true,
        plan: session.metadata?.plan || "starter",
        email: session.customer_details?.email || null,
      });
    }

    return res.status(200).json({ success: false });
  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({ error: "Failed to verify session", detail: err.message });
  }
}

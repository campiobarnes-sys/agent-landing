export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, source = "unknown" } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Invalid email" });
  }

  console.log(`Email captured: ${email} | source: ${source}`);

  // Send welcome email via Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Campio <onboarding@resend.dev>",
          to: email,
          subject: "Your Campio learning path is saved 🎯",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0b0f;color:#f0efe8;padding:2rem;border-radius:12px;">
              <h1 style="color:#c9a84c;font-size:1.5rem;margin-bottom:0.5rem;">Your path is saved ✅</h1>
              <p style="color:#9ca3af;line-height:1.6;margin-bottom:1rem;">
                Thanks for joining Campio. Your personalized AI learning path is waiting —
                real modules, real projects, and everything you need to go from where you are
                to where you want to be.
              </p>
              <p style="color:#9ca3af;line-height:1.6;margin-bottom:1.5rem;">
                Unlock all 5 modules with one-time access for just $19.
              </p>
              <a href="https://www.campioai.com/results"
                style="display:inline-block;background:#c9a84c;color:#0a0b0f;padding:0.75rem 1.75rem;border-radius:10px;font-weight:700;text-decoration:none;margin-bottom:1.5rem;">
                View my learning path →
              </a>
              <p style="color:#6b6a72;font-size:0.78rem;margin-top:1rem;">
                You signed up at campioai.com · <a href="https://www.campioai.com" style="color:#6b6a72;">Unsubscribe</a>
              </p>
            </div>
          `,
        }),
      });

      const d = await r.json();
      if (!r.ok) {
        console.error("Resend error:", JSON.stringify(d));
      } else {
        console.log("Welcome email sent:", d.id);
      }
    } catch (err) {
      console.error("Resend exception:", err.message);
    }
  }

  return res.status(200).json({ success: true });
}

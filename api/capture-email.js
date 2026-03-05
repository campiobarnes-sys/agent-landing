export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, source = "unknown" } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Invalid email" });
  }

  const results = [];

  // --- Resend (if configured) ---
  if (process.env.RESEND_API_KEY) {
    try {
      // Add to Resend audience
      if (process.env.RESEND_AUDIENCE_ID) {
        const r = await fetch(`https://api.resend.com/audiences/${process.env.RESEND_AUDIENCE_ID}/contacts`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, unsubscribed: false }),
        });
        const d = await r.json();
        results.push({ provider: "resend_audience", ok: r.ok, id: d.id });
      }

      // Send welcome email
      const welcome = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Campio <hello@campioai.com>",
          to: email,
          subject: "Your Campio learning path is saved 🎯",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0b0f;color:#f0efe8;padding:2rem;border-radius:12px;">
              <h1 style="color:#c9a84c;font-size:1.5rem;margin-bottom:0.5rem;">Your path is saved ✅</h1>
              <p style="color:#9ca3af;line-height:1.6;margin-bottom:1.5rem;">
                Thanks for joining Campio. Your personalized AI learning path is waiting for you —
                5 modules, real projects, and everything you need to go from where you are to where you want to be.
              </p>
              <a href="https://www.campioai.com/results"
                style="display:inline-block;background:#c9a84c;color:#0a0b0f;padding:0.75rem 1.75rem;border-radius:10px;font-weight:700;text-decoration:none;">
                View my learning path →
              </a>
              <p style="color:#6b6a72;font-size:0.78rem;margin-top:2rem;">
                You're receiving this because you signed up at campioai.com.
              </p>
            </div>
          `,
        }),
      });
      const wd = await welcome.json();
      results.push({ provider: "resend_welcome", ok: welcome.ok, id: wd.id });
    } catch (err) {
      results.push({ provider: "resend", ok: false, error: err.message });
    }
  }

  // --- Airtable (if configured) ---
  if (process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID) {
    try {
      const r = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Emails`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: [{ fields: { Email: email, Source: source, Created: new Date().toISOString() } }],
        }),
      });
      const d = await r.json();
      results.push({ provider: "airtable", ok: r.ok });
    } catch (err) {
      results.push({ provider: "airtable", ok: false, error: err.message });
    }
  }

  // If no providers configured, still return 200 (email captured client-side in localStorage)
  console.log(`Email captured: ${email} (source: ${source})`, results);
  return res.status(200).json({ success: true, providers: results.length });
}

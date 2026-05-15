import Logger from "./logger";

interface PendingCode {
    code: string;
    expiresAt: number;
}

const pendingCodes = new Map<string, PendingCode>();
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeOtp(email: string, code: string): void {
    pendingCodes.set(email.toLowerCase(), {
        code,
        expiresAt: Date.now() + OTP_TTL_MS,
    });
}

export function verifyOtp(email: string, code: string): boolean {
    const entry = pendingCodes.get(email.toLowerCase());
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
        pendingCodes.delete(email.toLowerCase());
        return false;
    }
    if (entry.code !== code) return false;
    pendingCodes.delete(email.toLowerCase());
    return true;
}

export async function sendEmailOtp(toEmail: string, code: string): Promise<void> {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@inblock.io";
    const appUrl = process.env.FRONTEND_URL || "https://aquafier.inblock.io";

    if (!apiKey) {
        throw new Error("Email delivery not configured (SENDGRID_API_KEY missing)");
    }

    const year = new Date().getFullYear();
    const appUrlShort = appUrl.replace(/^https?:\/\//, "");

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Aquafier — Email verification</title></head>
<body style="margin:0;padding:0;background:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1F2937">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#F4F4F5;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08)">
        <tr><td style="background:#E55B1F;background-image:linear-gradient(135deg,#E55B1F 0%,#F37C30 100%);padding:36px 24px;text-align:center;color:#FFFFFF">
          <div style="font-size:26px;font-weight:700;letter-spacing:0.2px;margin:0">Aquafier</div>
          <div style="font-size:14px;font-weight:500;margin-top:6px;opacity:0.95">Verify your email identity claim</div>
        </td></tr>
        <tr><td style="padding:32px 36px 8px 36px">
          <p style="margin:0 0 14px 0;font-size:15px;line-height:1.55;color:#1F2937">Thank you for using <strong>Aquafier</strong>.</p>
          <p style="margin:0 0 6px 0;font-size:15px;line-height:1.55;color:#374151">To complete your email verification and create a verified email identity claim, please use the one-time password (OTP) below:</p>
        </td></tr>
        <tr><td align="center" style="padding:8px 36px 4px 36px">
          <div style="display:inline-block;font-family:'SF Mono','Menlo','Consolas',monospace;font-size:38px;font-weight:700;letter-spacing:10px;color:#E55B1F;background:#FFF4EE;border:1px solid #FBD3B9;border-radius:10px;padding:18px 28px;margin:18px 0">${code}</div>
        </td></tr>
        <tr><td style="padding:8px 36px 28px 36px">
          <p style="margin:0 0 10px 0;font-size:13px;line-height:1.55;color:#4B5563">This OTP is valid for the next <strong>10 minutes</strong>. If you didn't request this verification, please ignore this email or contact support.</p>
          <p style="margin:14px 0 0 0;font-size:13px;line-height:1.55;color:#9CA3AF">Do not share this code with anyone for security reasons.</p>
        </td></tr>
      </table>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;width:100%;margin-top:18px">
        <tr><td align="center" style="padding:0 24px;font-size:12px;color:#6B7280">
          <div>&copy; ${year} Aquafier. All rights reserved.</div>
          <div style="margin-top:6px"><a href="${appUrl}" style="color:#E55B1F;text-decoration:none">${appUrlShort}</a></div>
          <div style="margin-top:6px;color:#9CA3AF">This is an automated email. Please do not reply.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const payload = {
        personalizations: [{ to: [{ email: toEmail }], subject: `Your Aquafier verification code: ${code}` }],
        from: { email: fromEmail, name: "Aquafier" },
        content: [{ type: "text/html", value: html }],
    };

    const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!resp.ok) {
        const body = await resp.text();
        Logger.error(`SendGrid returned ${resp.status}: ${body}`);
        throw new Error(`SendGrid returned ${resp.status}`);
    }

    Logger.info(`Email OTP sent to ${toEmail} via SendGrid`);
}

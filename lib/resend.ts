import { Resend } from "resend";

const resend = new Resend(process.env.RESEND);

export async function sendFormShareEmail({
  to,
  formTitle,
  formUrl,
  senderName,
}: {
  to: string;
  formTitle: string;
  formUrl: string;
  senderName: string;
}) {
  const { data, error } = await resend.emails.send({
    from: "App <noreply@example.com>",
    to,
    subject: `${senderName} shared a form with you: ${formTitle}`,
    html: buildFormShareEmailHtml({ formTitle, formUrl, senderName }),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function buildFormShareEmailHtml({
  formTitle,
  formUrl,
  senderName,
}: {
  formTitle: string;
  formUrl: string;
  senderName: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:32px 32px 0 32px;">
              <h1 style="margin:0;font-size:18px;font-weight:600;color:#111827;">App</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                <strong>${senderName}</strong> has shared a form with you:
              </p>
              <p style="margin:0 0 24px;font-size:16px;font-weight:600;color:#111827;">
                ${formTitle}
              </p>
              <a href="${formUrl}" style="display:inline-block;padding:12px 24px;background-color:#000000;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;">
                Open Form
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Sent via <a href="https://example.com" style="color:#6b7280;">App</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

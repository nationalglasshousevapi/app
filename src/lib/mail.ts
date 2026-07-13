import nodemailer from "nodemailer";

type SendInvoiceEmailParams = {
  to: string;
  subject: string;
  text: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
};

export async function sendInvoiceEmail({
  to,
  subject,
  text,
  pdfBuffer,
  pdfFilename,
}: SendInvoiceEmailParams): Promise<void> {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!user || !pass) {
    throw new Error(
      "Email sending is not configured. Set SMTP_USER and SMTP_PASS environment variables."
    );
  }

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
  });

  await transport.sendMail({
    from: `"National Glass House" <${user}>`,
    to,
    subject,
    text,
    attachments: [
      {
        filename: pdfFilename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

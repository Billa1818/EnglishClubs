import nodemailer from "nodemailer"

type SendInvitationEmailInput = {
  to: string
  inviteUrl: string
  expiresAtIso: string
}

type SendInvitationEmailResult =
  | { ok: true; messageId: string | null }
  | { ok: false; error: string; technicalMessage?: string }

type SmtpErrorDetails = {
  code: string | null
  message: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatExpiryForEmail(expiresAtIso: string) {
  const date = new Date(expiresAtIso)
  if (Number.isNaN(date.getTime())) {
    return "la date d'expiration configuree"
  }

  return date.toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " (UTC)"
}

function getInvitationEmailConfig() {
  const parsedPort = Number.parseInt((process.env.BREVO_SMTP_PORT ?? "587").trim(), 10)
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 587

  const secureValue = (process.env.BREVO_SMTP_SECURE ?? "").trim().toLowerCase()
  const secure = secureValue === "1" || secureValue === "true" || secureValue === "yes"

  return {
    from: (process.env.INVITATION_EMAIL_FROM ?? "").trim(),
    host: (process.env.BREVO_SMTP_HOST ?? "smtp-relay.brevo.com").trim(),
    port,
    secure,
    user: (process.env.BREVO_SMTP_USER ?? "").trim(),
    pass: (process.env.BREVO_SMTP_PASS ?? "").trim(),
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readSmtpError(error: unknown): SmtpErrorDetails {
  if (!error || typeof error !== "object") {
    return { code: null, message: "unknown" }
  }

  const smtpError = error as Error & {
    code?: string
    response?: string
  }
  const code = typeof smtpError.code === "string" ? smtpError.code : null
  const message =
    typeof smtpError.response === "string" && smtpError.response.trim()
      ? smtpError.response
      : smtpError.message || "unknown"

  return { code, message }
}

function isRetryableSmtpCode(code: string | null) {
  return (
    code === "EDNS" ||
    code === "ECONNECTION" ||
    code === "ESOCKET" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET"
  )
}

function getInvitationEmailTextContent(input: SendInvitationEmailInput) {
  return [
    "Bonjour,",
    "",
    "Vous avez recu une invitation pour rejoindre English Club.",
    `Lien d'inscription: ${input.inviteUrl}`,
    `Expiration: ${formatExpiryForEmail(input.expiresAtIso)}`,
    "",
    "Si vous n'attendiez pas cet email, vous pouvez l'ignorer.",
  ].join("\n")
}

function getInvitationEmailHtmlContent(input: SendInvitationEmailInput) {
  const safeUrl = escapeHtml(input.inviteUrl)
  const safeExpiry = escapeHtml(formatExpiryForEmail(input.expiresAtIso))

  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
    <h2 style="margin: 0 0 12px;">Invitation English Club</h2>
    <p style="margin: 0 0 12px;">
      Vous avez recu une invitation pour rejoindre English Club.
    </p>
    <p style="margin: 0 0 12px;">
      <a href="${safeUrl}" style="color: #2563eb;">Ouvrir le lien d'inscription</a>
    </p>
    <p style="margin: 0 0 12px;">
      Ce lien expire le <strong>${safeExpiry}</strong>.
    </p>
    <p style="margin: 0;">
      Si vous n'attendiez pas cet email, vous pouvez l'ignorer.
    </p>
  </div>
  `.trim()
}

export async function sendInvitationEmail(
  input: SendInvitationEmailInput
): Promise<SendInvitationEmailResult> {
  const config = getInvitationEmailConfig()

  if (!config.from || !config.user || !config.pass || !config.host) {
    return {
      ok: false,
      error:
        "Le service email n'est pas configure. Ajoutez BREVO_SMTP_USER, BREVO_SMTP_PASS et INVITATION_EMAIL_FROM dans .env.",
      technicalMessage:
        "Missing BREVO SMTP credentials or INVITATION_EMAIL_FROM.",
    }
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  })

  const maxAttempts = 2

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const sendResult = await transporter.sendMail({
        from: config.from,
        to: input.to,
        subject: "Invitation a rejoindre English Club",
        text: getInvitationEmailTextContent(input),
        html: getInvitationEmailHtmlContent(input),
      })

      return { ok: true, messageId: sendResult.messageId ?? null }
    } catch (error) {
      const smtpError = readSmtpError(error)
      const canRetry = isRetryableSmtpCode(smtpError.code) && attempt < maxAttempts

      if (canRetry) {
        await sleep(500)
        continue
      }

      return {
        ok: false,
        error:
          "Impossible de joindre le service d'email pour le moment. Reessayez dans quelques instants.",
        technicalMessage: `Brevo SMTP error${smtpError.code ? ` (${smtpError.code})` : ""}: ${smtpError.message}`,
      }
    }
  }

  return {
    ok: false,
    error: "Impossible d'envoyer l'email d'invitation pour le moment.",
    technicalMessage: "Unexpected email delivery loop termination.",
  }
}

import transporter from '../config/nodemailer.js'

export async function sendOrderEmail({ to, subject, html }) {
  if (!to) throw new Error('Missing recipient')
  const from = process.env.ACCOUNT_EMAIL
  await transporter.sendMail({ from, to, subject, html })
}

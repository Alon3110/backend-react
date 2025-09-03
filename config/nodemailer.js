import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.ACCOUNT_EMAIL, pass: process.env.EMAIL_PASSWORD },
})

export default transporter

import { config } from 'dotenv'

config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` })

export const {
    SERVER_URL,
    DB_URI,
    QSTASH_URL, QSTASH_TOKEN,
    EMAIL_PASSWORD, ACCOUNT_EMAIL,
} = process.env
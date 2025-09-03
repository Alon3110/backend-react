import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { serve } = require('@upstash/workflow/express')

import { buildOrderConfirmation } from '../utils/order-confirmation-template.js'
import { sendOrderEmail } from '../utils/send-order-email.js'

// 👇 adjust these imports if your paths differ
import { orderService } from '../api/order/order.service.js'
import { stayService } from '../api/stay/stay.service.js'
import { authService } from '../api/auth/auth.service.js'

export const orderConfirmationWorkflow = serve(async (context) => {
    console.log('[Workflow] payload:', context.requestPayload)
    const payload = context.requestPayload || {}
    const { orderId, snapshot } = payload

    // 1) Prefer using snapshot payload to avoid extra DB calls
    let order = snapshot?.order || null
    let stay = snapshot?.stay || null
    let guest = snapshot?.guest || null

    // 2) Fallback: fetch via services if needed (no models)
    if (!order && orderId) {
        order = await context.run('load order', async () => orderService.getById(orderId))
    }
    if (!stay && order?.stayId) {
        stay = await context.run('load stay', async () => stayService.getById(order.stayId))
    }
    if (!guest && (order?.userId || snapshot?.guestId)) {
        const uid = snapshot?.guestId || order.userId
        guest = await context.run('load user', async () => authService.getById(uid))
    }

    // 3) Build details
    const guestEmail = snapshot?.guestEmail || order?.contactEmail || guest?.email
    const guestName = snapshot?.guestName || guest?.fullname || guest?.username || 'Guest'
    const stayName = snapshot?.stayName || stay?.name || 'Your stay'
    const address = snapshot?.address || stay?.address || stay?.city || ''
    const startDate = snapshot?.startDate || order?.startDate
    const endDate = snapshot?.endDate || order?.endDate
    const totalPrice = snapshot?.totalPrice || order?.totalPrice || 0
    const manageUrl = snapshot?.manageUrl || `${process.env.CLIENT_URL || ''}/trips/${order?._id || ''}`

    // Guard
    if (!guestEmail || !startDate || !endDate) return

    // 4) Compose + send
    const { subject, html } = buildOrderConfirmation({
        guestName, stayName, address, startDate, endDate, totalPrice, manageUrl,
    })

    await context.run('send email', async () => {
        await sendOrderEmail({ to: guestEmail, subject, html })
    })

    // 5) Optional idempotency mark (ignore if your service doesn’t support partial updates)
    if (order?._id) {
        await context.run('mark sent', async () => {
            try {
                await orderService.update({
                    ...order,
                    emails: { ...(order.emails || {}), confirmationSentAt: new Date() }
                })
            } catch (e) {
                // non-fatal
                console.warn('mark sent failed', e?.message)
            }
        })
    }

    return { ok: true }
})

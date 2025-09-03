// server/utils/order-confirmation-template.js
export const buildOrderConfirmation = ({
    guestName,
    stayName,
    address,
    startDate,
    endDate,
    totalPrice,
    manageUrl,
}) => {
    const s = new Date(startDate).toLocaleDateString()
    const e = new Date(endDate).toLocaleDateString()

    return {
        subject: `✅ Booking confirmed: ${stayName} (${s} → ${e})`,
        html: `
<div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;background:#f7f9fb">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 6px 16px rgba(0,0,0,.08)">
    <tr>
      <td style="background:#FF385C;color:#fff;text-align:center;padding:28px 18px">
        <p style="font-size:28px;margin:0;font-weight:800">Sharebnb</p>
        <p style="margin:4px 0 0;opacity:.9">Booking Confirmation</p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 24px">
        <p style="margin:0 0 16px">Hi <strong>${guestName}</strong>, you’re booked!</p>
        <p style="margin:0 0 18px"><strong>${stayName}</strong><br/><span style="color:#70757a">${address || ''}</span></p>
        <table width="100%" cellpadding="12" style="background:#f6f7f9;border-radius:10px;margin:0 0 18px">
          <tr><td><strong>Check-in</strong>: ${s}</td></tr>
          <tr><td><strong>Check-out</strong>: ${e}</td></tr>
          <tr><td><strong>Total</strong>: $${Number(totalPrice || 0).toFixed(2)}</td></tr>
        </table>
        <p style="margin:0 0 18px">
          <a href="${manageUrl}" style="display:inline-block;padding:10px 14px;border-radius:10px;text-decoration:none;background:#111;color:#fff">Manage booking</a>
        </p>
        <p style="margin:18px 0 0;color:#555">We’ve sent your host the details. See you soon ✨</p>
      </td>
    </tr>
    <tr>
      <td style="background:#f6f7f9;padding:16px;text-align:center;font-size:12px;color:#777">© Sharebnb</td>
    </tr>
  </table>
</div>`,
    }
}

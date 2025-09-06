// api/order/order.controller.js
import { logger } from '../../services/logger.service.js'
import { orderService } from './order.service.js'
import { stayService } from '../stay/stay.service.js'
import { userService } from '../user/user.service.js'
import { workflowClient } from '../../config/upstash.js'

const HEX24 = /^[0-9a-fA-F]{24}$/ // NEW

export async function getOrders(req, res) {
	try {
		// NEW: only pass valid ObjectIds (drop placeholders like "guest-user-id")
		// const safeId = (v) => (typeof v === 'string' && HEX24.test(v) ? v : '') // NEW

		const filterBy = {
			hostId: req.query.hostId || '',   // NEW
			userId: req.query.userId || '',   // NEW
			guestId: req.query.guestId || '', // NEW
			status: req.query.status || '',
		}
		logger.info('getOrders -> req.query:', filterBy)


		// Log the filter to debug
		// logger.info('getOrders -> filterBy:', filterBy)

		// For now, return empty array to test if the endpoint works
		// logger.info('getOrders -> returning empty array for testing')
		// res.json([])

		// Uncomment this when we fix the service
		const orders = await orderService.query(filterBy)
		// logger.info('getOrders -> orders returned:', orders.length)
		res.json(orders)
	} catch (err) {
		logger.error('Failed to get orders - full error:', err)
		logger.error('Failed to get orders - error message:', err.message)
		logger.error('Failed to get orders - error stack:', err.stack)
		res.status(400).send({ err: 'Failed to get orders: ' + err.message })
	}
}

export async function getOrderById(req, res) {
	try {
		const orderId = req.params.id
		// console.log(orderId)
		const order = await orderService.getById(orderId)
		res.json(order)
	} catch (err) {
		logger.error('Failed to get order', err)
		res.status(400).send({ err: 'Failed to get order' })
	}
}

export async function addOrder(req, res) {
	const { loggedinUser } = req
	const order = req.body

	console.log('Adding order:', { loggedinUser, order })
	console.log('Order userId:', order.userId)
	console.log('Order hostId:', order.hostId)
	console.log('Logged in user _id:', loggedinUser?._id)

	try {
		const orderToAdd = {
			// userId: order.loggedinUser?._id || order.userId,
			userId: order.userId, // using userId from the frontend (the guest making the booking)
			stayId: order.stayId,
			hostId: order.hostId,
			totalPrice: order.totalPrice,
			startDate: new Date(order.startDate),
			endDate: new Date(order.endDate),
			guests: order.guests,
			status: order.status || 'pending',
			emails: order.emails || {}, // optional container for email fields
			contactEmail: loggedinUser?.email || order.contactEmail || null,
		}
		
		console.log('Order to add:', orderToAdd)

		const addedOrder = await orderService.add(orderToAdd)
		console.log('Order added successfully:', addedOrder)

		// // email related
		// let stay = null
		// try {
		// 	const stayIdForGet =
		// 		typeof addedOrder.stayId === 'string'
		// 			? addedOrder.stayId
		// 			: addedOrder.stayId?.toString?.()
		// 	if (stayIdForGet) {
		// 		stay = await stayService.getById(stayIdForGet)
		// 	}
		// } catch {
		// 	// swallow
		// }

		// const snapshot = {
		// 	order: {
		// 		_id: addedOrder._id,
		// 		startDate: addedOrder.startDate,
		// 		endDate: addedOrder.endDate,
		// 		totalPrice: addedOrder.totalPrice,
		// 	},
		// 	stay: stay ? { name: stay.name, address: stay.address, city: stay.city } : null,
		// 	guest: null, // we’ll rely on loggedinUser for now
		// 	guestEmail: loggedinUser?.email || order.contactEmail || order.guestEmail || addedOrder.contactEmail,
		// 	guestName: loggedinUser?.fullname || loggedinUser?.username || 'Guest',
		// 	stayName: stay?.name,
		// 	address: stay?.address || stay?.city,
		// 	startDate: addedOrder.startDate,
		// 	endDate: addedOrder.endDate,
		// 	totalPrice: addedOrder.totalPrice,
		// 	manageUrl: `${process.env.CLIENT_URL || ''}/trips/${addedOrder._id}`,
		// 	guestId: addedOrder.userId,
		// }

		// // trigger QStash workflow (fire-and-forget)
		// await workflowClient.trigger({
		// 	url: `${process.env.SERVER_URL}/api/workflows/order/confirmation`,
		// 	body: { orderId: addedOrder._id, snapshot },
		// })

		res.json(addedOrder)
	} catch (err) {
		logger.error('Failed to add order', err)
		console.error('Error adding order:', err)
		res.status(400).send({ err: 'Failed to add order: ' + err.message })
	}
}

export async function updateOrder(req, res) {
	const { loggedinUser, body: order } = req
	// const { _id: userId, isAdmin } = loggedinUser

	console.log('Updating order:', { loggedinUser, order })
	console.log('Order hostId:', order.hostId, 'Type:', typeof order.hostId)
	console.log('Logged in user _id:', loggedinUser._id, 'Type:', typeof loggedinUser._id)
	console.log('Comparison result:', order.hostId !== loggedinUser._id)

	// In guest mode, allow updates if no specific user is logged in
	if (order.hostId !== loggedinUser._id) {
		console.log('Access denied - not your order')
		res.status(403).send('Not your order...')
		return
	}

	try {
		// console.log('Calling order service to update order:', order)
		const updatedOrder = await orderService.update(order)
		console.log('Order updated successfully:', updatedOrder)
		res.json(updatedOrder)
	} catch (err) {
		logger.error('Failed to update order', err)
		console.error('Error updating order:', err)
		res.status(400).send({ err: 'Failed to update order: ' + err.message })
	}
}

export async function removeOrder(req, res) {
	try {
		const orderId = req.params.id
		await orderService.remove(orderId)
		res.send({ msg: 'Order removed successfully' })
	} catch (err) {
		logger.error('Failed to remove order', err)
		res.status(400).send({ err: 'Failed to remove order' })
	}
}

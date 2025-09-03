import { logger } from '../../services/logger.service.js'
import { orderService } from './order.service.js'
import { stayService } from '../stay/stay.service.js'
import { workflowClient } from '../../config/upstash.js'


export async function getOrders(req, res) {
	try {
		logger.info('getOrders -> req.query:', req.query)
		
		const filterBy = {
			hostId: req.query.hostId || '',
			userId: req.query.userId || '',
			guestId: req.query.guestId || '',
			status: req.query.status || '',
		}
		
		// Log the filter to debug
		logger.info('getOrders -> filterBy:', filterBy)
		
		// For now, return empty array to test if the endpoint works
		logger.info('getOrders -> returning empty array for testing')
		res.json([])
		
		// Uncomment this when we fix the service
		// const orders = await orderService.query(filterBy)
		// logger.info('getOrders -> orders returned:', orders.length)
		// res.json(orders)
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

	try {
		const orderToAdd = {
			userId: loggedinUser?._id || order.userId,
			stayId: order.stayId,
			hostId: order.hostId,
			totalPrice: order.totalPrice,
			startDate: new Date(order.startDate),
			endDate: new Date(order.endDate),
			guests: order.guests,
			status: order.status || 'pending',
			emails: order.emails || {}, // optional container for email fields
			contactEmail: order.contactEmail || loggedinUser?.email || null
		}

		const addedOrder = await orderService.add(orderToAdd)
		console.log('Order added successfully:', addedOrder)

		// build a lightweight snapshot for the email workflow
		let stay = null
		try { stay = await stayService.getById(addedOrder.stayId) } catch { }

		const snapshot = {
			order: {
				_id: addedOrder._id,
				startDate: addedOrder.startDate,
				endDate: addedOrder.endDate,
				totalPrice: addedOrder.totalPrice,
			},
			stay: stay ? { name: stay.name, address: stay.address, city: stay.city } : null,
			guest: null, // we’ll rely on loggedinUser for now
			guestEmail: loggedinUser?.email || order.contactEmail || order.guestEmail || addedOrder.contactEmail,
			guestName: loggedinUser?.fullname || loggedinUser?.username || 'Guest',
			stayName: stay?.name,
			address: stay?.address || stay?.city,
			startDate: addedOrder.startDate,
			endDate: addedOrder.endDate,
			totalPrice: addedOrder.totalPrice,
			manageUrl: `${process.env.CLIENT_URL || ''}/trips/${addedOrder._id}`,
			guestId: addedOrder.userId,
		}

		// trigger QStash workflow (fire-and-forget)
		await workflowClient.trigger({
			url: `${process.env.SERVER_URL}/api/workflows/order/confirmation`,
			body: { orderId: addedOrder._id, snapshot },
		})

		res.json(addedOrder)
	} catch (err) {
		logger.error('Failed to add order', err)
		console.error('Error adding order:', err)
		res.status(400).send({ err: 'Failed to add order: ' + err.message })
	}
}

export async function updateOrder(req, res) {
	const { loggedinUser, body: order } = req
	const { _id: userId, isAdmin } = loggedinUser

	console.log('Updating order:', { loggedinUser, order })

	// In guest mode, allow updates if no specific user is logged in
	if (!loggedinUser || !loggedinUser._id) {
		// Guest mode - allow the update
		console.log('Guest mode - allowing update')
	} else if (!isAdmin && order.userId && order.userId !== userId) {
		console.log('Access denied - not your order')
		res.status(403).send('Not your order...')
		return
	}

	try {
		console.log('Calling order service to update order:', order)
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

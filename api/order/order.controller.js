import { logger } from '../../services/logger.service.js'
import { orderService } from './order.service.js'

export async function getOrders(req, res) {
	try {
		const filterBy = {
			hostId: req.query.hostId || '',
			userId: req.query.userId || '',
			guestId: req.query.guestId || '',
			status: req.query.status || '',
		}
		const orders = await orderService.query(filterBy)
		res.json(orders)
	} catch (err) {
		logger.error('Failed to get orders', err)
		res.status(400).send({ err: 'Failed to get orders' })
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
	const { loggedinUser, body } = req
	const order = req.body
	
	console.log('Adding order:', { loggedinUser, order })
	
	try {
		// Ensure the order has the correct structure matching MongoDB Compass format
		const orderToAdd = {
			userId: loggedinUser._id || order.userId, // Use logged in user ID or provided userId
			stayId: order.stayId,
			hostId: order.hostId,
			totalPrice: order.totalPrice,
			startDate: new Date(order.startDate),
			endDate: new Date(order.endDate),
			guests: order.guests,
			status: order.status || 'pending'
		}
		
		console.log('Order to add:', orderToAdd)
		
		const addedOrder = await orderService.add(orderToAdd)
		console.log('Order added successfully:', addedOrder)
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

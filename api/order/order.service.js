import { dbService } from '../../services/db.service.js'
import { logger } from '../../services/logger.service.js'
import { ObjectId } from 'mongodb'

const COLLECTION_NAME = 'order'

export const orderService = {
    query,
    getById,
    add,
    update,
    remove,
}

async function query(filterBy = {}) {
    try {
        const collection = await dbService.getCollection(COLLECTION_NAME)
        let criteria = {}

        // Apply filters with proper ObjectId conversion
        if (filterBy.hostId) {
            criteria.hostId = new ObjectId(filterBy.hostId)
        }
        if (filterBy.userId) {
            // Handle guest user IDs - don't convert to ObjectId
            criteria.userId = filterBy.userId === 'guest-user-id' ? filterBy.userId : new ObjectId(filterBy.userId)
        }
        if (filterBy.guestId) {
            // Handle guest user IDs - don't convert to ObjectId
            criteria.userId = filterBy.guestId === 'guest-user-id' ? filterBy.guestId : new ObjectId(filterBy.guestId)
        }
        if (filterBy.status) {
            criteria.status = filterBy.status
        }

        const orders = await collection.find(criteria).toArray()
        return orders
    } catch (err) {
        logger.error('ERROR: cannot find orders')
        throw err
    }
}

async function getById(orderId) {
    try {
        const criteria = { _id: new ObjectId(orderId) }

        const collection = await dbService.getCollection(COLLECTION_NAME)
        const order = await collection.findOne(criteria)
        return order
    } catch (err) {
        logger.error(`ERROR: cannot find order ${orderId}`)
        throw err
    }
}

async function add(order) {
    try {
        console.log('Adding order in service:', order)
        
        const collection = await dbService.getCollection(COLLECTION_NAME)
        
        // Validate required fields
        if (!order.stayId) {
            throw new Error('stayId is required')
        }
        if (!order.hostId) {
            throw new Error('hostId is required')
        }
        if (!order.totalPrice) {
            throw new Error('totalPrice is required')
        }
        if (!order.startDate) {
            throw new Error('startDate is required')
        }
        if (!order.endDate) {
            throw new Error('endDate is required')
        }
        if (!order.guests) {
            throw new Error('guests is required')
        }
        
        // Create order with exact structure specified
        const orderToAdd = {
            userId: order.userId && order.userId !== 'guest-user-id' ? new ObjectId(order.userId) : order.userId,
            stayId: new ObjectId(order.stayId),
            hostId: new ObjectId(order.hostId),
            totalPrice: order.totalPrice,
            startDate: new Date(order.startDate),
            endDate: new Date(order.endDate),
            guests: order.guests,
            status: order.status || 'pending'
        }
        
        console.log('Order to add to database:', orderToAdd)
        
        const result = await collection.insertOne(orderToAdd)
        const addedOrder = { ...orderToAdd, _id: result.insertedId }
        
        console.log('Order added to database:', addedOrder)
        return addedOrder
    } catch (err) {
        logger.error('ERROR: cannot add order')
        console.error('Error in add function:', err)
        throw err
    }
}

async function update(order) {
    try {
        console.log('Updating order in service:', order)
        const orderToSave = { ...order }
        delete orderToSave._id
        
        // Convert ObjectIds if they exist and are not guest user IDs
        if (orderToSave.userId && typeof orderToSave.userId === 'string' && orderToSave.userId !== 'guest-user-id') {
            orderToSave.userId = new ObjectId(orderToSave.userId)
        }
        if (orderToSave.stayId && typeof orderToSave.stayId === 'string') {
            orderToSave.stayId = new ObjectId(orderToSave.stayId)
        }
        if (orderToSave.hostId && typeof orderToSave.hostId === 'string') {
            orderToSave.hostId = new ObjectId(orderToSave.hostId)
        }
        
        console.log('Order to save in update:', orderToSave)
        
        const collection = await dbService.getCollection(COLLECTION_NAME)
        const result = await collection.updateOne({ _id: new ObjectId(order._id) }, { $set: orderToSave })
        console.log('Update result:', result)
        
        const updatedOrder = { ...order, ...orderToSave }
        console.log('Updated order:', updatedOrder)
        return updatedOrder
    } catch (err) {
        logger.error(`ERROR: cannot update order ${order._id}`)
        console.error('Error in update function:', err)
        throw err
    }
}

async function remove(orderId) {
    try {
        const collection = await dbService.getCollection(COLLECTION_NAME)
        await collection.deleteOne({ _id: new ObjectId(orderId) })
    } catch (err) {
        logger.error(`ERROR: cannot remove order ${orderId}`)
        throw err
    }
}








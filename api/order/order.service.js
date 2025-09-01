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
            criteria.userId = new ObjectId(filterBy.userId)
        }
        if (filterBy.guestId) {
            criteria.userId = new ObjectId(filterBy.guestId)
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
        const collection = await dbService.getCollection(COLLECTION_NAME)
        
        // Create order with exact structure specified
        const orderToAdd = {
            userId: order.userId ? new ObjectId(order.userId) : null,
            stayId: new ObjectId(order.stayId),
            hostId: new ObjectId(order.hostId),
            totalPrice: order.totalPrice,
            startDate: new Date(order.startDate),
            endDate: new Date(order.endDate),
            guests: order.guests,
            status: order.status || 'pending'
        }
        
        const result = await collection.insertOne(orderToAdd)
        return { ...orderToAdd, _id: result.insertedId }
    } catch (err) {
        logger.error('ERROR: cannot add order')
        throw err
    }
}

async function update(order) {
    try {
        const orderToSave = { ...order }
        delete orderToSave._id
        
        // Convert ObjectIds if they exist
        if (orderToSave.userId && typeof orderToSave.userId === 'string') {
            orderToSave.userId = new ObjectId(orderToSave.userId)
        }
        if (orderToSave.stayId && typeof orderToSave.stayId === 'string') {
            orderToSave.stayId = new ObjectId(orderToSave.stayId)
        }
        if (orderToSave.hostId && typeof orderToSave.hostId === 'string') {
            orderToSave.hostId = new ObjectId(orderToSave.hostId)
        }
        
        const collection = await dbService.getCollection(COLLECTION_NAME)
        await collection.updateOne({ _id: new ObjectId(order._id) }, { $set: orderToSave })
        return { ...order, ...orderToSave }
    } catch (err) {
        logger.error(`ERROR: cannot update order ${order._id}`)
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








import { dbService } from '../../services/db.service.js'
import { logger } from '../../services/logger.service.js'

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
        let orders = await collection.find().toArray()
        
        // Apply filters if needed
        if (filterBy.hostId) {
            orders = orders.filter(order => order.hostId._id === filterBy.hostId)
        }
        if (filterBy.guestId) {
            orders = orders.filter(order => order.guest._id === filterBy.guestId)
        }
        if (filterBy.status) {
            orders = orders.filter(order => order.status === filterBy.status)
        }
        
        return orders
    } catch (err) {
        logger.error('ERROR: cannot find orders')
        throw err
    }
}

async function getById(orderId) {
    try {
        const collection = await dbService.getCollection(COLLECTION_NAME)
        const order = await collection.findOne({ _id: orderId })
        return order
    } catch (err) {
        logger.error(`ERROR: cannot find order ${orderId}`)
        throw err
    }
}

async function add(order) {
    try {
        const collection = await dbService.getCollection(COLLECTION_NAME)
        await collection.insertOne(order)
        return order
    } catch (err) {
        logger.error('ERROR: cannot add order')
        throw err
    }
}

async function update(order) {
    try {
        const orderToSave = { ...order }
        delete orderToSave._id
        const collection = await dbService.getCollection(COLLECTION_NAME)
        await collection.updateOne({ _id: order._id }, { $set: orderToSave })
        return order
    } catch (err) {
        logger.error(`ERROR: cannot update order ${order._id}`)
        throw err
    }
}

async function remove(orderId) {
    try {
        const collection = await dbService.getCollection(COLLECTION_NAME)
        await collection.deleteOne({ _id: orderId })
    } catch (err) {
        logger.error(`ERROR: cannot remove order ${orderId}`)
        throw err
    }
}


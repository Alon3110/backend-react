// api/order/order.service.js
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

// function isHex24(id) { // NEW
//     return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id)
// }

// function safeObjId(id) { // NEW
//     return isHex24(id) ? new ObjectId(id) : null
// }

function _buildCriteria(filterBy = {}) {
    const criteria = {}

    // EDIT: only add filter if valid ObjectId (skip guest-user-id etc)
    if (filterBy.hostId) criteria.hostId = ObjectId.createFromHexString(filterBy.hostId) // EDIT
    if (filterBy.userId) criteria.userId = ObjectId.createFromHexString(filterBy.userId) // EDIT
    if (filterBy.guestId) criteria.userId = ObjectId.createFromHexString(filterBy.guestId) // EDIT
    if (filterBy.status) criteria.status = filterBy.status

    return criteria
}

async function query(filterBy) {
    const criteria = _buildCriteria(filterBy)
    const collection = await dbService.getCollection(COLLECTION_NAME)

    const orders = await collection
        .aggregate([
            {
                $match: criteria,
            },
            {
                $lookup: {
                    from: 'user',
                    foreignField: '_id',
                    localField: 'userId',
                    as: 'guest',
                },
            },
            {
                $unwind: '$guest',
            },
            {
                $lookup: {
                    from: 'stay',
                    foreignField: '_id',
                    localField: 'stayId',
                    as: 'stay',
                },
            },
            {
                $unwind: '$stay',
            },
            {
                $lookup: {
                    from: 'user',
                    foreignField: '_id',
                    localField: 'hostId',
                    as: 'host',
                },
            },
            {
                $unwind: '$host',
            },
            {
                $project: {
                    startDate: 1,
                    endDate: 1,
                    status: 1,
                    totalPrice: 1,
                    guests: 1,
                    createdAt: 1,

                    guest: {
                        _id: '$guest._id',
                        imgUrl: '$guest.imgUrl',
                        fullname: { $ifNull: ['$guest.fullname', '$guest.name'] },
                        email: '$guest.email', // NEW
                    },

                    stay: {
                        _id: '$stay._id',
                        name: '$stay.name',
                        imgUrls: '$stay.imgUrls',
                        imgUrl: '$stay.imgUrl',
                        price: '$stay.price',
                    },
                },

            },
        ])
        .toArray()

    return orders
}

async function getById(orderId) {
    try {
        // const _id = safeObjId(orderId) // EDIT
        // if (!_id) throw new Error('Invalid order id') // NEW
        const collection = await dbService.getCollection(COLLECTION_NAME)
        return await collection.findOne({ _id: ObjectId.createFromHexString(orderId) })
    } catch (err) {
        logger.error(`ERROR: cannot find order ${orderId}`)
        throw err
    }
}

async function add(order) {
    try {
        const collection = await dbService.getCollection(COLLECTION_NAME)

        // if (!order.stayId) throw new Error('stayId is required')
        // if (!order.hostId) throw new Error('hostId is required')
        // if (!order.totalPrice) throw new Error('totalPrice is required')
        // if (!order.startDate) throw new Error('startDate is required')
        // if (!order.endDate) throw new Error('endDate is required')
        // if (!order.guests) throw new Error('guests is required')

        const orderToAdd = {
            userId: ObjectId.createFromHexString(order.userId),
            stayId: ObjectId.createFromHexString(order.stayId),
            hostId: ObjectId.createFromHexString(order.hostId),
            totalPrice: order.totalPrice,
            startDate: new Date(order.startDate),
            endDate: new Date(order.endDate),
            guests: order.guests,
            status: order.status || 'pending',
            createdAt: new Date(), // NEW
            contactEmail: order.contactEmail || null,
        }

        const result = await collection.insertOne(orderToAdd)
        return result
    } catch (err) {
        logger.error('ERROR: cannot add order')
        throw err
    }
}

async function update(order) {
    try {

        // const orderToSave = { ...order }
        // delete orderToSave._id

        // if (typeof orderToSave.userId === 'string' && isHex24(orderToSave.userId)) orderToSave.userId = new ObjectId(orderToSave.userId) // EDIT
        // if (typeof orderToSave.stayId === 'string' && isHex24(orderToSave.stayId)) orderToSave.stayId = new ObjectId(orderToSave.stayId) // EDIT
        // if (typeof orderToSave.hostId === 'string' && isHex24(orderToSave.hostId)) orderToSave.hostId = new ObjectId(orderToSave.hostId) // EDIT

        const collection = await dbService.getCollection(COLLECTION_NAME)
        const savedOrder = await collection.updateOne({ _id: ObjectId.createFromHexString(order._id) },
            { $set: { status: order.status } })
        return savedOrder
    } catch (err) {
        logger.error(`ERROR: cannot update order ${order._id}`)
        throw err
    }
}

async function remove(orderId) {
    try {
        const _id = safeObjId(orderId) // EDIT
        if (!_id) throw new Error('Invalid order id') // NEW
        const collection = await dbService.getCollection(COLLECTION_NAME)
        await collection.deleteOne({ _id })
    } catch (err) {
        logger.error(`ERROR: cannot remove order ${orderId}`)
        throw err
    }
}

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

function isHex24(id) { // NEW
    return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id)
}

function safeObjId(id) { // NEW
    return isHex24(id) ? new ObjectId(id) : null
}

function _buildCriteria(filterBy = {}) {
    const criteria = {}

    // EDIT: only add filter if valid ObjectId (skip guest-user-id etc)
    if (filterBy.hostId && isHex24(filterBy.hostId)) criteria.hostId = safeObjId(filterBy.hostId) // EDIT
    if (filterBy.userId && isHex24(filterBy.userId)) criteria.userId = safeObjId(filterBy.userId) // EDIT
    if (filterBy.guestId && isHex24(filterBy.guestId)) criteria.userId = safeObjId(filterBy.guestId) // EDIT
    if (filterBy.status) criteria.status = filterBy.status

    return criteria
}

async function query(filterBy) {
    const criteria = _buildCriteria(filterBy)
    const col = await dbService.getCollection(COLLECTION_NAME)

    // Convert *only if* the string looks like a 24-hex id
    const idCastStage = { // NEW
        $addFields: {
            stayId: {
                $cond: [
                    {
                        $and: [
                            { $eq: [{ $type: "$stayId" }, "string"] },
                            { $regexMatch: { input: "$stayId", regex: /^[a-fA-F0-9]{24}$/ } }
                        ]
                    },
                    { $toObjectId: "$stayId" },
                    "$stayId"
                ]
            },
            hostId: {
                $cond: [
                    {
                        $and: [
                            { $eq: [{ $type: "$hostId" }, "string"] },
                            { $regexMatch: { input: "$hostId", regex: /^[a-fA-F0-9]{24}$/ } }
                        ]
                    },
                    { $toObjectId: "$hostId" },
                    "$hostId"
                ]
            },
            userId: {
                $cond: [
                    {
                        $and: [
                            { $eq: [{ $type: "$userId" }, "string"] },
                            { $regexMatch: { input: "$userId", regex: /^[a-fA-F0-9]{24}$/ } }
                        ]
                    },
                    { $toObjectId: "$userId" },
                    "$userId"
                ]
            },
        }
    }

    const pipeline = [
        { $match: criteria },
        idCastStage, // NEW

        { $lookup: { from: 'user', localField: 'userId', foreignField: '_id', as: 'guest' } },
        { $unwind: { path: '$guest', preserveNullAndEmptyArrays: true } },

        { $lookup: { from: 'stay', localField: 'stayId', foreignField: '_id', as: 'stay' } },
        { $unwind: { path: '$stay', preserveNullAndEmptyArrays: true } },

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

        { $sort: { createdAt: -1, _id: -1 } },
    ]

    return await col.aggregate(pipeline).toArray()
}

async function getById(orderId) {
    try {
        const _id = safeObjId(orderId) // EDIT
        if (!_id) throw new Error('Invalid order id') // NEW
        const collection = await dbService.getCollection(COLLECTION_NAME)
        return await collection.findOne({ _id })
    } catch (err) {
        logger.error(`ERROR: cannot find order ${orderId}`)
        throw err
    }
}

async function add(order) {
    try {
        const collection = await dbService.getCollection(COLLECTION_NAME)

        if (!order.stayId) throw new Error('stayId is required')
        if (!order.hostId) throw new Error('hostId is required')
        if (!order.totalPrice) throw new Error('totalPrice is required')
        if (!order.startDate) throw new Error('startDate is required')
        if (!order.endDate) throw new Error('endDate is required')
        if (!order.guests) throw new Error('guests is required')

        const orderToAdd = {
            userId: (order.userId && isHex24(order.userId)) ? new ObjectId(order.userId) : order.userId, // EDIT
            stayId: isHex24(order.stayId) ? new ObjectId(order.stayId) : order.stayId, // EDIT
            hostId: isHex24(order.hostId) ? new ObjectId(order.hostId) : order.hostId, // EDIT
            totalPrice: order.totalPrice,
            startDate: new Date(order.startDate),
            endDate: new Date(order.endDate),
            guests: order.guests,
            status: order.status || 'pending',
            createdAt: new Date(), // NEW
            contactEmail: order.contactEmail ?? null,
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
        const _id = safeObjId(order._id) // EDIT
        if (!_id) throw new Error('Invalid order id') // NEW

        const orderToSave = { ...order }
        delete orderToSave._id

        if (typeof orderToSave.userId === 'string' && isHex24(orderToSave.userId)) orderToSave.userId = new ObjectId(orderToSave.userId) // EDIT
        if (typeof orderToSave.stayId === 'string' && isHex24(orderToSave.stayId)) orderToSave.stayId = new ObjectId(orderToSave.stayId) // EDIT
        if (typeof orderToSave.hostId === 'string' && isHex24(orderToSave.hostId)) orderToSave.hostId = new ObjectId(orderToSave.hostId) // EDIT

        const collection = await dbService.getCollection(COLLECTION_NAME)
        await collection.updateOne({ _id }, { $set: orderToSave })
        return { _id, ...orderToSave }
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

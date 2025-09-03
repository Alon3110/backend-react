import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 3

export const stayService = {
	remove,
	query,
	getById,
	add,
	update,
	addStayMsg,
	removeStayMsg,
}

function _asObjectId(id) {                 // NEW
	if (!id) return null
	try { return new ObjectId(String(id)) } catch { return null }
}

async function query(filterBy = {}) {
	try {
		const criteria = _buildCriteria(filterBy)
		const collection = await dbService.getCollection('stay')
		console.log('criteria =>', JSON.stringify(criteria)) // EDIT (debug-friendly)

		const stayCursor = await collection.find(criteria)   // if needed: add sort later
		const stays = await stayCursor.toArray()
		return stays
	} catch (err) {
		logger.error('cannot find stays', err)
		throw err
	}
}

async function getById(stayId) {
	try {
		const _id = _asObjectId(stayId)                     // NEW (robust)
		if (!_id) throw new Error(`Invalid stay id: ${stayId}`) // NEW

		const collection = await dbService.getCollection('stay')
		const stay = await collection.findOne({ _id })

		if (!stay) throw new Error(`Stay not found: ${stayId}`) // NEW

		stay.createdAt = stay._id.getTimestamp()
		return stay
	} catch (err) {
		logger.error(`while finding stay ${stayId}`, err)
		throw err
	}
}

async function remove(stayId) {
	const { loggedinUser } = asyncLocalStorage.getStore()
	const { _id: hostId, isAdmin } = loggedinUser

	try {
		const _id = _asObjectId(stayId)                     // NEW
		if (!_id) throw new Error(`Invalid stay id: ${stayId}`) // NEW

		const criteria = { _id }
		if (!isAdmin) criteria['host._id'] = hostId

		const collection = await dbService.getCollection('stay')
		const res = await collection.deleteOne(criteria)

		if (res.deletedCount === 0) throw ('Not your stay')
		return stayId
	} catch (err) {
		logger.error(`cannot remove stay ${stayId}`, err)
		throw err
	}
}

async function add(stay) {
	try {
		if (stay.loc) {
			stay.loc.lat = Number(stay.loc.lat)
			stay.loc.lng = Number(stay.loc.lng)
		}
		logger.info('stay.service.add -> final stay.host:', stay.host)
		const collection = await dbService.getCollection('stay')
		const result = await collection.insertOne(stay)

		return { ...stay, _id: result.insertedId }
	} catch (err) {
		logger.error('cannot insert stay', err)
		throw err
	}
}

async function update(stay) {
	const stayToSave = { name: stay.name, price: stay.price }
	if (stay.loc) {
		stayToSave.loc = {
			lat: Number(stay.loc.lat),
			lng: Number(stay.loc.lng),
		}
	}
	try {
		const _id = _asObjectId(stay._id)                   // NEW
		if (!_id) throw new Error(`Invalid stay id: ${stay?._id}`) // NEW

		const collection = await dbService.getCollection('stay')
		await collection.updateOne({ _id }, { $set: stayToSave })

		return { ...stay, _id }
	} catch (err) {
		logger.error(`cannot update stay ${stay._id}`, err)
		throw err
	}
}

async function addStayMsg(stayId, msg) {
	try {
		const _id = _asObjectId(stayId)                     // NEW
		if (!_id) throw new Error(`Invalid stay id: ${stayId}`) // NEW

		msg.id = makeId()

		const collection = await dbService.getCollection('stay')
		await collection.updateOne({ _id }, { $push: { msgs: msg } })

		return msg
	} catch (err) {
		logger.error(`cannot add stay msg ${stayId}`, err)
		throw err
	}
}

async function removeStayMsg(stayId, msgId) {
	try {
		const _id = _asObjectId(stayId)                     // NEW
		if (!_id) throw new Error(`Invalid stay id: ${stayId}`) // NEW

		const collection = await dbService.getCollection('stay')
		await collection.updateOne({ _id }, { $pull: { msgs: { id: msgId } } })

		return msgId
	} catch (err) {
		logger.error(`cannot remove stay msg ${stayId}`, err)
		throw err
	}
}

function _buildCriteria(filterBy) {
	// const criteria = {
	// 	address: { $regex: filterBy.address || '', $options: 'i' },
	// 	price: { $gte: filterBy.maxPrice || 0 },
	// }
	console.log(filterBy);

	const criteria = {}

	if (filterBy.hostId) {
		// Support both string and ObjectId host IDs
		const hostIdOr = [{ 'host._id': filterBy.hostId }]
		try {
			hostIdOr.push({ 'host._id': ObjectId.createFromHexString(filterBy.hostId) })
		} catch (e) { }

		if (criteria.$or) {
			// If address already created an $or, combine with $and
			const existingOr = criteria.$or
			delete criteria.$or
			criteria.$and = [{ $or: existingOr }, { $or: hostIdOr }]
		} else if (criteria.$and) {
			criteria.$and.push({ $or: hostIdOr })
		} else {
			criteria.$or = hostIdOr
		}
	}

	if (filterBy.address.trim()) {
		criteria.$or = [
			{ 'loc.city': { $regex: filterBy.address.trim(), $options: 'i' } },
			{ 'loc.country': { $regex: filterBy.address.trim(), $options: 'i' } },
			{ 'loc.address': { $regex: filterBy.address.trim(), $options: 'i' } }
		]		// criteria.loc.address = { $regex: filterBy.address.trim(), $options: 'i' }
	}

	const { checkIn, checkOut } = filterBy
	if (checkIn && checkOut) {
		const reqStart = new Date(checkIn)
		const reqEnd = new Date(checkOut)
		if (!isNaN(+reqStart) && !isNaN(+reqEnd)) {
			and.push({ availableFrom: { $lte: reqStart } })
			and.push({ availableTo: { $gte: reqEnd } })
		}
	}

	if (and.length === 0) return {}     // no filters → return all (unchanged)
	if (and.length === 1) return and[0]
	return { $and: and }
}

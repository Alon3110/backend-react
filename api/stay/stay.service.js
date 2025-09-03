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

async function query(filterBy) {
	try {
		const criteria = _buildCriteria(filterBy)
		//if needed
		// const sort = _buildSort(filterBy)

		const collection = await dbService.getCollection('stay')
		console.log('criteria =>', criteria)
		var stayCursor = await collection.find(criteria) // if needed ,{ sort }

		const stays = await stayCursor.toArray()
		return stays
	} catch (err) {
		logger.error('cannot find stays', err)
		throw err
	}
}

async function getById(stayId) {
	try {
		const criteria = { _id: ObjectId.createFromHexString(stayId) }

		const collection = await dbService.getCollection('stay')
		const stay = await collection.findOne(criteria)

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
		const criteria = {
			_id: ObjectId.createFromHexString(stayId),
		}
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
		const collection = await dbService.getCollection('stay')
		const result = await collection.insertOne(stay)

		// Return the stay with the generated _id
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

		const criteria = { _id: ObjectId.createFromHexString(stay._id) }

		const collection = await dbService.getCollection('stay')
		await collection.updateOne(criteria, { $set: stayToSave })

		return stay
	} catch (err) {
		logger.error(`cannot update stay ${stay._id}`, err)
		throw err
	}
}

async function addStayMsg(stayId, msg) {
	try {
		const criteria = { _id: ObjectId.createFromHexString(stayId) }
		msg.id = makeId()

		const collection = await dbService.getCollection('stay')
		await collection.updateOne(criteria, { $push: { msgs: msg } })

		return msg
	} catch (err) {
		logger.error(`cannot add stay msg ${stayId}`, err)
		throw err
	}
}

async function removeStayMsg(stayId, msgId) {
	try {
		const criteria = { _id: ObjectId.createFromHexString(stayId) }

		const collection = await dbService.getCollection('stay')
		await collection.updateOne(criteria, { $pull: { msgs: { id: msgId } } })

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

		criteria.availableFrom = { $lte: reqStart }
		criteria.availableTo = { $gte: reqEnd }
	}

	// if (filterBy.checkIn) {
	// 	const startDate = new Date(filterBy.checkIn)
	// 	criteria['filterBy.checkIn'] = { $lte: checkIn }
	// }
	// if (filterBy.checkOut) {
	// 	const endDate = new Date(filterBy.checkOut)
	// 	criteria['filterBy.checkOut'] = { $gte: checkOut }
	// }

	if (filterBy.guests) {
		console.log(filterBy.guests);
		criteria.capacity = { $gte: filterBy.guests }
	}

	return criteria

}

// function _buildSort(filterBy) {
// 	if (!filterBy.sortField) return {}
// 	return { [filterBy.sortField]: filterBy.sortDir }
// }
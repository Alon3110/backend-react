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

async function query(filterBy = { address: '', maxPrice: 0 }) {
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
	const criteria = {}

  if (filterBy.address && filterBy.address.trim()) {
    criteria.address = { $regex: filterBy.address.trim(), $options: 'i' }
  }

  if (typeof filterBy.maxPrice === 'number' && filterBy.maxPrice > 0) {
    criteria.price = { $gte: filterBy.maxPrice }
  }

  return criteria

	return criteria
}

// function _buildSort(filterBy) {
// 	if (!filterBy.sortField) return {}
// 	return { [filterBy.sortField]: filterBy.sortDir }
// }
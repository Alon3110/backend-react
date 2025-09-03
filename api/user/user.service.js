// api/user/user.service.js

import { dbService } from '../../services/db.service.js'
import { logger } from '../../services/logger.service.js'
import { reviewService } from '../review/review.service.js'
import { ObjectId } from 'mongodb'

export const userService = {
    add,            // Create (Signup)
    getById,        // Read (Profile page)
    update,         // Update (Edit profile)
    remove,         // Delete (remove user)
    query,          // List (of users)
    getByUsername,  // Used for Login
}

async function query(filterBy = {}) {
    const criteria = _buildCriteria(filterBy)
    try {
        const collection = await dbService.getCollection('user')
        let users = await collection.find(criteria).toArray()
        users = users.map(user => {
            delete user.password
            // Fake recent createdAt (kept from your code)
            user.createdAt = Date.now() - (1000 * 60 * 60 * 24 * 3)
            return user
        })
        return users
    } catch (err) {
        logger.error('cannot find users', err)
        throw err
    }
}

async function getById(userId) {
    try {
        // --- robust id handling ---
        // EDIT: only convert valid hex strings to ObjectId
        const _id =
            typeof userId === 'string'
                ? (ObjectId.isValid(userId) ? new ObjectId(userId) : null) // EDIT
                : userId

        if (!_id) {                            // NEW
            throw new Error(`Invalid user id: ${userId}`) // NEW
        }

        const collection = await dbService.getCollection('user')
        // EDIT: project out password; keep email available
        const user = await collection.findOne(
            { _id },
            { projection: { password: 0 } }     // EDIT
        )

        if (!user) {                           // NEW
            throw new Error(`User not found: ${userId}`) // NEW
        }

        // Enrich with given reviews (best-effort)
        const criteria = { byUserId: userId }
        try {
            const givenReviews = await reviewService.query(criteria)
            user.givenReviews = (givenReviews || []).map(review => {
                const { byUser, ...rest } = review
                return rest
            })
        } catch (e) {
            logger.warn('getById: failed loading givenReviews', e) // NEW
            user.givenReviews = []                                  // NEW
        }

        return user
    } catch (err) {
        logger.error(`while finding user by id: ${userId}`, err)
        throw err
    }
}

async function getByUsername(username) {
    try {
        const collection = await dbService.getCollection('user')
        // EDIT: include email (+ password for auth)
        const user = await collection.findOne(
            { username },
            { projection: { username: 1, fullname: 1, imgUrl: 1, isAdmin: 1, email: 1, password: 1 } } // EDIT
        )
        return user
    } catch (err) {
        logger.error(`while finding user by username: ${username}`, err)
        throw err
    }
}

async function remove(userId) {
    try {
        // EDIT: safe id handling
        const _id =
            typeof userId === 'string'
                ? (ObjectId.isValid(userId) ? new ObjectId(userId) : null)
                : userId
        if (!_id) throw new Error(`Invalid user id: ${userId}`) // NEW

        const collection = await dbService.getCollection('user')
        await collection.deleteOne({ _id })
    } catch (err) {
        logger.error(`cannot remove user ${userId}`, err)
        throw err
    }
}

async function update(user) {
    try {
        // EDIT: allow updating email/imgUrl too (optional)
        const _id =
            typeof user._id === 'string'
                ? (ObjectId.isValid(user._id) ? new ObjectId(user._id) : null)
                : user._id
        if (!_id) throw new Error(`Invalid user id: ${user?._id}`) // NEW

        const userToSave = {
            fullname: user.fullname,
            username: user.username,
            imgUrl: user.imgUrl ?? null, // NEW
            email: user.email ?? null,   // NEW
        }

        const collection = await dbService.getCollection('user')
        await collection.updateOne({ _id }, { $set: userToSave })

        return { _id, ...userToSave }
    } catch (err) {
        logger.error(`cannot update user ${user._id}`, err)
        throw err
    }
}

async function add(user) {
	try {
		// peek only updatable fields!
		const userToAdd = {
			username: user.username,
			password: user.password,
			fullname: user.fullname,
			imgUrl: user.imgUrl,
			isAdmin: user.isAdmin,
            email:user.email
		}
		const collection = await dbService.getCollection('user')
		await collection.insertOne(userToAdd)
		return userToAdd
	} catch (err) {
		logger.error('cannot add user', err)
		throw err
	}
}

function _buildCriteria(filterBy) {
    const criteria = {}
    if (filterBy.txt) {
        const txtCriteria = { $regex: filterBy.txt, $options: 'i' }
        criteria.$or = [
            { username: txtCriteria },
            { fullname: txtCriteria },
        ]
    }
    if (filterBy.minBalance) {
        criteria.score = { $gte: filterBy.minBalance }
    }
    return criteria
}

import { MongoClient } from 'mongodb'

import { config } from '../config/index.js'
import { logger } from './logger.service.js'

export const dbService = { getCollection }

var dbConn = null

async function getCollection(collectionName) {
	try {
		logger.info('db.service -> getting collection:', collectionName)
		const db = await _connect()
		const collection = await db.collection(collectionName)
		logger.info('db.service -> collection obtained successfully:', collectionName)
		return collection
	} catch (err) {
		logger.error('Failed to get Mongo collection:', collectionName, err)
		throw err
	}
}

async function _connect() {
	if (dbConn) {
		logger.info('db.service -> using existing connection')
		return dbConn
	}
    
	try {
		logger.info('db.service -> connecting to:', config.dbURL, 'database:', config.dbName)
		const client = await MongoClient.connect(config.dbURL)
		dbConn = client.db(config.dbName)
		logger.info('db.service -> connected successfully')
		return dbConn
	} catch (err) {
		logger.error('Cannot Connect to DB', err)
		throw err
	}
}
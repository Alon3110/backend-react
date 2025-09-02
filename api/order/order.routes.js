import express from 'express'
import { getOrders, getOrderById, addOrder, updateOrder, removeOrder } from './order.controller.js'
import { requireAuth } from '../../middlewares/requireAuth.middleware.js'

const router = express.Router()

router.get('/', getOrders)
router.get('/:id', getOrderById)
router.post('/', requireAuth, addOrder)
router.put('/:id', requireAuth, updateOrder)
router.delete('/:id', requireAuth, removeOrder)

export const orderRoutes = router


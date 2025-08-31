import express from 'express'
import { getOrders, getOrderById, addOrder, updateOrder, removeOrder } from './order.controller.js'

const router = express.Router()

router.get('/', getOrders)
router.get('/:id', getOrderById)
router.post('/', addOrder)
router.put('/:id', updateOrder)
router.delete('/:id', removeOrder)

export const orderRoutes = { router }


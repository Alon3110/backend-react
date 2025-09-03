import { Router } from 'express'
import { orderConfirmationWorkflow } from '../../workflows/orderConfirmation.workflow.js'

const workflowsRouter = Router()
workflowsRouter.post('/order/confirmation', orderConfirmationWorkflow)

export default workflowsRouter

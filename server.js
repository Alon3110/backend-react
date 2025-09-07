import http from 'http'
import path from 'path'
import cors from 'cors'
import express from 'express'
import cookieParser from 'cookie-parser'
import 'dotenv/config'

import { authRoutes } from './api/auth/auth.routes.js'
import { userRoutes } from './api/user/user.routes.js'
import { reviewRoutes } from './api/review/review.routes.js'
import { stayRoutes } from './api/stay/stay.routes.js'
import { orderRoutes } from './api/order/order.routes.js'
import { setupSocketAPI } from './services/socket.service.js'
import workflowsRouter from "./api/workflow/workflows.routes.js"

import { setupAsyncLocalStorage } from './middlewares/setupAls.middleware.js'
import { attachLoggedinUser } from './middlewares/requireAuth.middleware.js'

const app = express()
const server = http.createServer(app)

// Express App Config
app.use(cookieParser())
app.use(express.json())
app.use(attachLoggedinUser)

if (process.env.NODE_ENV !== 'production') {
    const corsOptions = {
        origin: ['http://127.0.0.1:3030',
            'http://localhost:3030',
            'http://127.0.0.1:5173',
            'http://localhost:5173',
            'http://127.0.0.1:5174',
            'http://localhost:5174',
            'http://127.0.0.1:5178',
            'http://localhost:5178'
        ],
        credentials: true
    }
    app.use(cors(corsOptions))
    app.options('*', cors(corsOptions))
} else {
    app.use(express.static(path.resolve('public')))
}


app.all('*all', setupAsyncLocalStorage)

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/review', reviewRoutes)
app.use('/api/stay', stayRoutes)
app.use('/api/order', orderRoutes)
app.use("/api/workflows", workflowsRouter)


setupSocketAPI(server)

app.get('/*all', (req, res) => {
    res.sendFile(path.resolve('public/index.html'))
})

import { logger } from './services/logger.service.js'
const port = process.env.PORT || 3030

server.listen(port, () => {
    logger.info('Server is running on port: ' + port)
})



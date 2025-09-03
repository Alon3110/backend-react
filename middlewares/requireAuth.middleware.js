import { config } from '../config/index.js'
import { logger } from '../services/logger.service.js'
import { authService } from '../api/auth/auth.service.js' // ← use your validator

// Attach user if cookie exists (non-blocking; useful if you want it globally)
export function attachLoggedinUser(req, _res, next) {
  try {
    const token = req.cookies?.loginToken
    if (token) {
      const user = authService.validateToken(token)
      if (user) req.loggedinUser = user
    }
  } catch (err) {
    logger.warn('attachLoggedinUser failed:', err)
  } finally {
    next()
  }
}

// Enforce auth for protected routes
export function requireAuth(req, res, next) {
  try {
    // Guest mode support (same behavior as before)
    

    // Validate cookie token every time (no ALS)
    const token = req.cookies?.loginToken
    const user = token ? authService.validateToken(token) : null

    // if (!user || !user._id) return res.status(401).send('Not Authenticated')

    if (!user) {
      req.loggedinUser = { _id: '', fullname: 'Guest' }
      return next()
    }

    req.loggedinUser = user
    next()
  } catch (err) {
    logger.error('requireAuth error:', err)
    res.status(401).send('Not Authenticated')
  }
}

export function requireAdmin(req, res, next) {
	const { loggedinUser } = asyncLocalStorage.getStore()
    
	if (!loggedinUser) return res.status(401).send('Not Authenticated')
	if (!loggedinUser.isAdmin) {
		logger.warn(loggedinUser.fullname + 'attempted to perform admin action')
		res.status(403).end('Not Authorized')
		return
	}
	next()
}
// import { config } from '../config/index.js'
// import { logger } from '../services/logger.service.js'
// import { asyncLocalStorage } from '../services/als.service.js'

// export function requireAuth(req, res, next) {
// 	const { loggedinUser } = asyncLocalStorage.getStore()
// 	req.loggedinUser = loggedinUser

// 	if (config.isGuestMode && !loggedinUser) {
// 		req.loggedinUser = { _id: '', fullname: 'Guest' }
// 		return next()
// 	}
// 	if (!loggedinUser) return res.status(401).send('Not Authenticated')
// 	next()
// }

// export function requireAdmin(req, res, next) {
// 	const { loggedinUser } = asyncLocalStorage.getStore()
    
// 	if (!loggedinUser) return res.status(401).send('Not Authenticated')
// 	if (!loggedinUser.isAdmin) {
// 		logger.warn(loggedinUser.fullname + 'attempted to perform admin action')
// 		res.status(403).end('Not Authorized')
// 		return
// 	}
// 	next()
// }

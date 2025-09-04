// api/auth/auth.controller.js
import { authService } from './auth.service.js'
import { logger } from '../../services/logger.service.js'

const isProd = process.env.NODE_ENV === 'production'

export async function login(req, res) {
  const { username, password } = req.body
  try {
    const user = await authService.login(username, password)
    const loginToken = authService.getLoginToken(user)

    logger.info('User login: ', user)

    // res.cookie('loginToken', loginToken, {
    //   httpOnly: true,
    //   // Use None in dev too so cross-site XHR includes cookie
    //   sameSite: 'None',
    //   // Keep secure only in prod; localhost stays false
    //   secure: isProd,
    //   path: '/',
    //   maxAge: 1000 * 60 * 60 * 24 * 7,
    // })
    res.cookie('loginToken', loginToken)
    res.json(user)
  } catch (err) {
    logger.error('Failed to Login ' + err)
    res.status(401).send({ err: 'Failed to Login' })
  }
}

export async function signup(req, res) {
  try {
    const credentials = req.body
    const account = await authService.signup(credentials)
    logger.debug(`auth.route - new account created: ` + JSON.stringify(account))

    const user = await authService.login(credentials.username, credentials.password)
    logger.info('User signup:', user)

    const loginToken = authService.getLoginToken(user)
    // res.cookie('loginToken', loginToken, {
    //   httpOnly: true,
    //   sameSite: 'None',
    //   secure: isProd,
    //   path: '/',
    //   maxAge: 1000 * 60 * 60 * 24 * 7,
    // })
    res.cookie('loginToken', loginToken)
    res.json(user)
  } catch (err) {
    logger.error('Failed to signup ' + err)
    res.status(400).send({ err: 'Failed to signup' })
  }
}

export async function logout(req, res) {
  try {
    res.clearCookie('loginToken')
    res.send({ msg: 'Logged out successfully' })
  } catch (err) {
    res.status(400).send({ err: 'Failed to logout' })
  }
}
// import { authService } from './auth.service.js'
// import { logger } from '../../services/logger.service.js'

// export async function login(req, res) {
// 	const { username, password } = req.body
// 	try {
// 		const user = await authService.login(username, password)
// 		const loginToken = authService.getLoginToken(user)
        
// 		logger.info('User login: ', user)
        
// 		res.cookie('loginToken', loginToken, { sameSite: 'None', secure: true })
// 		res.json(user)
// 	} catch (err) {
// 		logger.error('Failed to Login ' + err)
// 		res.status(401).send({ err: 'Failed to Login' })
// 	}
// }

// export async function signup(req, res) {
// 	try {
// 		const credentials = req.body
		
//         const account = await authService.signup(credentials)
// 		logger.debug(`auth.route - new account created: ` + JSON.stringify(account))
		
//         const user = await authService.login(credentials.username, credentials.password)
// 		logger.info('User signup:', user)
		
//         const loginToken = authService.getLoginToken(user)
// 		res.cookie('loginToken', loginToken, { sameSite: 'None', secure: true })
// 		res.json(user)
// 	} catch (err) {
// 		logger.error('Failed to signup ' + err)
// 		res.status(400).send({ err: 'Failed to signup' })
// 	}
// }

// export async function logout(req, res) {
// 	try {
// 		res.clearCookie('loginToken')
// 		res.send({ msg: 'Logged out successfully' })
// 	} catch (err) {
// 		res.status(400).send({ err: 'Failed to logout' })
// 	}
// }
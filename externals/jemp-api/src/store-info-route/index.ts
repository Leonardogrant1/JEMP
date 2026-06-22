

import { Router, type Request, type Response } from 'express'
import logger from 'src/utils/pino-logger'
import { fetchIosVersionInfo, fetchAndroidVersionInfo } from './helpers'
import { fetchIOSProducts } from './helpers/fetch-ios-products'
import { fetchAndroidProducts } from './helpers/fetch-android-products'
import { refillableSubscriptions } from 'database/constants'
import { getCached, setCached } from './cache'

const router: Router = Router()

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

router.get('/ios', async (_: Request, res: Response) => {
  try {
    if (!process.env.IOS_BUNDLE_ID) {
      throw new Error('IOS_BUNDLE_ID environment variable is not set')
    }

    const cached = getCached<{ version: string; releaseNotes: string }>('store-info-ios')
    if (cached) {
      res.status(200).send(cached)
      return
    }

    const storeInfo = await fetchIosVersionInfo(process.env.IOS_BUNDLE_ID)
    setCached('store-info-ios', storeInfo, TWO_HOURS_MS)
    res.status(200).send(storeInfo)
  } catch (error: any) {
    logger.error(error)
    res.status(500).send({ error: error.message })
  }
})

router.get('/ios/products', async (_: Request, res: Response) => {
  try {
    const products = await fetchIOSProducts()
    res.status(200).send(products)
  } catch (error: any) {
    logger.error(error)
    res.status(500).send({ error: error.message })
  }
})

router.get('/android', async (_: Request, res: Response) => {
  try {
    if (!process.env.ANDROID_PACKAGE_NAME) {
      throw new Error('ANDROID_PACKAGE_NAME environment variable is not set')
    }

    const cached = getCached<{ version: string; releaseNotes: string }>('store-info-android')
    if (cached) {
      res.status(200).send(cached)
      return
    }

    const storeInfo = await fetchAndroidVersionInfo(process.env.ANDROID_PACKAGE_NAME)
    setCached('store-info-android', storeInfo, TWO_HOURS_MS)
    res.status(200).send(storeInfo)
  } catch (error: any) {
    logger.error(error)
    res.status(500).send({ error: error.message })
  }
})

router.get('/android/products', async (_: Request, res: Response) => {
  try {
    const products = await fetchAndroidProducts()
    res.status(200).send(products)
  } catch (error: any) {
    logger.error(error)
    res.status(500).send({ error: error.message })
  }
})

router.get('/refillable-subscriptions', async (_: Request, res: Response) => {
  res.status(200).send(refillableSubscriptions)
})

export default router
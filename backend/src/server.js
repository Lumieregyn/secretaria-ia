import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { router as health } from './routes/health.js'
import { router as api } from './routes/api.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use('/health', health)
app.use('/api', api)
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`[backend] listening on ${PORT}`))

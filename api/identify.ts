import { identifyAll } from './_identify'

// Vercel serverless function: POST { image: dataURL } -> species JSON. The API key never reaches the browser.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end()
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' })
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    if (!body?.image || body.image.length > 3_000_000) return res.status(400).json({ error: 'bad image' })
    res.status(200).json(await identifyAll(body.image, { anthropic: key, model: process.env.ANTHROPIC_MODEL, plantnet: process.env.PLANTNET_API_KEY }))
  } catch {
    res.status(502).json({ error: 'identify failed' })
  }
}

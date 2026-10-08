import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { loadEnv, Plugin } from 'vite'
import { identifyAll } from './api/_identify'

// Dev-only: serves /api/identify locally using ANTHROPIC_API_KEY from .env (in production Vercel runs api/identify.ts)
const devApi = (key?: string, model?: string, pn?: string): Plugin => ({
  name: 'dev-api',
  configureServer(s) {
    s.middlewares.use('/api/identify', (req, res) => {
      let b = ''; req.on('data', c => (b += c))
      req.on('end', async () => {
        res.setHeader('content-type', 'application/json')
        try { if (!key) throw new Error('no key'); res.end(JSON.stringify(await identifyAll(JSON.parse(b).image, { anthropic: key, model, plantnet: pn }))) }
        catch { res.statusCode = 502; res.end('{"error":"identify failed"}') }
      })
    })
  }
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [react(), devApi(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL, env.PLANTNET_API_KEY), VitePWA({
    registerType: 'autoUpdate',
    workbox: {
      globIgnores: ['**/*.wasm'],
      navigateFallbackDenylist: [/^\/api/, /^\/__/],
      runtimeCaching: [{ urlPattern: /\.wasm$/, handler: 'CacheFirst', options: { cacheName: 'ai-runtime' } }]
    },
    manifest: {
      name: 'TerraQuest', short_name: 'TerraQuest',
      description: 'AI-powered outdoor nature & activity companion',
      theme_color: '#121212', background_color: '#121212', display: 'standalone', start_url: '/',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    }
  })]
}
})

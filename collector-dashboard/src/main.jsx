import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const root = createRoot(document.getElementById('root'))

// App is imported dynamically so a missing .env shows a readable message
// instead of a blank page (lib/env.ts throws on missing variables).
import('./App.jsx')
  .then(({ default: App }) =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
  .catch((error) =>
    root.render(
      <main className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-serif text-2xl font-bold text-brand-900">Configuration error</h1>
        <p className="mt-3 text-sm text-muted">{error.message}</p>
      </main>,
    ),
  )

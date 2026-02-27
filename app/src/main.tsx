import React from 'react'
import ReactDOM from 'react-dom/client'
import { Buffer } from 'buffer'
import App from './App.tsx'
import './index.css'

// Anchor/web3 dependencies rely on Node globals in browser builds.
(globalThis as any).Buffer = Buffer
;(globalThis as any).global = globalThis

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

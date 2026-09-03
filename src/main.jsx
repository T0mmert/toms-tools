import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import LoginGate from './components/LoginGate.jsx'
import './index.css'
import App from './App.jsx'

// LoginGate sits above App rather than inside it: until the vault is open there
// is no decryption key, so every store would read empty. Not mounting App at
// all keeps that state from ever existing.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <LoginGate>
        <App />
      </LoginGate>
    </ErrorBoundary>
  </StrictMode>,
)

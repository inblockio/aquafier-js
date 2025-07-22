import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Create a single root with all providers
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
)

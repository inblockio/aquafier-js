import { StrictMode } from 'react'
import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ColorModeProvider } from './components/ui/color-mode.tsx'
import { Toaster } from "./components/ui/toaster"
import { EnvironmentProvider } from "@chakra-ui/react"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EnvironmentProvider>
      <ChakraProvider value={defaultSystem}>
        <ColorModeProvider>
          <Toaster />
          <App />
        </ColorModeProvider>
      </ChakraProvider>
    </EnvironmentProvider>
  </StrictMode>,
)

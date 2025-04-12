import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { EnvironmentProvider, ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { ColorModeProvider } from './components/ui/color-mode.tsx'
import {Toaster} from "./components/ui/toaster.tsx"

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

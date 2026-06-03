import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'

const STORAGE_KEY = 'aquafier_deprecation_banner_dismissed'

export default function DeprecationBanner() {
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem(STORAGE_KEY) === 'true'
  )

  if (dismissed) return null

  return (
    <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 text-center text-sm font-medium shadow-md z-[100]">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Aquafier is being deprecated. Please switch to{' '}
          <a
            href="https://aquafire.inblock.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold hover:text-white/90"
          >
            AquaFire
          </a>
          , the next-generation Aqua Protocol v4 platform.
        </span>
      </div>
      <button
        onClick={() => {
          sessionStorage.setItem(STORAGE_KEY, 'true')
          setDismissed(true)
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/20 transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Coffee } from 'lucide-react'

export function ProductImg({ image, name }: { image?: string; name: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (image) {
      window.api.coffee.products.loadImage(image).then(setSrc).catch(() => setSrc(null))
    } else {
      setSrc(null)
    }
  }, [image])

  return src
    ? <img src={src} alt={name} className="w-full h-full object-cover" />
    : (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-700 dark:to-slate-800">
        <Coffee className="w-6 h-6 text-amber-300 dark:text-slate-500" />
      </div>
    )
}

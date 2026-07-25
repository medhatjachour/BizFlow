import { useState, useEffect } from 'react'

export function ProductImg({ image, name }: { image?: string; name: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (image) {
      window.api.coffee.products
        .loadImage(image)
        .then(setSrc)
        .catch(() => setSrc(null))
    } else {
      setSrc(null)
    }
  }, [image])

  return src ? (
    <img src={src} alt={name} className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
      <span className="text-5xl">☕</span>
    </div>
  )
}

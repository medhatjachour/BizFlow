import { useState, useEffect } from 'react'

interface ImageLoaderProps {
  filename: string
  name: string
}

export function ImageLoader({ filename, name }: ImageLoaderProps) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    window.api.coffee.products
      .loadImage(filename)
      .then(setSrc)
      .catch(() => setSrc(null))
  }, [filename])

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400">
        <span className="text-4xl">☕</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      className="w-full h-full object-cover"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none'
      }}
    />
  )
}

export default ImageLoader

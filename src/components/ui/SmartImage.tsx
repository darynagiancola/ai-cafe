import { useMemo, useState, type ImgHTMLAttributes } from 'react'

interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string
}

function resolveFallbackImagePath(): string {
  const base = import.meta.env.BASE_URL
  return `${base}images/fallback-coffee.svg`
}

export function SmartImage({ src, alt, ...rest }: SmartImageProps) {
  const fallbackSrc = useMemo(() => resolveFallbackImagePath(), [])
  const [currentSrc, setCurrentSrc] = useState(src)

  return (
    <img
      {...rest}
      src={currentSrc}
      alt={alt}
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc)
        }
      }}
    />
  )
}

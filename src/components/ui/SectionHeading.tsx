interface SectionHeadingProps {
  eyebrow?: string
  title: string
  description?: string
  center?: boolean
}

export function SectionHeading({ eyebrow, title, description, center = false }: SectionHeadingProps) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a5239]">{eyebrow}</p>}
      <h2 className="display-serif mt-3 text-4xl font-semibold leading-[1.02] text-[#231d19] sm:text-5xl">{title}</h2>
      {description && <p className="mt-4 text-base leading-relaxed text-[#5f534b] sm:text-lg">{description}</p>}
    </div>
  )
}

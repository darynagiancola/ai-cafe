interface SectionHeadingProps {
  eyebrow?: string
  title: string
  description?: string
  center?: boolean
}

export function SectionHeading({ eyebrow, title, description, center = false }: SectionHeadingProps) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8b4f38]">{eyebrow}</p>}
      <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#2a2320] sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-base text-[#695f58]">{description}</p>}
    </div>
  )
}

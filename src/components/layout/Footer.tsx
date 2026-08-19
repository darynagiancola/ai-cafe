import { Instagram, Facebook, Music2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { businessService } from '../../services/businessService'

const socialIconByLabel: Record<string, JSX.Element> = {
  Instagram: <Instagram className="h-4 w-4" aria-hidden />,
  Facebook: <Facebook className="h-4 w-4" aria-hidden />,
  TikTok: <Music2 className="h-4 w-4" aria-hidden />,
}

export function Footer() {
  const businessInfo = businessService.getBusinessInfo()

  return (
    <footer className="mt-16 border-t border-[#e8ddd2] bg-[#fcfaf6]">
      <div className="container-shell grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="text-lg font-semibold tracking-[0.2em] text-[#2a2320]">{businessInfo.logoWordmark}</p>
          <p className="text-sm text-[#695f58]">{businessInfo.tagline}</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#3f3530]">Navigate</h2>
          <ul className="space-y-2 text-sm text-[#695f58]">
            <li>
              <Link className="focus-ring rounded hover:text-[#8b4f38]" to="/">
                Home
              </Link>
            </li>
            <li>
              <Link className="focus-ring rounded hover:text-[#8b4f38]" to="/menu">
                Menu
              </Link>
            </li>
            <li>
              <Link className="focus-ring rounded hover:text-[#8b4f38]" to="/about">
                About
              </Link>
            </li>
            <li>
              <Link className="focus-ring rounded hover:text-[#8b4f38]" to="/contact">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#3f3530]">Opening hours</h2>
          <ul className="space-y-2 text-sm text-[#695f58]">
            {businessInfo.openingHours.map((hour) => (
              <li className="flex justify-between gap-3" key={hour.day}>
                <span>{hour.day}</span>
                <span>{hour.time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#3f3530]">Contact</h2>
          <p className="text-sm text-[#695f58]">
            {businessInfo.address}, {businessInfo.city}
          </p>
          <p className="text-sm text-[#695f58]">{businessInfo.phone}</p>
          <p className="text-sm text-[#695f58]">{businessInfo.email}</p>
          <div className="flex gap-2">
            {businessInfo.socials.map((social) => (
              <a
                key={social.label}
                className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e8ddd2] text-[#695f58] transition hover:bg-[#f0e4d8] hover:text-[#3f3530]"
                href={social.url}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
              >
                {socialIconByLabel[social.label] ?? <span className="text-xs">{social.label[0]}</span>}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-[#e8ddd2] py-4 text-center text-sm text-[#7d726a]">
        © {new Date().getFullYear()} {businessInfo.brandName}. All rights reserved.
      </div>
    </footer>
  )
}

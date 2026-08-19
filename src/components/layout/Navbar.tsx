import { Menu, ShoppingBag, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { businessService } from '../../services/businessService'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/menu', label: 'Menu' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

const navClassName = ({ isActive }: { isActive: boolean }) =>
  `focus-ring rounded-full px-4 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-[#eeddce] text-[#6f3d2a]'
      : 'text-[#4e453f] hover:bg-[#f4e9dc] hover:text-[#2a2320]'
  }`

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { totals } = useCart()
  const businessInfo = businessService.getBusinessInfo()

  return (
    <header className="sticky top-0 z-40 border-b border-[#e5d6c7] bg-[#f7f0e7]/90 backdrop-blur-md">
      <div className="container-shell flex h-20 items-center justify-between gap-4 py-3">
        <Link className="focus-ring flex flex-col rounded-md" to="/">
          <span className="display-serif text-2xl font-semibold tracking-[0.18em] text-[#2a2320]">
            {businessInfo.brandName}
          </span>
          <span className="-mt-1 text-[10px] uppercase tracking-[0.28em] text-[#7a6e65]">Specialty Café</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <NavLink key={link.to} className={navClassName} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            className="focus-ring relative rounded-full border border-[#ddcebf] bg-[#fff9f2] p-2.5 text-[#2a2320] transition hover:-translate-y-0.5 hover:bg-[#f5ebde]"
            to="/cart"
            aria-label="Open cart"
          >
            <ShoppingBag aria-hidden className="h-5 w-5" />
            {totals.itemCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-[#7f4630] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {totals.itemCount}
              </span>
            )}
          </Link>
          <Link className="btn-primary" to="/checkout">
            Order online
          </Link>
        </div>

        <button
          type="button"
          className="focus-ring rounded-full border border-[#ddcebf] bg-[#fff9f2] p-2 text-[#2a2320] lg:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#e8ddd2] bg-[#f8f2ea] lg:hidden">
          <nav className="container-shell flex flex-col py-4" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                className={navClassName}
                to={link.to}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
            <div className="mt-3 flex items-center justify-between">
              <Link
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-[#ddcebf] bg-white px-3 py-2 text-sm text-[#2a2320]"
                to="/cart"
                onClick={() => setMobileOpen(false)}
              >
                <ShoppingBag className="h-4 w-4" />
                Cart ({totals.itemCount})
              </Link>
              <Link
                className="btn-primary px-4 py-2"
                to="/checkout"
                onClick={() => setMobileOpen(false)}
              >
                Order online
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

import type { PropsWithChildren } from 'react'
import { AddToCartToast } from '../cart/AddToCartToast'
import { Footer } from './Footer'
import { Navbar } from './Navbar'

export function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-[#f7f2eb] text-[#1f1a17]">
      <Navbar />
      <AddToCartToast />
      <main>{children}</main>
      <Footer />
    </div>
  )
}

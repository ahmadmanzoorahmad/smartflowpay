'use client'

import Link from 'next/link'

interface LogoProps {
  className?: string
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <Link href="/" className={`block hover:opacity-80 transition-opacity ${className}`}>
      <img
        src="/logo.jpg"
        alt="SmartFlow Pay"
        className="h-8 w-auto"
      />
    </Link>
  )
}

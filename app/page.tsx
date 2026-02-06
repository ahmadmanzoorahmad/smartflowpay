'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Logo } from '@/components/Logo'
import { WalletConnectButton } from '@/components/WalletConnectButton'
import { Wallet, Zap, TrendingUp, Shield } from 'lucide-react'
import { useCallback } from 'react'

export default function Landing() {
  const router = useRouter()

  const handleWalletConnect = useCallback((address: string) => {
    if (address) {
      router.push('/dashboard')
    }
  }, [router])

  const features = [
    {
      icon: Wallet,
      title: 'Accept Stablecoins',
      description: 'Receive USDT and FDUSD payments instantly on BNB Chain.',
    },
    {
      icon: Zap,
      title: 'Instant Settlement',
      description: 'No waiting periods. Funds are available the moment they arrive.',
    },
    {
      icon: TrendingUp,
      title: 'Real-Time Dashboard',
      description: 'Track every invoice, payment, and withdrawal as it happens.',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Logo className="h-12" />
          </div>
          <p className="text-xl text-gray-600 mb-8">
            Stablecoin payments, made effortless.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <WalletConnectButton size="lg" onConnect={handleWalletConnect} />
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              size="lg"
            >
              Try Demo
            </Button>
          </div>

          <p className="text-sm text-gray-500">
            Built for merchants & freelancers — fully non-custodial
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl w-full mt-8">
          {features.map((feature, index) => (
            <Card key={index} className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </Card>
          ))}
        </div>

        <div className="mt-12 flex items-center gap-2 text-sm text-gray-500">
          <Shield className="w-4 h-4 text-green-500" />
          Non-custodial &middot; BNB Chain Testnet
        </div>
      </main>
    </div>
  )
}

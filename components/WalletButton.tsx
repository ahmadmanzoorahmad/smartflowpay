'use client'

import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { bscTestnet } from 'wagmi/chains'
import { Button } from './Button'
import { formatAddress } from '@/lib/utils'
import { Wallet, LogOut, AlertCircle } from 'lucide-react'

export function WalletButton() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  const isWrongNetwork = isConnected && chain?.id !== bscTestnet.id

  if (isConnected && address) {
    if (isWrongNetwork) {
      return (
        <Button
          variant="outline"
          onClick={() => switchChain({ chainId: bscTestnet.id })}
          className="border-red-300 text-red-600 hover:bg-red-50"
        >
          <AlertCircle className="w-4 h-4" />
          Switch to BNB Testnet
        </Button>
      )
    }

    return (
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium">
          {formatAddress(address)}
        </div>
        <button
          onClick={() => disconnect()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 text-gray-500" />
        </button>
      </div>
    )
  }

  return (
    <Button onClick={() => connect({ connector: connectors[0] })} disabled={isPending}>
      <Wallet className="w-5 h-5" />
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  )
}

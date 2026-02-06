'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/Button'
import { Wallet, Check } from 'lucide-react'
import { connectWallet, shortAddr, getEthereum } from '@/lib/web3'

const STORAGE_KEY = 'smartflow_wallet'

interface WalletConnectButtonProps {
  size?: 'sm' | 'md' | 'lg'
  onConnect?: (address: string) => void
}

export function WalletConnectButton({ size = 'lg', onConnect }: WalletConnectButtonProps) {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setAddress(saved)
    }
  }, [])

  useEffect(() => {
    const ethereum = getEthereum()
    if (!ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress(null)
        localStorage.removeItem(STORAGE_KEY)
      } else {
        const newAddress = accounts[0]
        setAddress(newAddress)
        localStorage.setItem(STORAGE_KEY, newAddress)
      }
    }

    ethereum.on('accountsChanged', handleAccountsChanged)
    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged)
    }
  }, [])

  const handleConnect = useCallback(async () => {
    const ethereum = getEthereum()
    if (!ethereum) {
      alert('Please install a Web3 wallet like MetaMask to continue.')
      return
    }

    setIsConnecting(true)
    try {
      const walletAddress = await connectWallet()
      if (walletAddress) {
        setAddress(walletAddress)
        localStorage.setItem(STORAGE_KEY, walletAddress)
        onConnect?.(walletAddress)
      }
    } catch (error) {
      console.error('Wallet connection failed:', error)
    } finally {
      setIsConnecting(false)
    }
  }, [onConnect])

  if (address) {
    return (
      <Button size={size} variant="outline" onClick={handleConnect}>
        <Check className="w-5 h-5 text-green-500" />
        {shortAddr(address)}
      </Button>
    )
  }

  return (
    <Button onClick={handleConnect} disabled={isConnecting} size={size}>
      <Wallet className="w-5 h-5" />
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  )
}

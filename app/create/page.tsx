'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Logo } from '@/components/Logo'
import { usePaymentStore, generatePaymentId } from '@/lib/store'
import { createInvoice, isDemoMode } from '@/lib/invoice/client'
import { connectWallet, getEthereum, isCorrectNetwork, switchToBscTestnet, shortAddr, getExplorerTxUrl } from '@/lib/web3'
import { ArrowLeft, Copy, Share2, CheckCircle, Loader2, AlertCircle, X, Lightbulb, ExternalLink } from 'lucide-react'
import QRCode from 'react-qr-code'

const STORAGE_KEY = 'smartflow_wallet'
const INVOICES_STORAGE_KEY = 'smartflow_invoices_created'

interface CreatedInvoice {
  invoiceId: string
  amount: string
  token: 'USDT' | 'FDUSD'
  note: string
  expiryMinutes: number
  createdAt: number
  paymentLink: string
  isDemo: boolean
}

function saveCreatedInvoice(invoice: CreatedInvoice) {
  if (typeof window === 'undefined') return
  const stored = localStorage.getItem(INVOICES_STORAGE_KEY)
  const invoices: CreatedInvoice[] = stored ? JSON.parse(stored) : []
  invoices.unshift(invoice)
  localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices))
}

export default function CreatePayment() {
  const router = useRouter()
  const addPayment = usePaymentStore((state) => state.addPayment)

  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'USDT' | 'FDUSD'>('USDT')
  const [note, setNote] = useState('')
  const [expiryMinutes, setExpiryMinutes] = useState(60)
  const [generatedLink, setGeneratedLink] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [copied, setCopied] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [isDemo, setIsDemo] = useState(false)
  const [creationTxHash, setCreationTxHash] = useState('')
  const [wrongNetwork, setWrongNetwork] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setWalletAddress(saved)
    }
  }, [])

  useEffect(() => {
    if (walletAddress && !isDemoMode()) {
      isCorrectNetwork().then(correct => setWrongNetwork(!correct))
    }
  }, [walletAddress])

  const isConnected = !!walletAddress || isDemoMode()

  const handleConnect = async () => {
    const ethereum = getEthereum()
    if (!ethereum) {
      alert('Please install MetaMask to continue.')
      return
    }

    const address = await connectWallet()
    if (address) {
      setWalletAddress(address)
      localStorage.setItem(STORAGE_KEY, address)
    }
  }

  const handleGenerate = async () => {
    if (!amount) return

    const merchantAddr = walletAddress || (isDemoMode() ? '0x91eA55119adD606960956EB0C7bF9F7Ec13aFDF1' : null)
    if (!merchantAddr) {
      setError('Please connect your wallet first')
      return
    }

    setIsCreating(true)
    setError('')

    try {
      if (!isDemoMode()) {
        const ethereum = getEthereum()
        if (!ethereum) {
          throw new Error('Please install MetaMask to continue.')
        }

        const correctNetwork = await isCorrectNetwork()
        if (!correctNetwork) {
          const switched = await switchToBscTestnet()
          if (!switched) {
            throw new Error('Please switch to BNB Chain Testnet')
          }
        }
      }

      const expiresAt = expiryMinutes > 0 
        ? Math.floor(Date.now() / 1000) + (expiryMinutes * 60)
        : 0

      const result = await createInvoice(merchantAddr, {
        token: currency,
        amount,
        note,
        expiresAt,
      })

      setInvoiceId(result.invoiceId)
      setIsDemo(result.isDemo)
      setCreationTxHash(result.txHash)

      const paymentId = generatePaymentId()
      addPayment({
        id: paymentId,
        amount,
        token: currency,
        note,
        merchantAddress: merchantAddr,
        status: 'pending',
        createdAt: Date.now(),
        invoiceId: result.invoiceId,
      })

      const link = `${window.location.origin}/pay/${result.invoiceId}`
      setGeneratedLink(link)

      saveCreatedInvoice({
        invoiceId: result.invoiceId,
        amount,
        token: currency,
        note,
        expiryMinutes,
        createdAt: Date.now(),
        paymentLink: link,
        isDemo: result.isDemo,
      })
    } catch (err: any) {
      const message = err.message || 'Failed to create invoice'
      
      if (message.includes('user rejected') || message.includes('User denied') || err.code === 4001) {
        setError('You cancelled the transaction.')
      } else if (message.includes('insufficient funds') || message.includes('gas')) {
        setError('Not enough BNB for gas fees. Top up your wallet and try again.')
      } else if (message.includes('network') || message.includes('chain')) {
        setError('Please switch to BNB Chain Testnet to continue.')
      } else {
        setError(message)
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Request',
          text: `Pay ${amount} ${currency}`,
          url: generatedLink,
        })
      } catch (err) {
        handleCopy()
      }
    } else {
      handleCopy()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Logo />
          </div>
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {!generatedLink ? (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Create Payment</h1>
              <p className="text-gray-600">Generate a payment link or QR code for your customer</p>
              {walletAddress && (
                <p className="text-sm text-gray-500 mt-2">
                  Connected: {shortAddr(walletAddress)}
                </p>
              )}
            </div>

            <Card>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency *
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'USDT' | 'FDUSD')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                  >
                    <option value="USDT">USDT</option>
                    <option value="FDUSD">FDUSD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note (Invoice / Order ID)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g., Invoice #1234, Order #5678, Website design payment"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry (minutes)
                  </label>
                  <input
                    type="number"
                    value={expiryMinutes}
                    onChange={(e) => setExpiryMinutes(parseInt(e.target.value) || 0)}
                    placeholder="60"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Set to 0 for no expiration</p>
                </div>

                {wrongNetwork && walletAddress && !isDemoMode() && (
                  <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-xl">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">Please switch to BNB Chain Testnet</p>
                    <button
                      onClick={async () => {
                        const switched = await switchToBscTestnet()
                        if (switched) setWrongNetwork(false)
                      }}
                      className="ml-auto text-sm font-medium text-orange-700 underline whitespace-nowrap"
                    >
                      Switch
                    </button>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {!isConnected && !isDemoMode() && (
                  <Button
                    onClick={handleConnect}
                    className="w-full"
                    size="lg"
                  >
                    Connect Wallet
                  </Button>
                )}

                {isConnected && (
                  <>
                    <Button
                      onClick={handleGenerate}
                      disabled={!amount || isCreating}
                      className="w-full"
                      size="lg"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Generate Payment Link'
                      )}
                    </Button>
                  </>
                )}
              </div>
            </Card>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Share this link or QR code with your customer.</p>
                <p className="text-sm text-blue-600">Payments settle instantly on BNB Chain.</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <Card className="bg-yellow-50 border-yellow-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Invoice Created Successfully</h2>
                  <p className="text-gray-600">{amount} {currency}</p>
                  {isDemo && (
                    <p className="text-xs text-yellow-600 mt-1">Demo Mode - Invoice stored locally</p>
                  )}
                  {creationTxHash && !isDemo && (
                    <a
                      href={getExplorerTxUrl(creationTxHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                    >
                      View on BscScan <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <div className="bg-white p-4 rounded-xl shadow-sm">
                  <QRCode value={generatedLink} size={200} />
                </div>
              </div>

              <div className="mt-4 bg-white rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-2">Payment Link</p>
                <p className="text-sm font-mono break-all">{generatedLink}</p>
              </div>

              <div className="flex gap-3 mt-4">
                <Button
                  variant="secondary"
                  onClick={handleCopy}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button
                  onClick={handleShare}
                  className="flex-1"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold mb-4">Payment Status</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 relative">
                <p className="font-medium text-yellow-700">Pending</p>
                <p className="text-sm text-yellow-600">Waiting for payment</p>
                <div className="w-2 h-2 bg-yellow-400 rounded-full absolute right-4 top-1/2 -translate-y-1/2"></div>
              </div>
              <p className="text-sm text-gray-500 text-center mt-4">
                You'll be notified when the payment is received
              </p>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setGeneratedLink('')
                  setInvoiceId('')
                  setAmount('')
                  setNote('')
                  setExpiryMinutes(60)
                  setCreationTxHash('')
                }}
                className="flex-1"
              >
                Create Another
              </Button>
              <Button 
                variant="secondary"
                onClick={() => router.push('/dashboard')} 
                className="flex-1"
              >
                Back to Dashboard
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

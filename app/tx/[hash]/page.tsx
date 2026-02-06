'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Logo } from '@/components/Logo'
import { usePaymentStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'
import { getExplorerTxUrl } from '@/lib/web3'
import { ArrowLeft, CheckCircle, ExternalLink, Copy, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export default function TransactionPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const txHash = (params?.hash as string) ?? ''
  const isDemo = searchParams?.get('demo') === 'true'

  const payments = usePaymentStore((state) => state.payments)
  const payment = payments.find(p => p.txHash === txHash || p.id === txHash)

  const [copied, setCopied] = useState(false)
  const [showNotification, setShowNotification] = useState(true)
  const [paymentLink, setPaymentLink] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setShowNotification(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (payment && typeof window !== 'undefined') {
      setPaymentLink(`${window.location.origin}/pay/${payment.invoiceId || payment.id}`)
    }
  }, [payment])

  const handleCopy = () => {
    navigator.clipboard.writeText(payment?.merchantAddress || txHash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const explorerUrl = getExplorerTxUrl(txHash)

  return (
    <div className="min-h-screen bg-gray-50">
      {showNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium">Payment received!</span>
        </div>
      )}

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

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="text-center">
          {paymentLink && (
            <div className="bg-white p-6 rounded-xl border border-gray-100 inline-block mb-4">
              <QRCodeSVG value={paymentLink} size={180} level="H" />
            </div>
          )}

          <p className="text-4xl font-bold mb-2">
            {payment ? `${formatCurrency(payment.amount)} ${payment.token}` : 'Transaction Details'}
          </p>
          <p className="text-gray-600 mb-4">SmartFlow Pay</p>

          <div className="bg-green-50 border border-green-200 rounded-full px-6 py-3 inline-flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">Payment confirmed</span>
          </div>
        </div>

        <Card>
          <h3 className="font-semibold mb-3">Merchant Address</h3>
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <p className="font-mono text-sm truncate flex-1">
              {payment?.merchantAddress || 'N/A'}
            </p>
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-gray-200 rounded-lg ml-2"
            >
              <Copy className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <p className="text-sm text-blue-600 mt-2">BNB Chain Testnet</p>
        </Card>

        {!isDemo && (
          <Card
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => window.open(explorerUrl, '_blank')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">View on BscScan</h3>
                <p className="text-sm text-gray-500">See full transaction details on the block explorer</p>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-400" />
            </div>
          </Card>
        )}

        {isDemo && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-sm text-yellow-700">
              This is a demo transaction — no on-chain activity was recorded.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            variant="secondary"
            onClick={() => router.push('/create')}
            className="flex-1"
          >
            New Payment
          </Button>
          <Button onClick={() => router.push('/dashboard')} className="flex-1">
            Back to Dashboard
          </Button>
        </div>
      </main>
    </div>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/Card'
import { Logo } from '@/components/Logo'
import { getContractEvents, ContractEvent } from '@/lib/events'
import { isDemoMode } from '@/lib/invoice/client'
import { shortAddr, getExplorerTxUrl } from '@/lib/web3'
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Plus, Search, Filter, X, Loader2, ExternalLink } from 'lucide-react'

const STORAGE_KEY = 'smartflow_wallet'

type FilterType = 'all' | 'incoming' | 'outgoing'

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '0.00'
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function TransactionsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<ContractEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    setIsLoading(true)
    const saved = localStorage.getItem(STORAGE_KEY)
    const merchantAddress = saved || (isDemoMode() ? '0x91eA55119adD606960956EB0C7bF9F7Ec13aFDF1' : null)
    if (!merchantAddress) {
      setIsLoading(false)
      return
    }
    try {
      const contractEvents = await getContractEvents(merchantAddress, 500)
      setEvents(contractEvents)
    } catch (err) {
      console.error('Failed to load events:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredEvents = useMemo(() => {
    let filtered = [...events]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(e =>
        e.txHash.toLowerCase().includes(query) ||
        e.note?.toLowerCase().includes(query) ||
        e.invoiceId?.toLowerCase().includes(query)
      )
    }

    if (filter === 'incoming') {
      filtered = filtered.filter(e => e.type === 'InvoicePaid' || e.type === 'InvoiceCreated')
    } else if (filter === 'outgoing') {
      filtered = filtered.filter(e => e.type === 'Withdrawal')
    }

    return filtered
  }, [events, searchQuery, filter])

  const isDemo = isDemoMode()

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

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by hash or note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <button className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50">
              <Filter className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            {(['all', 'incoming', 'outgoing'] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
                  filter === type
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No transactions found.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event, index) => (
                <a
                  key={`${event.txHash}-${index}`}
                  href={!isDemo ? getExplorerTxUrl(event.txHash) : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors block"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      event.type === 'InvoicePaid'
                        ? 'bg-green-100'
                        : event.type === 'Withdrawal'
                        ? 'bg-red-100'
                        : 'bg-blue-100'
                    }`}>
                      {event.type === 'InvoicePaid' ? (
                        <ArrowDownLeft className="w-5 h-5 text-green-600" />
                      ) : event.type === 'Withdrawal' ? (
                        <ArrowUpRight className="w-5 h-5 text-red-600" />
                      ) : (
                        <Plus className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {event.type === 'InvoicePaid'
                          ? 'Payment Received'
                          : event.type === 'Withdrawal'
                          ? 'Withdrawal'
                          : 'Invoice Created'}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        {shortAddr(event.txHash)}
                        {!isDemo && <ExternalLink className="w-3 h-3" />}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      event.type === 'InvoicePaid'
                        ? 'text-green-600'
                        : event.type === 'Withdrawal'
                        ? 'text-red-600'
                        : 'text-gray-900'
                    }`}>
                      {event.type === 'InvoicePaid' ? '+' : event.type === 'Withdrawal' ? '-' : ''}
                      {formatCurrency(event.amount)} {event.tokenSymbol}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      event.type === 'InvoicePaid'
                        ? 'bg-green-100 text-green-700'
                        : event.type === 'Withdrawal'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {event.type === 'InvoicePaid'
                        ? 'completed'
                        : event.type === 'Withdrawal'
                        ? 'withdrawn'
                        : 'pending'}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}

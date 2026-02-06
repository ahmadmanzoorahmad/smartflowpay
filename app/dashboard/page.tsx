'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Logo } from '@/components/Logo'
import { usePaymentStore } from '@/lib/store'
import { getMerchantBalance, withdraw, isDemoMode, isLiveMode } from '@/lib/invoice/client'
import { getContractEvents, getTodaysSales, ContractEvent } from '@/lib/events'
import { 
  connectWallet, 
  getEthereum, 
  isCorrectNetwork, 
  switchToBscTestnet,
  getExplorerTxUrl,
  shortAddr,
  USDT_ADDRESS,
  FDUSD_ADDRESS,
  getTokenAddress
} from '@/lib/web3'
import {
  Plus,
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Clock,
  CheckCircle,
  Loader2,
  ExternalLink,
  Menu,
  X,
  AlertCircle,
  LogOut,
  History,
} from 'lucide-react'

const STORAGE_KEY = 'smartflow_wallet'
const WITHDRAW_SUPPORTED = true

function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '0.00'
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Dashboard() {
  const router = useRouter()
  const payments = usePaymentStore((state) => state.payments)
  
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [contractBalanceUSDT, setContractBalanceUSDT] = useState('0')
  const [contractBalanceFDUSD, setContractBalanceFDUSD] = useState('0')
  const [todaysSalesUSDT, setTodaysSalesUSDT] = useState(0)
  const [todaysSalesFDUSD, setTodaysSalesFDUSD] = useState(0)
  const [events, setEvents] = useState<ContractEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawToken, setWithdrawToken] = useState<'USDT' | 'FDUSD'>('USDT')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawRecipient, setWithdrawRecipient] = useState('')
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [withdrawSuccess, setWithdrawSuccess] = useState<{ txHash: string; isDemo: boolean } | null>(null)
  const [wrongNetwork, setWrongNetwork] = useState(false)

  const merchantAddress = walletAddress || (isDemoMode() ? '0x91eA55119adD606960956EB0C7bF9F7Ec13aFDF1' : null)

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

  useEffect(() => {
    if (merchantAddress) {
      loadDashboardData()
    } else {
      setIsLoading(false)
    }
  }, [merchantAddress])

  const loadDashboardData = async () => {
    if (!merchantAddress) return
    setIsLoading(true)
    
    try {
      const [usdtBal, fdusdBal, sales, contractEvents] = await Promise.all([
        getMerchantBalance(merchantAddress, 'USDT'),
        getMerchantBalance(merchantAddress, 'FDUSD'),
        getTodaysSales(merchantAddress),
        getContractEvents(merchantAddress, 500),
      ])
      
      setContractBalanceUSDT(usdtBal)
      setContractBalanceFDUSD(fdusdBal)
      setTodaysSalesUSDT(sales.usdt)
      setTodaysSalesFDUSD(sales.fdusd)
      setEvents(contractEvents)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleDisconnect = () => {
    setWalletAddress(null)
    localStorage.removeItem(STORAGE_KEY)
    setShowMenu(false)
  }

  const openWithdrawModal = (token: 'USDT' | 'FDUSD') => {
    const balance = token === 'USDT' ? contractBalanceUSDT : contractBalanceFDUSD
    setWithdrawToken(token)
    setWithdrawAmount(balance)
    setWithdrawRecipient(merchantAddress || '')
    setWithdrawError('')
    setWithdrawSuccess(null)
    setShowWithdrawModal(true)
  }

  const handleWithdraw = async () => {
    if (!merchantAddress) return
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setWithdrawError('Please enter a valid amount')
      return
    }
    if (!withdrawRecipient || withdrawRecipient.length !== 42) {
      setWithdrawError('Please enter a valid recipient address')
      return
    }

    setIsWithdrawing(true)
    setWithdrawError('')

    try {
      if (!isDemoMode()) {
        const correct = await isCorrectNetwork()
        if (!correct) {
          const switched = await switchToBscTestnet()
          if (!switched) {
            throw new Error('Please switch to BNB Chain Testnet')
          }
        }
      }

      const result = await withdraw(withdrawToken, withdrawAmount, withdrawRecipient)
      setWithdrawSuccess(result)
      await loadDashboardData()
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || ''
      if (msg.includes('user rejected') || err.code === 4001) {
        setWithdrawError('You cancelled the transaction.')
      } else if (msg.includes('insufficient') || msg.includes('balance')) {
        setWithdrawError('Not enough balance to complete this withdrawal.')
      } else {
        setWithdrawError(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setIsWithdrawing(false)
    }
  }

  const totalContractBalance = parseFloat(contractBalanceUSDT) + parseFloat(contractBalanceFDUSD)
  const totalTodaysSales = todaysSalesUSDT + todaysSalesFDUSD

  const recentEvents = events.slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            {walletAddress ? (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {shortAddr(walletAddress)}
              </span>
            ) : isDemoMode() ? (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                Demo Mode
              </span>
            ) : (
              <Button size="sm" onClick={handleConnect}>
                Connect Wallet
              </Button>
            )}
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {showMenu && (
        <div className="fixed inset-0 bg-black/50 z-20" onClick={() => setShowMenu(false)}>
          <div className="absolute right-0 top-0 h-full w-64 bg-white p-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold">Menu</h3>
              <button onClick={() => setShowMenu(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {walletAddress ? (
                <>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-500">Connected Wallet</p>
                    <p className="text-sm font-mono">{shortAddr(walletAddress)}</p>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect Wallet
                  </button>
                </>
              ) : (
                <Button onClick={handleConnect} className="w-full">
                  Connect Wallet
                </Button>
              )}
              {isDemoMode() && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-xs text-yellow-700">Running in Demo Mode</p>
                  <p className="text-xs text-yellow-600 mt-1">Data stored locally</p>
                </div>
              )}
              <Button variant="secondary" onClick={() => router.push('/transactions')} className="w-full">
                <History className="w-4 h-4 mr-2" />
                View All Transactions
              </Button>
              <Button variant="secondary" onClick={() => router.push('/')} className="w-full">
                Home
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-green-600 mb-1">Today's Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(totalTodaysSales)} USD</p>
                {(todaysSalesUSDT > 0 || todaysSalesFDUSD > 0) && (
                  <p className="text-sm text-gray-500 mt-1">
                    USDT: {formatCurrency(todaysSalesUSDT)} • FDUSD: {formatCurrency(todaysSalesFDUSD)}
                  </p>
                )}
              </Card>

              <Card>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Available Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(totalContractBalance)} USD</p>
                <p className="text-sm text-gray-500 mt-1">
                  USDT: {formatCurrency(contractBalanceUSDT)} • FDUSD: {formatCurrency(contractBalanceFDUSD)}
                </p>
              </Card>

              <Card>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Total Completed Invoices</p>
                <p className="text-2xl font-bold">{events.filter(e => e.type === 'InvoicePaid').length}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {events.filter(e => e.type === 'InvoiceCreated').length} created total
                </p>
              </Card>
            </div>

            <Card>
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  onClick={() => router.push('/create')}
                  className="flex-col h-auto py-4"
                >
                  <Plus className="w-5 h-5 mb-1" />
                  <span className="text-sm">Payment Link</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push('/create?qr=true')}
                  className="flex-col h-auto py-4"
                >
                  <QrCode className="w-5 h-5 mb-1" />
                  <span className="text-sm">Generate QR</span>
                </Button>
                {WITHDRAW_SUPPORTED ? (
                  <Button
                    variant="secondary"
                    onClick={() => openWithdrawModal('USDT')}
                    disabled={totalContractBalance <= 0}
                    className="flex-col h-auto py-4"
                  >
                    <ArrowUpRight className="w-5 h-5 mb-1" />
                    <span className="text-sm">Withdraw</span>
                  </Button>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 bg-gray-100 rounded-xl text-gray-500">
                    <ArrowUpRight className="w-5 h-5 mb-1" />
                    <span className="text-xs text-center">Withdraw not available</span>
                  </div>
                )}
                <Button
                  variant="secondary"
                  onClick={loadDashboardData}
                  className="flex-col h-auto py-4"
                >
                  <ExternalLink className="w-5 h-5 mb-1" />
                  <span className="text-sm">Refresh</span>
                </Button>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Recent Transactions</h2>
                <button
                  onClick={() => router.push('/transactions')}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View all <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              {recentEvents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No activity yet. Create your first payment link to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentEvents.map((event, index) => (
                    <a
                      key={`${event.txHash}-${index}`}
                      href={!isDemoMode() ? getExplorerTxUrl(event.txHash) : undefined}
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
                          <p className="text-sm text-gray-500">
                            {shortAddr(event.txHash)}
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
          </>
        )}
      </main>

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 z-30 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            {withdrawSuccess ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold mb-2">Withdrawal Confirmed!</h2>
                <p className="text-gray-600 mb-4">
                  {withdrawAmount} {withdrawToken} sent to {shortAddr(withdrawRecipient)}
                </p>
                {withdrawSuccess.txHash && !withdrawSuccess.isDemo && (
                  <a
                    href={getExplorerTxUrl(withdrawSuccess.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline text-sm mb-4"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on BNB Explorer
                  </a>
                )}
                {withdrawSuccess.isDemo && (
                  <p className="text-xs text-yellow-600 mb-4">Demo Mode - No real transaction</p>
                )}
                <Button onClick={() => setShowWithdrawModal(false)} className="w-full">
                  Done
                </Button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Withdraw Funds</h2>
                  <button onClick={() => setShowWithdrawModal(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Token</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setWithdrawToken('USDT')
                          setWithdrawAmount(contractBalanceUSDT)
                        }}
                        className={`flex-1 py-2 px-4 rounded-lg border ${
                          withdrawToken === 'USDT' 
                            ? 'border-primary bg-primary/10 text-primary' 
                            : 'border-gray-200'
                        }`}
                      >
                        USDT ({formatCurrency(contractBalanceUSDT)})
                      </button>
                      <button
                        onClick={() => {
                          setWithdrawToken('FDUSD')
                          setWithdrawAmount(contractBalanceFDUSD)
                        }}
                        className={`flex-1 py-2 px-4 rounded-lg border ${
                          withdrawToken === 'FDUSD' 
                            ? 'border-primary bg-primary/10 text-primary' 
                            : 'border-gray-200'
                        }`}
                      >
                        FDUSD ({formatCurrency(contractBalanceFDUSD)})
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Address</label>
                    <input
                      type="text"
                      value={withdrawRecipient}
                      onChange={(e) => setWithdrawRecipient(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    />
                  </div>

                  {withdrawError && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl">
                      <AlertCircle className="w-5 h-5" />
                      <p className="text-sm">{withdrawError}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleWithdraw}
                    disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                    className="w-full"
                    size="lg"
                  >
                    {isWithdrawing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Withdraw ${withdrawAmount} ${withdrawToken}`
                    )}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

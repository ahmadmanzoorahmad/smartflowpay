import { Contract, JsonRpcProvider, formatUnits, Interface } from 'ethers'
import SmartFlowPayInvoicesABI from './abi/SmartFlowPayInvoices.json'
import {
  INVOICE_CONTRACT_ADDRESS,
  BSC_TESTNET_RPC,
  USDT_ADDRESS,
  FDUSD_ADDRESS,
  isLiveMode,
} from './web3'

export interface ContractEvent {
  type: 'InvoiceCreated' | 'InvoicePaid' | 'Withdrawal'
  invoiceId?: string
  merchant: string
  payer?: string
  to?: string
  token: string
  tokenSymbol: 'USDT' | 'FDUSD'
  amount: string
  note?: string
  txHash: string
  blockNumber: number
  timestamp?: number
}

function resolveTokenSymbol(tokenAddress: string): 'USDT' | 'FDUSD' {
  if (tokenAddress.toLowerCase() === USDT_ADDRESS.toLowerCase()) return 'USDT'
  if (tokenAddress.toLowerCase() === FDUSD_ADDRESS.toLowerCase()) return 'FDUSD'
  return 'USDT'
}

export async function getContractEvents(
  merchantAddress: string,
  blocksBack: number = 50
): Promise<ContractEvent[]> {
  if (!isLiveMode()) {
    return getDemoEvents(merchantAddress)
  }

  try {
    const provider = new JsonRpcProvider(BSC_TESTNET_RPC)
    const contract = new Contract(INVOICE_CONTRACT_ADDRESS, SmartFlowPayInvoicesABI, provider)
    const iface = new Interface(SmartFlowPayInvoicesABI)

    const currentBlock = await provider.getBlockNumber()
    const fromBlock = Math.max(0, currentBlock - blocksBack)

    const events: ContractEvent[] = []

    const [createdLogs, paidLogs, withdrawalLogs] = await Promise.all([
      provider.getLogs({ ...contract.filters.InvoiceCreated(null, merchantAddress), fromBlock, toBlock: 'latest' }),
      provider.getLogs({ ...contract.filters.InvoicePaid(null, merchantAddress), fromBlock, toBlock: 'latest' }),
      provider.getLogs({ ...contract.filters.Withdrawal(merchantAddress), fromBlock, toBlock: 'latest' }),
    ])

    for (const log of createdLogs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
        if (parsed) {
          events.push({
            type: 'InvoiceCreated',
            invoiceId: parsed.args.invoiceId,
            merchant: parsed.args.merchant,
            token: parsed.args.token,
            tokenSymbol: resolveTokenSymbol(parsed.args.token),
            amount: formatUnits(parsed.args.amount, 18),
            note: parsed.args.note,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          })
        }
      } catch (e) {
        console.error('Could not parse InvoiceCreated log:', e)
      }
    }

    for (const log of paidLogs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
        if (parsed) {
          events.push({
            type: 'InvoicePaid',
            invoiceId: parsed.args.invoiceId,
            merchant: parsed.args.merchant,
            payer: parsed.args.payer,
            token: parsed.args.token,
            tokenSymbol: resolveTokenSymbol(parsed.args.token),
            amount: formatUnits(parsed.args.amount, 18),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          })
        }
      } catch (e) {
        console.error('Could not parse InvoicePaid log:', e)
      }
    }

    for (const log of withdrawalLogs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
        if (parsed) {
          events.push({
            type: 'Withdrawal',
            merchant: parsed.args.merchant,
            to: parsed.args.to,
            token: parsed.args.token,
            tokenSymbol: resolveTokenSymbol(parsed.args.token),
            amount: formatUnits(parsed.args.amount, 18),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          })
        }
      } catch (e) {
        console.error('Could not parse Withdrawal log:', e)
      }
    }

    events.sort((a, b) => b.blockNumber - a.blockNumber)
    return events
  } catch (error) {
    console.error('Could not fetch on-chain events:', error)
    return []
  }
}

export async function getTodaysSales(merchantAddress: string): Promise<{ usdt: number; fdusd: number }> {
  if (!isLiveMode()) {
    return getDemoTodaysSales(merchantAddress)
  }

  try {
    const provider = new JsonRpcProvider(BSC_TESTNET_RPC)
    const contract = new Contract(INVOICE_CONTRACT_ADDRESS, SmartFlowPayInvoicesABI, provider)
    const iface = new Interface(SmartFlowPayInvoicesABI)

    const currentBlock = await provider.getBlockNumber()
    const blocksIn24h = Math.floor((24 * 60 * 60) / 3)
    const fromBlock = Math.max(0, currentBlock - blocksIn24h)

    const paidFilter = contract.filters.InvoicePaid(null, merchantAddress)
    const paidLogs = await provider.getLogs({ ...paidFilter, fromBlock, toBlock: 'latest' })

    let usdtTotal = 0
    let fdusdTotal = 0

    for (const log of paidLogs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
        if (parsed) {
          const amount = parseFloat(formatUnits(parsed.args.amount, 18))
          if (parsed.args.token.toLowerCase() === USDT_ADDRESS.toLowerCase()) {
            usdtTotal += amount
          } else if (parsed.args.token.toLowerCase() === FDUSD_ADDRESS.toLowerCase()) {
            fdusdTotal += amount
          }
        }
      } catch (e) {
        console.error('Could not parse payment log:', e)
      }
    }

    return { usdt: usdtTotal, fdusd: fdusdTotal }
  } catch (error) {
    console.error('Could not calculate today\'s sales:', error)
    return { usdt: 0, fdusd: 0 }
  }
}

function getDemoEvents(merchantAddress: string): ContractEvent[] {
  if (typeof window === 'undefined') return []

  const stored = localStorage.getItem('smartflow-demo-invoices')
  if (!stored) return []

  const invoices = JSON.parse(stored)
  const events: ContractEvent[] = []

  Object.values(invoices).forEach((inv: any) => {
    if (inv.merchant.toLowerCase() === merchantAddress.toLowerCase()) {
      events.push({
        type: 'InvoiceCreated',
        invoiceId: inv.invoiceId,
        merchant: inv.merchant,
        token: inv.token,
        tokenSymbol: inv.tokenSymbol,
        amount: inv.amount,
        note: inv.note,
        txHash: '0x' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2),
        blockNumber: Math.floor(Date.now() / 1000),
      })

      if (inv.paid) {
        events.push({
          type: 'InvoicePaid',
          invoiceId: inv.invoiceId,
          merchant: inv.merchant,
          payer: inv.payer,
          token: inv.token,
          tokenSymbol: inv.tokenSymbol,
          amount: inv.amount,
          txHash: '0x' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2),
          blockNumber: Math.floor(Date.now() / 1000) + 1,
        })
      }
    }
  })

  return events.sort((a, b) => b.blockNumber - a.blockNumber)
}

function getDemoTodaysSales(merchantAddress: string): { usdt: number; fdusd: number } {
  if (typeof window === 'undefined') return { usdt: 0, fdusd: 0 }

  const stored = localStorage.getItem('smartflow-demo-invoices')
  if (!stored) return { usdt: 0, fdusd: 0 }

  const invoices = JSON.parse(stored)
  let usdtTotal = 0
  let fdusdTotal = 0
  const oneDayAgo = Math.floor(Date.now() / 1000) - 86400

  Object.values(invoices).forEach((inv: any) => {
    if (inv.merchant.toLowerCase() === merchantAddress.toLowerCase() &&
        inv.paid &&
        inv.paidAt > oneDayAgo) {
      if (inv.tokenSymbol === 'USDT') {
        usdtTotal += parseFloat(inv.amount)
      } else {
        fdusdTotal += parseFloat(inv.amount)
      }
    }
  })

  return { usdt: usdtTotal, fdusd: fdusdTotal }
}

import { parseUnits, formatUnits } from 'ethers'
import {
  isLiveMode,
  isDemoMode,
  getInvoiceContract,
  getTokenContract,
  getTokenAddress,
  INVOICE_CONTRACT_ADDRESS,
  checkAllowance,
} from '../web3'

export interface Invoice {
  invoiceId: string
  merchant: string
  token: string
  tokenSymbol: 'USDT' | 'FDUSD'
  amount: string
  note: string
  createdAt: number
  expiresAt: number
  paid: boolean
  payer: string
  paidAt: number
}

export interface CreateInvoiceParams {
  token: 'USDT' | 'FDUSD'
  amount: string
  note: string
  expiresAt?: number
}

export interface PayInvoiceResult {
  txHash: string
  isDemo: boolean
}

export interface WithdrawResult {
  txHash: string
  isDemo: boolean
}

const DEMO_STORAGE_KEY = 'smartflow-demo-invoices'

function getDemoInvoices(): Record<string, Invoice> {
  if (typeof window === 'undefined') return {}
  const stored = localStorage.getItem(DEMO_STORAGE_KEY)
  return stored ? JSON.parse(stored) : {}
}

function saveDemoInvoices(invoices: Record<string, Invoice>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(invoices))
}

function generateDemoId(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function createInvoice(
  merchantAddress: string,
  params: CreateInvoiceParams
): Promise<{ invoiceId: string; txHash: string; isDemo: boolean }> {
  const tokenAddress = getTokenAddress(params.token)
  const expiresAt = params.expiresAt || 0

  if (isLiveMode()) {
    const contract = await getInvoiceContract()
    if (!contract) throw new Error('Unable to connect to the invoice contract')

    const amountWei = parseUnits(params.amount, 18)
    const tx = await contract.createInvoice(tokenAddress, amountWei, params.note, expiresAt)
    const receipt = await tx.wait()

    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log)
        return parsed?.name === 'InvoiceCreated'
      } catch {
        return false
      }
    })

    if (!event) throw new Error('Invoice creation event not found in transaction')
    const parsed = contract.interface.parseLog(event)
    return { invoiceId: parsed?.args.invoiceId, txHash: receipt.hash, isDemo: false }
  }

  const invoiceId = generateDemoId()
  const invoice: Invoice = {
    invoiceId,
    merchant: merchantAddress,
    token: tokenAddress,
    tokenSymbol: params.token,
    amount: params.amount,
    note: params.note,
    createdAt: Math.floor(Date.now() / 1000),
    expiresAt,
    paid: false,
    payer: '',
    paidAt: 0,
  }

  const invoices = getDemoInvoices()
  invoices[invoiceId] = invoice
  saveDemoInvoices(invoices)

  return { invoiceId, txHash: generateDemoId(), isDemo: true }
}

export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  if (isLiveMode()) {
    const contract = await getInvoiceContract()
    if (!contract) return null

    try {
      const data = await contract.getInvoice(invoiceId)
      if (data.merchant === '0x0000000000000000000000000000000000000000') {
        return null
      }

      const tokenSymbol = data.token.toLowerCase() === getTokenAddress('USDT').toLowerCase()
        ? 'USDT'
        : 'FDUSD'

      return {
        invoiceId: data.invoiceId,
        merchant: data.merchant,
        token: data.token,
        tokenSymbol,
        amount: formatUnits(data.amount, 18),
        note: data.note,
        createdAt: Number(data.createdAt),
        expiresAt: Number(data.expiresAt),
        paid: data.paid,
        payer: data.payer,
        paidAt: Number(data.paidAt),
      }
    } catch {
      return null
    }
  }

  const invoices = getDemoInvoices()
  return invoices[invoiceId] || null
}

export async function payInvoice(
  invoiceId: string,
  payerAddress: string
): Promise<PayInvoiceResult> {
  if (isLiveMode()) {
    const invoice = await getInvoice(invoiceId)
    if (!invoice) throw new Error('Invoice not found')
    if (invoice.paid) throw new Error('This invoice has already been paid')

    const amountWei = parseUnits(invoice.amount, 18)
    const allowance = await checkAllowance(invoice.token, payerAddress, INVOICE_CONTRACT_ADDRESS)

    if (allowance < amountWei) {
      const tokenContract = await getTokenContract(invoice.token)
      if (!tokenContract) throw new Error('Unable to connect to token contract')
      const approveTx = await tokenContract.approve(INVOICE_CONTRACT_ADDRESS, amountWei)
      await approveTx.wait()
    }

    const contract = await getInvoiceContract()
    if (!contract) throw new Error('Unable to connect to the invoice contract')

    const tx = await contract.payInvoice(invoiceId)
    const receipt = await tx.wait()

    return { txHash: receipt.hash, isDemo: false }
  }

  await new Promise(resolve => setTimeout(resolve, 1500))

  const invoices = getDemoInvoices()
  const invoice = invoices[invoiceId]
  if (!invoice) throw new Error('Invoice not found')
  if (invoice.paid) throw new Error('This invoice has already been paid')

  invoice.paid = true
  invoice.payer = payerAddress
  invoice.paidAt = Math.floor(Date.now() / 1000)
  saveDemoInvoices(invoices)

  return { txHash: generateDemoId(), isDemo: true }
}

export async function getMerchantBalance(
  merchantAddress: string,
  token: 'USDT' | 'FDUSD'
): Promise<string> {
  if (isLiveMode()) {
    const contract = await getInvoiceContract()
    if (!contract) return '0'

    try {
      const tokenAddress = getTokenAddress(token)
      const balance = await contract.getMerchantBalance(merchantAddress, tokenAddress)
      return formatUnits(balance, 18)
    } catch {
      return '0'
    }
  }

  const invoices = getDemoInvoices()
  let total = 0
  const tokenAddress = getTokenAddress(token)

  Object.values(invoices).forEach(inv => {
    if (inv.merchant.toLowerCase() === merchantAddress.toLowerCase() &&
        inv.token.toLowerCase() === tokenAddress.toLowerCase() &&
        inv.paid) {
      total += parseFloat(inv.amount)
    }
  })

  return total.toFixed(2)
}

export async function withdraw(
  token: 'USDT' | 'FDUSD',
  amount: string,
  toAddress: string
): Promise<WithdrawResult> {
  if (isLiveMode()) {
    const contract = await getInvoiceContract()
    if (!contract) throw new Error('Unable to connect to the invoice contract')

    const tokenAddress = getTokenAddress(token)
    const amountWei = parseUnits(amount, 18)

    const tx = await contract.withdraw(tokenAddress, amountWei, toAddress)
    const receipt = await tx.wait()

    return { txHash: receipt.hash, isDemo: false }
  }

  await new Promise(resolve => setTimeout(resolve, 1500))
  return { txHash: generateDemoId(), isDemo: true }
}

export async function getMerchantInvoices(merchantAddress: string): Promise<Invoice[]> {
  if (isDemoMode()) {
    const invoices = getDemoInvoices()
    return Object.values(invoices).filter(
      inv => inv.merchant.toLowerCase() === merchantAddress.toLowerCase()
    ).sort((a, b) => b.createdAt - a.createdAt)
  }
  return []
}

export { isLiveMode, isDemoMode }

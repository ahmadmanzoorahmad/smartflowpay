import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PaymentRequest {
  id: string
  amount: string
  token: 'USDT' | 'FDUSD'
  note: string
  merchantAddress: string
  status: 'pending' | 'completed' | 'withdrawn'
  txHash?: string
  createdAt: number
  invoiceId?: string
}

interface PaymentStore {
  payments: PaymentRequest[]
  addPayment: (payment: PaymentRequest) => void
  updatePayment: (id: string, updates: Partial<PaymentRequest>) => void
  getPayment: (id: string) => PaymentRequest | undefined
}

export const usePaymentStore = create<PaymentStore>()(
  persist(
    (set, get) => ({
      payments: [],
      addPayment: (payment) =>
        set((state) => ({ payments: [...state.payments, payment] })),
      updatePayment: (id, updates) =>
        set((state) => ({
          payments: state.payments.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      getPayment: (id) => get().payments.find((p) => p.id === id),
    }),
    {
      name: 'smartflow-payments',
    }
  )
)

export function generatePaymentId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export const INVOICE_CONTRACT_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    inputs: [],
    name: "InsufficientBalance",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidAmount",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidRecipient",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidToken",
    type: "error"
  },
  {
    inputs: [],
    name: "InvoiceAlreadyExists",
    type: "error"
  },
  {
    inputs: [],
    name: "InvoiceAlreadyPaid",
    type: "error"
  },
  {
    inputs: [],
    name: "InvoiceExpired",
    type: "error"
  },
  {
    inputs: [],
    name: "InvoiceNotFound",
    type: "error"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "invoiceId", type: "bytes32" },
      { indexed: true, internalType: "address", name: "merchant", type: "address" },
      { indexed: false, internalType: "address", name: "token", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "string", name: "note", type: "string" },
      { indexed: false, internalType: "uint256", name: "expiresAt", type: "uint256" }
    ],
    name: "InvoiceCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "invoiceId", type: "bytes32" },
      { indexed: true, internalType: "address", name: "merchant", type: "address" },
      { indexed: true, internalType: "address", name: "payer", type: "address" },
      { indexed: false, internalType: "address", name: "token", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "InvoicePaid",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "merchant", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: false, internalType: "address", name: "token", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "Withdrawal",
    type: "event"
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "string", name: "note", type: "string" },
      { internalType: "uint256", name: "expiresAt", type: "uint256" }
    ],
    name: "createInvoice",
    outputs: [{ internalType: "bytes32", name: "invoiceId", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "invoiceId", type: "bytes32" }],
    name: "getInvoice",
    outputs: [
      {
        components: [
          { internalType: "bytes32", name: "invoiceId", type: "bytes32" },
          { internalType: "address", name: "merchant", type: "address" },
          { internalType: "address", name: "token", type: "address" },
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "string", name: "note", type: "string" },
          { internalType: "uint256", name: "createdAt", type: "uint256" },
          { internalType: "uint256", name: "expiresAt", type: "uint256" },
          { internalType: "bool", name: "paid", type: "bool" },
          { internalType: "address", name: "payer", type: "address" },
          { internalType: "uint256", name: "paidAt", type: "uint256" }
        ],
        internalType: "struct SmartFlowPayInvoices.Invoice",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "merchant", type: "address" },
      { internalType: "address", name: "token", type: "address" }
    ],
    name: "getMerchantBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "merchant", type: "address" }],
    name: "getMerchantNonce",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "invoiceId", type: "bytes32" }],
    name: "payInvoice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "to", type: "address" }
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const

export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const

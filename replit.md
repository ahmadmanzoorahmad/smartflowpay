# SmartFlow Pay

## Overview
A Next.js merchant stablecoin payment application for BNB Chain Testnet. Enables merchants to receive USDT and FDUSD payments with wallet integration and on-chain invoice management. Supports both Demo Mode (localStorage) and Live Mode (on-chain contract).

## Tech Stack
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Wallet Integration**: wagmi + viem + ethers.js
- **State Management**: Zustand
- **UI Components**: Custom components with Lucide icons
- **Smart Contracts**: Solidity 0.8.20 + Hardhat
- **Deployment**: Netlify-ready with @netlify/plugin-nextjs

## Project Structure
```
/app                 - Next.js App Router pages
  /dashboard         - Merchant dashboard (sales, balance, transactions)
  /create            - Create payment links / invoices
  /pay/[id]          - Customer payment page
  /tx/[hash]         - Transaction confirmation
  /transactions      - Full transaction history
/components          - Reusable UI components (Button, Card, Logo, Providers, WalletConnectButton)
/lib                 - Utilities, wagmi config, Zustand store, web3 helpers
  /abi               - Contract ABI JSON
  /contracts         - TypeScript contract ABI definitions
  /invoice           - Invoice client (create, pay, withdraw, get)
/public              - Static assets (logo)
/contracts           - Smart contract workspace (Hardhat)
```

## Key Features
- Wallet connection (MetaMask / WalletConnect)
- BNB Chain Testnet enforcement with automatic network switching
- On-chain invoice creation with InvoiceCreated event extraction
- Payment link generation with QR codes
- ERC20 approval + payInvoice flow
- Dashboard with on-chain event-driven data (provider.getLogs)
- Merchant balance display and withdrawal
- Transaction history from InvoiceCreated, InvoicePaid, Withdrawal events
- Demo Mode fallback with localStorage when no contract address is set

## Smart Contract (SmartFlowPayInvoices)
- **Address**: 0x5dCf6eB4D0743a85e06C2566edC221615fd1ff6a (BNB Chain Testnet)
- `createInvoice(token, amount, note, expiresAt)` - Create invoice
- `payInvoice(invoiceId)` - Pay an invoice
- `withdraw(token, amount, to)` - Withdraw merchant balance
- `getInvoice(invoiceId)` - View invoice details
- `getMerchantBalance(merchant, token)` - Check balance

## Environment Variables
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - WalletConnect project ID
- `NEXT_PUBLIC_USDT_ADDRESS` - USDT token contract address
- `NEXT_PUBLIC_FDUSD_ADDRESS` - FDUSD token contract address
- `NEXT_PUBLIC_INVOICE_CONTRACT_ADDRESS` - Invoice contract address (empty = Demo Mode)
- `NEXT_PUBLIC_BSC_RPC` - BSC Testnet RPC URL
- `NEXT_PUBLIC_BSC_EXPLORER` - BSC Testnet explorer URL

## Development
- Start: `npm run dev` (runs on port 5000)
- Build: `npm run build`

## Deployment
### Netlify
- `netlify.toml` is pre-configured
- Uses `@netlify/plugin-nextjs` for SSR support
- Set environment variables in Netlify dashboard
- Push to Git and connect repo in Netlify

### Replit
- Use the built-in deployment tools
- Frontend binds to 0.0.0.0:5000

## Pages
1. `/` - Landing page with wallet connect and demo option
2. `/dashboard` - Merchant dashboard with sales, balance, transactions
3. `/create` - Create payment links with QR codes
4. `/pay/[id]` - Customer payment page
5. `/tx/[hash]` - Transaction confirmation page
6. `/transactions` - Full transaction history with search and filters

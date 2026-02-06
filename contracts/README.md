# SmartFlow Pay - Smart Contracts

Invoice-based payment smart contracts for stablecoins (USDT, FDUSD) on BNB Chain.

## Overview

The `SmartFlowPayInvoices` contract enables:
- Merchants to create invoices for stablecoin payments
- Customers to pay invoices directly on-chain
- Merchants to withdraw their earned funds
- Event-based tracking for payment status updates

## Prerequisites

- Node.js 18+
- npm or yarn

## Setup

```bash
# From the project root, navigate to contracts folder
cd contracts

# Install dependencies
npm install

# Copy environment file and add your private key
cp .env.example .env
```

Edit `.env` and add your private key:
```
PRIVATE_KEY=your_private_key_without_0x_prefix
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
BSC_MAINNET_RPC=https://bsc-dataseed1.binance.org
```

## Commands

### Compile Contracts
```bash
npx hardhat compile
```

### Run Tests
```bash
npx hardhat test
```

### Deploy to BSC Testnet
```bash
npx hardhat run scripts/deploy.js --network bsctest
```

### Deploy to BSC Mainnet
```bash
npx hardhat run scripts/deploy.js --network bsc
```

## Contract Functions

### For Merchants

#### `createInvoice(token, amount, note, expiresAt)`
Creates a new invoice for payment.
- `token`: ERC20 token address (USDT, FDUSD)
- `amount`: Payment amount in token units
- `note`: Order ID or description
- `expiresAt`: Expiration timestamp (0 = never expires)
- Returns: `invoiceId` (bytes32)

#### `withdraw(token, amount, to)`
Withdraws earned tokens to a specified address.
- Only withdraws from your own merchant balance
- Balance is updated when customers pay invoices

### For Customers

#### `payInvoice(invoiceId)`
Pays an invoice by transferring tokens.
- Customer must approve the contract to spend tokens first
- Tokens are held in the contract until merchant withdraws

### View Functions

#### `getInvoice(invoiceId)`
Returns all invoice details including payment status.

#### `getMerchantBalance(merchant, token)`
Returns merchant's available balance for a token.

## Frontend Integration

### 1. Create Invoice (Merchant)
```javascript
const tx = await contract.createInvoice(
  USDT_ADDRESS,
  ethers.parseUnits("100", 18), // 100 USDT
  "Order #12345",
  0 // No expiration
);
const receipt = await tx.wait();
const invoiceId = receipt.logs[0].args.invoiceId;

// Generate payment link/QR with invoiceId
const paymentUrl = `https://yourapp.com/pay/${invoiceId}`;
```

### 2. Pay Invoice (Customer)
```javascript
// First approve the contract
await usdtContract.approve(CONTRACT_ADDRESS, amount);

// Then pay the invoice
const tx = await contract.payInvoice(invoiceId);
const receipt = await tx.wait();

// Get transaction hash for confirmation
const txHash = receipt.hash;
```

### 3. Check Payment Status
```javascript
const invoice = await contract.getInvoice(invoiceId);
if (invoice.paid) {
  console.log("Invoice paid by:", invoice.payer);
  console.log("Paid at:", new Date(Number(invoice.paidAt) * 1000));
}
```

### 4. Listen for Events
```javascript
contract.on("InvoicePaid", (invoiceId, merchant, payer, token, amount) => {
  console.log(`Invoice ${invoiceId} paid by ${payer}`);
  // Update UI, send notification, etc.
});
```

## Events

| Event | Parameters |
|-------|------------|
| `InvoiceCreated` | invoiceId, merchant, token, amount, note, expiresAt |
| `InvoicePaid` | invoiceId, merchant, payer, token, amount |
| `Withdrawal` | merchant, to, token, amount |

## Security Features

- **ReentrancyGuard**: Protects against reentrancy attacks
- **SafeERC20**: Safe token transfers
- **Access Control**: Only merchants can withdraw their own funds
- **Expiration**: Invoices can have optional expiration times

## Network Information

### BSC Testnet (ChainId: 97)
- RPC: `https://data-seed-prebsc-1-s1.binance.org:8545`
- Explorer: `https://testnet.bscscan.com`
- Faucet: `https://testnet.binance.org/faucet-smart`

### BSC Mainnet (ChainId: 56)
- RPC: `https://bsc-dataseed1.binance.org`
- Explorer: `https://bscscan.com`

## License

MIT

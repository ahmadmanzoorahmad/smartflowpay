export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function getExplorerUrl(txHash: string): string {
  return `https://testnet.bscscan.com/tx/${txHash}`
}

export function getAddressExplorerUrl(address: string): string {
  return `https://testnet.bscscan.com/address/${address}`
}

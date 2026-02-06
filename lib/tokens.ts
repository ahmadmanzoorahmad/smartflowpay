export const TOKENS = {
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    address: process.env.NEXT_PUBLIC_USDT_ADDRESS || '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
    decimals: 18,
  },
  FDUSD: {
    symbol: 'FDUSD',
    name: 'First Digital USD',
    address: process.env.NEXT_PUBLIC_FDUSD_ADDRESS || '0x7c9e73d4C71dae564d41F78d56439bB4ba87592f',
    decimals: 18,
  },
} as const

export type TokenSymbol = keyof typeof TOKENS

export function getTokenInfo(symbol: TokenSymbol) {
  return TOKENS[symbol]
}

export function getTokenAddressForSymbol(symbol: TokenSymbol): string {
  return TOKENS[symbol].address
}

export function getTokenSymbolForAddress(address: string): TokenSymbol | null {
  const lowerAddress = address.toLowerCase()
  if (lowerAddress === TOKENS.USDT.address.toLowerCase()) return 'USDT'
  if (lowerAddress === TOKENS.FDUSD.address.toLowerCase()) return 'FDUSD'
  return null
}

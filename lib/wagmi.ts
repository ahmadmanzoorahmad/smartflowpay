import { http, createConfig } from 'wagmi'
import { bscTestnet } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo'

export const config = createConfig({
  chains: [bscTestnet],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [bscTestnet.id]: http(),
  },
})

export const USDT_ADDRESS = process.env.NEXT_PUBLIC_USDT_ADDRESS || '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'
export const FDUSD_ADDRESS = process.env.NEXT_PUBLIC_FDUSD_ADDRESS || '0x7c9e73d4C71dae564d41F78d56439bB4ba87592f'

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
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const

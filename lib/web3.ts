import { BrowserProvider, Contract, JsonRpcSigner, formatUnits, parseUnits } from 'ethers'
import SmartFlowPayInvoicesABI from './abi/SmartFlowPayInvoices.json'

export const BSC_TESTNET = {
  chainId: 97,
  chainIdHex: '0x61',
  name: 'BNB Smart Chain Testnet',
  rpcUrl: process.env.NEXT_PUBLIC_BSC_RPC || 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  explorerUrl: process.env.NEXT_PUBLIC_BSC_EXPLORER || 'https://testnet.bscscan.com',
  nativeCurrency: {
    name: 'tBNB',
    symbol: 'tBNB',
    decimals: 18,
  },
}

export const BSC_TESTNET_CHAIN_ID = BSC_TESTNET.chainId
export const BSC_TESTNET_RPC = BSC_TESTNET.rpcUrl
export const BSC_TESTNET_EXPLORER = BSC_TESTNET.explorerUrl

export const INVOICE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_INVOICE_CONTRACT_ADDRESS || ''
export const USDT_ADDRESS = process.env.NEXT_PUBLIC_USDT_ADDRESS || '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'
export const FDUSD_ADDRESS = process.env.NEXT_PUBLIC_FDUSD_ADDRESS || '0x7c9e73d4C71dae564d41F78d56439bB4ba87592f'

export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
]

export function isLiveMode(): boolean {
  return !!INVOICE_CONTRACT_ADDRESS && INVOICE_CONTRACT_ADDRESS.length === 42
}

export function isDemoMode(): boolean {
  return !isLiveMode()
}

export function shortAddr(addr: string): string {
  if (!addr) return ''
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function shortenAddress(address: string): string {
  return shortAddr(address)
}

export function getTokenAddress(token: 'USDT' | 'FDUSD'): string {
  return token === 'USDT' ? USDT_ADDRESS : FDUSD_ADDRESS
}

export function getExplorerTxUrl(txHash: string): string {
  return `${BSC_TESTNET_EXPLORER}/tx/${txHash}`
}

export function getExplorerAddressUrl(address: string): string {
  return `${BSC_TESTNET_EXPLORER}/address/${address}`
}

export function getEthereum(): any {
  if (typeof window === 'undefined') return null
  return window.ethereum || null
}

export async function switchToBscTestnet(): Promise<boolean> {
  const ethereum = getEthereum()
  if (!ethereum) return false

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BSC_TESTNET.chainIdHex }],
    })
    return true
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: BSC_TESTNET.chainIdHex,
              chainName: BSC_TESTNET.name,
              nativeCurrency: BSC_TESTNET.nativeCurrency,
              rpcUrls: [BSC_TESTNET.rpcUrl],
              blockExplorerUrls: [BSC_TESTNET.explorerUrl],
            },
          ],
        })
        return true
      } catch {
        return false
      }
    }
    return false
  }
}

export async function connectWallet(): Promise<string | null> {
  const ethereum = getEthereum()
  if (!ethereum) return null

  try {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
    await switchToBscTestnet()
    return accounts[0] || null
  } catch {
    return null
  }
}

export async function getProvider(): Promise<BrowserProvider | null> {
  const ethereum = getEthereum()
  if (!ethereum) return null
  return new BrowserProvider(ethereum)
}

export async function getSigner(): Promise<JsonRpcSigner | null> {
  const provider = await getProvider()
  if (!provider) return null
  return provider.getSigner()
}

export async function getCurrentChainId(): Promise<number | null> {
  const provider = await getProvider()
  if (!provider) return null
  const network = await provider.getNetwork()
  return Number(network.chainId)
}

export async function isCorrectNetwork(): Promise<boolean> {
  const chainId = await getCurrentChainId()
  return chainId === BSC_TESTNET_CHAIN_ID
}

export async function getInvoiceContract(signerOrProvider?: JsonRpcSigner | BrowserProvider): Promise<Contract | null> {
  if (!isLiveMode()) return null

  let provider = signerOrProvider
  if (!provider) {
    provider = await getSigner() || undefined
  }
  if (!provider) return null

  return new Contract(INVOICE_CONTRACT_ADDRESS, SmartFlowPayInvoicesABI, provider)
}

export async function getTokenContract(tokenAddress: string): Promise<Contract | null> {
  const signer = await getSigner()
  if (!signer) return null
  return new Contract(tokenAddress, ERC20_ABI, signer)
}

export async function getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
  try {
    const provider = await getProvider()
    if (!provider) return '0'
    const contract = new Contract(tokenAddress, ERC20_ABI, provider)
    const balance = await contract.balanceOf(walletAddress)
    return formatUnits(balance, 18)
  } catch {
    return '0'
  }
}

export async function approveToken(
  tokenAddress: string,
  spenderAddress: string,
  amount: string
): Promise<string> {
  const contract = await getTokenContract(tokenAddress)
  if (!contract) throw new Error('Could not connect to token contract')

  const amountWei = parseUnits(amount, 18)
  const tx = await contract.approve(spenderAddress, amountWei)
  const receipt = await tx.wait()
  return receipt.hash
}

export async function checkAllowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string
): Promise<bigint> {
  try {
    const provider = await getProvider()
    if (!provider) return BigInt(0)
    const contract = new Contract(tokenAddress, ERC20_ABI, provider)
    return await contract.allowance(ownerAddress, spenderAddress)
  } catch {
    return BigInt(0)
  }
}

export function formatAmount(amount: string | bigint, decimals: number = 18): string {
  if (typeof amount === 'bigint') {
    return formatUnits(amount, decimals)
  }
  return amount
}

declare global {
  interface Window {
    ethereum?: any
  }
}

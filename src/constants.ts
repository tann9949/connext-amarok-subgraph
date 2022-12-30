import { TypedMap } from "@graphprotocol/graph-ts"

export const ETHEREUM_MAINNET = "Ethereum Mainnet"
export const OPTIMISM = "Optimistic Ethereum"
export const BNB_CHAIN = "Binance Smart Chain Mainnet"
export const XDAI = "xDAI Chain"
export const MATIC_MAINNET = "Matic Mainnet"
export const MOONBEAM = "Moonbeam"  // no remote added
export const MILKOMEDA_C1 = "Milkomeda Cardano (C1)"  // thegraph not supported
export const EVMOS = "Evmos"  // thegraph not supported
export const ARBITRUM_ONE = "Arbitrum One"

export let domainLookupTable = new TypedMap<string, string>();
domainLookupTable.set("6648936", ETHEREUM_MAINNET)
domainLookupTable.set("1869640809", OPTIMISM)
domainLookupTable.set("6450786", BNB_CHAIN)
domainLookupTable.set("6778479", XDAI)
domainLookupTable.set("1886350457", MATIC_MAINNET)
domainLookupTable.set("1650811245", MOONBEAM)
domainLookupTable.set("25393", MILKOMEDA_C1)
domainLookupTable.set("4441", EVMOS)
domainLookupTable.set("1634886255", ARBITRUM_ONE)

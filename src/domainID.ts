export function lookupDomainID(domainID: string): string {
    if (domainID == "6648936") {
        return "Ethereum Mainnet"
    } else if (domainID == "1869640809") {
        return "Optimistic Ethereum"
    } else if (domainID == "6450786") {
        return "Binance Smart Chain Mainnet"
    } else if (domainID == "6778479") {
        return "xDAI Chain"
    } else if (domainID == "1886350457") {
        return "Matic Mainnet"
    } else if (domainID == "1650811245") {
        return "Moonbeam"
    } else if (domainID == "25393") {
        return "Milkomeda Cardano (C1)"
    } else if (domainID == "4441") {
        return "Evmos Testnet"
    } else if (domainID == "1634886255") {
        return "Arbitrum One"
    } else {
        return domainID
    }
}
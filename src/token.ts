import { Address, BigInt } from "@graphprotocol/graph-ts"
import { ERC20Contract } from "../generated/ERC20Contract/ERC20Contract"
import { Token } from "../generated/schema"

export function loadToken(tokenAddress: Address): Token {
    const token = new Token(tokenAddress.toHex())

    const contract = ERC20Contract.bind(tokenAddress)
    const symbol = contract.symbol()
    const name = contract.name()
    const decimals = contract.decimals()

    token.symbol = symbol
    token.name = name
    token.decimals = BigInt.fromI32(decimals)
    return token
}
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { RouterLiquidityAdded, RouterLiquidityRemoved, RouterAdded, RouterRemoved, RouterInitialized } from "../generated/Routers/RouterFacet"
import { AddLiquidityTransaction, Router, Token } from "../generated/schema";
import { loadToken } from "./token";

export function handleRouterAdded(event: RouterAdded): void {
    const id = event.params.router.toHex()

    let router = Router.load(id)
    if (router == null) {
        // if router doesn't exists
        // add one
        const router = new Router(id)
        router.approved = true
        router.tokens = []
        router.balances = []

        router.save()
    } else if (router.id != id) {
        // router id doesn't match specified id
        router.approver = event.params.caller.toHex()
        router.save()
    }
}

export function handleRouterRemoved(event: RouterRemoved): void {
    const id = event.params.router.toHex()
    const router = Router.load(id)

    if (router) {
        // if router not null
        router.approver = null
        router.approved = false
        router.save()
    }
}

export function handleRouterInitialized(event: RouterInitialized): void {
    const id = event.params.router

    const router = new Router(id.toHex())
    router.approved = false
    router.tokens = []
    router.balances = []

    router.save()
}


export function handleRouterLiquidityAdded(event: RouterLiquidityAdded): void {
    const routerAddress: Address = event.params.router
    const addedTokenAddress: Address = event.params.local
    const key: Bytes = event.params.key  // keccak256(abi.encode(cannonicalID, cannonicalDomain))
    const amount: BigInt = event.params.amount
    const caller: Address = event.params.caller

    let router = Router.load(routerAddress.toHex())
    let token = Token.load(addedTokenAddress.toHex())

    if (router == null) {
        // router is not declared
        // ignored
        return
    }

    if (!router.approved) {
        // if not approved
        // ignored
        return
    }

    if (token == null) {
        // declear token if not added
        token = loadToken(addedTokenAddress)
        token.save()
    }

    // save tx subgraph
    const txid = event.transaction.hash.toHex()
    const tx = new AddLiquidityTransaction(txid)
    tx.liquidityProvider = caller.toHex()
    tx.amount = amount
    tx.token = token.id
    tx.router = router.id
    tx.save()

    // update router's liquidity
    if (router.tokens == null) {
        // if somehow router tokens is null
        router.tokens = []
    }

    if (router.balances == null) {
        // if somehow router balances is null
        router.balances = []
    }

    if (router.tokens!.includes(token.id)) {
        // if token exists in list
        const tokenIdx: i32 = router.tokens!.indexOf(token.id)
        const currTokenBalance: BigInt = router.balances![tokenIdx]
        const newBalance: BigInt = currTokenBalance.plus(amount)

        router.balances![tokenIdx] = newBalance
        router.save()
    } else {
        // router hasn't add this token before
        const currTokens = router.tokens
        const currBalances = router.balances
        // push to new index
        currTokens!.push(token.id)
        currBalances!.push(amount)

        router.tokens = currTokens
        router.balances =  currBalances

        router.save()
    }
}

export function handleRouterLiquidityRemoved(event: RouterLiquidityRemoved): void {
    const routerAddress: Address = event.params.router
    const addedTokenAddress: Address = event.params.local
    const key: Bytes = event.params.key  // keccak256(abi.encode(cannonicalID, cannonicalDomain))
    const amount: BigInt = event.params.amount
    const caller: Address = event.params.caller

    let router = Router.load(routerAddress.toHex())
    let token = Token.load(addedTokenAddress.toHex())

    if (router == null) {
        // router is not declared
        // ignored
        return
    }

    if (!router.approved) {
        // if router not approved
        return
    }

    if (token == null) {
        // declear token if not added
        token = loadToken(addedTokenAddress)
        token.save()
    }

    // save tx subgraph
    const txid = event.transaction.hash.toHex()
    const tx = new AddLiquidityTransaction(txid)
    tx.liquidityProvider = caller.toHex()
    tx.amount = amount
    tx.token = token.id
    tx.router = router.id
    tx.save()

    // update router's liquidity
    if (router.tokens == null || router.balances == null) {
        // if somehow router tokens or balances is null
        // do noting, cannot deduct if token doesn't exists
        return 
    }

    if (router.tokens!.includes(token.id)) {
        // if token exists in list
        const tokenIdx: i32 = router.tokens!.indexOf(token.id)
        const currTokenBalance: BigInt = router.balances![tokenIdx]
        const newBalance: BigInt = currTokenBalance.minus(amount)

        router.balances![tokenIdx] = newBalance

        router.save()
    } 
}

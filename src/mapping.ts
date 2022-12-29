import { Address, BigInt, Bytes, store, log } from "@graphprotocol/graph-ts";
import { XcallCall, AddSequencerCall, RemoveSequencerCall, RemoteAdded } from "../generated/Bridges/BridgeFacet"
import { ERC20Contract} from "../generated/ERC20Contract/ERC20Contract"
import { AddRelayerCall, RemoveRelayerCall } from "../generated/Relayers/RelayerFacet"
import { RouterLiquidityAdded, RouterLiquidityRemoved, RouterAdded, RouterRemoved, RouterInitialized } from "../generated/Routers/RouterFacet"
import { ArbitraryMessageTransaction, BridgeTransaction, Relayer, Token, Sequencer, Remote, Router, AddLiquidityTransaction } from "../generated/schema"
import { lookupDomainID } from "./domainID";


function loadToken(tokenAddress: Address): Token {
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


export function handleXCallTransaction(event: XcallCall): void {
    const id = event.transaction.hash.toHex();

    const domainID: string = event.inputs._destination.toString()
    const destChain = lookupDomainID(domainID)
    const sourceChain: string = "Ethereum Mainnet"

    if (event.inputs._amount == new BigInt(0)) {
        // arbitrary message passing
        const ampTx = new ArbitraryMessageTransaction(id);

        ampTx.sourceChain = sourceChain
        ampTx.destinationChain = destChain
        ampTx.to = event.inputs._to
        ampTx.callData = event.inputs._callData
        ampTx.destinationDomain = event.inputs._destination

        ampTx.save()
    } else {
        // bridge events
        const bridgeTx = new BridgeTransaction(id);
        const tokenAddress = event.inputs._asset

        let token = Token.load(tokenAddress.toHex())
        if (token == null) {
            // token not added to the database
            token = loadToken(tokenAddress)
            token.save()
        }

        bridgeTx.sourceChain = sourceChain
        bridgeTx.destinationChain = destChain
        bridgeTx.to = event.inputs._to
        bridgeTx.delegate = event.inputs._delegate
        bridgeTx.amount =  event.inputs._amount
        bridgeTx.slippage = event.inputs._slippage
        bridgeTx.callData = event.inputs._callData
        bridgeTx.asset = token.id
        bridgeTx.destinationDomain = event.inputs._destination

        bridgeTx.save()
    }
    
}

export function handleAddRelayer(event: AddRelayerCall): void {
    const id = event.inputs._relayer
    const relayer = new Relayer(id.toHex())
    relayer.save()
}

export function handleRemoveRelayer(event: RemoveRelayerCall): void {
    const id = event.inputs._relayer.toHex()
    let relayer = Relayer.load(id)
    if (relayer) {
        // if not null
        store.remove("Relayer", id)
    }
}

export function handleRemoteAdded(event: RemoteAdded): void {
    const id = event.params.remote.toHex()  // remote addres
    const domainID = event.params.domain
    const caller = event.params.caller
    const sourceChain: string = "Ethereum Mainnet"

    let remote = Remote.load(id)
    if (remote == null || remote.id != id) {
        // update only if null
        remote = new Remote(id)
        remote.originChain = sourceChain
        remote.remoteChain = lookupDomainID(domainID.toString())
        remote.caller = caller.toHex()

        remote.save()
    }
}

export function handleAddSequencer(event: AddSequencerCall): void {
    const id = event.inputs._sequencer
    const sequencer = new Sequencer(id.toHex())
    sequencer.save()
}

export function handleRemoveSequencer(event: RemoveSequencerCall): void {
    const id = event.inputs._sequencer.toHex()
    let sequencer = Sequencer.load(id)
    if (sequencer) {
        // if not null
        store.remove("Sequencer", id)
    }
}

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

import { BigInt, store } from "@graphprotocol/graph-ts";
import { AddSequencerCall, RemoteAdded, RemoveSequencerCall, XcallCall } from "../generated/Bridges/BridgeFacet";
import { ArbitraryMessageTransaction, BridgeTransaction, Remote, Sequencer, Token } from "../generated/schema";
import { domainLookupTable } from "./constants";
import { loadToken } from "./token";
import { BridgeFacet } from "../generated/Bridges/BridgeFacet"


export function handleXCallTransaction(event: XcallCall): void {
    const id = event.transaction.hash.toHex();

    const currDomain = BridgeFacet.bind(event.to).domain().toString()
    let sourceChain = domainLookupTable.get(currDomain)
    if (sourceChain == null) {
        sourceChain = currDomain
    }

    const domainID: string = event.inputs._destination.toString()
    let destChain = domainLookupTable.get(domainID)
    if (destChain == null) {
        destChain = domainID  // default as ID
    }

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

export function handleRemoteAdded(event: RemoteAdded): void {
    const id = event.params.remote.toHex()  // remote addres
    const domainID = event.params.domain
    const caller = event.params.caller
    
    const currDomain = BridgeFacet.bind(event.address).domain().toString()
    let sourceChain = domainLookupTable.get(currDomain)
    if (sourceChain == null) {
        sourceChain = currDomain
    }

    let remote = Remote.load(id)
    if (remote == null || remote.id != id) {
        // update only if null
        remote = new Remote(id)
        remote.originChain = sourceChain
        remote.remoteChain = domainLookupTable.get(domainID.toString())
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
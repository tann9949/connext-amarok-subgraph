import { BigInt, store } from "@graphprotocol/graph-ts";
import { XcallCall, AddSequencerCall, RemoveSequencerCall } from "../generated/Bridges/BridgeFacet"
import { ERC20Contract} from "../generated/ERC20Contract/ERC20Contract"
import { AddRelayerCall, RemoveRelayerCall, RemoveRelayerCall } from "../generated/Relayers/RelayerFacet"
import { ArbitraryMessageTransaction, BridgeTransaction, Relayer, Token, Sequencer } from "../generated/schema"
import { lookupDomainID } from "./domainID";


export function handleXCallTransaction(event: XcallCall): void {
    const id = event.transaction.hash.toHex();

    const domainID: string = event.inputs._destination.toString()
    const destChain = lookupDomainID(domainID)

    if (event.inputs._amount == new BigInt(0)) {
        // arbitrary message passing
        const ampTx = new ArbitraryMessageTransaction(id);

        ampTx.destinationChain = destChain
        ampTx.to = event.inputs._to
        ampTx.callData = event.inputs._callData

        ampTx.save()
    } else {
        // bridge events
        const bridgeTx = new BridgeTransaction(id);
        const tokenAddress = event.inputs._asset

        let token = Token.load(tokenAddress.toHex())
        if (!token) {
            // token not added to the database
            token = new Token(tokenAddress.toHex())

            const contract = ERC20Contract.bind(tokenAddress)
            const symbol = contract.symbol()
            const name = contract.name()
            const decimals = contract.decimals()

            token.symbol = symbol
            token.name = name
            token.decimals = BigInt.fromI32(decimals)

            token.save()
        }

        bridgeTx.destinationChain = destChain
        bridgeTx.to = event.inputs._to
        bridgeTx.delegate = event.inputs._delegate
        bridgeTx.amount =  event.inputs._amount
        bridgeTx.slippage = event.inputs._slippage
        bridgeTx.callData = event.inputs._callData
        bridgeTx.asset = token.id

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
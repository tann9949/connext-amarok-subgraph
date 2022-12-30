import { store } from "@graphprotocol/graph-ts"
import { AddRelayerCall, RemoveRelayerCall } from "../generated/Relayers/RelayerFacet"
import { Relayer } from "../generated/schema"

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
/* eslint-disable @typescript-eslint/ban-types */
import { Address, BigInt, Bytes, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as/assembly/index';
import { LiquidationExecuted } from '../../generated/templates/LiquidationLogic/LiquidationLogic';

export function createLiquidationExecutedEvent(
    user: Address,
    collateralCcy: Bytes,
    debtCcy: Bytes,
    debtMaturity: BigInt,
    debtAmount: BigInt
): LiquidationExecuted {
    const mockEvent = newMockEvent();
    const event = new LiquidationExecuted(
        mockEvent.address,
        mockEvent.logIndex,
        mockEvent.transactionLogIndex,
        mockEvent.logType,
        mockEvent.block,
        mockEvent.transaction,
        mockEvent.parameters,
        mockEvent.receipt
    );

    event.parameters = new Array();
    event.parameters.push(
        new ethereum.EventParam('user', ethereum.Value.fromAddress(user))
    );
    event.parameters.push(
        new ethereum.EventParam(
            'collateralCcy',
            ethereum.Value.fromBytes(collateralCcy)
        )
    );
    event.parameters.push(
        new ethereum.EventParam('debtCcy', ethereum.Value.fromBytes(debtCcy))
    );
    event.parameters.push(
        new ethereum.EventParam(
            'debtMaturity',
            ethereum.Value.fromUnsignedBigInt(debtMaturity)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'debtAmount',
            ethereum.Value.fromUnsignedBigInt(debtAmount)
        )
    );
    return event;
}

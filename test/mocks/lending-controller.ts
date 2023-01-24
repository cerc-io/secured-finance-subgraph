import { Address, BigInt, Bytes, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as/assembly/index';
import {
    CreateLendingMarket,
    RotateLendingMarkets,
} from '../../generated/LendingMarketController/LendingMarketController';

export function createCreateLendingMarketEvent(
    ccy: Bytes,
    lendingMarketAddress: Address,
    futureValueVault: Address,
    index: BigInt,
    maturity: BigInt
): CreateLendingMarket {
    const mockEvent = changetype<CreateLendingMarket>(newMockEvent());
    const event = new CreateLendingMarket(
        mockEvent.address,
        mockEvent.logIndex,
        mockEvent.transactionLogIndex,
        mockEvent.logType,
        mockEvent.block,
        mockEvent.transaction,
        mockEvent.parameters,
        mockEvent.receipt
    );
    event.parameters = [];

    event.parameters.push(
        new ethereum.EventParam('ccy', ethereum.Value.fromBytes(ccy))
    );
    event.parameters.push(
        new ethereum.EventParam(
            'marketAddr',
            ethereum.Value.fromAddress(lendingMarketAddress)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'futureValueVault',
            ethereum.Value.fromAddress(futureValueVault)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'index',
            ethereum.Value.fromUnsignedBigInt(index)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'maturity',
            ethereum.Value.fromUnsignedBigInt(maturity)
        )
    );

    return event;
}

export function createRotateLendingMarketsEvent(
    ccy: Bytes,
    oldMaturity: BigInt,
    newMaturity: BigInt
): RotateLendingMarkets {
    const mockEvent = changetype<RotateLendingMarkets>(newMockEvent());
    const event = new RotateLendingMarkets(
        mockEvent.address,
        mockEvent.logIndex,
        mockEvent.transactionLogIndex,
        mockEvent.logType,
        mockEvent.block,
        mockEvent.transaction,
        mockEvent.parameters,
        mockEvent.receipt
    );

    event.parameters = [];

    event.parameters.push(
        new ethereum.EventParam('ccy', ethereum.Value.fromBytes(ccy))
    );

    event.parameters.push(
        new ethereum.EventParam(
            'oldMaturity',
            ethereum.Value.fromUnsignedBigInt(oldMaturity)
        )
    );

    event.parameters.push(
        new ethereum.EventParam(
            'newMaturity',
            ethereum.Value.fromUnsignedBigInt(newMaturity)
        )
    );

    return event;
}

export function toArrayString(array: Array<string>): string {
    return `[${array.map<string>(item => item.toString()).join(', ')}]`;
}

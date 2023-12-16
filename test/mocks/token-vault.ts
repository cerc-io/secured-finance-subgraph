/* eslint-disable @typescript-eslint/ban-types */
import { Address, BigInt, Bytes, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as/assembly/index';
import { Deposit, Withdraw } from '../../generated/TokenVault/TokenVault';

export function createDepositEvent(
    user: Address,
    ccy: Bytes,
    amount: BigInt
): Deposit {
    const mockEvent = newMockEvent();
    const event = new Deposit(
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
        new ethereum.EventParam('ccy', ethereum.Value.fromBytes(ccy))
    );
    event.parameters.push(
        new ethereum.EventParam(
            'amount',
            ethereum.Value.fromUnsignedBigInt(amount)
        )
    );
    return event;
}

export function createWithdrawEvent(
    user: Address,
    ccy: Bytes,
    amount: BigInt
): Withdraw {
    const mockEvent = newMockEvent();
    const event = new Withdraw(
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
        new ethereum.EventParam('ccy', ethereum.Value.fromBytes(ccy))
    );
    event.parameters.push(
        new ethereum.EventParam(
            'amount',
            ethereum.Value.fromUnsignedBigInt(amount)
        )
    );
    return event;
}

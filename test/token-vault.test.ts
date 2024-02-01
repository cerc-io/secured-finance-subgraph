import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import {
    afterEach,
    assert,
    clearStore,
    describe,
    newMockEvent,
    test,
} from 'matchstick-as/assembly/index';
import { Deposit } from '../generated/TokenVault/TokenVault';
import { handleDeposit, handleWithdraw } from '../src/mappings/token-vault';
import { toBytes32, toBytes20 } from '../src/utils/string';
import { ALICE, BOB } from './utils/createEntities';
import { createDepositEvent, createWithdrawEvent } from './mocks';

const ccy = toBytes32('ETH');

describe('Deposit & Withdraw', () => {
    afterEach(() => {
        clearStore();
    });

    test('Should create an user and a transfer when the Deposit Event is raised', () => {
        const amount = BigInt.fromI32(10000000);
        const event = createDepositEvent(ALICE, ccy, amount);

        const id =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();

        handleDeposit(event);

        assert.entityCount('User', 1);
        assert.fieldEquals('Protocol', 'ethereum', 'totalUsers', '1');
        assert.fieldEquals('User', ALICE.toHexString(), 'transferCount', '1');

        const depositID = ALICE.toHexString() + ':' + ccy.toString();
        assert.fieldEquals('Deposit', depositID, 'amount', amount.toString());

        assert.entityCount('Transfer', 1);
        assert.fieldEquals('Transfer', id, 'user', ALICE.toHexString());
        assert.fieldEquals('Transfer', id, 'currency', ccy.toHexString());
        assert.fieldEquals('Transfer', id, 'amount', amount.toString());
        assert.fieldEquals('Transfer', id, 'transferType', 'Deposit');

        assert.stringEquals(ccy.toString(), 'ETH');
    });

    test('Should increment the totalUsers when a new user deposits', () => {
        const amount = BigInt.fromI32(10000000);
        for (let i = 0; i < 100; i++) {
            const event = createDepositEvent(
                Address.fromBytes(toBytes20(i.toString())),
                ccy,
                amount
            );
            event.logIndex = BigInt.fromI32(i);
            handleDeposit(event);
        }
        assert.entityCount('User', 100);
        assert.fieldEquals('Protocol', 'ethereum', 'totalUsers', '100');
        assert.entityCount('Transfer', 100);
    });

    test('Should increment the transferCount when same user deposits', () => {
        const amount = BigInt.fromI32(10000000);
        for (let i = 0; i < 10; i++) {
            const event = createDepositEvent(ALICE, ccy, amount);
            event.logIndex = BigInt.fromI32(i);
            handleDeposit(event);
        }
        assert.entityCount('User', 1);
        assert.fieldEquals('Protocol', 'ethereum', 'totalUsers', '1');
        assert.fieldEquals('User', ALICE.toHexString(), 'transferCount', '10');
        assert.entityCount('Transfer', 10);
    });

    test('Should increment the transferCount and add a transfer when user withdraws', () => {
        const amount = BigInt.fromI32(10000000);
        const depositEvent = createDepositEvent(ALICE, ccy, amount);
        handleDeposit(depositEvent);

        const withdrawEvent = createWithdrawEvent(ALICE, ccy, amount);
        withdrawEvent.logIndex = BigInt.fromI32(2);
        handleWithdraw(withdrawEvent);

        const id =
            withdrawEvent.transaction.hash.toHexString() +
            ':' +
            withdrawEvent.logIndex.toString();

        assert.entityCount('User', 1);
        assert.fieldEquals('Protocol', 'ethereum', 'totalUsers', '1');
        assert.fieldEquals('User', ALICE.toHexString(), 'transferCount', '2');

        assert.entityCount('Transfer', 2);
        assert.fieldEquals('Transfer', id, 'user', ALICE.toHexString());
        assert.fieldEquals('Transfer', id, 'currency', ccy.toHexString());
        assert.fieldEquals('Transfer', id, 'amount', amount.toString());
        assert.fieldEquals('Transfer', id, 'transferType', 'Withdraw');
    });

    test('Should create deposit for currency', () => {
        const amount1 = BigInt.fromI32(10000000);
        const amount2 = BigInt.fromI32(20000000);
        const amount3 = BigInt.fromI32(50000000);
        const wfil = toBytes32('WFIL');
        const usdc = toBytes32('USDC');
        const axlFIL = toBytes32('axlFIL');

        const event1 = createDepositEvent(ALICE, wfil, amount1);
        const event2 = createDepositEvent(ALICE, usdc, amount2);
        const event3 = createDepositEvent(ALICE, axlFIL, amount3);

        handleDeposit(event1);
        handleDeposit(event2);
        handleDeposit(event3);

        assert.notInStore(
            'Deposit',
            ALICE.toHexString() + ':' + ccy.toString()
        );
        assert.fieldEquals(
            'Deposit',
            ALICE.toHexString() + ':' + wfil.toString(),
            'amount',
            amount1.toString()
        );
        assert.fieldEquals(
            'Deposit',
            ALICE.toHexString() + ':' + usdc.toString(),
            'amount',
            amount2.toString()
        );
        assert.fieldEquals(
            'Deposit',
            ALICE.toHexString() + ':' + axlFIL.toString(),
            'amount',
            amount3.toString()
        );

        const event4 = createDepositEvent(ALICE, axlFIL, amount2);
        handleDeposit(event4);

        assert.fieldEquals(
            'Deposit',
            ALICE.toHexString() + ':' + axlFIL.toString(),
            'amount',
            (amount3 + amount2).toString()
        );
    });

    test('Should not affect deposit amount when user withdraws', () => {
        const amount1 = BigInt.fromI32(10000000);
        const amount2 = BigInt.fromI32(20000000);
        const amount3 = BigInt.fromI32(15000000);
        const usdc = toBytes32('USDC');

        const event1 = createDepositEvent(ALICE, usdc, amount1);
        const event2 = createDepositEvent(ALICE, usdc, amount2);
        const event3 = createWithdrawEvent(ALICE, usdc, amount3);

        handleDeposit(event1);
        handleDeposit(event2);
        handleWithdraw(event3);

        assert.fieldEquals(
            'Deposit',
            ALICE.toHexString() + ':' + usdc.toString(),
            'amount',
            (amount1 + amount2).toString()
        );

        const event4 = createDepositEvent(ALICE, usdc, amount2);
        handleDeposit(event4);

        assert.fieldEquals(
            'Deposit',
            ALICE.toHexString() + ':' + usdc.toString(),
            'amount',
            (amount1 + amount2 + amount2).toString()
        );
    });
});

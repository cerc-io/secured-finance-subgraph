import { Address, ethereum } from '@graphprotocol/graph-ts';
import {
    afterEach,
    assert,
    clearStore,
    describe,
    newMockEvent,
    test,
} from 'matchstick-as/assembly/index';
import { Deposit } from '../generated/TokenVault/TokenVault';
import { handleDeposit } from '../src/token-vault';
import { toBytes20 } from '../src/utils/string';

describe('User Entity', () => {
    afterEach(() => {
        clearStore();
    });

    test('Should create an user when the Deposit Event is raised', () => {
        const userWallet = '0x0000000000000000000000000000000000000000';
        const mockEvent = changetype<Deposit>(newMockEvent());
        mockEvent.parameters.push(
            new ethereum.EventParam(
                'user',
                ethereum.Value.fromAddress(Address.fromString(userWallet))
            )
        );
        handleDeposit(mockEvent);
        assert.fieldEquals('User', userWallet, 'id', userWallet);
        assert.fieldEquals('Protocol', 'ethereum', 'totalUsers', '1');
    });

    test('Should increment the totalUsers when a new user is created', () => {
        for (let i = 0; i < 100; i++) {
            const mockEvent = changetype<Deposit>(newMockEvent());
            mockEvent.parameters.push(
                new ethereum.EventParam(
                    'user',
                    ethereum.Value.fromAddress(
                        Address.fromBytes(toBytes20(i.toString()))
                    )
                )
            );
            handleDeposit(mockEvent);
        }
        assert.entityCount('User', 100);
        assert.fieldEquals('Protocol', 'ethereum', 'totalUsers', '100');
    });
});

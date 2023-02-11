import { Address, ethereum } from '@graphprotocol/graph-ts';
import {
    assert,
    describe,
    newMockEvent,
    test,
} from 'matchstick-as/assembly/index';
import { Deposit } from '../generated/TokenVault/TokenVault';
import { handleDeposit } from '../src/token-vault';

describe('User Entity', () => {
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
        const userWallet = '0x0000000000000000000000000000000000000001';
        const mockEvent = changetype<Deposit>(newMockEvent());
        mockEvent.parameters.push(
            new ethereum.EventParam(
                'user',
                ethereum.Value.fromAddress(Address.fromString(userWallet))
            )
        );
        handleDeposit(mockEvent);
        assert.fieldEquals('Protocol', 'ethereum', 'totalUsers', '2');
    });
});

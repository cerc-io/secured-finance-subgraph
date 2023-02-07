import { Address, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent, test } from 'matchstick-as/assembly/index';
import { Deposit } from '../generated/TokenVault/TokenVault';
import { handleDeposit } from '../src/token-vault';

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
});

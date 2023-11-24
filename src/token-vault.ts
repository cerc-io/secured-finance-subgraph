import { Deposit } from '../generated/TokenVault/TokenVault';
import { getOrInitUser } from './helper/initializer';

export function handleDeposit(event: Deposit): void {
    getOrInitUser(event.params.user, event.block.timestamp);
}

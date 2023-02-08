import { log } from 'matchstick-as';
import { Deposit } from '../generated/TokenVault/TokenVault';
import { getOrInitUser } from './helper/initializer';

export function handleDeposit(event: Deposit): void {
    const user = getOrInitUser(event.params.user);
    log.info('handle Deposit for user: {}', [user.id]);
}

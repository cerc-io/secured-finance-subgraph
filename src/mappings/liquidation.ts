import { Address, BigInt, log } from '@graphprotocol/graph-ts';
import { LiquidationExecuted } from '../../generated/LiquidationLogic/LiquidationLogic';
import { initLiquidation } from '../helper/initializer';

export function handleLiquidationExecuted(event: LiquidationExecuted): void {
    const id =
        event.transaction.hash.toHexString() + ':' + event.logIndex.toString();

    initLiquidation(
        id,
        event.params.user,
        event.params.collateralCcy,
        event.params.debtCcy,
        event.params.debtMaturity,
        event.params.debtAmount,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash
    );
}

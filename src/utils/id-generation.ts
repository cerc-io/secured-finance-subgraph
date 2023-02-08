import { BigInt, Bytes } from '@graphprotocol/graph-ts';

export function getDailyVolumeEntityId(
    ccy: Bytes,
    maturity: BigInt,
    date: string
): string {
    return `${ccy}-${maturity.toString()}-${date}`;
}

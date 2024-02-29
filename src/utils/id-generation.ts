import { BigInt, Bytes } from '@graphprotocol/graph-ts';

export function getDailyVolumeEntityId(
    ccy: Bytes,
    maturity: BigInt,
    date: string
): string {
    return `${ccy.toString()}-${maturity.toString()}-${date}`;
}

export function getOrderEntityId(
    orderId: BigInt,
    ccy: Bytes,
    maturity: BigInt
): string {
    return `${orderId.toHexString()}-${ccy.toString()}-${maturity.toString()}`;
}

export function getTransactionCandleStickEntityId(
    ccy: Bytes,
    maturity: BigInt,
    epochTime: BigInt
): string {
    return `${ccy.toString()}-${maturity.toString()}-${epochTime.toString()}`;
}

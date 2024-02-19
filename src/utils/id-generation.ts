import { BigInt, Bytes } from '@graphprotocol/graph-ts';

export const getUTCMonthYear = (maturity: BigInt): string => {
    const maturityDate = new Date(maturity.toI64() * 1000);
    const monthAbbreviations = [
        'JAN',
        'FEB',
        'MAR',
        'APR',
        'MAY',
        'JUN',
        'JUL',
        'AUG',
        'SEP',
        'OCT',
        'NOV',
        'DEC',
    ];

    const utcMonth = maturityDate.getUTCMonth();
    const utcYear = maturityDate.getUTCFullYear();

    const result = monthAbbreviations[utcMonth] + utcYear.toString();

    return result;
};

export function getDailyVolumeEntityId(
    ccy: Bytes,
    maturity: BigInt,
    date: string
): string {
    return `${ccy.toString()}-${getUTCMonthYear(maturity)}-${date}`;
}

export function getOrderEntityId(
    orderId: BigInt,
    ccy: Bytes,
    maturity: BigInt
): string {
    return `${orderId.toHexString()}-${ccy.toString()}-${getUTCMonthYear(
        maturity
    )}`;
}

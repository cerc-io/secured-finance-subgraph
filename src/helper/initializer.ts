import { BigInt, Bytes, log } from '@graphprotocol/graph-ts';
import {
    DailyVolume,
    LendingMarket,
    Protocol,
    User,
} from '../../generated/schema';
import { getDailyVolumeEntityId } from '../utils/id-generation';
import { buildLendingMarketId } from '../utils/string';

export const PROTOCOL_ID = 'ethereum';

export const getProtocol = (): Protocol => {
    let protocol = Protocol.load(PROTOCOL_ID);
    if (!protocol) {
        protocol = new Protocol(PROTOCOL_ID);
        protocol.totalUsers = BigInt.fromI32(0);
        protocol.save();
    }
    return protocol as Protocol;
};

export const getOrInitLendingMarket = (
    ccy: Bytes,
    maturity: BigInt
): LendingMarket => {
    const id = buildLendingMarketId(ccy, maturity);
    let lendingMarket = LendingMarket.load(id);
    if (!lendingMarket) {
        lendingMarket = new LendingMarket(id);
        lendingMarket.currency = ccy;
        lendingMarket.maturity = maturity;
        lendingMarket.prettyName = ccy.toString() + '-' + maturity.toString();
        lendingMarket.isActive = true;
        lendingMarket.protocol = getProtocol().id;
        lendingMarket.volume = BigInt.fromI32(0);

        lendingMarket.save();
        log.debug('Created lending market: {}', [lendingMarket.prettyName]);
    }
    return lendingMarket as LendingMarket;
};

export const getOrInitUser = (address: Bytes): User => {
    let user = User.load(address.toHexString());
    if (!user) {
        user = new User(address.toHexString());
        user.transactionCount = BigInt.fromI32(0);
        user.orderCount = BigInt.fromI32(0);
        user.save();

        log.debug('New user: {}', [user.id]);

        // Add user to protocol
        const protocol = getProtocol();
        protocol.totalUsers = protocol.totalUsers.plus(BigInt.fromI32(1));
        protocol.save();
    }
    return user as User;
};

export const getOrInitDailyVolume = (
    ccy: Bytes,
    maturity: BigInt,
    date: BigInt
): DailyVolume => {
    const utcDate = new Date(date.times(BigInt.fromI32(1000)).toI64());
    const dayStr = utcDate.toISOString().substring(0, 10); //yyyy-mm-dd

    let id = getDailyVolumeEntityId(ccy, maturity, dayStr);
    let dailyVolume = DailyVolume.load(id);
    if (!dailyVolume) {
        dailyVolume = new DailyVolume(id);
        dailyVolume.currency = ccy;
        dailyVolume.maturity = maturity;
        dailyVolume.day = dayStr;
        dailyVolume.timestamp = BigInt.fromI64(
            Date.parse(dayStr).getTime() / 1000
        );
        dailyVolume.volume = BigInt.fromI32(0);
        dailyVolume.lendingMarket = getOrInitLendingMarket(ccy, maturity).id;
        dailyVolume.save();
    }
    return dailyVolume as DailyVolume;
};

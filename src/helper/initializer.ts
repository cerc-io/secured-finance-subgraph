import { BigInt, Bytes } from '@graphprotocol/graph-ts';
import { DailyVolume, User } from '../../generated/schema';
import { getDailyVolumeEntityId } from '../utils/id-generation';

export const getOrInitUser = (address: Bytes): User => {
    let user = User.load(address.toHexString());
    if (user == null) {
        user = new User(address.toHexString());
        user.save();
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
    if (dailyVolume == null) {
        dailyVolume = new DailyVolume(id);
        dailyVolume.currency = ccy;
        dailyVolume.maturity = maturity;
        dailyVolume.day = dayStr;
        dailyVolume.timestamp = BigInt.fromI64(
            Date.parse(dayStr).getTime() / 1000
        );
        dailyVolume.volume = BigInt.fromI32(0);
        dailyVolume.save();
    }
    return dailyVolume as DailyVolume;
};

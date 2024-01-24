import {Utils} from "../../../../utils/utils";
import LiveTimer from "./coach-live-timer";
import {LiveSessionSplit} from "../../api/collections";
import {ExpressionUtils} from "../../../../expressions/utils";
import {Athlete} from "../../../athletes/api/collections";


class LiveSessionState {
    /**
     *
     * @param {LiveSession} liveSession
     * @param {LiveDevice[]} devices
     * @param splits
     * @param users
     * @param coach
     */
    constructor(liveSession, devices, splits, users, coach) {
        let self = this;
        /**@type LiveSession */
        self.liveSession = liveSession;
        /**@type LiveDevice[] */
        self.devices = devices || [];
        self.splits = splits || [];
        self.devicesMaxHr = {};
        /**@type {Object.<string, Athlete>}*/
        self.devicesInfo = {};
        self.coach = coach;
        self.timer = null;
        self.expression = null;
        self.intervals = [];
        /**@type {Array|DeviceLiveSessionSplit} */
        self.deviceSplits = [];

        if (this.getSessionExpression()) {
            this.expression = ExpressionUtils.parse(this.getSessionExpression());
            this.intervals = ExpressionUtils.expand(this.expression);
        }

        users.map(function (user) {
            const athlete = Athlete.find(user._id);
            self.devicesMaxHr[user._id] = athlete.maxHeartRate;
            self.devicesInfo[user._id] = athlete;
            return user;
        })

    }

    /**
     *
     * @returns {LiveSession}
     */
    getLiveSession() {
        return this.liveSession;
    }

    /**
     *
     * @returns {LiveDevice[]|Array|*}
     */
    getDevices() {
        return this.devices;
    }

    inLiveSession() {
        return this.liveSession !== null && this.liveSession !== undefined && this.liveSession.active === true;
    }

    getLiveSessionId() {
        return this.liveSession._id;
    }

    setSplits(splits) {
        this.splits = splits;
        let split = this.getCurrentSplit();
        if (split) {
            this.liveSession.split = split.number;
            if (split.number === 0) {
                this.liveSession.finishedWarmUpAt = split.startedAt
            }
        }
    }

    /**
     *
     * @param {Array|DeviceLiveSessionSplit} deviceSplits
     */
    setDeviceSplits(deviceSplits) {
        this.deviceSplits = deviceSplits;
    }

    /**
     *
     * @returns {Array|DeviceLiveSessionSplit}
     */
    getDeviceSplits() {
        return this.deviceSplits;
    }

    getSplits() {
        return this.splits;
    }

    areSplitsFinished() {
        return this.expression !== null && this.splits.length === this.intervals.length
            && this.splits[this.splits.length - 1].finishedAt > 0
    }

    /**
     *
     * @returns {LiveSessionSplit}
     */
    getCurrentSplit() {
        if (!this.liveSession) {
            return null;
        }

        if (this.splits.length === 0)
            return null;

        let split = this.splits[this.splits.length - 1];
        if (split.finishedAt > 0) {
            return null;
        }

        return split;
    }

    /**
     *
     * @returns {LiveSessionSplit}
     */
    getLastWorkingSplit(startFrom = null) {
        if (!this.liveSession) {
            return null;
        }

        if (this.splits.length === 0)
            return null;

        for (let i = startFrom !== null ? startFrom : this.splits.length - 1; i >= 0; i--) {
            /**@type LiveSessionSplit */
            let split = this.splits[i];
            if (split.isRecovery === false) {
                return split;
            }
        }
        return null;
    }

    /**
     *
     * @returns {LiveSessionSplit}
     */
    getLastSplit() {
        if (!this.liveSession) {
            return null;
        }

        if (this.splits.length === 0)
            return null;

        return this.splits[this.splits.length - 1];
    }

    setLiveSession(session) {
        this.liveSession = session;
    }

    getDeviceList() {
        let devices = [];
        this.devices.map((d) => devices.push(d.id));
        return devices;
    }

    areThereOnlineDevices() {
        return this.devices.length > 0
    }

    getDeviceRestingHr(id) {
        return this.devicesInfo[id].restingHeartRate;
    }

    getDeviceMaxHr(id) {
        return this.devicesInfo[id].maxHeartRate;
    }

    getServerOffset() {
        return Utils.cristianClockSynchronization(this.coach.latency);
    }

    getSessionExpression() {
        return this.liveSession.expression;
    }

    inScheduledSession() {
        return this.expression !== null && this.liveSession.finishedWarmUpAt > 0
            && !this.areSplitsFinished()
    }

    inWarmUp() {
        return this.expression !== null && !(this.liveSession.finishedWarmUpAt > 0)
    }

    inFreeSession() {
        return this.getSessionExpression() === null;
    }

    inSoloSession() {
        return this.liveSession.solo === true
    }

    /**
     *
     * @param {LiveTimer} timer
     */
    setTimer(timer) {
        /** @type LiveTimer */
        this.timer = timer;
    }

    /**
     *
     * @returns {Number}
     */
    getSessionDuration() {
        return this.timer.getDuration();
    }

    getFullSessionDuration() {
        return this.timer.getFullDuration();
    }

    /**
     *
     * @param {function} listener
     */
    registerForTimerUpdates(listener) {
        this.timer.addListener(listener);
    }

    getCurrentInterval() {
        let split = this.getCurrentSplit();
        if (!split) {
            return null;
        }

        let interval = this.intervals[split.number];
        if (!interval) {
            return null;
        }

        return interval;
    }

    isSessionInADistanceBasedSplit() {

        let interval = this.getCurrentInterval();
        if (interval === null) {
            return false;
        }

        return interval.isBasedInDistance();
    }


    getCurrentSplitDistanceInKm() {
        let interval = this.getCurrentInterval();
        if (interval === null) {
            return null;
        }

        return interval.getDistanceInKm();
    }

    removeDevice(id) {
        for (let i = 0, l = this.devices.length; i < l; i++) {
            let device = this.devices[i];
            if (device.id === id) {
                this.devices.splice(i, 1);
                break;
            }
        }
    }
}


export default LiveSessionState;

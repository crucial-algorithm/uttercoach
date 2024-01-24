import {
    DeviceData, LiveDeviceData, LiveSplitSummary, LiveSplitPartialsPosition, DeviceLiveSessionSplit,
    LiveSession
} from "./collections";
import {Utils} from "../../../utils/utils";
import {IntervalType, LiveSessionDistanceHandling, LiveSessionType} from "./liveDevicesConstants";
import {DistanceStep} from "./collections";
import {Coach} from "../../coaches/api/collections";
import {Split} from "../../training-sessions/api/collections";
import {Meteor} from "meteor/meteor";
import {logger} from "../../../utils/logger";
import {UserUtils} from "../../users/api/utils";

class LiveUtils {

    static guessDistance(distance) {
        // convert distance to meters
        distance = distance * 1000;

        // try sprint kayak distances
        let ratio100 = Utils.round(distance / 100, 2);
        let ratio200 = Utils.round(distance / 200, 2);
        let ratio500 = Utils.round(distance / 500, 2);
        let ratio750 = Utils.round(distance / 750, 2);
        let ratio1k  = Utils.round(distance / 1000, 2);

        if (ratio100 >= 0.9 && ratio100 <= 1.1) {
            return 100
        }

        if (ratio200 >= 0.9 && ratio200 <= 1.1) {
            return 200
        }


        if (ratio500 >= 0.9 && ratio500 <= 1.1) {
            return 500
        }

        if (ratio750 >= 0.9 && ratio750 <= 1.1) {
            return 750

        }

        if (ratio1k >= 0.9 && ratio1k <= 1.1) {
            return 1000
        }

        if (distance < 500) {
            return 1;
        }

        return distance;

    }

    static guessPartials(distance, displayedDistance) {

        let step = 100;
        if (displayedDistance <= 200) step = 50;
        if (displayedDistance <= 100) step = 20;
        if (displayedDistance >= 2000) step = 200;
        if (displayedDistance >= 3000) step = 1000;

        let point = 0, partials = [];

        while (true) {
            partials.push(point);
            point += step;
            if (point > displayedDistance) {
                partials.push(distance);
                break;
            }
        }

        return partials.splice(1);
    }

    /**
     *
     * @param {LiveSession} liveSession
     * @param {LiveSessionSplit} liveSessionSplit
     */
    static async generatePartials(liveSession, liveSessionSplit) {
        let deviceSplit, metrics;

        for (let device of liveSession.devices) {
            deviceSplit = DeviceLiveSessionSplit.findSplit(device, liveSessionSplit.sessionId, liveSessionSplit.number);
            metrics = await LiveUtils.fetchMetricsForSplit(liveSession, device, deviceSplit);
            LiveUtils.generatePartialsForAthlete(liveSession, liveSessionSplit, deviceSplit, device, metrics);
        }
    }

    /**
     *
     * @param {LiveSession}             liveSession
     * @param {string}                  deviceId            device UUID
     * @param {DeviceLiveSessionSplit}  deviceSplit         Device split
     * @returns {Array|DeviceData}
     */
    static async fetchMetricsForSplit(liveSession, deviceId, deviceSplit) {
        return new Promise(function (resolve, reject) {

            let processResult = function(metrics) {
                if (metrics.length === 0) {
                    return [];
                }

                let count = 0, result = [], moment = deviceSplit.startedAt;

                metrics = metrics.map(function (m) {
                    return new DeviceData(m);
                });

                // we should be converting everything to DeviceData upfront, but for now, we won't
                let startIndex = firstMetricIndex(metrics, deviceSplit.startedAt)
                    , finishIndex = lastMetricIndex(metrics, deviceSplit.finishedAt);

                metrics = metrics.splice(startIndex, finishIndex - startIndex + 1);

                let firstMetric, /**@type DeviceData*/ lastMetric, gap;
                firstMetric = metrics[0];
                gap = deviceSplit.startedAt - firstMetric.getDuration();
                let initialMetric = firstMetric.appendMilis(gap, firstMetric.getSpeed());
                if (gap !== 0) {
                    metrics[0] = initialMetric;
                }

                lastMetric = metrics[metrics.length - 1];
                gap = deviceSplit.finishedAt - lastMetric.getDuration();
                let finalMetric = lastMetric.appendMilis(gap, lastMetric.getSpeed());
                if (gap !== 0) {
                    metrics[metrics.length - 1] = finalMetric;
                }

                let user, refreshRate = (user = Meteor.users.findOne(deviceId)) ? user.profile.liveUpdateEvery : 1;
                for (let metric of metrics) {
                    if (metric === finalMetric) {
                        if (deviceSplit.type === IntervalType.TIME) {
                            metric = metric.appendMilis(moment - metric.getDuration(), metric.getSpeed());
                            result.push(metric);
                            break;
                        }

                        result.push(metric);
                        break;
                    }

                    metric = metric.appendMilis(moment - metric.getDuration(), metric.getSpeed());
                    result.push(metric);
                    count++;
                    moment += refreshRate * 1000;
                    moment = Math.min(moment, finalMetric.getDuration());
                }

                return result;
            };

            let firstMetricIndex = function (metrics, startedAt) {
                let metric, previous = null, after = null, prevIndex = -1, afterIndex = -1;
                for (let i = 0, l = metrics.length; i < l; i++) {
                    metric = metrics[i];

                    if (metric.getDuration() === startedAt) {
                        return i;
                    }

                    if (metric.getDuration() < startedAt) {
                        previous = metric;
                        prevIndex = i;
                        continue;
                    }

                    if (metric.getDuration() > startedAt) {
                        after = metric;
                        afterIndex = i;
                        break;
                    }
                }

                if (!previous) {
                    return afterIndex;
                }
                if (Math.abs(startedAt - previous.getDuration()) < Math.abs(startedAt - after.getDuration())) {
                    return prevIndex;
                }
                return afterIndex;
            };

            let lastMetricIndex = function (metrics, finishedAt) {
                let metric, previous = null, after = null, prevIndex = -1, afterIndex = -1;
                for (let i = metrics.length - 1; i >= 0; i--) {
                    metric = metrics[i];

                    if (metric.getDuration() === finishedAt) {
                        return i;
                    }

                    if (metric.getDuration() > finishedAt) {
                        after = metric;
                        afterIndex = i;
                        continue;
                    }

                    if (metric.getDuration() < finishedAt) {
                        previous = metric;
                        prevIndex = i;
                        break;
                    }
                }

                if (!after) {
                    return prevIndex;
                }

                if (Math.abs(finishedAt - previous.getDuration()) < Math.abs(finishedAt - after.getDuration())) {
                    return prevIndex;
                }
                return afterIndex;
            };

            let fetch = function() {
                return LiveDeviceData.find({
                    dv: deviceId,
                    ss: liveSession.id,
                    dr: {$gte: deviceSplit.startedAt - 2000}
                }, {sort: {dr: 1}}).fetch();
            };

            let isComplete = function (/**@type {Array}*/ metrics) {
                if (!metrics || !metrics.length) {
                    return false;
                }
                let metric = new DeviceData(metrics[metrics.length - 1]);
                logger.debug(`isComplete? ${metric.getDuration()} >= ${deviceSplit.finishedAt}`);
                return metric.getDuration() >= deviceSplit.finishedAt;
            };

            let log = function (result) {
                logger.debug(`started: ${deviceSplit.startedAt}, Finished: ${deviceSplit.finishedAt}, duration: ${deviceSplit.finishedAt - deviceSplit.startedAt}, 1st accepted metric ${result[0].getDuration()}; Last accepted metric: ${result[result.length - 1].getDuration()}; Total metrics: ${result.length}`);
            };

            const data = fetch();
            if (isComplete(data)) {
                let metrics = processResult(data);
                log(metrics);
                resolve(metrics);
                return;
            }

            let retries = 1, intervalId;
            intervalId = Meteor.setInterval(function () {
                logger.debug('retry', retries);
                const data = fetch();

                if (isComplete(data)) {
                    Meteor.clearInterval(intervalId);
                    let metrics = processResult(fetch());
                    log(metrics);
                    resolve(metrics);
                    return;
                }

                retries++;
                if (retries >= 5) {
                    reject('metrics not found in time');
                    Meteor.clearInterval(intervalId)
                }
            }, 1000);
        });
    }


    /**
     *
     * @param {LiveSession}             session
     * @param {LiveSessionSplit}        split
     * @param {DeviceLiveSessionSplit}  deviceSplit
     * @param {string}                  athleteId
     * @param {Array|LiveDeviceData}        metrics
     */
    static generatePartialsForAthlete(session, split, deviceSplit, athleteId, metrics) {

        if (metrics.length === 0) {
            console.error(`no metrics found for the following data: device: ${athleteId} | session: ${session.id} | split: ${deviceSplit.number}`);
            return;
        }

        /** [@DistanceStep] */
        let steps = LiveUtils.collapseMetrics(metrics, deviceSplit);

        let generic = false;
        let breakpoints = LiveSplitPartialsPosition.find({device: athleteId, liveSession: session.id, split: deviceSplit._id}).fetch();
        if (breakpoints.length === 0) {
            breakpoints = LiveUtils.guessPartials(deviceSplit.distance, deviceSplit.displayedDistance);
            generic = true;
        }

        let totals = {spm: 0, hr: 0, speed: 0, displacement: 0, counter: 0},
            partials = {displacement: 0, spm: 0, counter: 0, start: null, hr: 0}, metric = null;

        let list = [], lastStepDuration = 0;
        for (/** @type {DistanceStep}*/ let step of steps) {

            if (partials.start === null) partials.start = step;

            partials.counter += step.counter;
            totals.counter += step.counter;
            partials.displacement += step.displacement;
            totals.displacement += step.displacement;
            partials.spm += step.cadence;
            totals.spm += step.cadence;
            partials.hr += step.heartRate;
            totals.hr += step.heartRate;

            if (breakpoints.length === 0) continue;

            /* have we crossed a partial? */
            if (step.distance >= deviceSplit.displayedDistance
                || ((generic && step.distance >= breakpoints[0])
                || (!generic && step.duration >= breakpoints[0].timestamp))) {

                list.push(LiveUtils.partial({
                    distance: generic ? step.distance  : breakpoints[0].distance,
                    duration: (lastStepDuration = step.duration - deviceSplit.startedAt),
                    cadence: partials.spm / partials.counter,
                    displacement: partials.displacement / partials.counter,
                    hr: partials.hr / partials.counter
                }));

                partials.counter = 0;
                partials.displacement = 0;
                partials.spm = 0;
                partials.hr = 0;
                breakpoints.splice(0, 1);
            }
        }

        if (partials.counter > 0) {
            list.push(LiveUtils.partial({
                distance: deviceSplit.distance,
                duration: deviceSplit.finishedAt - deviceSplit.startedAt,
                cadence: partials.spm / partials.counter,
                displacement: partials.displacement / partials.counter,
                hr: partials.hr / partials.counter
            }));
        }

        let speed = LiveUtils.processSpeedForSummary(deviceSplit, metrics);

        let /**@type DeviceData */ last = metrics[metrics.length - 1];

        LiveSplitSummary.insert({
            split: split.id,
            liveSession: session.id,
            device: athleteId,
            partials: list,
            duration: deviceSplit.finishedAt - deviceSplit.startedAt,
            distance: last.getRelativeDistanceInMeters(),
            cadence: isNaN(totals.spm / totals.counter) ? 0 : totals.spm / totals.counter,
            displacement: isNaN(totals.displacement / totals.counter) ? 0 : totals.displacement / totals.counter,
            hr: isNaN(totals.hr / totals.counter) ? 0 : totals.hr / totals.counter,
            speed: speed.records,
            number: deviceSplit.number,
            maxSpeed: {position: speed.maxSpeedPosition, value: speed.maxSpeed, duration: speed.maxSpeedTimestamp}
        });

        return list;
    }

    /**
     * Turn "raw" metrics into constant distance increments of {LiveSessionDistanceHandling.DISTANCE_STEP_IN_METERS}
     * For instance, [7m, 14m, 18m, 21m] would get converted to [10m, 20m] in a distance increment of 10m
     *
     * @param {Array|DeviceData} metrics
     * @param {DeviceLiveSessionSplit}  deviceSplit
     * @returns {Array|DistanceStep}
     */
    static collapseMetrics(metrics, deviceSplit) {
        let distance, step = 0, /**@type DeviceData */ previous = null, start;
        /**@type Array|DistanceStep*/
        let result = [];
        /**@type DeviceData*/
        let firstMetric = metrics[0];
        let totals = {cadence: 0, hr: 0, speed: 0, displacement: 0, counter: 0};

        start = {
            timestamp: deviceSplit.startedAt,
            distance: firstMetric.getDistanceInMeters()
            + (deviceSplit.startedAt - firstMetric.getDuration()) * (firstMetric.getSpeed() / 3600000)
        };

        start.distance = Math.round(start.distance * 10000) / 10000;

        for (let metric of metrics) {

            metric.setStartDistance(start.distance / 1000);
            distance = metric.getRelativeDistanceInMeters();

            if (!LiveUtils.isIncrement(step, distance)) {
                totals.hr += metric.heartRate;
                totals.speed += metric.speed;
                totals.cadence += metric.cadence;
                totals.displacement += metric.displacement;
                totals.counter++;

                previous = metric;
                continue;
            }

            // calculate new distance step
            step = distance - distance % LiveSessionDistanceHandling.DISTANCE_STEP_IN_METERS;

            // if 1st distance is bigger than 10 (slow GPS reading)
            if (previous === null) {
                previous = metric.clone();
                previous.setDistance(deviceSplit.startDistance);
                previous.setDuration(deviceSplit.startedAt);
            }

            // determine duration when swap actually happened
            let milis = LiveUtils.determineDurationInMilis(step, previous, metric);
            if (totals.counter > 0)
                result.push(new DistanceStep(milis, totals.speed, step, totals.cadence, totals.displacement, totals.hr, totals.counter));
            else
                result.push(new DistanceStep(milis, metric.getSpeed(), step, metric.getCadence(), metric.getDisplacement(), metric.getHeartRate(), 1));

            totals = {cadence: 0, hr: 0, speed: 0, displacement: 0, counter: 0};
            previous = metric;
        }

        if (totals.counter > 0) {
            result.push(new DistanceStep(deviceSplit.finishedAt - previous === null ? deviceSplit.startedAt : previous.getDuration() ,
                totals.speed, deviceSplit.distance, totals.cadence, totals.displacement, totals.hr, totals.counter));
        }

        if (result.length > 0) {
            result[result.length - 1].duration = deviceSplit.finishedAt;
        }

        return result;
    }

    static isIncrement(step, distance) {
        return distance - distance % LiveSessionDistanceHandling.DISTANCE_STEP_IN_METERS > step;
    }

    static processSpeedForSummary(deviceSplit, metrics) {

        let speed = [];

        // organize splits in bins (bin inspired by data binning techniques)
        let binSize = metrics.length > 60 ? Math.round(metrics.length / 12) : 1, binAmount = 0, binTotal = 0;

        //gather info regarding max speed
        let maxSpeed = -1, maxSpeedPosition = 0, maxSpeedTimestamp = 0;

        for (let metric of metrics) {

            binTotal += metric.getSpeed();
            binAmount++;
            if (binAmount === binSize) {
                speed.push(binTotal / binSize);
                binAmount = 0;
                binTotal = 0;
            }


            if (metric.getSpeed() > maxSpeed) {
                maxSpeed = metric.getSpeed();
                maxSpeedPosition = speed.length - 1;
                maxSpeedTimestamp = metric.getDuration();
            }
        }
        if (binAmount > 0 && binAmount < binSize) speed.push(binTotal/binAmount);

        return {
            records: speed,
            maxSpeed: maxSpeed,
            maxSpeedTimestamp: maxSpeedTimestamp,
            maxSpeedPosition: maxSpeedPosition
        }
    }

    /**
     * Determine the actual distance at a given timestamp, given a data point
     * @param   {Number}        timestamp
     * @param   {DeviceData}    data
     */
    static determineDistanceAtTimestamp(timestamp, data) {
        let distancePerMili = (data.getSpeed() * 1000) / 3600000;
        let gap = data.getTimestamp() - timestamp;
        return data.getDistanceInMeters() - (gap * distancePerMili);
    }

    /**
     * Given a distance and two data points, determine de exact duration when the device go to that distance
     *
     * @param   {Number}      distance
     * @param   {DeviceData}  before
     * @param   {DeviceData}  after
     * @returns {Number}      Distance, in meters
     */
    static determineDurationInMilis(distance, before, after) {
        if (after === null) after = before;
        let speed = (before.getSpeed() + after.getSpeed()) / 2;
        let distancePerMili = (speed * 1000) / 3600000;
        let gap = distance - before.getRelativeDistanceInMeters();

        return before.getDuration() + Math.round(gap / distancePerMili);
    }

    /**
     * Ensure all values are valid
     * @param record
     */
    static partial(record) {
        if (isNaN(record.cadence)) {
            record.cadence = 0;
        }

        if (isNaN(record.displacement)) {
            record.displacement = 0;
        }

        if (isNaN(record.hr)) {
            record.hr = 0;
        }
        return record;
    }

    /**
     *
     * @param id
     * @returns {number}
     */
    static coachOffset(id) {
        let coach = Coach.find(id);
        if (!coach) {
            console.debug(`Failed to get coach with ID ${id}`);
            return 0;
        }
        return Utils.cristianClockSynchronization(coach.latency);
    }

    /**
     *
     * @param trainingSession
     * @returns {MockExpression}
     */
    static calculateSplitDataFromLiveForSession(trainingSession) {

        let tsAdjustment = trainingSession.serverClockGap;
        let start = trainingSession.date.getTime() + tsAdjustment;
        let user = Meteor.user();
        let liveSession = LiveSession.findMatchForAthleteSession(start, user._id);

        if (liveSession === null) {
            return null;
        }

        let liveSplits = DeviceLiveSessionSplit.findSplitsInSessionForDevice(liveSession.id, user._id);

        if (liveSplits.length === 0) {
            return null;
        }

        let duration, liveSplit = liveSplits.shift(), /**@Array.Split */ splits = [], metric = null, splitIds = [], /** @Split */ split,
            data = {displacement: 0, cadence: 0, hr: 0, count: 0}, avgSpeed;

        for (let i = 0, l = trainingSession.data.length; i < l; i++) {
            metric = trainingSession.data[i];

            // adjust timestamp
            duration = metric.timestamp + tsAdjustment - start;

            // before split
            if (duration < liveSplit.startedAt + 200) {
                continue;
            }

            // After split?
            if (split && split.end && duration > split.start + split.duration) {
                split.splitIndexEnd = i - 1;
                avgSpeed = (split.calculateDistance() / 1000) / (split.duration / 1000 / 3600);
                split.avgSpeed = isNaN(avgSpeed) ? 0 : avgSpeed;
                split.avgSpm = isNaN(data.cadence / data.count) ? 0 : data.cadence / data.count;
                split.avgSpmEfficiency = isNaN(data.displacement / data.count) ? 0 : data.displacement / data.count;
                split.avgHeartRate = isNaN(data.hr / data.count) ? 0 : data.hr / data.count;

                data = {displacement: 0, cadence: 0, hr: 0, count: 0};
                liveSplit = liveSplits.shift();

                if (!liveSplit) {
                    break;
                }
            }

            // during split, check if we need to create it
            if (!splits[liveSplit.number]) {
                logger.debug(`registering a new split @ metric ${metric.timestamp}, split @ ${liveSplit.startedAt}`);
                split = new Split(liveSplit.startedAt, liveSplit.finishedAt
                    , liveSplit.startDistance
                    , liveSplit.startDistance + liveSplit.distance
                    , /* basedInDistance = */ false
                    , /* recovery = */ liveSplit.isRecovery
                    , /* start position = */ i);

                split.id = liveSplit.id;
                splits.push(split);
                splitIds.push(liveSplit.splitId);
            }

            data.cadence += metric.spm;
            data.displacement += metric.spmEfficiency;
            data.hr += metric.heartRate;
            data.count++;
        }

        logger.debug(`Split end defined? ${split.splitIndexEnd} @ ${split.startedAt}`);

        if (split.splitIndexEnd === null) {
            logger.debug(`closing split at finish of session... @ ${split.startedAt}`);
            split.splitIndexEnd = trainingSession.data.length - 1;
            avgSpeed = Utils.calculateAverageSpeed(split.calculateDistance() / 1000, split.duration);
            split.avgSpeed = isNaN(avgSpeed) ? 0 : avgSpeed;
            split.avgSpm = isNaN(data.cadence / data.count) ? 0 : data.cadence / data.count;
            split.avgSpmEfficiency = isNaN(data.displacement / data.count) ? 0 : data.displacement / data.count;
            split.avgHeartRate = isNaN(data.hr / data.count) ? 0 : data.hr / data.count;
            split.end = metric.timestamp + tsAdjustment - start;
        }

        for (split of splits) {
            split.start = start + split.start;
            split.end = start + split.end;
            split.duration = Utils.formatDurationInMinutes(split.end - split.start);
            split.distanceStart = split.distanceStart / 1000;
            split.distanceEnd = split.distanceEnd / 1000;
        }

        return new MockExpression(splits, tsAdjustment, liveSession.id)

    }

    /**
     *
     * @param serverTime in miliseconds
     * @param offset
     * @param deviceId
     */
    static serverToDeviceTime(serverTime, offset, deviceId) {
        if (offset === null) {
            offset = UserUtils.calculateDeviceOffset(deviceId);
        }

        return serverTime - offset;
    }

    static deviceToServerTime(deviceTime, deviceId, offset) {
        if (offset === null) {
            offset = UserUtils.calculateDeviceOffset(deviceId);
        }

        return offset + deviceTime;
    }

}

class MockExpression {

    /**
     *
     * @param {[Split]} splits
     * @param           tsAdjustment
     * @param           liveSessionId
     */
    constructor(splits, tsAdjustment, liveSessionId) {
        this.splits = splits;
        this.tsAdjustment = tsAdjustment;
        this._liveSessionId = liveSessionId;
    }

    isRecovery(data) {
        let matchSplit = null;
        for (let split of this.splits) {
            if (data.timestamp + this.tsAdjustment >= split.start && data.timestamp + this.tsAdjustment <= split.end) {
                matchSplit = split;
                break;
            }
        }

        if (matchSplit === null) {
            return true;
        }

        return matchSplit.recovery;
    }

    duration() {
        let duration = 0;
        for (let split of this.splits) {
            if (split.recovery) {
                continue;
            }

            duration += split.end - split.start;
        }

        console.log(duration);
        return duration;
    }

    distance() {
        let distance = 0;
        for (let split of this.splits) {
            if (split.recovery === true) {
                continue;
            }

            distance += split.calculateDistance();
        }

        return distance === 0 ? 0 : distance;
    }

    splitsJson() {
        let result = [];
        for (let split of this.splits) {
            result.push(split.toJson())
        }
        return result;
    }

    get liveSessionId() {
        return this._liveSessionId;
    }
}

class DistanceHandler {
    constructor(offset) {
        this.serverOffset = offset;
        this.lastAcceptableDistance = null;

        // store last calculated and shown distances
        this.last = {
            raw: 0,
            displayed: 0
        };
    }

    getCurrentCannonicalTime() {
        return this.getCannonicalTime(Date.now());
    }

    getCannonicalTime(timestamp) {
        if (this.serverOffset === undefined) this.serverOffset = 0;
        return timestamp + this.serverOffset;
    }

    /**
     *
     * @param distance    in meters
     * @param speed       in km/h
     * @param duration    in seconds
     * @param {boolean}   locationChanged
     * @param {numeric}   startDistance
     */
    record(distance, speed, duration, locationChanged, startDistance) {
        if (locationChanged || this.lastAcceptableDistance === null) {
            this.lastAcceptableDistance = {
                distance: distance,
                speed: speed,
                duration: duration,
                locationChanged: locationChanged,
                startDistance: startDistance
            };
        }
    }

    /**
     * Calculates distance displayable on screen (according to "update" rate)
     * For instance, if we are showing distance every 10 meters, 113m will return 110m
     *
     * @param {boolean} showRaw Don't round distance to closest step
     * @param {Number} duration
     * @returns {*}
     */
    calculate(showRaw, duration) {
        let distance = this.calculateForTimestamp(duration);
        if (distance === null) return null;

        this.last.raw = distance;
        if (showRaw) return distance;

        this.last.displayed = DistanceHandler.standardizeDistance(distance);
        return this.last.displayed;
    }

    /**
     *
     * @param duration
     */
    calculateForTimestamp(duration) {
        if (this.lastAcceptableDistance === null) {
            return null;
        }

        let last = this.lastAcceptableDistance;

        if (last.locationChanged === false
            // We still have to make sure lastAcceptableDistance is not old because, if the device is stopped before start,
            // last acceptable distance will be as old as the time the device was stopped
            || last.duration - duration > LiveSessionDistanceHandling.DELAY_UNTIL_CACHED_LOCATION) {
            return last.distance;
        }

        let timeGap = duration - last.duration;
        return last.distance + timeGap * DistanceHandler.distancePerMiliSecond(last.speed);
    }

    /**
     * Calculate the number of meters traveled per mili second
     * @param speed Speed in km/h
     */
    static distancePerMiliSecond(speed) {
        return (speed * 1000) / 3600000
    }

    static standardizeDistance(distance) {
        return distance - distance % LiveSessionDistanceHandling.DISTANCE_STEP_IN_METERS;
    }
}

class CachedLocationException {
    constructor() {
    }
}

export {
    LiveUtils,
    DistanceHandler,
    CachedLocationException
}

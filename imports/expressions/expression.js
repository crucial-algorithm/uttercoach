'use strict';

import {parse} from "./grammar.js";
import {Utils} from "../utils/utils";
import {TrainingSessionData} from "../modules/training-sessions/api/collections";


/****************************
 *      Private Methods      *
 ****************************/

//TODO: Needs naming and type consolidation, but that is for now properly handled in the public API
//      - Interval and recovery could be Classes; ype is used for unit.
//      - Interval.type would be better named unit


function traverse(r, fn) {

    if (type(r) === 'Interval') {
        fn(r, false);
        if (r.recovery) fn(r.recovery, true);
    } else if (type(r) === 'Group') {
        traverseGroup(r, fn);
        if (r.recovery) fn(r.recovery, true);
    } else if (type(r) === 'Repetition') {
        traverseRepetition(r, fn);
    } else {
        console.log('[unknown type]', r, type(r));
    }
}

function traverseGroup(group, fn) {
    let out = [];
    for (let i = 0, l = group.exercises.length; i < l; i++) {
        traverse(group.exercises[i], fn);
    }
}

function traverseRepetition(repetition, fn) {
    let out = [];
    for (let i = 0; i < repetition.times; i++) {
        traverse(repetition.unit, fn);
    }
}

function toString(list) {
    let output = [];

    if (!(list instanceof Array)) {
        let out = _toString(list).substring(1);
        return out.substring(0, out.length - 1)
    }

    for (let i = 0, l = list.length; i < l; i++) {
        output.push(_toString(list[i]));
    }

    return (output.join('\n'));
}

function _toString(r) {
    if (type(r) === 'Interval') {
        return intervalToString(r);
    } else if (type(r) === 'Group') {
        return groupToString(r);
    } else if (type(r) === 'Repetition') {
        return repetitionToString(r);
    } else if (type(r) === 'Array') {
        return toString(r);
    } else {
        console.log('[unknown type]', r, type(r));
    }
}

function type(o) {
    if (o === null || o === undefined) return o;

    if (o instanceof Array)
        return 'Array';

    if (o.hasOwnProperty('exercises') && o.hasOwnProperty('recovery'))
        return 'Group';

    if (o.hasOwnProperty('duration') && o.hasOwnProperty('type'))
        return 'Interval';

    if (o.hasOwnProperty('times') && o.hasOwnProperty('unit'))
        return 'Repetition';
}

function intervalToString(o, dontPrtRecovery) {
    let out;
    out = o.duration + ' ' + o.type;
    if (o.recovery && dontPrtRecovery !== true) out += ' descansa ' + o.recovery.duration + ' ' + o.recovery.type;
    return out;
}

function repetitionToString(o) {
    return o.times + ' x ' + _toString(o.unit)
}

function groupToString(group) {
    let out = [];
    for (let i = 0, l = group.exercises.length; i < l; i++) {
        out.push(_toString(group.exercises[i]));
    }
    let g = "(" + out.join(" + ") + ")";
    if (group.recovery) g += " descansa " + group.recovery.duration + ' ' + group.recovery.type;

    return g;
}

/****************************
 *      Public Methods      *
 ****************************/

/**
 *
 * @param expression
 * @param session
 * @constructor
 */
function Expression(expression, session) {
    this._value = expression;
    this._expression = parse(expression.replace(/\s+/g, ''));
    this._flattened = null;
    this._basedInDistance = null;

    let data, start;
    if (session) {
        data = session.data;
        start = session.date.getTime();
    }

    this._session = {
        metrics: data,
        startAt: start,
        splits: undefined
    };
}

/**
 * Get unparsed expression
 * @returns {*}
 */
Expression.prototype.getRawExpr = function () {
    return this._value;
};

Expression.prototype.toString = function () {
    return toString(this._expression);
};

/**
 *
 * @returns {Interval[]}
 */
Expression.prototype.flatten = function () {
    if (this._flattened) return this._flattened;

    let list = [], self = this;
    this._basedInDistance = false;
    traverse(this._expression, function (obj, isRecovery) {
        let interval = new Interval(obj.duration, obj.type, isRecovery);
        list.push(interval);
        if (interval.isBasedInDistance()) {
            self._basedInDistance = true;
        }
    });

    // remove all recovery intervals in the end of the session
    if (list.length > 0 && list[list.length - 1].isRecovery()) {
        list.splice(list.length - 1, 1);
    }

    if (list.length > 0 && list[list.length - 1].isRecovery()) {
        list.splice(list.length - 1, 1);
    }

    let rec = false;
    let i = list.length - 1;

    while (i > -1) {

        if (list[i].isRecovery() && rec === true) {
            list.splice(i, 1);
        }
        rec = list[i].isRecovery();
        i--;
    }
    this._flattened = list;
    return list;
};


/**
 * Given a metric in a session, return if metric is from recovery interval
 *
 * @param metric
 * @returns {boolean}
 */
Expression.prototype.isRecovery = function (metric) {
    if (!this._session.metrics)
        return false;

    if (!this._session.splits)
        this._calculateSplits();

    if (metric.split < 0)
        return true;

    if (this._session.splits[metric.split])
        return this._session.splits[metric.split].isRecovery();

    if (metric.split > (this._session.splits.length - 1)) {
        // due to bugs in session generation, recovery by the end of the session was earlier considered as a split,
        // thus causing some sessions to store more splits than what current expressions evaluate to
        return true;
    }
    // should't happen
    return false;
};

/**
 * Taken in consideration an executed session, calculate session splits/intervals
 * @private
 */
Expression.prototype._calculateSplits = function() {

    if (this._session.splits) {
        return;
    }

    if (!this._session.metrics || this._session.metrics.length === 0) {
        this._session.splits = [];
        return;
    }

    // loop through metrics
    let list = this.flatten(), splits = []
        , metric, interval, /**@type Split */ split, previous = undefined
        , spm = 0, heartRate = 0, count = 0, started = false
        , bounceMax = -361, bounceMin = 361, left = 0, right = 0, lefts = 0, rights = 0, totalBounce = 0;

    if (list.length === 0 )
        return;

    for (let i = 0; i < this._session.metrics.length; i++) {
        metric = this._session.metrics[i];

        if (metric.split < 0 && !started)
            continue;

        started = true;
        if (splits[metric.split] === undefined) {

            if (split) {

                // start of recovery is the end of work
                split.setEnd(metric.timestamp);
                split.setDistanceEnd(metric.distance);
                split.setEndPosition(i - 1);


                // set metrics
                split.setAvgSpm(spm / count);
                split.setAvgHeartRate(heartRate / count);
                let avgSpeed = Utils.calculateAverageSpeed(split.getDistanceInKm(), split.getDurationInMilis());
                split.setAvgSpeed(avgSpeed);
                split.setAvgSpmEfficiency(Utils.calculateStrokeLength(spm / count, avgSpeed));
                split.setAvgBoatBounce(totalBounce / count);
                split.setAvgBoatLeftIncline(lefts > 0 ? Math.ceil(left / lefts) : 0);
                split.setAvgBoatRightIncline(rights > 0 ? Math.ceil(right / rights) : 0);

                //reset
                spm = heartRate = count = left = lefts = right = rights = totalBounce = 0;
            }

            // get new interval from session settings
            // break if no more intervals found (user didn't stopped paddling after session finished)
            interval = list.shift();
            if (!interval)
                break;

            split = new Split(metric, interval, i);
            if (split.isBasedInDistance()) {
                this._basedInDistance = true;
            }
            splits.push(split);
        }

        count++;
        spm += metric.spm;
        heartRate += (metric.heartRate || 0);

        for (let motion of metric.leftToRight) {
            if (motion.value > 0) {
                right += motion.value;
                rights++;
            }
            if (motion.value < 0) {
                left += motion.value;
                lefts++;
            }
        }

        bounceMax = -361; bounceMin = 361;
        for (let motion of metric.frontToBack) {
            if (motion === null) continue;
            if (motion.value > bounceMax) bounceMax = motion.value;
            if (motion.value < bounceMin) bounceMin = motion.value;
        }
        totalBounce += bounceMax > -361 && bounceMin < 361 ? Math.ceil(bounceMax - bounceMin) : 0;

        previous = metric;
    }

    this._session.splits = splits;

    if (!split) return;

    if (this._basedInDistance === null) {
        this._basedInDistance = false;
    }

    if (split.getEnd() === undefined) {
        split.setEnd(previous.timestamp);
    }

    if (split.getDistanceEnd() === undefined) {
        split.setDistanceEnd(previous.distance);
    }

    if (split.getEndPosition() === undefined) {
        split.setEndPosition(this._session.metrics.length - 1);
    }

    if (split.getAvgSpm() === undefined) {
        split.setAvgSpm(spm / count);
        split.setAvgHeartRate(heartRate / count);
        let avgSpeed = Utils.calculateAverageSpeed(split.getDistanceInKm(), split.getDurationInMilis());
        split.setAvgSpeed(avgSpeed);
        split.setAvgSpmEfficiency(Utils.calculateStrokeLength(spm / count, avgSpeed));
    }
};

Expression.prototype.distance = function () {
    if (!this._session.splits)
        this._calculateSplits();

    let distance = 0, last = this._session.metrics[this._session.metrics.length -1];
    this._session.splits.forEach(function (split) {
        if (split.isRecovery()) return;
        distance += (Math.min(split.distanceEnd, last.distance) - split.distanceStart);
    });

    return distance;
};

Expression.prototype.duration = function () {
    if (!this._session.splits)
        this._calculateSplits();

    let duration = 0;
    this._session.splits.forEach(function (split) {
        if (split.isRecovery()) return;
        duration += (split.end - split.start);
    });
    return duration;
};

Expression.prototype.splits = function () {
    return this._session.splits;
};

Expression.prototype.splitsJson = function () {
    let splits = [];
    if (!this._session.splits)
        this._calculateSplits();

    for (let split of this._session.splits) {
        splits.push(split.toJson())
    }
    return splits;
};

Expression.prototype.estimatedDurationSeconds = function () {
    let intervals = this.flatten(), total = 0;
    for (let interval of intervals) {
        total += interval.estimatedDurationInSeconds();
    }
    return total;
};

Expression.prototype.isBasedInDistance = function () {
    if (this._basedInDistance === null) {
        this.flatten();
    }

    return this._basedInDistance;
};


/**
 * Return estimated duration in milis, to show when scheduling sessions
 * Estimated, because it returns a duration for distance based intervals
 * @return {number}
 */
Expression.prototype.estimatedFullDuration = function () {
    let list = this.flatten();
    /**@type number */
    let total = 0;
    for (let interval of list) {
        total += interval.estimatedDurationInSeconds()
    }

    return total * 1000;
};

// duplicated in app - if changed, needs to be synced in splits measure
Expression.Units = {
    minutes: 'minutes',
    seconds: 'seconds',
    meters: 'meters',
    km: 'Kilometers'
};


/**
 *
 * @param {number} startAt  duration in miliseconds
 */
Expression.prototype.applyExpressionToFreeSession = function (startAt) {
    if (!this._session.metrics) throw 'Expression has no attached session';

    const data = this._session.metrics, splits = this.flatten();
    let stop = null, split, position = 0;
    /**@type TrainingSessionData */
    let previous = new TrainingSessionData();
    if (splits.length === 0) throw 'Expression has no splits';
    let appendRecords = [];
    split = splits.shift();
    let startPosition = findIndexForDuration(data, startAt), startRecord = data[startPosition];
    stop = calculateSplitStop(split, startRecord);
    for (let i = startPosition, l = data.length - 1; i < l; i++) {
        /**@type TrainingSessionData */
        let record = data[i];

        if (split && ((split.isBasedInDistance() && record.distance > stop) || (!split.isBasedInDistance() && record.timestamp > stop))) {
            let end = previous.clone(), start = previous.clone();
            if (split.isBasedInDistance()) {
                start.timestamp = end.timestamp = distanceToTime(previous, record, stop);
                start.distance = end.distance = stop;
            } else {
                start.timestamp = end.timestamp = stop;
                end.distance = timeToDistance(previous, record, stop);
            }
            start.split = position + 1;
            appendRecords.push({records: [end, start], index: i - 1});
            split = splits.shift();

            if (split) {
                stop = calculateSplitStop(split, start);
                position++;
            } else {
                position = -1;
            }
        }

        record.split = position;
        previous = record;
    }

    while (appendRecords.length > 0) {
        let r = appendRecords.pop();
        /**@type TrainingSessionData */
        let end = r.records[0], start = r.records[1];
        end.virtual = true;
        start.virtual = true;
        data.splice(r.index + 1, 0, end);
        data.splice(r.index + 2, 0, start);
    }
};

/**
 *
 * @param split
 * @param {TrainingSessionData} start
 */
function calculateSplitStop(split, start) {
    let stop;
    if (split.isBasedInDistance()) {
        // TODO: we are assuming that startAt is a second and that the start is in sync with session clock;
        //       If that's not the case, we should calculate start distance based on the gap between previous
        //       and current metric and speed the boat is moving
        stop = start.distance + split.getDistanceInKm();
    } else {
        stop = start.timestamp + split.getDurationInSeconds() * 1000
    }

    return stop;
}

/**
 *
 * @param {Array<TrainingSessionData>} records
 * @param duration
 */
function findIndexForDuration(records, duration) {
    for (let i = 0, l = records.length; i < l; i++) {
        const record = records[i];
        if (Math.floor(record.duration / 1000) > Math.floor(duration / 1000)) {
            return i - 1
        }
    }
    return records.length;
}


/**
 *
 * @param {TrainingSessionData} before
 * @param {TrainingSessionData} after
 * @param {number} timestamp
 *
 * @return {number}
 */
function timeToDistance(before, after, timestamp) {
    if (!before) return after.distance;
    let reference = after;
    if (Math.abs(before.timestamp - timestamp) < Math.abs(after.timestamp - timestamp)) {
        reference = before;
    }
    return reference.distance + ((timestamp - reference.timestamp) * (reference.speed / 1000)) / 1000;
}

/**
 *
 * @param {TrainingSessionData} before
 * @param {TrainingSessionData} after
 * @param {number} distance
 * @return {number}
 */
function distanceToTime(before, after, distance) {
    if (!before) return after.distance;
    let direction = -1, reference = after;

    if (Math.abs(before.distance - distance) < Math.abs(after.distance - distance)) {
        reference = before;
        direction = 1;
    }

    // speed is in meters per second
    const distInOneMili = reference.speed / 1000;
    // multiply by 1000 to convert km in meters (to match speed unit)
    const gap = Math.abs(reference.distance - distance) * 1000;

    return Math.round(reference.timestamp + (gap / distInOneMili * direction));
}


function isUnitBasedInDistance(unit) {
    switch (unit) {
        case Expression.Units.minutes:
            return false;
        case Expression.Units.seconds:
            return false;
        case Expression.Units.meters:
            return true;
        case Expression.Units.km:
            return true;
    }
    return false;
}

// TODO: use split from collections!!!
function Split(metric, interval, position) {
    this.start = metric.timestamp;
    this.end = undefined;
    this.distanceStart = metric.distance;
    this.distanceEnd = undefined;
    this.basedInDistance = false;
    this.recovery = interval.isRecovery();
    this.avgSpm = undefined;
    this.avgSpmEfficiency = undefined;
    this.avgSpeed = undefined;
    this.avgHeartRate = undefined;
    this.position = {start: position, end: undefined};
    this.duration = undefined;
    this.avgBoatBounce = null;
    this.avgBoatLeftIncline = null;
    this.avgBoatRightIncline = null;

    switch (interval.getUnit()) {
        case Expression.Units.minutes:
            this.end = this.start + interval.getDuration() * 60 * 1000;
            this.duration = interval.getDuration() + "'";
            break;
        case Expression.Units.seconds:
            this.end = this.start + interval.getDuration() * 1000;
            this.duration = interval.getDuration() + "''";
            break;
        case Expression.Units.meters:
            this.basedInDistance = true;
            this.distanceEnd = metric.distance + interval.getDuration() / 1000;
            this.duration = interval.getDuration() + "m";
            break;
        case Expression.Units.km:
            this.basedInDistance = true;
            this.distanceEnd = metric.distance + interval.getDuration();
            this.duration = interval.getDuration() + "km";
            break;
    }
}

Split.prototype.getDistanceInKm = function() {
    return this.distanceEnd - this.distanceStart;
};

Split.prototype.getDurationInMilis = function() {
    return this.end - this.start;
};

Split.prototype.isRecovery = function () {
    return this.recovery;
};

Split.prototype.getDistanceStart = function () {
    return this.distanceStart;
};

Split.prototype.setDistanceEnd = function(value) {
    this.distanceEnd = value;
};

Split.prototype.getDistanceEnd = function () {
    return this.distanceEnd;
};

Split.prototype.setEnd = function(value) {
    this.end = value;
};

Split.prototype.getEnd = function () {
    return this.end;
};

Split.prototype.setEndPosition = function(value) {
    this.position.end = value;
};

Split.prototype.getEndPosition = function () {
    return this.position.end;
};

Split.prototype.setAvgSpm = function(value) {
    this.avgSpm = value;
};

Split.prototype.getAvgSpm = function() {
    return this.avgSpm;
};

Split.prototype.setAvgSpmEfficiency = function(value) {
    this.avgSpmEfficiency = value;
};

Split.prototype.getAvgEfficiency = function() {
    return this.avgSpmEfficiency;
};

Split.prototype.setAvgSpeed = function(value) {
    this.avgSpeed = value;
};

Split.prototype.getAvgSpeed = function() {
    return this.avgSpeed;
};

Split.prototype.setAvgHeartRate = function(value) {
    this.avgHeartRate = value;
};

Split.prototype.getAvgHeartRate = function() {
    return this.avgHeartRate
};

Split.prototype.setAvgBoatBounce = function(value) {
    this.avgBoatBounce = value;
};

Split.prototype.getAvgBoatBounce = function() {
    return this.avgBoatBounce
};

Split.prototype.setAvgBoatLeftIncline = function(value) {
    this.avgBoatLeftIncline = value;
};

Split.prototype.getAvgBoatLeftIncline = function() {
    return this.avgBoatLeftIncline
};

Split.prototype.setAvgBoatRightIncline = function(value) {
    this.avgBoatRightIncline = value;
};

Split.prototype.getAvgBoatRightIncline = function() {
    return this.avgBoatRightIncline
};


Split.prototype.isBasedInDistance = function() {
    return this.basedInDistance;
};



Split.prototype.toJson = function () {
    return {
        start: this.start,
        end: this.end,
        distanceStart: this.distanceStart,
        distanceEnd: this.distanceEnd,
        basedInDistance: this.basedInDistance,
        recovery: this.recovery,
        avgSpm: this.avgSpm,
        avgSpmEfficiency: this.avgSpmEfficiency,
        avgHeartRate: this.avgHeartRate,
        avgSpeed: this.avgSpeed,
        position: this.position,
        duration: this.duration,
        avgBoatBounce: this.avgBoatBounce,
        avgBoatLeftIncline: this.avgBoatLeftIncline,
        avgBoatRightIncline: this.avgBoatRightIncline
    }
};


function Interval(duration, unit, isRecovery) {
    this._duration = duration;
    this._unit = unit;
    this._recovery = isRecovery;
}

Interval.prototype.getDuration = function () {
    return this._duration;
};

Interval.prototype.setDuration = function (value) {
    this._duration = value;
};

Interval.prototype.getUnit = function () {
    return this._unit;
};

Interval.prototype.setUnitToSeconds = function () {
    this._unit = Expression.Units.seconds;
};

Interval.prototype.isRecovery = function () {
    return this._recovery;
};

Interval.prototype.isBasedInDistance = function () {
    return isUnitBasedInDistance(this._unit);
};

Interval.prototype.getDistanceInKm = function () {
    switch (this._unit) {
        case Expression.Units.km:
            return this._duration;
        case Expression.Units.meters:
            return this._duration / 1000;
    }

    return null;
};

Interval.prototype.getDurationInSeconds = function () {
    switch (this._unit) {
        case Expression.Units.minutes:
            return this._duration * 60;
        case Expression.Units.seconds:
            return this._duration;
    }
    return null;
};

Interval.prototype.estimatedDurationInSeconds = function () {
    switch (this._unit) {
        case Expression.Units.seconds:
            return this._duration;
        case Expression.Units.minutes:
            return this._duration * 60;
        case Expression.Units.km:
            if (this._recovery)
                return this._duration * 6 * 60;
            else
                return this._duration * 5 * 60;
        case Expression.Units.meters:
            if (this._recovery)
                return this._duration / 1000 * 6 * 60;
            else
                return this._duration / 1000 * 5 * 60;

    }
};

Interval.prototype.toString = function () {
    let unit;
    switch (this._unit) {
        case Expression.Units.seconds:
            unit = '\'\'';
            break;
        case Expression.Units.minutes:
            unit = '\'';
            break;
        case Expression.Units.km:
            unit = 'km';
            break;
        case Expression.Units.meters:
            unit = 'm';
            break;
    }

    return `${this._duration}${unit}`;
};

export {Expression, Interval};

'use strict';

import {Utils} from "../../../utils/utils.js";
import {
    TrainingSession,
    TrainingSessionsDailySummary,
    TrainingSessionsWeeklySummary,
    TrainingSessionsMonthlySummary,
    TrainingSessionsYearlySummary
} from "./collections.js";
import {CoachTrainingSessions, CoachTrainingExpressions} from "../../coaches/api/collections";

import {Expression} from "../../../expressions/expression";
import {LiveUtils} from "../../live/api/utils";
import {logger} from "../../../utils/logger";
import i18n from "../../../utils/i18n";
import {Athlete} from "../../athletes/api/collections";
import {TrainingSessionData} from "./collections";

let migrationsFromAppToServer = [
    // 0
    function (session) { return session },

    // 1
    function (session) {
        if (!session.coachTrainingSessionId) {
            return session;
        }

        let coachTrainingSession = CoachTrainingSessions.findOne({_id: session.coachTrainingSessionId});
        let trainingExpression = CoachTrainingExpressions.byId(coachTrainingSession.expressionId);

        session.expression = trainingExpression.text;

        return Object.assign({}, session);
    },

    // 2 - Version non existent in app (created upon migration of aggregates)
    function (session) {return session},

    // 3 - Added magnitude and strokes count
    function (session) {
        for (let i = 0; i < session.data.length; i++) {
            session.data[i].strokes = null;
            session.data[i].magnitude = null;
        }
        return session;
    },

    // 4 - Added motion data into session data
    function (session) {
        for (let i = 0; i < session.data.length; i++) {
            session.data[i].leftToRight = [];
            session.data[i].frontToBack = [];
            session.data[i].rotation = [];
        }
        return session;
    },

    // 5 - added altitude, paused time and session type
    function (session) {
        session.pausedDuration = 0;
        session.elevation = 0;
        session.type = TrainingSession.TYPES().CANOEING;
        for (let i = 0; i < session.data.length; i++) {
            session.data[i].altitude = 0;
        }
        return session;
    }
];

class SessionAlreadyExistsException {
    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    constructor(id) {

        this._id = id;
    }
}

const TrainingSessionsUtils = {

    /**
     *
     * @param sessionId
     * @param expressionStatement
     * @param startAt
     * @param persist
     * @return {TrainingSession}
     */
    calculateSplitsInFreeSession: function (sessionId, expressionStatement, startAt, persist = true) {
        let session = TrainingSession.find(sessionId);
        session.data = session.data.map((r) => {
            r.split = -1;
            return r
        });
        let expression = new Expression(expressionStatement, session);
        expression.applyExpressionToFreeSession(startAt);

        session.expression = expressionStatement;
        session.coachTrainingSessionStart = startAt;

        let convertedSession = TrainingSessionsUtils.processTrainingSession(session.toJson(), true);
        convertedSession.coachTrainingSessionStart = startAt;
        convertedSession.id = session.id;
        if (persist) convertedSession.attachExpressionToFreeSession();
        return convertedSession;
    },

    resetSessionBackToFreeSession: function (sessionId) {
        let session = TrainingSession.find(sessionId);
        let data = [];
        for (let r of session.data) {
            if (r.virtual === true) continue;
            r.split = -1;
            data.push(r);
        }

        session.data = data;
        session.expression = null;
        session.coachTrainingSessionStart = null;
        let convertedSession = TrainingSessionsUtils.processTrainingSession(session.toJson(), true);
        convertedSession.id = session.id;
        convertedSession.resetExpressionFromSession();
    },

    /**
     *
     * @param trainingSession
     * @param force
     *
     * @returns {TrainingSession}
     */
    processTrainingSession: function (trainingSession, force = false) {

        if (!trainingSession) {
            throw 'Invalid training session';
        }

        trainingSession = Utils.applyMigrations(migrationsFromAppToServer, trainingSession
            , trainingSession.version, TrainingSession.version().LATEST);

        if (trainingSession.timestamp) {
            trainingSession.date = new Date(trainingSession.timestamp)
        } else if (!(trainingSession.date instanceof Date)) {
            throw 'Invalid date: ' + trainingSession.date;
        }

        if (!trainingSession.data || !Array.isArray(trainingSession.data)) {
            throw 'Invalid training session data';
        }

        if (trainingSession.data.length === 0) {
            throw 'Empty session';
        }

        /**
         * @type {TrainingSession}
         */
        let session = TrainingSession.findByUserAndDate(trainingSession.user, trainingSession.date);
        if (session !== null && force === false) {
            throw new SessionAlreadyExistsException(session.id);
        }

        session = new TrainingSession();
        session.type = trainingSession.type;
        session.pausedDuration = trainingSession.pausedDuration;
        session.user = trainingSession.user;
        session.date = trainingSession.date;

        const athlete = Athlete.find(trainingSession.user);

        if (trainingSession.expression) {
            session.expression = trainingSession.expression;
        }

        if (Utils.isNumeric(trainingSession.angleZ)) {
            session.angleZ = trainingSession.angleZ;
        }

        if (Utils.isNumeric(trainingSession.noiseX)) {
            session.noiseX = trainingSession.noiseX;
        }

        if (Utils.isNumeric(trainingSession.noiseZ)) {
            session.noiseZ = trainingSession.noiseZ;
        }

        if (Utils.isNumeric(trainingSession.factorX)) {
            session.factorX = trainingSession.factorX;
        }

        if (Utils.isNumeric(trainingSession.factorZ)) {
            session.factorZ = trainingSession.factorZ;
        }

        if (Utils.isNumeric(trainingSession.axis)) {
            session.axis = trainingSession.axis;
        }

        if (typeof trainingSession.coachTrainingSessionId === 'string') {
            session.coachTrainingSessionId = trainingSession.coachTrainingSessionId;
        }

        if (typeof trainingSession.coachTrainingSessionStart === "number") {
            session.coachTrainingSessionStart = trainingSession.coachTrainingSessionStart;
        }

        let i,
            len = trainingSession.data.length,
            data,
            totalSpeed = 0,
            minSpeed = null,
            maxSpeed = 0,
            totalWorkingSpm = 0,
            totalSpm = 0,
            minSpm = null,
            maxSpm = 0,
            totalSpmEfficiency = 0,
            minSpmEfficiency = null,
            maxSpmEfficiency = 0,
            totalHeartRate = 0,
            totalWorkingHeartRate = 0,
            minHeartRate = null,
            maxHeartRate = 0
        ;

        if (len === 0) return session;

        let expression, start = null, isScheduledSession = session.isScheduledSession();

        if (isScheduledSession) {
            expression = new Expression(session.expression, trainingSession);
            if (typeof trainingSession.coachTrainingSessionStart === "number") {
                start = trainingSession.coachTrainingSessionStart;
            }
        }

        if (!isScheduledSession) {
            logger.debug(`Search live session using gap of ${trainingSession.serverClockGap}`);

            // TODO: expression should be an interface!
            expression = LiveUtils.calculateSplitDataFromLiveForSession(trainingSession);
            if (expression !== null) {
                logger.debug('Enriched uploaded session with live data from: ' + expression.liveSessionId);
                isScheduledSession = true;

            }
        }

        let measures = 0;
        for (i = 0; i < len; i++) {

            data = trainingSession.data[i];
            totalSpm += data.spm;
            totalHeartRate += (data.heartRate === undefined || data.heartRate === null) ? 0 : data.heartRate;

            let record = new TrainingSessionData(data.timestamp, data.distance, data.speed, data.spm
                , data.spmEfficiency, data.latitude || 0, data.longitude || 0, data.altitude || 0
                , data.heartRate, false, data.strokes, data.magnitude, data.split
                , data.leftToRight, data.frontToBack, data.rotation, data.timestamp - session.date.getTime()
                , data.virtual === true); // only used when converting free to scheduled sessions


            if (expression && expression.isRecovery(data) || (start !== null && data.timestamp < start)) {
                record.recovery = true;
                session.data.push(record);
                continue;
            }

            // speed
            totalSpeed += data.speed;

            // min speed
            if (minSpeed === null || data.speed < minSpeed) {
                minSpeed = data.speed;
            }

            // max speed
            if (data.speed > maxSpeed) {
                maxSpeed = data.speed;
            }

            // spm
            totalWorkingSpm += data.spm;

            // min spm
            if (minSpm === null || data.spm < minSpm) {
                minSpm = data.spm;
            }

            // max spm
            if (data.spm > maxSpm) {
                maxSpm = data.spm;
            }

            // spm efficiency
            totalSpmEfficiency += data.spmEfficiency;

            // min spm efficiency
            if (minSpmEfficiency === null || data.spmEfficiency < minSpmEfficiency) {
                minSpmEfficiency = data.spmEfficiency;
            }

            // max spm efficiency
            if (data.spmEfficiency > maxSpmEfficiency) {
                maxSpmEfficiency = data.spmEfficiency;
            }

            // heart rate
            totalWorkingHeartRate += (data.heartRate === undefined || data.heartRate === null) ? 0 : data.heartRate;

            // min heart rate
            if (minHeartRate === null || data.heartRate < minHeartRate) {
                minHeartRate = data.heartRate;
            }

            // max heart rate
            if (data.heartRate > maxHeartRate) {
                maxHeartRate = data.heartRate;
            }

            session.data.push(record);
            measures++;
        }

        if (isScheduledSession) {
            session.duration = expression.duration();
            session.distance = expression.distance();
            session.splits = expression.splitsJson();

            session.fullDuration = session.data[len - 1].timestamp - session.data[0].timestamp;
            session.fullDistance = session.data[len - 1].distance;

        } else {
            session.fullDuration = session.data[len - 1].timestamp - session.data[0].timestamp;
            session.duration = session.fullDuration - session.pausedDuration;
            session.fullDistance = session.distance = session.data[len - 1].distance;
        }

        session.avgSpeed = Utils.calculateAverageSpeed(session.distance, session.duration);
        session.minSpeed = minSpeed || 0;
        session.maxSpeed = maxSpeed;

        let total = isScheduledSession ? totalWorkingSpm : totalSpm;
        session.avgSpm = +(isNaN(total / measures) ? 0 : total / measures).toFixed(3);
        session.minSpm = minSpm || 0;
        session.maxSpm = maxSpm;
        session.avgSpmEfficiency = Utils.calculateStrokeLength(session.avgSpm, session.avgSpeed);
        session.minSpmEfficiency = minSpmEfficiency || 0;
        session.maxSpmEfficiency = maxSpmEfficiency;
        total = isScheduledSession ? totalWorkingHeartRate : totalHeartRate;
        session.avgHeartRate = +(isNaN(total / measures) ? 0 : total / measures).toFixed(3);
        session.minHeartRate = minHeartRate || 0;
        session.maxHeartRate = maxHeartRate;
        session.serverClockGap = trainingSession.serverClockGap;
        session.version = TrainingSession.version().LATEST;
        session.userHeartRate = {max: athlete.maxHeartRate, resting: athlete.restingHeartRate};
        session.boat = athlete.boat;
        // lets calculate instead of trusting the client - if later we want to upgrade the way we calculate on the server
        // we will be able to do it faster
        session.elevation = session.calculateElevationGain();

        return session;
    },


    /**
     *
     * @param {TrainingSession}                 trainingSession
     * @param {boolean}                         persist             Save aggregations to database
     * @param {Array<TrainingSessionData>}      data                Use data array instead of data included in trainingSession
     * @return {{spmZonesToSpeed: any[], sumSpm: number, sumHeartRate: number, speedZones: any[], sumMetrics: number, heartRateFullZones: any[], heartRateZones: any[], sumFullHeartRate: number, sumFullSpm: number, sumFullMetrics: *, speedFullZones: any[], spmFullZones: any[], spmZones: any[]}}
     */
    calculateAggregations: function (trainingSession, persist = true, data = null) {
        const athlete = Athlete.find(trainingSession.user);

        let totalWorkingSpm, totalSpm, totalHeartRate, totalWorkingHeartRate, workingMetrics = 0;

        let spmZones = new Array(athlete.strokeRateZones.length).fill(0)
            , spmFullZones = new Array(athlete.strokeRateZones.length).fill(0)

            , speedZones = new Array(athlete.speedZones.length).fill(0)
            , speedFullZones = new Array(athlete.speedZones.length).fill(0)

            , hrZones = new Array(athlete.heartRateZones.length).fill(0)
            , hrFullZones = new Array(athlete.heartRateZones.length).fill(0);

        data = data || trainingSession.data;

        let result = calculateIntervals(data, athlete.strokeRateZones.slice(0), "spm", spmZones, spmFullZones);
        totalWorkingSpm = result.working;
        totalSpm = result.total;
        workingMetrics = result.workingCount;

        result = calculateIntervals(data, athlete.heartRateZones.slice(0), "heartRate", hrZones, hrFullZones, function (hr) {
            return Utils.heartRateReserveCalculation(athlete.restingHeartRate, athlete.maxHeartRate, hr);
        });
        totalWorkingHeartRate = result.working;
        totalHeartRate = result.total;

        calculateIntervals(data, athlete.speedZones.slice(0), "speed", speedZones, speedFullZones);

        const spmToSpeedData = spmToSpeedCorrelation(data, athlete.strokeRateZones.slice(0));

        if (persist === true) {
            trainingSession.updateAggregates(workingMetrics
                , data.length
                , totalWorkingSpm, totalSpm, totalWorkingHeartRate, totalHeartRate
                , spmZones, spmFullZones, speedZones, speedFullZones, hrZones, hrFullZones
                , spmToSpeedData);
        }

        return {
            sumMetrics: workingMetrics, sumFullMetrics: trainingSession.data.length
            , sumSpm: totalWorkingSpm, sumFullSpm: totalSpm
            , sumHeartRate: totalWorkingHeartRate, sumFullHeartRate: totalHeartRate
            , spmZones: spmZones, spmFullZones: spmFullZones
            , speedZones: speedZones, speedFullZones: speedFullZones
            , heartRateZones: hrZones, heartRateFullZones: hrFullZones
            , spmZonesToSpeed: spmToSpeedData
        }
    },


    /**
     *
     * @param {TrainingSession} trainingSession
     * @param remove
     */
    updateSummaryData: function (trainingSession, remove) {

        let self = this
            , userId = trainingSession.user
            , referenceDate = moment(trainingSession.date.getTime())
            , i
            , ranges = ['day', 'week', 'month', 'year']
            , range
            , collection
            , dateRange;

        referenceDate.hours(12).minutes(0).seconds(0);

        for (i = 0; i < ranges.length; i++) {

            range = ranges[i];
            let date = referenceDate.clone();
            if (range === 'week') {
                date = date.startOf('isoWeek').hours(12).minutes(0).seconds(0);
            } else if (range === 'month') {
                date = date.startOf('month').hours(12).minutes(0).seconds(0);
            } else if (range === 'year') {
                date = date.startOf('year').hours(12).minutes(0).seconds(0);
            }


            collection = self.getSummaryCollection(range);

            // check if aggregation is already registered
            if (collection.byDateRange(userId, referenceDate.toDate()).count() === 0) {

                // nothing registered for this range / nothing to be removed (this shouldn't happen)
                if (remove) {
                    return;
                }

                // no summary structure available for this aggregation (let's create it)
                collection.insert({
                    user: userId,
                    date: date.toDate(),
                    sumDistance: trainingSession.distance,
                    sumFullDistance: trainingSession.fullDistance,
                    sumDuration: trainingSession.duration,
                    sumFullDuration: trainingSession.fullDuration,
                    sumSpm: trainingSession.aggregates.sumSpm,
                    sumFullSpm: trainingSession.aggregates.sumSpm,
                    sumHeartRate: trainingSession.aggregates.sumHeartRate,
                    sumFullHeartRate: trainingSession.aggregates.sumFullHeartRate,
                    sumMetrics: trainingSession.aggregates.sumMetrics,
                    sumFullMetrics: trainingSession.aggregates.sumFullMetrics,
                    sumSessions: trainingSession.aggregates.sumSessions,
                    spmZones: trainingSession.aggregates.spmZones,
                    spmFullZones: trainingSession.aggregates.spmFullZones,
                    speedZones: trainingSession.aggregates.speedZones,
                    speedFullZones: trainingSession.aggregates.speedFullZones,
                    heartRateZones: trainingSession.aggregates.heartRateZones,
                    heartRateFullZones: trainingSession.aggregates.heartRateFullZones,
                    spmZonesToSpeed: trainingSession.aggregates.spmZonesToSpeed
                });

            } else {

                dateRange = Utils.getDateRange(referenceDate.toDate(), range);
                let multiple = remove === true ? -1 : 1;

                let updateObj = {
                    sumDistance: multiple * trainingSession.distance,
                    sumFullDistance: multiple * trainingSession.fullDistance,
                    sumDuration: multiple * trainingSession.duration,
                    sumFullDuration: multiple * trainingSession.fullDuration,
                    sumSpm: multiple * trainingSession.aggregates.sumSpm,
                    sumFullSpm: multiple * trainingSession.aggregates.sumSpm,
                    sumHeartRate: multiple * trainingSession.aggregates.sumHeartRate,
                    sumFullHeartRate: multiple * trainingSession.aggregates.sumFullHeartRate,
                    sumMetrics: multiple * trainingSession.aggregates.sumMetrics,
                    sumFullMetrics: multiple * trainingSession.aggregates.sumFullMetrics,
                    sumSessions: multiple
                };

                let generateUpdateForZones = function(zones, key, obj) {
                    for (let i = 0, l = zones.length; i < l; i++) {
                        obj[`${key}.${i}`] = multiple * zones[i];
                    }
                };

                generateUpdateForZones(trainingSession.aggregates.speedZones, "speedZones", updateObj);
                generateUpdateForZones(trainingSession.aggregates.speedFullZones, "speedFullZones", updateObj);
                generateUpdateForZones(trainingSession.aggregates.spmZones, "spmZones", updateObj);
                generateUpdateForZones(trainingSession.aggregates.spmFullZones, "spmFullZones", updateObj);
                generateUpdateForZones(trainingSession.aggregates.heartRateZones, "heartRateZones", updateObj);
                generateUpdateForZones(trainingSession.aggregates.heartRateFullZones, "heartRateFullZones", updateObj);

                for (let i = 0, l = trainingSession.aggregates.spmZonesToSpeed.length; i < l; i++) {
                    updateObj[`spmZonesToSpeed.${i}.count`] = multiple * trainingSession.aggregates.spmZonesToSpeed[i].count;
                    updateObj[`spmZonesToSpeed.${i}.total`] = multiple * trainingSession.aggregates.spmZonesToSpeed[i].total;
                }

                // update aggregation summary
                collection.update({user: userId, date: {$gte: dateRange.start, $lt: dateRange.end}}, {
                    $inc: updateObj
                });
            }
        }
    },


    /**
     *
     * @param range
     *
     * @returns {*}
     */
    getSummaryCollection: function (range) {

        switch (range) {

            case 'day':
                return TrainingSessionsDailySummary;
            case 'week':
                return TrainingSessionsWeeklySummary;
            case 'month':
                return TrainingSessionsMonthlySummary;
            case 'year':
                return TrainingSessionsYearlySummary;
            default:
                return null;
        }
    },


    /**
     *
     * @param trainingSession
     *
     * @returns {*}
     */
    trainingSessionTitle: function (trainingSession) {

        if (!trainingSession) {
            return i18n.translate("main_sidebar_menu_athlete_training_session");
        }

        if (trainingSession.description) {
            return trainingSession.description + ' (' + Utils.displayDate(trainingSession.date, true) + ')';
        }

        return Utils.displayDate(trainingSession.date, true);
    },


    /**
     *
     * @param debugSession
     *
     * @returns {{trainingSession: *, data: Array}}
     */
    processTrainingSessionDebug: function (debugSession) {

        if (!debugSession) {
            throw 'Invalid debug session';
        }

        if (!debugSession.trainingSession) {
            throw 'Invalid training session';
        }

        if (!debugSession.data || !Array.isArray(debugSession.data)) {
            throw 'Invalid debug session data';
        }

        var dSession = {
            trainingSession: debugSession.trainingSession,
            data: []
        };

        var i,
            len = debugSession.data.length,
            data;

        if (len > 0) {

            for (i = 0; i < len; i++) {

                data = debugSession.data[i];

                if (!Utils.isNumeric(data.timestamp)) {
                    throw 'Invalid timestamp: ' + data.timestamp;
                }

                if (!Utils.isNumeric(data.x)) {
                    throw 'Invalid x: ' + data.x;
                }

                if (!Utils.isNumeric(data.y)) {
                    throw 'Invalid y: ' + data.y;
                }

                if (!Utils.isNumeric(data.z)) {
                    throw 'Invalid z: ' + data.z;
                }

                if (!Utils.isNumeric(data.value)) {
                    throw 'Invalid value: ' + data.value;
                }

                dSession.data.push({
                    timestamp: data.timestamp,
                    x: data.x,
                    y: data.y,
                    z: data.z,
                    value: data.value
                });
            }
        }

        return dSession;
    }
};


function loopIntervals(data, zones, property, working, all, process = function (value) {
    return Math.floor(value)
}) {
    let index = -1;

    while (zones.length > 0) {
        let zone = zones.shift();
        index++;

        for (let record of data) {
            let value = process(record[property]);

            if (value >= zone.start && value <= zone.end) {
                all.apply({}, [record[property], index, record]);

                if (record.recovery) continue;
                working.apply({}, [record[property], index, record]);
            }
        }
    }
}

/**
 *
 * @param {TrainingSessionData[]}           data            Training session data
 * @param {{start: number, end: number}[]}  zones           Training zones
 * @param {string}                          property        Either spm, speed or heartRate, according to zone to process
 * @param {number[]}                        aggregator      Empty array, stores the results for the processed zones
 * @param {number[]}                        aggregatorFull  Empty array, stores the results for the processed zones
 * @param {function}                        [process]       Optional function to be used to calculate value to match
 *                                                          the zone with
 * @returns {{workingCount: number, total: number, working: number}}
 */
function calculateIntervals(data, zones, property, aggregator, aggregatorFull, process = function (value) {
    return Math.floor(value)
}) {
    let total = 0, working = 0, count = 0;

    loopIntervals(data, zones, property, function (value, position) {
        count++;
        aggregator[position]++;
        working += value;
    }, function all(value, position) {
        aggregatorFull[position]++;
        total += value;
    }, process);


    return {
        working: working,
        workingCount: count,
        total: total
    }
}

function spmToSpeedCorrelation(data, zones = []) {
    let output = new Array(zones.length).fill(null);
    loopIntervals(data, zones, "spm", function (value, position, record) {
        if (output[position] === null) output[position] = {count: 0, total: 0};
        output[position].total += record.speed;
        output[position].count += 1;
    }, function all(value) {
        // intentionally left blank
    });

    for (let i = 0; i < output.length; i++) {
        if (output[i] === null) {
            output[i] = {count: 0, total: 0};
        }
    }

    return output;
}

export {
    TrainingSessionsUtils,
    SessionAlreadyExistsException
}


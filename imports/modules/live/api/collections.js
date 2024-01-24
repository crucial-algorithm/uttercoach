import {
    IntervalType,
    LiveDeviceCommands, LiveDevicesStatus, LiveSessionDelays,
    LiveSessionType
} from './liveDevicesConstants';
import {Expression} from "../../../expressions/expression";
import {LiveUtils} from "./utils";
import {logger} from "../../../utils/logger";
import {CoachUtils} from "../../coaches/api/utils";
import {Coach} from "../../coaches/api/collections";

/*  Live Sessions  */
/*-----------------*/
let LiveSessionCollection = new Mongo.Collection('liveSession', {idGeneration: 'STRING'});
LiveSessionCollection.attachSchema(new SimpleSchema({
    coach: {
        type: String,
        label: 'Coach live session belongs to'
    },
    active: {
        type: Boolean,
        label: 'Session is active or not'
    },
    type: {
        type: String,
        label: 'Session type - free, distance based, ...'
    },
    expression: {
        type: String,
        label: 'Session expression/layout',
        optional: true
    },
    split: {
        type: Number,
        label: 'Session split'
    },
    startedAt: {
        type: Number,
        label: "Timestamp of start"
    },
    finishedWarmUpAt: {
        type: Number,
        label: "Timestamp of finish warm-up",
        optional: true
    },
    finishedAt: {
        type: Number,
        label: "Timestamp of finish",
        optional: true
    },
    devices: {
        type: [String],
        label: 'devices'
    },
    solo: {
        type: Boolean,
        label: "Started by athlete (true) or coach (false)"
    },
    createdAt: {
        type: Number,
        label: "created timestamp"
    },
    notes: {
        type: String,
        label: "notes about session issues for debugging purposes",
        optional: true
    }
}));
class LiveSession {

    constructor(coachId, active, expression, split, startedAt, devices) {
        this._id = null;
        this._coach = coachId;
        this._active = active;
        this._split = split;
        this._finishedAt = null;
        this._expression = expression;
        this._startedAt = startedAt;
        this._devices = devices;
        this._type = LiveSessionType.FREE;
        this._solo = false;
        this._finishedWarmUpAt = null;
        this._createdAt = Date.now();

        if (expression) {
            let expr = new Expression(expression);
            if (expr.isBasedInDistance()) {
                this.type = LiveSessionType.DISTANCE;
            } else {
                this.type = LiveSessionType.TIME;
            }
        }

        this._notes = null;
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get coach() {
        return this._coach;
    }

    set coach(value) {
        this._coach = value;
    }

    get active() {
        return this._active;
    }

    set active(value) {
        this._active = value;
    }

    get type() {
        return this._type;
    }

    set type(value) {
        this._type = value;
    }

    get expression() {
        return this._expression;
    }

    set expression(value) {
        this._expression = value;
    }

    get split() {
        return this._split;
    }

    set split(value) {
        this._split = value;
    }

    get startedAt() {
        return this._startedAt;
    }

    set startedAt(value) {
        this._startedAt = value;
    }

    get finishedWarmUpAt() {
        return this._finishedWarmUpAt;
    }

    set finishedWarmUpAt(value) {
        this._finishedWarmUpAt = value;
    }

    get devices() {
        return this._devices;
    }

    set devices(value) {
        this._devices = value;
    }

    get finishedAt() {
        return this._finishedAt;
    }

    set finishedAt(value) {
        this._finishedAt = value;
    }

    get solo() {
        return this._solo;
    }

    set solo(value) {
        this._solo = value;
    }

    get createdAt() {
        return this._createdAt;
    }

    set createdAt(value) {
        this._createdAt = value;
    }

    get notes() {
        return this._notes;
    }

    set notes(value) {
        this._notes = value;
    }

    get duration() {
        return this.finishedAt - this.startedAt
    }

    /**
     *
     * @returns {boolean}
     */
    isFinished() {
        return this.finishedAt > 0;
    }

    /**
     *
     * @returns {boolean}
     */
    isDistanceBased() {
        return this.type === LiveSessionType.DISTANCE
    }

    insert() {
        this.id = LiveSessionCollection.insert({
            coach: this.coach,
            active: this.active,
            type: this.type,
            expression: this.expression,
            split: this.split,
            startedAt: this.startedAt,
            finishedAt: this.finishedAt,
            devices: this.devices,
            solo: this.solo,
            createdAt: this.createdAt,
            notes: this.notes
        });
        return this.id;
    }

    /**
     *
     * @param record
     * @returns {LiveSession}
     */
    static instantiateFromRecord(record) {
        if (!record) return null;

        let session = new LiveSession(record.coach, record.active, record.expression, record.split, record.startedAt, record.devices);
        session.id = record._id;
        session.finishedAt = record.finishedAt;
        session.splits = record.splits;
        session.type = record.type;
        session.solo = record.solo;
        session.finishedWarmUpAt = record.finishedWarmUpAt;
        session.createdAt = record.createdAt;
        session.notes = record.notes;

        return session;
    }


    calculateDurationAsCoach() {
        let currentTime = Date.now() + LiveUtils.coachOffset(Meteor.userId());
        return currentTime - this.startedAt;
    }

    /**
     *
     * @param id
     * @returns {LiveSession}
     */
    static find(id) {
        return LiveSession.instantiateFromRecord(LiveSessionCollection.findOne({_id: id}));
    }

    /**
     *
     * @returns {LiveSession[]}
     */
    static findAll() {
        let results = [];
        let records = LiveSessionCollection.find({}).fetch();
        for (let record of records) {
            results.push(LiveSession.instantiateFromRecord(record));
        }
        return results;
    }

    static findActive() {
        let results = [];
        let records = LiveSessionCollection.find({active: true}).fetch();
        for (let record of records) {
            results.push(LiveSession.instantiateFromRecord(record));
        }
        return results;
    }

    /**
     *
     * @returns {LiveSession[]}
     */
    static findFinished() {
        let results = [];
        let records = LiveSessionCollection.find({active: false}).fetch();
        for (let record of records) {
            results.push(LiveSession.instantiateFromRecord(record));
        }
        return results;
    }

    /**
     *
     * @param {Number} startedAt
     * @param {String} athleteId
     * @returns {LiveSession}
     */
    static findMatchForAthleteSession(startedAt, athleteId) {
        let liveSession = LiveSession.instantiateFromRecord(LiveSessionCollection.findOne({
            devices: athleteId,
            $and: [{startedAt: {$gte: startedAt - 2500}}, {startedAt: {$lte: startedAt + 2500}}]
        }));

        if (!liveSession) {
            return null;
        }

        return liveSession;
    }

    /**
     *
     * @param athleteId
     * @returns {LiveSession}
     */
    static findAthleteSoloLiveSession(athleteId) {
        return LiveSession.instantiateFromRecord(LiveSessionCollection.findOne({
            active: true,
            devices: athleteId
        }));

    }

    /**
     *
     * @param athleteId
     */
    static finishRunningAthleteSoloLiveSessions(athleteId) {
        LiveSessionCollection.update({devices: athleteId, solo: true, finishedAt: null}, {
            $set: {
                finished: Date.now(),
                active: false
            }
        }, {multi: true})
    }

    static cursorFindSession(id) {
        return LiveSessionCollection.find({_id: id});
    }

    static cursorCoachActiveSession(coachId) {
        let ids = [];
        let coach = Coach.find(coachId);
        if (coach) {
            ids = coach.athleteIds();
        }
        return LiveSessionCollection.find({
            active: true,
            $or: [{coach: coachId}, {devices: {$in: ids}}]
        });
    }

    static cursorSessionsLastXDays(coachId, days) {
        let ids = [];
        let coach = Coach.find(coachId);
        if (coach) {
            ids = coach.athleteIds();
        }
        return LiveSessionCollection.find({
            startedAt: {$gte: Date.now() - 86400 * 1000 * days},
            devices: {$in: ids}
        });
    }

    static finishSession(id, finishedAt) {
        LiveSessionCollection.update({_id: id}, {$set: {active: false, finishedAt: finishedAt}});
    }

    static incrementSplit(id) {
        LiveSessionCollection.update({_id: id}, {
            $inc: {
                split: 1
            }
        });
    }

    static finishWarmUp(id, timestamp) {
        LiveSessionCollection.update({_id: id}, {$set: {finishedWarmUpAt: timestamp}, $inc: {split: 1}})
    }

    static updateDevices(id, devices) {
        LiveSessionCollection.update({_id: id}, {$set: {devices: devices}})
    }

    static updateNotes(id, notes) {
        LiveSessionCollection.update({_id: id}, {$set: {notes: notes}})
    }

    static appendDevice(id, device) {
        LiveSessionCollection.update({_id: id}, {$push: {devices: device}})
    }
}

/*  Live (online) Devices  */
/*-------------------------*/
let LiveDevices = new Mongo.Collection('liveDevices');
let latencySchema = new SimpleSchema({
    count: {
        type: Number,
        label: "Total number of samples"
    },
    duration: {
        type: Number,
        label: "accumulated value of latency",
        decimal: true
    },
    clock: {
        type: Number,
        label: "difference in milliseconds between clocks",
        decimal: true
    },
    finishedAt: {
        type: Number,
        label: "timestamp when latency was last calculated",
        optional: true
    }
});
LiveDevices.attachSchema(new SimpleSchema({
    status: {
        type: String,
        label: "Device status",
        allowedValues: [LiveDevicesStatus.OFFLINE, LiveDevicesStatus.RUNNING
            , LiveDevicesStatus.READY, LiveDevicesStatus.FINISHED]
    },
    startedAt: {
        type: Number,
        label: "Timestamp for start of last session",
        optional: true
    },
    groupKey: {
        type: String,
        label: "Group of devices that started session at the same time",
        optional: true
    },
    lastSeenAt: {
        type: Date,
        label: "Date for last time the device was seen online",
        optional: true
    },
    expression: {
        type: String,
        label: "expression for the last running session, if any",
        optional: true
    },
    warning: {
        type: String,
        label: "Any warning message from the device",
        optional: true
    },
    latency: {
        type: latencySchema,
        label: "Last known latency data for device"
    }
}));

class LiveDevice {
    /**
     *
     * @param {string}  id
     * @param {string}  status
     * @param {object}  [latency]
     * @param {Date}    lastSeenAt
     * @param {string}  warning
     * @param {number}  startedAt
     * @param {string}  activeSessionId
     * @param {string}  expression
     */
    constructor(id, status, latency, lastSeenAt = null, warning = null, startedAt = null, activeSessionId = null
                , expression = null) {
        this._id = id;
        this._status = status;
        this._latency = latency ? latency : {
            count: 0, duration: 0, clock: 0, finishedAt: null
        };
        this._lastSeenAt = lastSeenAt === null ? new Date() : lastSeenAt;
        this._warning = warning;
        this._startedAt = startedAt;
        this._activeSessionId = activeSessionId;
        this._expression = expression;
    }

    insert() {
        LiveDevices.insert(this.toJson());
        return this.id;
    }

    toJson() {
        return {
            _id: this.id,
            status: this.status,
            startedAt: this.startedAt,
            groupKey: this.activeSessionId,
            lastSeenAt: this.lastSeenAt,
            expression: this.expression,
            warning: this.warning,
            latency: this.latency
        }
    }


    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get status() {
        return this._status;
    }

    set status(value) {
        this._status = value;
    }

    get latency() {
        return this._latency;
    }

    set latency(value) {
        this._latency = value;
    }

    get lastSeenAt() {
        return this._lastSeenAt;
    }

    set lastSeenAt(value) {
        this._lastSeenAt = value;
    }

    get warning() {
        return this._warning;
    }

    set warning(value) {
        this._warning = value;
    }

    get startedAt() {
        return this._startedAt;
    }

    set startedAt(value) {
        this._startedAt = value;
    }

    get activeSessionId() {
        return this._activeSessionId;
    }

    set activeSessionId(value) {
        this._activeSessionId = value;
    }

    get expression() {
        return this._expression;
    }

    set expression(value) {
        this._expression = value;
    }

    get latencyRefreshedAt() {
        return this._latency.finishedAt;
    }

    isDeviceAvailable() {
        return this.status === LiveDevicesStatus.READY && Date.now() - this.lastSeenAt < 60000;
    }


    /**
     *
     * @param id
     * @returns {LiveDevice}
     */
    static find(id) {
        return LiveDevice.instantiateFromRecord(LiveDevices.findOne({_id: id}));
    }

    /**
     *
     * @param ids
     * @returns {LiveDevice[]}
     */
    static findDevices(ids) {
        let result = [];
        LiveDevice.cursorFindDevices(ids)
            .forEach((record) => result.push(LiveDevice.instantiateFromRecord(record)));
        return result;
    }

    /**
     *
     * @returns {LiveDevice[]}
     */
    static findAll() {
        let result = [];
        LiveDevices.find({})
            .forEach((record) => result.push(LiveDevice.instantiateFromRecord(record)));
        return result;
    }

    /**
     * Called by the coach screen to refresh devices that are currently available
     * @param {string[]} universe List of id's to consider from all existing devices
     * @returns {LiveDevice[]}
     */
    static findActiveDevices(universe) {
        let result = [];
        LiveDevice.cursorFindActiveDevices(universe)
            .forEach((record) => result.push(LiveDevice.instantiateFromRecord(record)));
        return result;
    }

    /**
     *
     @param {string[]} universe List of id's to consider from all existing devices
     * @return {Mongo.Cursor}
     */
    static cursorFindActiveDevices(universe) {
        return LiveDevices.find({
            _id: {$in: universe}, lastSeenAt: {$gt: new Date(new Date().getTime() - LiveSessionDelays.DELAY_TO_CONSIDER_ATHLETE_VISIBLE)}
            , status: LiveDevicesStatus.READY
        });
    }

    /**
     *
     * @param universe
     * @returns {Mongo.Cursor}
     */
    static cursorFindDevices(universe) {
        return LiveDevices.find({
            _id: {$in: universe}
        });
    }

    /**
     *
     * @param record
     * @returns {null|LiveDevice}
     */
    static instantiateFromRecord(record) {
        if (!record) return null;
        return new LiveDevice(record._id, record.status, record.latency, record.lastSeenAt, record.warning
            , record.startedAt, record.groupKey, record.expression);
    }

    static resetDeviceState(id, status, activeSessionId = null) {
        logger.debug(`[LiveDevice] resetting device ${id} state to ${status}`);
        let update = {
            status: status
            , startedAt: null
            , groupKey: activeSessionId
            , lastSeenAt: new Date()
            , expression: null
            , warning: null
            // , latency: {}
        };

        if (status === LiveDevicesStatus.RUNNING) {
            delete update.startedAt;
            delete update.expression;
            delete update.warning;
        }

        LiveDevices.update({_id: id}, {
            $set: update
        });
    }

    static setDeviceReady(id, currentActiveSessionId) {
        let updated = LiveDevices.update({_id: id, groupKey: currentActiveSessionId}, {
            $set: {
                status: LiveDevicesStatus.READY
                , startedAt: null
                , groupKey: null
                , lastSeenAt: new Date()
                , expression: null
                , warning: null
            }
        });

        if (updated > 0) {
            logger.debug(`[LiveDevice] set device ${id} Ready`);
        } else {
            logger.debug(`[LiveDevice] tried to set ${id} ready but it's status was changed meanwhile`);
        }
    }

    static removeDevicesFromSession(ids) {
        logger.debug(`[LiveDevice] removing device ${ids.join(', ')} from current session `);

        LiveDevices.update({_id: {$in: ids}}, {
            $set: {
                groupKey: null
            }
        });
    }

    static justSeen(id) {
        logger.debug(`[LiveDevice] Just seen device ${id}`);
        LiveDevices.update({_id: id}, {
            $set: {lastSeenAt: new Date()}
        });
    }

    static startDevice(id, startedAt, activeSessionId = null, expression = null) {
        logger.debug(`[LiveDevice] Start device ${id} in session ${activeSessionId}`);
        LiveDevices.update({_id: id}, {
            $set: {
                lastSeenAt: new Date()
                , startedAt: startedAt
                , status: LiveDevicesStatus.RUNNING
                , groupKey: activeSessionId
                , expression: expression
            }
        });
    }

    static finish(id) {
        logger.debug(`[LiveDevice] Finish session in device ${id}`);
        LiveDevices.update({_id: id}, {
            $set: {
                lastSeenAt: new Date()
                , startedAt: null
                , status: LiveDevicesStatus.FINISHED
                , groupKey: null
                , expression: null
            }
        });
    }

    static resetLatency(id) {
        logger.debug(`[LiveDevice] Reset latency in device ${id}`);
        LiveDevices.update({_id: id}, {$set: {'latency.count': 0, 'latency.duration': 0
                , 'latency.clock': 0, 'latency.finishedAt': null
        }})
    }

    static updateLatency(id, duration, clock) {
        logger.debug(`[LiveDevice] Update latency in device ${id}`);
        LiveDevices.update({_id: id}, {
            $inc: {
                'latency.count': 1,
                'latency.duration': duration,
                'latency.clock': clock
            }
        })
    }

    static latencyCalcFinished(id) {
        logger.debug(`[LiveDevice] Latency calculation finished in device ${id}`);
        LiveDevices.update({_id: id}, {$set: {'latency.finishedAt': Date.now()}})
    }

    static async addDevicesToLiveSession(devices, liveSessionId) {
        logger.debug(`[LiveDevice] Update live session ${liveSessionId} for devices ${devices.join(', ')}`);
        LiveDevices.update({_id: {$in: devices}}, {$set: {groupKey: liveSessionId}}
            , {multi: true})
    }
}

/*  Live Device Data (metrics)  */
/*------------------------------*/
let LiveDeviceData = new Mongo.Collection('liveDeviceData', {'idGeneration': 'STRING'});
LiveDeviceData.attachSchema(new SimpleSchema({
    dv: {
        type: String,
        label: "Device"
    },
    ss: {
        type: String,
        label: "Session id"
    },
    dr: {
        type: Number,
        label: "Duration, in seconds"
    },
    sd: {
        type: Number,
        label: "Instantaneous speed",
        decimal: true
    },
    dt: {
        type: Number,
        label: "Current distance",
        decimal: true
    },
    cd: {
        type: Number,
        label: "Instantaneous spm/cadence"
    },
    dp: {
        type: Number,
        label: "Instantaneous meters per stroke / displacement",
        decimal: true
    },
    hr: {
        type: Number,
        label: "Instantaneous heart rate"
    },
    st: {
        type: Number,
        label: "Current split"
    },
    ls: {
        type: Number,
        label: "Gap between GPS timestamp and measure timestamp",
        decimal: true
    },
    lc: {
        type: Boolean,
        label: "Location changed"
    },
    ca: {
        type: Number,
        label: "Created at"
    }
}));

class DeviceData {
    constructor(raw) {
        this.device = raw.dv;
        this.timestamp = null;
        this.duration = raw.dr;
        this.speed = raw.sd;
        this.rawDistance = raw.dt;
        this.cadence = raw.cd;
        this.displacement = raw.dp;
        this.heartRate = raw.hr;
        this.split = raw.st;
        this.gpsGap = raw.ls;
        this.startDistance = null;
        this.locationChanged = raw.lc === true;
        // If location was not changed, raw.ls can be significantly old, so we can't rely on this
        // measure to displace boat position based on time gap; However, it may happen that we did that on
        // previous metric, and it will cause the coach to see distance update to an older position, but only
        // if he refreshes page (because on a running session, display won't change when locationChanged === false
        // this.distance = Math.round((raw.dt + (this.locationChanged ? raw.ls * (this.speed / 3600000) : 0)) * 10000) / 10000;

        // disable dead reckoning
        this.distance = raw.dt;
        this.createdAt = raw.ca;
    }

    getDevice() {
        return this.device;
    }

    getDuration() {
        return this.duration;
    }

    setDuration(value) {
        this.duration = value;
    }

    getTimestamp() {
        throw 'method was deprecated';
    }

    setTimestamp(value) {
        this.timestamp = value;
    }

    getSpeed() {
        return this.speed;
    }

    getDistance() {
        return this.distance;
    }

    setDistance(value) {
        this.distance = Math.round(value * 10000) / 10000;
    }

    getDistanceInMeters() {
        return Math.round(this.distance * 1000 * 10) / 10;
    }

    getRelativeDistanceInMeters() {
        return Math.round((this.distance - (this.startDistance === null ? 0 : this.startDistance)) * 1000);
    }

    getCadence() {
        return this.cadence;
    }

    getDisplacement() {
        return this.displacement;
    }

    getHeartRate() {
        return this.heartRate;
    }

    getSplit() {
        return this.split;
    }

    getGpsGap() {
        return this.gpsGap;
    }

    hashCode() {
        return [this.speed, this.distance, this.cadence, this.displacement, this.heartRate].join('-');
    }

    setRawDistance(value) {
        this.rawDistance = value;
    }

    setGpsGap(value) {
        this.gpsGap = value;
    }

    getCreatedAt() {
        return this.createdAt;
    }

    appendMilis(milis, speed) {
        let metric = this.clone();
        metric.setDuration(this.duration + milis);
        let distance = this.rawDistance;
        let gap = this.gpsGap + milis;
        metric.setDistance(distance + gap * (speed / 3600000));
        metric.setRawDistance(metric.getDistance());
        metric.setGpsGap(0);
        return metric;
    }

    calculateDistanceAfter(milis) {
        return this.distance + milis / 1000 * ((this.speed / 3600));
    }

    clone() {
        return new DeviceData({
            dv: this.device,
            dr: this.duration,
            sd: this.speed,
            dt: this.rawDistance,
            cd: this.cadence,
            dp: this.displacement,
            hr: this.heartRate,
            st: this.split,
            ls: this.gpsGap,
            lc: this.locationChanged,
            ca: this.createdAt

        })
    }

    setStartDistance(value) {
        this.startDistance = value;
    }

    isLocationChanged() {
        return this.locationChanged;
    }

    setLocationChanged(value) {
        this.locationChanged = value === true;
    }
}

/*  Live Session Splits */
/*----------------------*/
let LiveSessionSplits = new Mongo.Collection('liveSessionSplits', {idGeneration: 'STRING'});
LiveSessionSplits.attachSchema(new SimpleSchema({
    liveSession: {
        type: String,
        label: 'Live session UUID'
    },
    startedAt: {
        type: Number,
        label: "Start of split"
    },
    recovery: {
        type: Boolean,
        label: "Is recovery or not"
    },
    finishedAt: {
        type: Number,
        label: "End of split",
        optional: true
    },
    number: {
        type: Number,
        label: "Split number"
    },
    type: {
        type: String,
        label: "Type of split",
        allowedValues: [IntervalType.TIME, IntervalType.DISTANCE, IntervalType.FREE]
    },
    device: {
        type: Object,
        label: "device distance when starting interval",
        blackbox: true
    }
}));
class LiveSessionSplit {

    constructor(sessionId, startedAt, isRecovery, number, devices, type) {
        this._id = null;
        this._recovery = isRecovery;
        this._finishedAt = null;
        this._sessionId = sessionId;
        this._startedAt = startedAt;
        this._isRecovery = isRecovery;
        this._number = number;
        this._devices = devices;
        this._type = type;
    }

    insert() {
        this._id = LiveSessionSplits.insert({
            liveSession: this.sessionId,
            recovery: this.isRecovery,
            type: this.type,
            startedAt: this.startedAt,
            finishedAt: this.finishedAt,
            number: this.number,
            device: this.devices
        });
        return this._id;
    }

    get sessionId() {
        return this._sessionId;
    }

    set sessionId(value) {
        this._sessionId = value;
    }

    get startedAt() {
        return this._startedAt;
    }

    set startedAt(value) {
        this._startedAt = value;
    }

    get isRecovery() {
        return this._isRecovery;
    }

    set isRecovery(value) {
        this._isRecovery = value;
    }

    get number() {
        return this._number;
    }

    set number(value) {
        this._number = value;
    }

    get finishedAt() {
        return this._finishedAt;
    }

    set finishedAt(value) {
        this._finishedAt = value;
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get devices() {
        return this._devices;
    }

    set devices(value) {
        this._devices = value;
    }

    get type() {
        return this._type;
    }

    set type(value) {
        this._type = value;
    }

    /**
     *
     * @returns {number}
     */
    duration() {
        return this.finishedAt - this.startedAt;
    }

    /**
     *
     * @returns {number}
     */
    durationInSeconds() {
        return Math.round((this.finishedAt - this.startedAt) / 1000);
    }

    static instantiateFromRecord(record) {
        if (!record)
            return null;

        let split = new LiveSessionSplit(record.liveSession, record.startedAt, record.recovery
            , record.number, record.device, record.type);
        split.id = record._id;
        split.finishedAt = record.finishedAt;
        return split;
    }

    static find(id) {
        let record = LiveSessionSplits.findOne({_id: id});
        return LiveSessionSplit.instantiateFromRecord(record);
    }

    static findSessionSplitsForDevice(sessionId, deviceId) {
        let records = LiveSessionSplits.find({liveSession: sessionId, device: {$contains: deviceId}}).fetch(),
            result = [];
        for (let record of records) {
            result.push(LiveSessionSplit.instantiateFromRecord(record));
        }
        return result;
    }

    static cursorSplitsForSession(sessionId) {
        return LiveSessionSplits.find({liveSession: sessionId}, {sort: {number: 1}});
    }

    static findLastNonRecoverySplit(sessionId) {
        let record = LiveSessionSplits.findOne({
            liveSession: sessionId,
            finishedAt: {$gt: 0},
            recovery: false
        }, {limit: 1, sort: {number: -1}});

        return LiveSessionSplit.instantiateFromRecord(record);
    }

    /**
     *
     * @param sessionId
     * @param number
     * @returns {LiveSessionSplit}
     */
    static findSplitByNumber(sessionId, number) {
        let record = LiveSessionSplits.findOne({
            liveSession: sessionId,
            number: number
        });

        return LiveSessionSplit.instantiateFromRecord(record);
    }
    /**
     *
     * @param finishedAt
     * @returns {LiveSessionSplit}
     */
    static findSplitByFinishTime(finishedAt) {
        let record = LiveSessionSplits.findOne({finishedAt: finishedAt});
        return LiveSessionSplit.instantiateFromRecord(record);
    }

    /**
     *
     * @param sessionId
     * @param finishedAt
     * @param isFinishDevices
     * @param devicesFinishDistances
     */
    static finishRunningSplits(sessionId, finishedAt, isFinishDevices = false, devicesFinishDistances = []) {
        LiveSessionSplits.update({liveSession: sessionId, finishedAt: null}, {
            $set: {
                finishedAt: finishedAt
            }
        }, {multi: true});

        if (isFinishDevices) {
            for (let device of devicesFinishDistances) {
                DeviceLiveSessionSplit.finish(sessionId, device.deviceId, finishedAt, device.distance, device.displayedDistance);
            }
        }
    }

    static finishSplitByNumber(sessionId, number, finishedAt) {
        LiveSessionSplits.update({liveSession: sessionId, number: number}, {
            $set: {
                finishedAt: finishedAt
            }
        }, {multi: false});
    }
}

/*  Device Live Session Split */
/*----------------------------*/
let CollectionLiveSessionSplitDevices = new Mongo.Collection('liveSessionSplitForDevice', {idGeneration: 'STRING'});
let liveSessionSplitDevicesSchema = new SimpleSchema({
    liveSession: {
        type: String,
        label: 'Live session UUID'
    },
    device: {
        type: String,
        label: 'Device UUID'
    },
    split: {
        type: String,
        label: 'Split UUID'
    },
    type: {
        type: String,
        label: "Type of split",
        allowedValues: [IntervalType.TIME, IntervalType.DISTANCE, IntervalType.FREE]
    },
    startedAt: {
        type: Number,
        label: "Start of split"
    },
    recovery: {
        type: Boolean,
        label: "Is recovery or not"
    },
    finishedAt: {
        type: Number,
        label: "End of split",
        optional: true
    },
    number: {
        type: Number,
        label: "Split number",
        optional: true
    },
    startDistance: {
        type: Number,
        label: "Device actual start distance",
        decimal: true
    },
    distance: {
        type: Number,
        label: "Device actual performed distance",
        decimal: true,
        optional: true
    },
    startDisplayedDistance: {
        type: Number,
        label: "Device displayed start distance"
    },
    displayedDistance: {
        type: Number,
        label: "Device displayed performed distance",
        optional: true
    }
});
CollectionLiveSessionSplitDevices.attachSchema(liveSessionSplitDevicesSchema);
class DeviceLiveSessionSplit {

    constructor(sessionId, device, splitId, startedAt, isRecovery, number, startDistance, startDisplayedDistance, type) {
        this._id = null;
        this._recovery = isRecovery;
        this._finishedAt = null;
        this._sessionId = sessionId;
        this._startedAt = startedAt;
        this._isRecovery = isRecovery;
        this._number = number;
        this._startDistance = startDistance;
        this._startDisplayedDistance = startDisplayedDistance;
        this._distance = null;
        this._displayedDistance = null;
        this._device = device;
        this._splitId = splitId;
        this._type = type;

    }

    insert() {
        this._id = CollectionLiveSessionSplitDevices.insert({
            device: this.device,
            liveSession: this.sessionId,
            split: this.splitId,
            type: this.type,
            startedAt: this.startedAt,
            recovery: this.isRecovery,
            finishedAt: this.finishedAt,
            number: this.number,
            startDistance: this.startDistance,
            startDisplayedDistance: this.startDisplayedDistance === null ? 0 : this.startDisplayedDistance,
            distance: this.distance,
            displayedDistance: this.displayedDistance
        });
        return this._id;
    }

    get device() {
        return this._device;
    }

    set device(value) {
        this._device = value;
    }

    get sessionId() {
        return this._sessionId;
    }

    set sessionId(value) {
        this._sessionId = value;
    }

    get splitId() {
        return this._splitId;
    }

    set splitId(value) {
        this._splitId = value;
    }

    get startedAt() {
        return this._startedAt;
    }

    set startedAt(value) {
        this._startedAt = value;
    }

    get isRecovery() {
        return this._isRecovery;
    }

    set isRecovery(value) {
        this._isRecovery = value;
    }

    get number() {
        return this._number;
    }

    set number(value) {
        this._number = value;
    }

    get finishedAt() {
        return this._finishedAt;
    }

    set finishedAt(value) {
        this._finishedAt = value;
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get startDistance() {
        return this._startDistance;
    }

    set startDistance(value) {
        this._startDistance = value;
    }

    get startDisplayedDistance() {
        return this._startDisplayedDistance;
    }

    set startDisplayedDistance(value) {
        this._startDisplayedDistance = value;
    }

    get distance() {
        return this._distance;
    }

    set distance(value) {
        this._distance = value;
    }

    get displayedDistance() {
        return this._displayedDistance;
    }

    set displayedDistance(value) {
        this._displayedDistance = value;
    }

    get type() {
        return this._type;
    }

    set type(value) {
        this._type = value;
    }

    calculateDuration() {
        if (this.finishedAt === null) {
            return null
        }
        return this.finishedAt === null ? 0 : this.finishedAt - this.startedAt;
    }

    toJson() {
        return {
            _id: this._id,
            liveSession: this.sessionId,
            device: this.device,
            split: this.splitId,
            startedAt: this.startedAt,
            recovery: this.isRecovery,
            finishedAt: this.finishedAt,
            number: this.number,
            startDistance: this.startDistance,
            distance: this.distance,
            startDisplayedDistance: this.startDisplayedDistance,
            displayedDistance: this.displayedDistance,
            type: this.type
        }
    }

    finish(stats) {
        CollectionLiveSessionSplitDevices.update({_id: this.id}, {
            $set: {
                startedAt: stats.start.time,
                startDistance: stats.start.distance,
                startDisplayedDistance: Math.round(stats.start.distance),
                finishedAt: stats.finish.time,
                distance: Math.round((stats.finish.distance - stats.start.distance) * 100) / 100,
                displayedDistance: Math.round(stats.finish.distance - stats.start.distance),
            }
        })
    }

    update() {
        return CollectionLiveSessionSplitDevices.update({_id: this.id}, {
            $set: {
                liveSession: this.sessionId,
                device: this.device,
                split: this.splitId,
                startedAt: this.startedAt,
                recovery: this.isRecovery,
                finishedAt: this.finishedAt,
                number: this.number,
                startDistance: this.startDistance,
                distance: this.distance,
                startDisplayedDistance: this.startDisplayedDistance,
                displayedDistance: this.displayedDistance,
                type: this.type
            }
        });
    }

    /**
     *
     * @param record
     * @returns {DeviceLiveSessionSplit}
     */
    static instantiateFromRecord(record) {
        if (!record) return null;
        let split = new DeviceLiveSessionSplit(record.liveSession, record.device
            , record.split, record.startedAt, record.recovery, record.number
            , record.startDistance, record.startDisplayedDistance, record.type);
        split.id = record._id;
        split.finishedAt = record.finishedAt;
        split.distance = record.distance;
        split.displayedDistance = record.displayedDistance;

        return split;
    }

    /**
     *
     * @param id
     * @returns {DeviceLiveSessionSplit}
     */
    static find(id) {
        let record = CollectionLiveSessionSplitDevices.findOne({_id: id});
        return DeviceLiveSessionSplit.instantiateFromRecord(record);
    }

    static cursorSplitInSession(sessionId) {
        return CollectionLiveSessionSplitDevices.find({liveSession: sessionId});
    }


    static findSplitsInSession(sessionId) {
        let records = CollectionLiveSessionSplitDevices.find({liveSession: sessionId}).fetch(),
            result = [];
        for (let record of records) {
            result.push(DeviceLiveSessionSplit.instantiateFromRecord(record));
        }
        return result;
    }

    /**
     *
     * @param sessionId
     * @param deviceId
     * @returns {[DeviceLiveSessionSplit]}
     */
    static findSplitsInSessionForDevice(sessionId, deviceId) {
        let records = CollectionLiveSessionSplitDevices.find({
                liveSession: sessionId,
                device: deviceId
            }, {sort: {startedAt: 1}}).fetch(),
            result = [];
        for (let record of records) {
            result.push(DeviceLiveSessionSplit.instantiateFromRecord(record));
        }
        return result;
    }

    /**
     *
     * @param {string}  deviceId
     * @param {string}  sessionId
     * @param {number}  splitNumber
     * @returns {DeviceLiveSessionSplit}
     */
    static findSplit(deviceId, sessionId, splitNumber) {
        return DeviceLiveSessionSplit
            .instantiateFromRecord(CollectionLiveSessionSplitDevices.findOne({
                device: deviceId, liveSession: sessionId, number: splitNumber
            }));
    }

    static finish(sessionId, deviceId, finishedAt, distance, displayedDistance) {
        CollectionLiveSessionSplitDevices.update({liveSession: sessionId, device: deviceId, finishedAt: null}, {
            $set: {
                finishedAt: finishedAt,
                distance: distance,
                displayedDistance: displayedDistance
            }
        })
    }

    static countRunningSplits(sessionId) {
        return CollectionLiveSessionSplitDevices.find({liveSession: sessionId, finishedAt: null}).count();
    }

    /**
     *
     * @param sessionId
     * @param deviceId
     * @param number
     * @returns {DeviceLiveSessionSplit}
     */
    static findSplitByNumber(sessionId, deviceId, number) {
        let record = CollectionLiveSessionSplitDevices.findOne({
            liveSession: sessionId,
            device: deviceId,
            number: number
        });

        return DeviceLiveSessionSplit.instantiateFromRecord(record);
    }
}

/*  Live Split Partials  */
/*-----------------------*/
let LiveSplitPartialsPosition = new Mongo.Collection('liveSplitPartialsPosition', {'idGeneration': 'STRING'});
LiveSplitPartialsPosition.attachSchema(new SimpleSchema({
    device: {type: String, label: "Device UUID"},
    liveSession: {type: String, label: 'Live session record belongs to'},
    split: {type: String, label: 'Split record belongs to'},
    timestamp: {type: Number, label: 'Moment to take the timestamp'},
    distance: {type: Number, label: "Standardized distance (on regular meter intervals)", decimal: true}
}));

/*  Live Split Summary  */
/*----------------------*/
let LiveSplitSummary = new Mongo.Collection('liveSplitSummary', {'idGeneration': 'STRING'});
let partialSchema = new SimpleSchema({
    distance: {type: Number, label: 'distance', decimal: true},
    duration: {type: Number, label: "Duration"},
    cadence: {type: Number, label: "SPM", decimal: true},
    displacement: {type: Number, label: "Stroke Length", decimal: true},
    hr: {type: Number, label: "Heart rate", decimal: true}
});
let maxSpeedSchema = new SimpleSchema({
    position: {type: Number, label: "Point (in array of speed) max speed happened"},
    value: {type: Number, label: "max speed", decimal: true},
    duration: {type: Number, label: "moment, in split, max speed happened"}
});
LiveSplitSummary.attachSchema(new SimpleSchema({
    split: {type: String, label: 'Split partial belongs to'},
    liveSession: {type: String, label: 'Live session partial belongs to'},
    device: {type: String, label: 'Athlete'},
    partials: {type: [partialSchema], label: "Interval partials"},
    duration: {type: Number, label: "Duration"},
    distance: {type: Number, label: "Distance", decimal: true},
    cadence: {type: Number, label: "SPM", decimal: true},
    displacement: {type: Number, label: "Stroke length", decimal: true},
    hr: {type: Number, label: "heart rate", decimal: true},
    speed: {type: [{type: Number, decimal: true}]},
    number: {
        type: Number,
        label: "Split number",
        optional: true
    },
    maxSpeed: {type: maxSpeedSchema}
}));

/*  Coach Commands  */
/*------------------*/
let Commands = new Mongo.Collection('liveCommands', {'idGeneration': 'STRING'});
Commands.attachSchema(new SimpleSchema({
    command: {
        type: String,
        label: "Actual command",
        allowedValues: [LiveDeviceCommands.PUSH_EXPRESSION, LiveDeviceCommands.START_SESSION
            , LiveDeviceCommands.FINISH_SESSION, LiveDeviceCommands.PING, LiveDeviceCommands.START
            , LiveDeviceCommands.PAUSE, LiveDeviceCommands.STOP, LiveDeviceCommands.SYNC_CLOCK
            , LiveDeviceCommands.CLOCK_SYNCED, LiveDeviceCommands.FINISH_WARMUP, LiveDeviceCommands.RESUME
            , LiveDeviceCommands.HARD_RESET, LiveDeviceCommands.APPEND_TO_SESSION
            , LiveDeviceCommands.COACH_ACCEPTED_TEAM_REQUEST
            , LiveDeviceCommands.USER_CONNECTED_TO_STRAVA
        ]
    },
    createdAt: {
        type: Number,
        label: "Date the command was issued"
    },
    device: {
        type: String,
        label: "Device command applies to",
        optional: true
    },
    synced: {
        type: Boolean,
        label: "Command executed in device",
        optional: true
    },
    payload: {
        type: Object,
        label: "Arguments specific to the type of command",
        blackbox: true,
        optional: true
    },
    parent: {
        type: String,
        label: "parent / coach aggregate command",
        optional: true
    },
    finished: {
        type: Boolean,
        label: "Is command complete (aplicable only in coach)?",
        optional: true
    },
    devices: {
        type: [String],
        label: "array of devices",
        optional: true
    },
    canceled: {
        type: Boolean,
        optional: true
    },
    sessionId: {
        type: String,
        optional: true
    }
}));


/*  Live Split & Device Split Buffer  */
/*------------------------------------*/
let CollectionLiveSessionSplitBuffer = new Mongo.Collection('liveSessionSplitBuffer', {idGeneration: 'STRING'});
CollectionLiveSessionSplitBuffer.attachSchema(new SimpleSchema({
    liveSession: {
        type: String,
        label: 'Live session UUID'
    },
    recovery: {
        type: Boolean,
        label: "Is recovery or not"
    },
    type: {
        type: String,
        label: "Type of split",
        allowedValues: [IntervalType.TIME, IntervalType.DISTANCE, IntervalType.FREE]
    },
    startedAt: {
        type: Number,
        label: "Start of split"
    },
    finishedAt: {
        type: Number,
        label: "End of split",
        optional: true
    },
    number: {
        type: Number,
        label: "Split number (null to accommodate finish interval)",
        optional: true
    },
    devices: {
        label: "Split Devices info",
        type: [liveSessionSplitDevicesSchema]
    },
    removed: {
        type: Boolean,
        label: "Was it removed?"
    }
}));

class LiveSessionSplitBuffer {

    /**
     *
     * @param {string} liveSession Live Session Id
     * @param startedAt
     * @param recovery
     * @param number
     * @param type
     */
    constructor(liveSession, startedAt, recovery, number, type) {
        this._liveSession = liveSession;
        this._startedAt = startedAt;
        this._recovery = recovery;
        this._number = number;
        this._finishedAt = null;
        /**@type Array.<DeviceLiveSessionSplit> */
        this._devices = [];

        this._id = LiveSessionSplitBuffer.generateUUID(liveSession, number);
        this._removed = false;
        this._type = type;
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get liveSession() {
        return this._liveSession;
    }

    set liveSession(value) {
        this._liveSession = value;
    }

    get startedAt() {
        return this._startedAt;
    }

    set startedAt(value) {
        this._startedAt = value;
    }

    get recovery() {
        return this._recovery;
    }

    set recovery(value) {
        this._recovery = value;
    }

    get finishedAt() {
        return this._finishedAt;
    }

    set finishedAt(value) {
        this._finishedAt = value;
    }

    get number() {
        return this._number;
    }

    set number(value) {
        this._number = value;
    }

    get devices() {
        return this._devices;
    }

    set devices(value) {
        this._devices = value;
    }

    get removed() {
        return this._removed;
    }

    set removed(value) {
        this._removed = value;
    }

    get type() {
        return this._type;
    }

    set type(value) {
        this._type = value;
    }

    /**
     *
     * @param {DeviceLiveSessionSplit} device
     */
    async addDevice(device) {
        let promise;
        const collection = CollectionLiveSessionSplitBuffer.rawCollection();
        promise = collection.findOneAndUpdate({_id: this._id}, {$push: {devices: device.toJson()}}, {returnOriginal: false});
        let mongoResult = await promise;
        let record = mongoResult.value;
        record = LiveSessionSplitBuffer.instantiateFromRecord(record);
        this.devices = record.devices;
        return this;
    }

    toJson() {

        let devices = [];
        for (let device of this.devices) {
            devices.push(device.toJson());
        }

        return {
            _id: this._id,
            liveSession: this.liveSession,
            recovery: this.recovery,
            type: this.type,
            startedAt: this.startedAt,
            finishedAt: this.finishedAt,
            number: this.number,
            devices: devices,
            removed: this.removed === true
        };
    }

    insert() {
        this._id = CollectionLiveSessionSplitBuffer.insert(this.toJson());
        return this._id;
    }

    /**
     *
     * @returns {LiveSessionSplit}
     */
    populateFinalCollections() {

        let devices = {};
        /** @type DeviceLiveSessionSplit */
        let device;
        for (device of this.devices) {
            devices[device.device] = device.startDistance;
        }

        logger.debug(`populateFinalCollections:: considering ${this.devices.length} devices`);

        let split = new LiveSessionSplit(this.liveSession, this.startedAt, this.recovery, this.number, devices, this.type);
        const newSplitId = split.insert();

        for (device of this.devices) {
            device.splitId = newSplitId;
            device.insert();
        }

        logger.debug(`populateFinalCollections:: cleaning up`);
        CollectionLiveSessionSplitBuffer.update({_id: this._id}, {$set: {removed: true}});
        return split;
    }

    static instantiateFromRecord(record) {
        if (!record) return null;
        let split = new LiveSessionSplitBuffer(record.liveSession, record.startedAt, record.recovery, record.number, record.type);
        split.id = record._id;
        split.finishedAt = record.finishedAt;
        split.removed = record.removed === true;
        let devices = [];
        for (let device of record.devices) {
            devices.push(DeviceLiveSessionSplit.instantiateFromRecord(device));
        }
        split.devices = devices;
        return split;
    }

    static find(id) {
        return LiveSessionSplitBuffer.instantiateFromRecord(CollectionLiveSessionSplitBuffer.findOne({_id: id}));
    }

    /**
     *
     * @param liveSessionId
     * @param splitNumber
     * @returns {LiveSessionSplitBuffer}
     */
    static findSplitByNumber(liveSessionId, splitNumber) {
        return LiveSessionSplitBuffer.instantiateFromRecord(CollectionLiveSessionSplitBuffer
            .findOne({_id: LiveSessionSplitBuffer.generateUUID(liveSessionId, splitNumber)}))
    }

    static generateUUID(liveSessionId, splitNumber) {
        let str = "" + splitNumber;
        let pad = "0000";
        let ans = pad.substring(0, pad.length - str.length) + str;

        return `${liveSessionId}${ans}`;
    }

    static async appendDevice(liveSessionId, number, device) {
        const collection = CollectionLiveSessionSplitBuffer.rawCollection();
        let mongoResult = await collection.findOneAndUpdate({_id: LiveSessionSplitBuffer.generateUUID(liveSessionId, number)}
            , {$push: {devices: device.toJson()}}
            , {returnOriginal: false});

        let record = mongoResult.value;
        return LiveSessionSplitBuffer.instantiateFromRecord(record);
    }

}

class DistanceStep {

    constructor(duration, speed, distance, cadence, displacement, heartRate, counter) {
        this._duration = duration; // duration, in mili-seconds
        this._speed = speed;
        this._distance = distance;
        this._cadence = cadence;
        this._displacement = displacement;
        this._heartRate = heartRate;
        this._counter = counter;
    }

    get duration() {
        return this._duration;
    }

    set duration(value) {
        this._duration = value;
    }

    get speed() {
        return this._speed;
    }

    set speed(value) {
        this._speed = value;
    }

    get distance() {
        return this._distance;
    }

    set distance(value) {
        this._distance = value;
    }

    get cadence() {
        return this._cadence;
    }

    set cadence(value) {
        this._cadence = value;
    }

    get displacement() {
        return this._displacement;
    }

    set displacement(value) {
        this._displacement = value;
    }

    get heartRate() {
        return this._heartRate;
    }

    set heartRate(value) {
        this._heartRate = value;
    }

    get counter() {
        return this._counter;
    }

    set counter(value) {
        this._counter = value;
    }
}

export {
    LiveSession,
    LiveDeviceData,
    LiveSessionSplits,
    Commands,
    LiveSplitSummary,
    LiveSplitPartialsPosition,
    CollectionLiveSessionSplitDevices,
    CollectionLiveSessionSplitBuffer,

    DeviceData,
    DistanceStep,
    LiveSessionSplit,
    DeviceLiveSessionSplit,
    LiveSessionSplitBuffer,

    LiveDevice
};

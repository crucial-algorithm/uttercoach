import {Mongo} from "meteor/mongo";
import {Utils} from "../../../utils/utils.js";
import {Athlete, DEFAULT_HR_RANGE} from "../../athletes/api/collections";
import {Coach, CoachTrainingSessions} from "../../coaches/api/collections";
import i18n from "../../../utils/i18n";
import {Meteor} from "meteor/meteor";
import numbro from "numbro";
import {logger} from "../../../utils/logger";
import {buildGPX, GarminBuilder} from "gpx-builder";
import {TrainingSessionCollection, TrainingSessionProcessFailuresCollection} from "./mongo";
import KalmanFilter from 'kalmanjs';

const {Point} = GarminBuilder.MODELS;

class TrainingSessionData {

    constructor(timestamp, distance, speed, spm, spmEfficiency, latitude, longitude, altitude = 0, heartRate = 0
                , recovery, strokes, magnitude, split, leftToRight, frontToBack, rotation
                , duration, virtual = false
    ) {

        this._timestamp = timestamp;
        this._distance = distance;
        this._speed = speed;
        this._spm = spm;
        this._spmEfficiency = spmEfficiency;
        this._latitude = latitude;
        this._longitude = longitude;
        this._altitude = altitude;
        this._heartRate = heartRate;
        this._recovery = recovery === true;
        this._strokes = strokes;
        this._magnitude = magnitude;
        this._split = split;
        this._leftToRight = leftToRight || [];
        this._frontToBack = frontToBack || [];
        this._rotation = rotation || [];
        this._duration = duration;
        this._virtual = virtual === true;


        let lefts = 0, rights = 0, left = 0, right = 0;
        for (let motion of this.leftToRight) {
            if (motion.value > 0) {
                right += motion.value;
                rights++;
            }
            if (motion.value < 0) {
                left += motion.value;
                lefts++;
            }
        }

        this._left = lefts > 0 ? Math.abs(Math.ceil(left / lefts)) : 0;
        this._right = rights > 0 ? Math.ceil(right / rights) : 0;

    }

    toJson() {
        return {
            timestamp: this.timestamp,
            distance: this.distance,
            speed: this.speed,
            spm: this.spm,
            spmEfficiency: this.spmEfficiency,
            latitude: this.latitude,
            longitude: this.longitude,
            altitude: this.altitude,
            heartRate: this.heartRate,
            recovery: this.recovery,
            strokes: this.strokes,
            magnitude: this.magnitude,
            split: this.split,
            leftToRight: this.leftToRight || [],
            frontToBack: this.frontToBack || [],
            rotation: this.rotation || [],
            virtual: this.virtual
        }
    }

    /**
     *
     * @return {TrainingSessionData}
     */
    clone() {
        return new TrainingSessionData(this.timestamp, this.distance, this.speed, this.spm, this.spmEfficiency
            , this.latitude, this.longitude, this.altitude, this.heartRate, this.recovery, this.strokes, this.magnitude, this.split
            , [...this.leftToRight], [...this.frontToBack], [...this.rotation]
            , this.duration, this.virtual
        );
    }

    get timestamp() {
        return this._timestamp;
    }

    set timestamp(value) {
        this._timestamp = value;
    }

    get distance() {
        return this._distance;
    }

    set distance(value) {
        this._distance = value;
    }

    get speed() {
        return this._speed;
    }

    set speed(value) {
        this._speed = value;
    }

    get spm() {
        return this._spm;
    }

    set spm(value) {
        this._spm = value;
    }

    get spmEfficiency() {
        return this._spmEfficiency;
    }

    set spmEfficiency(value) {
        this._spmEfficiency = value;
    }

    get latitude() {
        return this._latitude;
    }

    set latitude(value) {
        this._latitude = value;
    }

    get longitude() {
        return this._longitude;
    }

    set longitude(value) {
        this._longitude = value;
    }

    get altitude() {
        return this._altitude;
    }

    set altitude(value) {
        this._altitude = value;
    }

    get heartRate() {
        return this._heartRate;
    }

    set heartRate(value) {
        this._heartRate = value;
    }

    get recovery() {
        return this._recovery;
    }

    set recovery(value) {
        this._recovery = value;
    }

    get strokes() {
        return this._strokes;
    }

    set strokes(value) {
        this._strokes = value;
    }

    get magnitude() {
        return this._magnitude;
    }

    set magnitude(value) {
        this._magnitude = value;
    }

    get split() {
        return this._split;
    }

    set split(value) {
        this._split = value;
    }

    get leftToRight() {
        return this._leftToRight;
    }

    set leftToRight(value) {
        this._leftToRight = value;
    }

    get frontToBack() {
        return this._frontToBack;
    }

    set frontToBack(value) {
        this._frontToBack = value;
    }

    get rotation() {
        return this._rotation;
    }

    set rotation(value) {
        this._rotation = value;
    }

    get duration() {
        return this._duration;
    }

    set duration(value) {
        this._duration = value;
    }

    get virtual() {
        return this._virtual;
    }

    set virtual(value) {
        this._virtual = value;
    }

    get left() {
        return this._left;
    }

    set left(value) {
        this._left = value;
    }

    get right() {
        return this._right;
    }

    set right(value) {
        this._right = value;
    }
}

/**
 * Class used in live sessions
 */
class Split {
    constructor(start, end, distanceStart, distanceEnd, basedInDistance, recovery, splitIndexStart) {

        this._duration = end - start;
        this._start = start;
        this._end = end;
        this._distanceStart = distanceStart;
        this._distanceEnd = distanceEnd;
        this._basedInDistance = basedInDistance;
        this._recovery = recovery;
        this._avgSpm = null;
        this._avgSpmEfficiency = null;
        this._avgSpeed = null;
        this._avgHeartRate = null;
        this._splitIndexStart = splitIndexStart;
        this._splitIndexEnd = null;
        this._id = null;
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get duration() {
        return this._duration;
    }

    set duration(value) {
        this._duration = value;
    }

    get start() {
        return this._start;
    }

    set start(value) {
        this._start = value;
    }

    get end() {
        return this._end;
    }

    set end(value) {
        this._end = value;
        this.duration = this.end - this.start;
    }

    get distanceStart() {
        return this._distanceStart;
    }

    set distanceStart(value) {
        this._distanceStart = value;
    }

    get distanceEnd() {
        return this._distanceEnd;
    }

    set distanceEnd(value) {
        this._distanceEnd = value;
    }

    get basedInDistance() {
        return this._basedInDistance;
    }

    set basedInDistance(value) {
        this._basedInDistance = value;
    }

    get recovery() {
        return this._recovery;
    }

    set recovery(value) {
        this._recovery = value;
    }

    get avgSpm() {
        return this._avgSpm;
    }

    set avgSpm(value) {
        this._avgSpm = value;
    }

    get avgSpmEfficiency() {
        return this._avgSpmEfficiency;
    }

    set avgSpmEfficiency(value) {
        this._avgSpmEfficiency = value;
    }

    get avgSpeed() {
        return this._avgSpeed;
    }

    set avgSpeed(value) {
        this._avgSpeed = value;
    }

    get splitIndexStart() {
        return this._splitIndexStart;
    }

    set splitIndexStart(value) {
        this._splitIndexStart = value;
    }

    get splitIndexEnd() {
        return this._splitIndexEnd;
    }

    set splitIndexEnd(value) {
        this._splitIndexEnd = value;
    }

    get avgHeartRate() {
        return this._avgHeartRate;
    }

    set avgHeartRate(value) {
        this._avgHeartRate = value;
    }

    calculateDistance() {
        return this._distanceEnd - this._distanceStart;
    }

    toJson() {
        return {
            start: this.start,
            end: this.end,
            distanceStart: this.distanceStart,
            distanceEnd: this.distanceEnd,
            basedInDistance: this.basedInDistance,
            recovery: this.recovery,
            avgSpm: this.avgSpm,
            avgSpmEfficiency: this.avgSpmEfficiency,
            avgSpeed: this.avgSpeed,
            avgHeartRate: this.avgHeartRate,
            position: {
                start: this.splitIndexStart,
                end: this.splitIndexEnd
            },
            duration: this.duration
        }
    }
}

/**
 @typedef SessionSplit
 @property {Number} start                   timestamp
 @property {Number} end                     timestamp
 @property {Number} distanceStart           distance in meters
 @property {Number} distanceEnd             distance in meters
 @property {Boolean} basedInDistance
 @property {Boolean} recovery
 @property {Number} avgSpm
 @property {Number} avgSpmEfficiency
 @property {Number} avgHeartRate
 @property {Number} avgSpeed
 @property {{start: number, end: number}}   position, in data array
 @property {String} duration                Duration, according to the expression the user typed in
 @property {Number} avgBoatLeftIncline
 @property {Number} avgBoatRightIncline
 */

class TrainingSession {
    /**
     *
     * @return {{CYCLING: string, CANOEING: string}}
     * @constructor
     */
    static TYPES() {
        return {
            CANOEING: 'canoeing',
            CYCLING: 'cycling'
        }
    }

    /**
     *
     * @return {string[]}
     * @constructor
     */
    static TYPES_LIST() {
        return Object.values(TrainingSession.TYPES());
    }

    constructor(version, type, id, user, date, serverClockGap, data
                , angleZ, noiseX, noiseZ, factorX, factorZ, axis
                , coachTrainingSessionStart, coachTrainingSessionId
                , duration, fullDuration, distance, fullDistance
                , avgSpeed, minSpeed, maxSpeed
                , avgSpm, minSpm, maxSpm
                , avgSpmEfficiency, minSpmEfficiency, maxSpmEfficiency
                , avgHeartRate, minHeartRate, maxHeartRate, userHeartRate
                , expression, splits, boat
                , aggregates, pausedDuration = 0
                , processed, createdAt, processedAt, inStrava = false, uploadedToStravaAt = null
                , elevation = 0
                , location = null, edited = false) {

        this._id = id;
        this._type = type;
        this._version = version;
        /**
         * @type {String}
         * @private
         */
        this._user = user;
        /**@type Date */
        this._date = date;
        this._serverClockGap = serverClockGap || null;
        /**@type {TrainingSessionData[]} */
        this._data = [];
        this._angleZ = angleZ;
        this._noiseX = noiseX;
        this._noiseZ = noiseZ;
        this._factorX = factorX;
        this._factorZ = factorZ;
        this._axis = axis;
        this._coachTrainingSessionStart = coachTrainingSessionStart || null;
        this._coachTrainingSessionId = coachTrainingSessionId || null;
        this._duration = duration;
        this._fullDuration = fullDuration;
        this._distance = distance || 0;
        this._fullDistance = fullDistance || 0;
        this._avgSpeed = avgSpeed || 0;
        this._minSpeed = minSpeed || 0;
        this._maxSpeed = maxSpeed || 0;
        this._avgSpm = avgSpm || 0;
        this._minSpm = minSpm || 0;
        this._maxSpm = maxSpm || 0;
        this._avgSpmEfficiency = avgSpmEfficiency || 0;
        this._minSpmEfficiency = minSpmEfficiency || 0;
        this._maxSpmEfficiency = maxSpmEfficiency || 0;
        this._avgHeartRate = avgHeartRate || 0;
        this._minHeartRate = minHeartRate || 0;
        this._maxHeartRate = maxHeartRate || 0;
        /**
         * @typedef {{max: number, resting: number}}
         * @private
         */
        this._userHeartRate = userHeartRate || null;
        this._expression = expression || null;
        this._splits = splits || [];
        /**
         * @typedef {String}
         * @private
         */
        this._boat = boat || null;

        /**
         * @type {boolean}
         * @private
         */
        this._processed = processed === true;

        /**
         * @type {Date}
         * @private
         */
        this._createdAt = createdAt || null;

        /**
         * @type {Date}
         * @private
         */
        this._processedAt = processedAt || null;

        /** @typedef {{sumMetrics: number, sumFullMetrics: number, sumSpm: number, sumFullSpm: number, sumHeartRate: number, sumFullHeartRate: number, spmZones: number[], spmFullZones: number[], speedZones: number[], speedFullZones: number[], heartRateZones: number[], heartRateFullZones: number[]}} */
        this._aggregates = aggregates || null;
        /**@type number */
        this._pausedDuration = pausedDuration;
        /**@type boolean*/
        this._inStrava = inStrava === true;
        /**@type number|null */
        this._uploadedToStravaAt = uploadedToStravaAt;
        /**@type number */
        this._elevation = elevation;

        for (let record of (data || [])) {
            this.data.push(new TrainingSessionData(record.timestamp, record.distance, record.speed, record.spm
                , record.spmEfficiency, record.latitude, record.longitude, record.altitude, record.heartRate, record.recovery
                , record.strokes, record.magnitude, record.split
                , record.leftToRight, record.frontToBack, record.rotation, (record.timestamp - this.date.getTime())
                , record.virtual)
            );
        }
        this._coachTrainingSessionId = coachTrainingSessionId;
        this._processedAt = processedAt;
        this._location = location;
        this._edited = edited;
        this._inStrava = inStrava;
    }

    static version() {
        return {
            INITIAL: 0,
            LATEST: 5
        }
    }

    static migrations() {
        return [
            // 0
            function (session) { return session },

            // 1
            function (session) { return session },

            // 2
            function (session) { return session },

            // 3
            function (session) {
                if (session.userHeartRate === undefined) {
                    session.userHeartRate = {
                        max: DEFAULT_HR_RANGE.MAX,
                        resting: DEFAULT_HR_RANGE.RESTING
                    }
                }
                return session
            },

            // 4
            /**
             * Add split number to data records
             * @param session   Raw session record, from db
             * @returns {*}
             */
            function (session) {

                if (session.userHeartRate.resting === null) {
                    session.userHeartRate.resting = DEFAULT_HR_RANGE.RESTING;
                }

                if (!session.expression) return session;

                if (!session.data) return session;

                let splits = session.splits.slice(0), number = 0, start = session.splits.length, end = 0;
                while (splits.length > 0) {
                    let split = splits.shift();
                    for (let i = split.position.start; i < split.position.end; i++) {
                        session.data[i].split = number;
                    }
                    number++;
                }

                if (session.splits.length > 0) {
                    start = session.splits[0].position.start;
                    end = session.splits[session.splits.length - 1].position.end;
                }

                number = -1;
                for (let i = 0; i < session.data.length; i++) {
                    let record = session.data[i];

                    if (i < start || i > end) {
                        record.split = -1;
                        continue;
                    }

                    if (record.split === undefined || record.split === null) {
                        record.split = number;
                        continue;
                    }

                    number = record.split + 1;
                }

                return session;
            },

            // 5
            function (session) {
                session.pausedTime = 0;
                session.elevation = 0;
                session.type = TrainingSession.TYPES().CANOEING;
                return session;
            }
        ]
    }

    /**
     * Migrate database record to latest version
     *
     * @param record
     *
     * @returns {TrainingSession}
     */
    static upgrade(record) {
        return Utils.applyMigrations(TrainingSession.migrations(), record
            , record.version, TrainingSession.version().LATEST);
    }

    notifyCoach() {
        /** @type Array<Coach> */
        let coaches = [];
        const athlete = Athlete.find(this.user), name = athlete.name;
        if (this.coachTrainingSessionId) {
            const coachTrainingSession = CoachTrainingSessions.findSessionById(this.coachTrainingSessionId);
            coaches.push(Coach.find(coachTrainingSession.user));
        } else {
            coaches = Athlete.getCoaches(this.user);
        }

        let counter = 0;
        for (let coach of coaches) {
            if (!coach.email) continue;
            let language = i18n.languageByUserId(coach.id);
            Meteor.call('sendEmailFromClient', coach.email
                , /* Subject = */ i18n.translate("training_session_upload_email_subject", [name], language)
                , /* Text    = */i18n.translate("training_session_upload_email_text", [name], language)
                , "session-saved"
                , {
                    footerBackgroundColor: "#cccccc",
                    greeting: i18n.translate("training_session_upload_email_greeting", [coach.name], language),
                    link: this.sessionUrl(),
                    message: i18n.translate("training_session_upload_email_message", [Utils.formatDurationInTime(this.fullDuration)
                        , numbro(this.fullDistance).format('0.00')
                        , numbro(this.avgSpeed).format('0.0')], language)
                }
                , language);
            counter++;
        }

        return counter;
    }

    sessionUrl() {
        const type = this.coachTrainingSessionId ? 's' : 'f';
        const id = this.coachTrainingSessionId ? this.coachTrainingSessionId : this.id;
        return Meteor.absoluteUrl(`training-session/${type}/${id}`)
    }

    /**
     * @returns {boolean}
     */
    isScheduledSession() {
        return !!this.expression
    }

    toJson() {

        let data = [];
        for (let record of this.data) {
            data.push(record.toJson())
        }

        return {
            type: this.type,
            user: this.user,
            date: this.date,
            createdAt: this.createdAt,
            serverClockGap: this.serverClockGap,
            data: data,
            expression: this.expression,
            splits: this.splits,
            angleZ: this.angleZ,
            noiseX: this.noiseX,
            noiseZ: this.noiseZ,
            factorX: this.factorX,
            factorZ: this.factorZ,
            axis: this.axis,
            coachTrainingSessionStart: this.coachTrainingSessionStart,
            coachTrainingSessionId: this.coachTrainingSessionId,
            duration: this.duration,
            fullDuration: this.fullDuration,
            distance: this.distance,
            fullDistance: this.fullDistance,
            avgSpeed: this.avgSpeed,
            minSpeed: this.minSpeed,
            maxSpeed: this.maxSpeed,
            avgSpm: this.avgSpm,
            minSpm: this.minSpm,
            maxSpm: this.maxSpm,
            avgSpmEfficiency: this.avgSpmEfficiency,
            minSpmEfficiency: this.minSpmEfficiency,
            maxSpmEfficiency: this.maxSpmEfficiency,
            avgHeartRate: this.avgHeartRate,
            minHeartRate: this.minHeartRate,
            maxHeartRate: this.maxHeartRate,
            version: this.version,
            aggregates: this.aggregates,
            pausedDuration: this.pausedDuration,
            userHeartRate: this.userHeartRate,
            boat: this.boat,
            processed: this.processed,
            processedAt: this.processedAt,
            inStrava: this.inStrava,
            uploadedToStravaAt: this.uploadedToStravaAt,
            elevation: this.elevation,
            location: this.location,
            edited: this.edited
        }
    }

    /**
     *
     * @returns {String}
     */
    insert() {
        if (!this.createdAt) {
            this.createdAt = Date.now();
        }
        try {
            this.id = TrainingSessionCollection.insert(this.toJson());
        } catch (err) {
            new TrainingSessionProcessFailure(this.toJson(), err.message).insert();
            throw err;
        }
        return this.id;
    }

    delete() {
        return TrainingSessionCollection.remove({_id: this.id})
    }

    attachExpressionToFreeSession() {
        return TrainingSessionCollection.update({_id: this.id}, {
            $set: {
                edited: true,
                data: this.data.map((r)=>{return r.toJson()}),
                splits: this.splits,
                coachTrainingSessionStart: this.coachTrainingSessionStart,
                expression: this.expression,
                duration: this.duration,
                fullDuration: this.fullDuration,
                distance: this.distance,
                fullDistance: this.fullDistance,
                avgSpeed: this.avgSpeed,
                avgSpm: this.avgSpm,
                avgSpmEfficiency: this.avgSpmEfficiency,
                avgHeartRate: this.avgHeartRate,
                processedAt: null,
                processed: false
            }
        })
    }

    resetExpressionFromSession() {
        return TrainingSessionCollection.update({_id: this.id, edited: true}, {
            $set: {
                edited: false,
                data: this.data.map((r)=>{return r.toJson()}),
                splits: [],
                coachTrainingSessionStart: null,
                expression: null,
                duration: this.fullDuration,
                fullDuration: this.fullDuration,
                distance: this.fullDistance,
                fullDistance: this.fullDistance,
                avgSpeed: this.avgSpeed,
                avgSpm: this.avgSpm,
                avgSpmEfficiency: this.avgSpmEfficiency,
                avgHeartRate: this.avgHeartRate,
                processedAt: null,
                processed: false
            }
        })
    }

    finishProcessing() {
        TrainingSessionCollection.update({_id: this.id}, {
            $set: {
                processed: true,
                processedAt: new Date()
            }
        });
    }

    /**
     *
     * @return {string} XML string
     */
    generateGPX() {
        let points = [];
        for (let record of this.data) {
            points.push(new Point(record.latitude, record.longitude, {
                time: new Date(record.timestamp),
                hr: record.heartRate || 0,
                cad: record.spm,
                ele: record.altitude
            }))
        }

        const gpxData = new GarminBuilder();
        gpxData.setSegmentPoints(points);
        return buildGPX(gpxData.toObject());
    }

    /**
     *
     * @return {number}
     */
    calculateElevationGain() {
        let filter = new KalmanFilter({R: 2, Q: 0.8});
        let previous = null, total = 0;
        for (let r of this.data) {
            if (isNaN(r.altitude) || previous === null && r.altitude === 0) continue;

            if (previous === null) {
                previous = filter.filter(r.altitude);
                continue;
            }

            let altitude = Math.floor(filter.filter(r.altitude));
            let gain = altitude - previous;
            total += gain > 0 ? gain : 0;

            previous = altitude;
        }
        return Math.round(total);
    }

    markHasUploadedToStrava() {
        TrainingSessionCollection.update({_id: this.id}, {
            $set: {
                inStrava: true,
                uploadedToStravaAt: new Date()
            }
        });
    }


    /**
     * Try to find the 1st position, because it's more likely to be converted to an actual address in google maps
     *
     * @return {{lng: *, lat: *}|{lng: null, lat: null}}
     */
    randomLatLng() {
        if (this.data.length === 0) {
            return {lat: null, lng: null}
        }

        for (let record of this.data) {
            if (record.latitude && record.longitude) {
                return {
                    lat: record.latitude,
                    lng: record.longitude
                }
            }
        }
        return {lat: null, lng: null}
    }

    /**
     */
    updateWithNoLocationFound() {
        logger.error(`No location found for ${this.id}`);
        TrainingSessionCollection.update({_id: this.id}, {
            $set: {
                location: {
                    processedAt: Date.now(),
                    found: false
                }
            }
        });
    }

    /**
     * private
     * @param position
     */
    setLocationInfo(position) {
        logger.info(`Location updated for ${this.id}; ${position.city}, ${position.country}`);
        TrainingSessionCollection.update({_id: this.id}, {
            $set: {
                location: {
                    processedAt: Date.now(),
                    found: true,
                    country: position.country,
                    city: position.city
                }
            }
        });
    }

    /**
     *
     * @param {string} id
     * @returns {TrainingSession}
     */
    static find(id) {
        return TrainingSession.instantiateFromRecord(TrainingSessionCollection.findOne({_id: id}));
    }

    static cursorFindSession(id) {
        return TrainingSessionCollection.find({_id: id})
    }

    updateAggregates(metricsCount, fullMetricsCount, sumSpm, sumFullSpm, sumHeartRate, sumFullHeartRate, spmZones
        , spmFullZones, speedZones, speedFullZones, heartRateZones, heartRateFullZones, spmZonesToSpeed) {

        this.aggregates = {
            sumMetrics: metricsCount,
            sumFullMetrics: fullMetricsCount,
            sumSpm: sumSpm,
            sumFullSpm: sumFullSpm,
            sumHeartRate: sumHeartRate,
            sumFullHeartRate: sumFullHeartRate,
            spmZones: spmZones,
            spmFullZones: spmFullZones,
            speedZones: speedZones,
            speedFullZones: speedFullZones,
            heartRateZones: heartRateZones,
            heartRateFullZones: heartRateFullZones,
            spmZonesToSpeed: spmZonesToSpeed
        };

        TrainingSessionCollection.update({_id: this.id}, {
            $set: {
                aggregates: this.aggregates
            }
        });
    }

    /**
     *
     * @param {TrainingSessionData} before
     * @param {TrainingSessionData} after
     * @param {number} distance     Distance in meters
     * @return {number}
     */
    distanceToTime(before, after, distance) {
        if (!before) return after.distance * 1000;
        let direction = -1, reference = after;

        if (Math.abs(before.distance * 1000 - distance) < Math.abs(after.distance * 1000 - distance)) {
            reference = before;
            direction = 1;
        }

        // speed is in meters per second
        const distInOneMili = reference.speed / 1000;
        const gap = Math.abs(reference.distance * 1000 - distance);

        return Math.round(reference.timestamp + (gap / distInOneMili * direction));
    }

    /**
     * @param {number}              step            Distance, in meters
     * @param {SessionSplit|null}  [split]
     * @return {Array<TrainingSessionData>}
     */
    stepMetricsIntoReadableDistances(step, split) {
        /**@type Array<TrainingSessionData> */
        let metrics = split ? this.extractSplit(split) : this.data.slice(0);
        if (metrics.length === 0) return [];
        let collapsed = [metrics[0]];
        let position = 0;

        let startAt = split ? split.start : this.date.getTime();

        for (let metric of metrics) {
            metric = metric.clone();

            /** @type TrainingSessionData */
            let stats = collapsed[position];

            if (metric.distance * 1000 > position + step) {
                position += step;
                metric.timestamp = this.distanceToTime(stats, metric, position);
                metric.distance = position / 1000;
                metric.duration = metric.timestamp - startAt;
                collapsed[position] = metric;
                continue;
            }

            collapsed[position].speed = Math.max(metric.speed, collapsed[position].speed);
            collapsed[position].spm = Math.max(metric.spm, collapsed[position].spm);
            collapsed[position].spmEfficiency = Math.max(metric.spmEfficiency, collapsed[position].spmEfficiency);
            collapsed[position].heartRate = Math.max(metric.heartRate, collapsed[position].heartRate);
            collapsed[position].magnitude = Math.max(metric.magnitude, collapsed[position].magnitude);
        }

        /**@type Array<TrainingSessionData> */
        let output = [];
        let previous = collapsed[0];
        for (let record of collapsed) {
            if (!record) continue;
            output.push(record);
            previous = record;
        }

        return output;
    }

    /**
     *
     * @param {SessionSplit|null} split
     * return {Array<TrainingSessionData>}
     */
    extractSplit(split) {
        if (!split) return this.data;
        let data = this.data.slice(split.position.start, split.position.end);
        let output = [];
        for (let metric of data) {
            metric = metric.clone();
            metric.distance -= split.distanceStart;
            metric.duration = metric.timestamp - split.start;
            output.push(metric);
        }
        return output;
    }

    /**
     *
     * @param record
     * @returns {TrainingSession|null}
     */
    static instantiateFromRecord(record) {
        if (!record) {
            return null;
        }

        record = TrainingSession.upgrade(record);

        return new TrainingSession(record.version, record.type, record._id, record.user, record.date, record.serverClockGap, record.data
            , record.angleZ, record.noiseX, record.noiseZ, record.factorX, record.factorZ, record.axis
            , record.coachTrainingSessionStart, record.coachTrainingSessionId
            , record.duration, record.fullDuration, record.distance, record.fullDistance
            , record.avgSpeed, record.minSpeed, record.maxSpeed
            , record.avgSpm, record.minSpm, record.maxSpm
            , record.avgSpmEfficiency, record.minSpmEfficiency, record.maxSpmEfficiency
            , record.avgHeartRate, record.minHeartRate, record.maxHeartRate, record.userHeartRate.max
            , record.expression, record.splits, record.boat
            , record.aggregates, record.pausedDuration, record.processed, record.createdAt
            , record.processedAt, record.inStrava, record.uploadedToStravaAt, record.elevation
            , record.location, record.edited
        );
    }

    /**
     *
     * @param user
     * @param date
     * @returns {TrainingSession}
     */
    static findByUserAndDate(user = null, date) {
        return TrainingSession.instantiateFromRecord(TrainingSessionCollection.findOne({user: user, date: date}));
    }

    /**
     *
     * @param limit
     * @returns {TrainingSession[]}
     */
    static findUnProcessedSessions(limit = 10) {
        let sessions = TrainingSessionCollection.find({$or: [{processed: false}, {processed: {$exists: false}}]}
            , {limit: limit}).fetch();

        let output = [];
        for (let session of sessions) {
            output.push(TrainingSession.instantiateFromRecord(session));
        }
        return output;
    }

    /**
     *
     * @param athleteId
     * @param from
     * @param to
     * @param excludeFree
     * @return {Mongo.Cursor}
     */
    static cursorFindSessionsBetween(athleteId, from, to = null, excludeFree = false) {
        return TrainingSession.cursorFindSessionsBetweenDatesForAthletes([athleteId], from, to, excludeFree);
    }

    /**
     *
     * @param {string}      athleteId
     * @param {Date}        from
     * @param {Date}        to
     * @param {boolean}     excludeFree
     * @returns {TrainingSession[]}
     */
    static findSessionsBetween(athleteId, from, to = null, excludeFree = false) {
        let sessions = TrainingSession.cursorFindSessionsBetween(athleteId, from, to, excludeFree).fetch(), result = [];
        for (let session of sessions) {
            result.push(TrainingSession.instantiateFromRecord(session));
        }
        return result;
    }

    static findSessionsForDay(athleteId, day) {
        const range = Utils.getDateRange(day ,'day');
        let sessions = TrainingSession.cursorFindSessionsBetween(athleteId, range.start, range.end, false)
            .fetch(), result = [];
        for (let session of sessions) {
            result.push(TrainingSession.instantiateFromRecord(session));
        }
        return result;
    }

    /**
     *
     * @param {Date}        from
     * @param {Date}        to
     * @returns {Array<TrainingSession>}
     */
    static findAllSessionsBetween(from, to = null) {
        let sessions = TrainingSessionCollection.find({$and: [{date: {$gte: from}}, {date: {$lte: to}}]});
        let result = [];
        for (let session of sessions) {
            result.push(TrainingSession.instantiateFromRecord(session));
        }
        return result;
    }

    static findSessionsNotInStrava() {
        let sessions = TrainingSessionCollection.find({inStrava: false});
        let result = [];

        for (let session of sessions) {
            result.push(TrainingSession.instantiateFromRecord(session));
        }
        return result;
    }

    /**
     *
     * @param ids
     * @param from
     * @param to
     * @param excludeFree
     * @param suppression
     * @return {Mongo.Cursor}
     */
    static cursorFindSessionsBetweenDatesForAthletes(ids, from, to = null, excludeFree = false, suppression = []) {
        let selector = {user: {$in: ids}, $and: [{date: {$gte: from}}]};
        if (to !== null) {
            selector.$and.push({date: {$lte: to}});
        }
        if (excludeFree === true) {
            selector.$and.push({expression: {$ne: null}});
            selector.$and.push({expression: {$exists: true}});
        }
        selector._id = {$nin: suppression};
        return TrainingSessionCollection.find(selector, {fields: {data: false}});
    }

    /**
     *
     * @param {Array<String>}   ids
     * @param {Date}            from
     * @param {Date}            to
     * @param {Boolean}         excludeFree
     * @param suppression
     * @returns {Array<TrainingSession>}
     */
    static findAllSessionsBetweenDatesForAthletes(ids, from, to = null, excludeFree = false, suppression = []) {
        let sessions = TrainingSession.cursorFindSessionsBetweenDatesForAthletes(ids, from, to, excludeFree, suppression);
        let result = [];
        for (let session of sessions) {
            result.push(TrainingSession.instantiateFromRecord(session));
        }
        return result;
    }

    /**
     *
     * @param limit
     * @return {Array}
     */
    static findSessionsWithoutGeo(limit = 100) {
        let sessions = [], result = [];
        if (limit > 0) sessions = TrainingSessionCollection.find({location: null}, {limit: limit}).fetch();
        for (let session of sessions) {
            result.push(TrainingSession.instantiateFromRecord(session));
        }
        return result;
    }

    /**
     *
     * @param {string} athleteId
     * @param {string} list List of session ids
     * @return {boolean}
     */
    static isAthleteOwnerOfOneOfTheseSessions(athleteId, list) {
        return TrainingSessionCollection.find({user: athleteId, _id: {$in: list}}).count() > 0
    }

    /**
     * Force reprocess of all training sessions for this user
     * @param {string} user
     */
    static reprocess(user) {
        TrainingSessionCollection.update({user: user}, {$set: {processed: false, processedAt: null}}, {multi: true});
        TrainingSessionsDailySummary.remove({user: user});
        TrainingSessionsWeeklySummary.remove({user: user});
        TrainingSessionsYearlySummary.remove({user: user});
    }

    /**
     *
     * @param {String} fromUserId
     * @param {String} toUserId
     */
    static migrateSessions(fromUserId, toUserId) {
        console.log(fromUserId, toUserId);
        return TrainingSessionCollection.update({user: fromUserId}, {$set: {user: toUserId}}, {multi: true});
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get version() {
        return this._version;
    }

    set version(value) {
        this._version = value;
    }

    get type() {
        return this._type;
    }

    set type(value) {
        this._type = value;
    }

    get user() {
        return this._user;
    }

    set user(value) {
        this._user = value;
    }

    /**
     *
     * @return {Date}
     */
    get date() {
        return this._date;
    }

    set date(value) {
        this._date = value;
    }

    get serverClockGap() {
        return this._serverClockGap;
    }

    set serverClockGap(value) {
        this._serverClockGap = value;
    }

    /**
     *
     * @returns {TrainingSessionData[]}
     */
    get data() {
        return this._data;
    }

    set data(value) {
        this._data = value;
    }

    get angleZ() {
        return this._angleZ;
    }

    set angleZ(value) {
        this._angleZ = value;
    }

    get noiseX() {
        return this._noiseX;
    }

    set noiseX(value) {
        this._noiseX = value;
    }

    get noiseZ() {
        return this._noiseZ;
    }

    set noiseZ(value) {
        this._noiseZ = value;
    }

    get factorX() {
        return this._factorX;
    }

    set factorX(value) {
        this._factorX = value;
    }

    get factorZ() {
        return this._factorZ;
    }

    set factorZ(value) {
        this._factorZ = value;
    }

    get axis() {
        return this._axis;
    }

    set axis(value) {
        this._axis = value;
    }

    get coachTrainingSessionStart() {
        return this._coachTrainingSessionStart;
    }

    set coachTrainingSessionStart(value) {
        this._coachTrainingSessionStart = value;
    }

    get coachTrainingSessionId() {
        return this._coachTrainingSessionId;
    }

    set coachTrainingSessionId(value) {
        this._coachTrainingSessionId = value;
    }

    get duration() {
        return this._duration;
    }

    set duration(value) {
        this._duration = value;
    }

    get fullDuration() {
        return this._fullDuration;
    }

    set fullDuration(value) {
        this._fullDuration = value;
    }

    get distance() {
        return this._distance;
    }

    set distance(value) {
        this._distance = value;
    }

    get fullDistance() {
        return this._fullDistance;
    }

    set fullDistance(value) {
        this._fullDistance = value;
    }

    get avgSpeed() {
        return this._avgSpeed;
    }

    set avgSpeed(value) {
        this._avgSpeed = value;
    }

    get minSpeed() {
        return this._minSpeed;
    }

    set minSpeed(value) {
        this._minSpeed = value;
    }

    get maxSpeed() {
        return this._maxSpeed;
    }

    set maxSpeed(value) {
        this._maxSpeed = value;
    }

    get avgSpm() {
        return this._avgSpm;
    }

    set avgSpm(value) {
        this._avgSpm = value;
    }

    get minSpm() {
        return this._minSpm;
    }

    set minSpm(value) {
        this._minSpm = value;
    }

    get maxSpm() {
        return this._maxSpm;
    }

    set maxSpm(value) {
        this._maxSpm = value;
    }

    get avgSpmEfficiency() {
        return this._avgSpmEfficiency;
    }

    set avgSpmEfficiency(value) {
        this._avgSpmEfficiency = value;
    }

    get minSpmEfficiency() {
        return this._minSpmEfficiency;
    }

    set minSpmEfficiency(value) {
        this._minSpmEfficiency = value;
    }

    get maxSpmEfficiency() {
        return this._maxSpmEfficiency;
    }

    set maxSpmEfficiency(value) {
        this._maxSpmEfficiency = value;
    }

    get avgHeartRate() {
        return this._avgHeartRate;
    }

    set avgHeartRate(value) {
        this._avgHeartRate = value;
    }

    get minHeartRate() {
        return this._minHeartRate;
    }

    set minHeartRate(value) {
        this._minHeartRate = value;
    }

    get maxHeartRate() {
        return this._maxHeartRate;
    }

    set maxHeartRate(value) {
        this._maxHeartRate = value;
    }

    get userHeartRate() {
        return this._userHeartRate;
    }

    set userHeartRate(value) {
        this._userHeartRate = value;
    }

    get expression() {
        return this._expression;
    }

    set expression(value) {
        this._expression = value;
    }

    /**
     *
     * @return {Array<SessionSplit>}
     */
    get splits() {
        return this._splits;
    }

    set splits(value) {
        this._splits = value;
    }

    get boat() {
        return this._boat;
    }

    set boat(value) {
        this._boat = value;
    }

    get processed() {
        return this._processed;
    }

    set processed(value) {
        this._processed = value;
    }

    get createdAt() {
        return this._createdAt;
    }

    set createdAt(value) {
        this._createdAt = value;
    }

    get processedAt() {
        return this._processedAt;
    }

    set processedAt(value) {
        this._processedAt = value;
    }

    /**
     * @returns {{sumMetrics: number, sumFullMetrics: number, sumSpm: number, sumFullSpm: number, sumHeartRate: number, sumFullHeartRate: number, spmZones: number[], spmFullZones: number[], speedZones: number[], speedFullZones: number[], heartRateZones: number[], heartRateFullZones: number[]}}
     */
    get aggregates() {
        return this._aggregates;
    }

    set aggregates(value) {
        this._aggregates = value;
    }

    get pausedDuration() {
        return this._pausedDuration;
    }

    set pausedDuration(value) {
        this._pausedDuration = value;
    }

    get inStrava() {
        return this._inStrava;
    }

    set inStrava(value) {
        this._inStrava = value;
    }

    get uploadedToStravaAt() {
        return this._uploadedToStravaAt;
    }

    set uploadedToStravaAt(value) {
        this._uploadedToStravaAt = value;
    }

    get elevation() {
        return this._elevation;
    }

    set elevation(value) {
        this._elevation = value;
    }

    get location() {
        return this._location;
    }

    set location(value) {
        this._location = value;
    }

    get edited() {
        return this._edited;
    }

    set edited(value) {
        this._edited = value;
    }
}

class TrainingSessionProcessFailure {
    /**
     *
     * @param {Object} session
     * @param errorMessage
     */
    constructor(session, errorMessage) {
        this._session = session;

        if (errorMessage instanceof TypeError) {
            this._errorMessage = {
                stack: errorMessage.stack,
                message: errorMessage.message
            }
        } else {
            this._errorMessage = {
                message: errorMessage,
                stack: null
            };
        }
    }

    insert() {
        let json = {... this.session};
        json.exception = this.errorMessage;
        TrainingSessionProcessFailuresCollection.insert(json);
    }


    get session() {
        return this._session;
    }

    set session(value) {
        this._session = value;
    }

    get errorMessage() {
        return this._errorMessage;
    }

    set errorMessage(value) {
        this._errorMessage = value;
    }
}


/**
 *
 * @param collection
 * @param userId
 * @param date
 * @param range
 * @param findOne
 *
 * @returns {Cursor}
 */
function byDateRange(collection, userId, date, range, findOne) {

    var dateRange = Utils.getDateRange(date, range);

    return collection[findOne ? 'findOne' : 'find']({user: userId, date: {$gte: dateRange.start, $lt: dateRange.end}});
}

/**
 * Training sessions statistics by day.
 */
let TrainingSessionsDailySummary = new Mongo.Collection('trainingSessionsDailySummary', {'idGeneration': 'STRING'});

TrainingSessionsDailySummary.byDateRange = function (userId, date, findOne) {

    return byDateRange(this, userId, date, 'day', findOne);
};


/**
 * Training sessions statistics by week.
 */
let TrainingSessionsWeeklySummary = new Mongo.Collection('trainingSessionsWeeklySummary', {'idGeneration': 'STRING'});

TrainingSessionsWeeklySummary.byDateRange = function (userId, date, findOne) {

    return byDateRange(this, userId, date, 'week', findOne);
};


TrainingSessionsWeeklySummary.weekDataForAthletes = function (date, athletes) {

    var dateRange = Utils.getDateRange(date, "week");

    return this.find({user: {$in: athletes}, date: {$gte: dateRange.start, $lt: dateRange.end}});
};

TrainingSessionsWeeklySummary.weekDataForAthlete = function (userId, date) {

    var dateRange = Utils.getDateRange(date, "week");

    return this.find({user: userId, date: {$gte: dateRange.start, $lt: dateRange.end}});
};

/**
 *
 * @param athleteId
 * @param {Date} start
 * @param {Date} stop
 * @returns {Mongo.Cursor}
 */
TrainingSessionsWeeklySummary.interval = function (athleteId, start, stop) {
    return this.find({user: athleteId, date: {$gte: start, $lt: stop}}, {sort: {date: 1}});
};


/**
 * Training sessions statistics by month.
 */
let TrainingSessionsMonthlySummary = new Mongo.Collection('trainingSessionsMonthlySummary', {'idGeneration': 'STRING'});

TrainingSessionsMonthlySummary.byDateRange = function (userId, date, findOne) {

    return byDateRange(this, userId, date, 'month', findOne);
};


/**
 * Training sessions statistics by year.
 */
let TrainingSessionsYearlySummary = new Mongo.Collection('trainingSessionsYearlySummary', {'idGeneration': 'STRING'});

TrainingSessionsYearlySummary.byDateRange = function (userId, date, findOne) {

    return byDateRange(this, userId, date, 'year', findOne);
};


/**
 * Debug information for training sessions.
 */
let DebugSessions = new Mongo.Collection('debugSessions', {'idGeneration': 'STRING'});

DebugSessions.byTrainingSession = function (trainingSessionId) {
    return this.find(
        {trainingSession: trainingSessionId}
    );
};


export {
    TrainingSession,
    TrainingSessionsDailySummary,
    TrainingSessionsWeeklySummary,
    TrainingSessionsMonthlySummary,
    TrainingSessionsYearlySummary,
    DebugSessions,
    Split,
    TrainingSessionData,
    TrainingSessionProcessFailure
};

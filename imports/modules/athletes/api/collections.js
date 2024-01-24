import {TrainingSession} from "../../training-sessions/api/collections";
import {Coach, CoachAthleteGroup, Team} from "../../coaches/api/collections";
import {Utils} from "../../../utils/utils";

let AthletesCollection = new Mongo.Collection('athletes');
let measurementSchema = new SimpleSchema({
    weight: {
        type: Number,
        label: "Athlete weight",
        decimal: true,
        optional: true
    },
    height: {
        type: Number,
        label: "Athlete height",
        decimal: true,
        optional: true
    },
    fat: {
        type: Number,
        label: "Athlete fat percentage",
        decimal: true,
        optional: true
    },
    when: {
        type: Number,
        label: "When measurement was taken"
    }
});

let intervalSchema = new SimpleSchema({
    start: {
        type: Number,
        label: "zone start",
        decimal: true
    },
    end: {
        type: Number,
        label: "zone end",
        decimal: true,
        optional: true
    }
});

let UserHeartRateSchema = new SimpleSchema({
    max: {
        type: Number,
        label: "User max heart rate at the time of session",
        min: 0,
        max: 300
    },
    resting: {
        type: Number,
        label: "User resting heart rate at the time of session",
        min: 0,
        max: 300,
        optional: true
    }
});

let StravaSchema = new SimpleSchema({
    athleteId: {
        type: String,
        label: "Athlete id"
    },
    athleteName: {
        type: String,
        label: "Athlete name"
    },
    accessToken: {
        type: String,
        label: "Api access token"
    },
    refreshToken: {
        type: String,
        label: "Api refresh token"
    },
    accessTokenExpiresAt: {
        type: Number,
        label: "token expiration"
    },
    app: {
        type: String,
        allowedValues: ['gopaddler', 'uttercycling']
    }
});

AthletesCollection.attachSchema(new SimpleSchema({
    name: {
        type: String,
        label: "Athlete name",
        optional: true
    },
    measurements: {
        type: [measurementSchema],
        label: "Athlete measurements"
    },
    strokeRateZones: {
        type: [intervalSchema],
        label: "Stroke rate zones"
    },
    heartRateZones: {
        type: [intervalSchema],
        label: "Heart rate zones"
    },
    speedZones: {
        type: [intervalSchema],
        label: "Speed zones"
    },
    gender: {
        type: String,
        label: "gender",
        allowedValues: ['M', 'F'],
        optional: true
    },
    boat: {
        type: String,
        label: "boat",
        allowedValues: ['K', 'C'],
        optional: true
    },
    heartRate: {
        type: UserHeartRateSchema,
        label: "Athlete heart rate",
    },
    birthDate: {
        type: Date,
        label: "birth date",
        optional: true
    },
    strava: {
        type: StravaSchema,
        label: "strava api info",
        optional: true
    }
}));


const DEFAULT_HEART_RATE_ZONES = [
    {start: 50, end: 59},
    {start: 60, end: 69},
    {start: 70, end: 79},
    {start: 80, end: 89},
    {start: 90, end: Infinity}
];

const DEFAULT_SPEED_ZONES_K1 = [
    {start: 0, end: 9},
    {start: 10, end: 10},
    {start: 11, end: 11},
    {start: 12, end: 12},
    {start: 13, end: 13},
    {start: 14, end: 14},
    {start: 15, end: 15},
    {start: 16, end: Infinity}
];

const DEFAULT_SPEED_ZONES_C1 = [
    {start: 0, end: 9},
    {start: 10, end: 10},
    {start: 11, end: 11},
    {start: 12, end: 12},
    {start: 13, end: 13},
    {start: 14, end: 14},
    {start: 15, end: 15},
    {start: 16, end: Infinity}
];

const DEFAULT_SPM_ZONES_K1 = [
    {start: 0, end: 59},
    {start: 60, end: 69},
    {start: 70, end: 79},
    {start: 80, end: 89},
    {start: 90, end: 99},
    {start: 100, end: 109},
    {start: 110, end: 119},
    {start: 120, end: Infinity}
];

const DEFAULT_SPM_ZONES_C1 = [
    {start: 0, end: 29},
    {start: 30, end: 34},
    {start: 35, end: 39},
    {start: 40, end: 44},
    {start: 45, end: 49},
    {start: 50, end: 54},
    {start: 55, end: 59},
    {start: 60, end: Infinity}
];

const DEFAULT_HR_RANGE = {
    RESTING: 60,
    MAX: 200
};


class Athlete {
    /**
     *
     * @param id
     * @param name
     * @param measurements
     * @param heartRateZones
     * @param strokeRateZones
     * @param speedZones
     * @param gender
     * @param boat
     * @param heartRate
     * @param birthDate
     * @param strava
     */

    constructor(id, name, measurements, heartRateZones, strokeRateZones, speedZones, gender, boat, heartRate, birthDate
                , strava = null) {
        this._measurements = measurements;
        this._id = id;
        this._heartRateZones = heartRateZones;
        this._strokeRateZones = strokeRateZones;
        this._speedZones = speedZones;
        this._gender = gender;
        this._boat = boat;
        this._restingHeartRate = heartRate.resting;
        this._maxHeartRate = heartRate.max;
        this._birthDate = birthDate;
        this._name = name;
        this._strava = strava;
    }


    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

    get measurements() {
        return this._measurements;
    }

    set measurements(value) {
        this._measurements = value;
    }

    get heartRateZones() {
        return this._heartRateZones;
    }

    set heartRateZones(value) {
        if (this.checkZonesIntegrity(value) === false) {
            throw 'invalid zones';
        }
        this._heartRateZones = value;
    }

    /**
     *
     * @return {Array<{start: number, end: number}>}
     */
    get strokeRateZones() {
        return this._strokeRateZones;
    }

    set strokeRateZones(value) {
        if (this.checkZonesIntegrity(value) === false) {
            throw 'invalid zones';
        }
        this._strokeRateZones = value;
    }

    get speedZones() {
        return this._speedZones;
    }

    set speedZones(value) {
        if (this.checkZonesIntegrity(value) === false) {
            throw 'invalid zones';
        }
        this._speedZones = value;
    }

    get gender() {
        return this._gender;
    }

    set gender(value) {
        this._gender = value;
    }

    get boat() {
        return this._boat;
    }

    set boat(value) {
        this._boat = value;
    }

    get restingHeartRate() {
        return this._restingHeartRate;
    }

    set restingHeartRate(value) {
        this._restingHeartRate = value;
    }

    get maxHeartRate() {
        return this._maxHeartRate;
    }

    set maxHeartRate(value) {
        this._maxHeartRate = value;
    }

    get birthDate() {
        return this._birthDate;
    }

    set birthDate(value) {
        this._birthDate = value;
    }

    get stravaAccessToken() {
        if (this._strava === null) return null;
        return this._strava.accessToken;
    }

    /**
     *
     * @return {String}
     */
    get stravaRefreshToken() {
        if (this._strava === null) return null;
        return this._strava.refreshToken;
    }

    get stravaTokenExpiresAt() {
        if (this._strava === null) return 0;
        return this._strava.accessTokenExpiresAt;
    }

    get stravaAthleteId() {
        if (this._strava === null) return null;
        return this._strava.athleteId;
    }

    get stravaAthleteName() {
        if (this._strava === null) return null;
        return this._strava.athleteName;
    }

    get stravaApplication() {
        if (this._strava === null) return null;
        return this._strava.app;
    }


    hasStrava() {
        return this._strava !== null;
    }

    checkZonesIntegrity(zones) {
        for (let i = 0; i < zones.length; i++) {
            if (zones[i + 1] !== undefined && zones[i].end + 1 !== zones[i + 1].start) {
                return false;
            }
        }
        return true;
    }


    toJSON() {
        return {
            _id: this.id,
            name: this.name,
            measurements: this.measurements,
            strokeRateZones: this.strokeRateZones,
            heartRateZones: this.heartRateZones,
            speedZones: this.speedZones,
            gender: this.gender,
            boat: this.boat,
            heartRate: {
                max: this.maxHeartRate,
                resting: this.restingHeartRate
            },
            birthDate: this.birthDate,
            strava: this._strava
        }
    }

    static instantiateFromRecord(record) {
        if (!record) return null;
        return new Athlete(record._id, record.name, record.measurements, record.heartRateZones
            , record.strokeRateZones, record.speedZones, record.gender, record.boat
            , record.heartRate, record.birthDate, record.strava)

    }

    insert() {
        AthletesCollection.insert(this.toJSON())
    }

    update(reprocess = true) {
        AthletesCollection.update({
                _id: this.id,
            },
            {
                $set:
                    {
                        measurements: this.measurements,
                        strokeRateZones: this.strokeRateZones,
                        heartRateZones: this.heartRateZones,
                        speedZones: this.speedZones,
                        gender: this.gender,
                        boat: this.boat,
                        "heartRate.resting": this.restingHeartRate,
                        "heartRate.max": this.maxHeartRate,
                        birthDate: this.birthDate,
                        name: this.name

                    }
            });

        const userId = this.id;
        if (reprocess === false) return;
        Meteor.setTimeout(function () {
            TrainingSession.reprocess(userId);
        }, 1000);
    }

    /**
     * Request access to coach
     * @param coachId
     * @return {number}
     */
    requestToJoinTeam(coachId) {
        return Team.joinCoachTeam(this.id, coachId);
    }

    /**
     *
     * @param coachId
     * @return {boolean}
     */
    leaveTeam(coachId) {
        return Team.leaveTeam(coachId, this.id) >= 0;
    }

    /**
     *
     * @return {Array<Coach>}
     */
    findCoaches() {
        return Team.athleteCoaches(this.id);
    }

    /**
     *
     * @return {string}
     */
    initials() {
        return Utils.getInitials(this.name)
    }

    /**
     *
     * @param id
     * @returns {Athlete}
     */
    static find(id) {
        const record = AthletesCollection.findOne({_id: id});
        if (!record) return null;
        return Athlete.instantiateFromRecord(record);
    }

    /**
     *
     * @param {string[]} ids
     * @return {Athlete[]}
     */
    static findInList(ids) {
        let records = Athlete.cursorFindInList(ids).fetch()
            , result = [];

        for (let record of records) {
            result.push(Athlete.instantiateFromRecord(record));
        }
        return result;
    }

    /**
     *
     * @param athleteId
     * @return {Array<Coach>}
     */
    static getCoaches(athleteId) {

        const groups = CoachAthleteGroup.findAllAthleteGroups(athleteId);
        const coachIds = [];

        for (let group of groups) {
            coachIds.push(group.coachId)
        }

        return Coach.allIn(coachIds);
    }

    /**
     *
     * @param {string[]} ids
     * @returns {Mongo.Cursor}
     */
    static cursorFindInList(ids) {
        return AthletesCollection.find({_id: {$in: ids}})
    }

    /**
     *
     * @param id
     * @returns {Mongo.Cursor}
     */
    static cursorFindAthlete(id) {
        return AthletesCollection.find({_id: id});
    }

    static addMeasurement(athleteId, weight, height, fat, when) {
        let measurement = {
            weight: weight,
            height: height,
            fat: fat,
            when: when
        };

        AthletesCollection.update({_id: athleteId}, {
            $push: {
                measurements: measurement
            }
        })
    }

    static editMeasurement(athleteId, weight, height, fat, when) {
        let measurement = {
            weight: weight,
            height: height,
            fat: fat,
            when: when
        };
        const athlete = Athlete.find(athleteId);
        if (athlete === null) {
            return;
        }

        for (let i = 0, l = athlete.measurements.length; i < l; i++) {
            let measure = athlete.measurements[i];
            if (measure.when === when) {
                athlete.measurements[i] = measurement;
            }
        }

        athlete.update();
    }

    static updateAthleteProfile(athleteId, gender, boat, restingHeartRate, maxHeartRate, birthDate) {

        AthletesCollection.update({_id: athleteId}, {
            $set: {
                gender: gender,
                boat: boat,
                heartRate: {
                    max: maxHeartRate,
                    resting: restingHeartRate
                },
                birthDate: birthDate
            }
        })
    }

    static updateAthleteBasicInfo(athleteId, name) {
        AthletesCollection.update({_id: athleteId}, {
            $set: {
                name: name
            }
        })
    }

    static updateHeartRateInfo(athleteId, resting, max) {
        AthletesCollection.update({_id: athleteId}, {
            $set: {
                heartRate: {
                    resting: resting,
                    max: max
                }
            }
        })
    }

    /**
     *
     * @param athleteId
     * @param appName
     * @param stravaAthleteId
     * @param stravaAthleteName
     * @param accessToken
     * @param refreshToken
     * @param accessTokenExpiresAt
     */
    static updateStravaCredentials(athleteId, appName, stravaAthleteId, stravaAthleteName, accessToken, refreshToken, accessTokenExpiresAt) {
        AthletesCollection.update({_id: athleteId}, {
            $set: {
                strava: {
                    athleteId: stravaAthleteId,
                    app: appName,
                    athleteName: stravaAthleteName,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    accessTokenExpiresAt: accessTokenExpiresAt
                }
            }
        });
    }

    static resetStravaCredentials(athleteId) {
        AthletesCollection.update({_id: athleteId}, {
            $set: {
                strava: null
            }
        });
    }

}

export {
    Athlete,
    DEFAULT_SPM_ZONES_K1, DEFAULT_SPEED_ZONES_C1, DEFAULT_HEART_RATE_ZONES, DEFAULT_SPEED_ZONES_K1, DEFAULT_SPM_ZONES_C1,
    DEFAULT_HR_RANGE
}

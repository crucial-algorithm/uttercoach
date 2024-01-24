export default class SessionUI {

    constructor(date, athleteId, sessionId, expression, distance, duration, fullDistance, fullDuration, avgSpm, avgHeartRate
                , sessions = 1, isGroup = false) {
        this._date = date;
        this._athleteId = athleteId;
        this._sessionId = sessionId;
        this._expression = expression;
        this._fullDistance = fullDistance;
        this._fullDuration = fullDuration;
        this._distance = distance;
        this._duration = duration;
        this._sessions = sessions;
        this._isGroup = isGroup;
        this._avgSpm = avgSpm;
        this._avgHeartRate = avgHeartRate;
    }

    /**
     *
     * @param {Array<TrainingSession>} sessions
     */
    static group(sessions) {
        let athletes = {}, ids = [];
        for (let session of sessions) {
            if (!athletes[session.user]) athletes[session.user] = [];
            athletes[session.user].push(session);
        }

        let output = [];
        for (let athleteId in athletes) {
            let sessions = athletes[athleteId];
            let distance = 0, duration = 0, count = 0, fullDuration = 0, fullDistance = 0;
            for (let session of sessions) {
                count++;
                fullDistance += session.fullDistance;
                fullDuration += session.fullDuration;
                distance += session.distance;
                duration += session.duration;
            }
            output.push(new SessionUI(null, athleteId, null, null
                , distance, duration, fullDistance, fullDuration
                , 0, null, count, true));
        }

        return output;
    }

    get athleteId() {
        return this._athleteId;
    }

    set athleteId(value) {
        this._athleteId = value;
    }

    get sessionId() {
        return this._sessionId;
    }

    set sessionId(value) {
        this._sessionId = value;
    }

    get expression() {
        return this._expression;
    }

    set expression(value) {
        this._expression = value;
    }

    get date() {
        return this._date;
    }

    set date(value) {
        this._date = value;
    }

    get distance() {
        return this._distance;
    }

    set distance(value) {
        this._distance = value;
    }

    get duration() {
        return this._duration;
    }

    set duration(value) {
        this._duration = value;
    }

    get fullDistance() {
        return this._fullDistance;
    }

    set fullDistance(value) {
        this._fullDistance = value;
    }

    get fullDuration() {
        return this._fullDuration;
    }

    set fullDuration(value) {
        this._fullDuration = value;
    }

    get avgSpm() {
        return this._avgSpm;
    }

    set avgSpm(value) {
        this._avgSpm = value;
    }

    get count() {
        return this._sessions;
    }

    set count(value) {
        this._sessions = value;
    }

    get avgHeartRate() {
        return this._avgHeartRate;
    }

    set avgHeartRate(value) {
        this._avgHeartRate = value;
    }

    get isGroup() {
        return this._isGroup;
    }

    set isGroup(value) {
        this._isGroup = value;
    }

    get isSingleSession() {
        return !this._isGroup
    }
}
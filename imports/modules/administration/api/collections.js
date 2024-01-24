let CollectionPlatformLogs = new Mongo.Collection('platformLogs', {idGeneration: 'STRING'});

CollectionPlatformLogs.attachSchema(new SimpleSchema({
    user: {
        type: String,
        label: 'user id'
    },
    timestamp: {
        type: Number,
        label: 'When'
    },
    action: {
        type: String,
        label: 'action (url, publication or method)'
    }
}));

const START_TIMESTAMP = 1562457600000;

class PlatformLog {

    constructor(user, timestamp, action) {
        this._id = null;
        this._user = user;
        this._timestamp = timestamp;
        this._action = action;
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get user() {
        return this._user;
    }

    set user(value) {
        this._user = value;
    }

    get timestamp() {
        return this._timestamp;
    }

    set timestamp(value) {
        this._timestamp = value;
    }

    get action() {
        return this._action;
    }

    set action(value) {
        this._action = value;
    }

    insert() {
        this.id = CollectionPlatformLogs.insert(this.toJson());
    }

    toJson() {
        return {
            _id: this.id,
            user: this.user,
            timestamp: this.timestamp,
            action: this.action
        }
    }

    static find(id) {
        return PlatformLog.instantiateFromRecord(CollectionPlatformLogs.findOne({_id: id}));
    }

    static findSince(timestamp) {
        let records = CollectionPlatformLogs.find({timestamp: {$gte: timestamp}}).fetch()
            , result = [];
        for (let record of records) {
            result.push(PlatformLog.instantiateFromRecord(record));
        }
        return result;
    }

    static cursorFindLatestForUser(userId) {
        return CollectionPlatformLogs.find({user: userId, timestamp: {$gte: Date.now() - 60000}});
    }

    /**
     *
     * @param userId
     * @returns {PlatformLog[]}
     */
    static findLatestForUser(userId) {
        let records = PlatformLog.cursorFindLatestForUser(userId)
            , result = [];
        for (let record of records) {
            result.push(PlatformLog.instantiateFromRecord(record));
        }
        return result;
    }

    /**
     *
     * @param record
     * @returns {null|PlatformLog}
     */
    static instantiateFromRecord(record) {
        if (!record) return null;
        const instance = new PlatformLog(record.user, record.timestamp, record.action);
        instance.id = record._id;
        return instance;
    }
}


export {
    PlatformLog
}
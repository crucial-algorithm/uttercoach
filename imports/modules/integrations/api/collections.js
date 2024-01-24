const WebHookPayloadCollection = new Mongo.Collection('webhook_payloads', {idGeneration: 'STRING'});

const STATUS = {
    NEW: 'new',
    PROCESSING: 'processing',
    PROCESSED: 'processed',
    FAILED: 'failed',
    IGNORED: 'ignored'
};

const SOURCES = {
    STRIPE: 'stripe',
    UNKNOWN: 'unknown'
};


WebHookPayloadCollection.attachSchema(new SimpleSchema({
    source: {
        type: String,
        label: "issuing entity",
        allowedValues: Object.values(SOURCES)
    },
    payload: {
        type: Object,
        blackbox: true
    },
    status: {
        type: String,
        allowedValues: Object.values(STATUS)
    },
    processStartedAt: {
        type: Number,
        label: "when job started processing record",
        optional: true
    },
    attempts: {
        type: Number,
        label: "number of processing attempts",
        defaultValue: 0
    },
    failedMessage: {
        type: String,
        label: "when processing failed, error message",
        optional: true
    },
    createdAt: {
        type: Number,
        label: "When was added"
    }
}));

class WebHookPayload {
    constructor(id, source, payload, status = STATUS.NEW, createdAt = Date.now()
                , processStartedAt = null, attempts = 0, failedMessage = null) {
        this._id = id;
        this._source = source;
        this._payload = payload;
        this._createdAt = createdAt;
        this._status = status;
        this._processStartedAt = processStartedAt;
        this._attempts = attempts;
        this._failedMessage = failedMessage;
    }

    toJSON() {
        return {
            _id: this.id,
            source: this.source,
            payload: this.payload,
            status: this.status,
            processStartedAt: this.processStartedAt,
            attempts: this.attempts,
            failedMessage: this.failedMessage,
            createdAt: this.createdAt
        }
    }

    insert() {
        WebHookPayloadCollection.insert(this.toJSON());
    }

    save() {
        WebHookPayloadCollection.update({_id: this.id}, {$set: this.toJSON()});
    }

    markAsProcessed() {
        this.status = STATUS.PROCESSED;
        this.save();
    }

    markAsIgnored() {
        this.status = STATUS.IGNORED;
        this.save();
    }

    markAsFailed(message) {
        this.status = STATUS.FAILED;
        this.failedMessage = message;
        this.processStartedAt = Date.now();
        this.save();
    }

    /**
     *
     * @param record
     * @return {WebHookPayload}
     */
    static instantiateFromRecord(record) {
        if (record === null) return null;
        return new WebHookPayload(record._id, record.source, record.payload, record.status
            , record.createdAt, record.processStartedAt, record.attempts, record.failedMessage);

    }

    /**
     *
     * @return {Promise<WebHookPayload>}
     */
    static async lockRecordForProcessing() {
        const collection = WebHookPayloadCollection.rawCollection();
        const record = await collection.findOneAndUpdate({ source: SOURCES.STRIPE,
            $or: [{status: STATUS.NEW}, {
                status: STATUS.PROCESSING,
                processStartedAt: {$lte: Date.now() - 3600000}
            }, {status: STATUS.FAILED, attempts: {$lte: 5}, processStartedAt: {$lte: Date.now() - 45000}}]
        }, {
            $set: {status: STATUS.PROCESSING, processStartedAt: Date.now()}, $inc: {attempts: 1}
        }, {returnNewDocument: true, returnOriginal: false});
        return WebHookPayload.instantiateFromRecord(record.ok ? record.value : null);
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get source() {
        return this._source;
    }

    set source(value) {
        this._source = value;
    }

    get payload() {
        return this._payload;
    }

    set payload(value) {
        this._payload = value;
    }

    get createdAt() {
        return this._createdAt;
    }

    set createdAt(value) {
        this._createdAt = value;
    }

    get status() {
        return this._status;
    }

    set status(value) {
        this._status = value;
    }

    get processStartedAt() {
        return this._processStartedAt;
    }

    set processStartedAt(value) {
        this._processStartedAt = value;
    }

    get attempts() {
        return this._attempts;
    }

    set attempts(value) {
        this._attempts = value;
    }

    get failedMessage() {
        return this._failedMessage;
    }

    set failedMessage(value) {
        this._failedMessage = value;
    }

    /**
     *
     * @return {{STRIPE: string, UNKNOWN: string}}
     */
    static sources() {
        return SOURCES;
    }
}

export {WebHookPayload}
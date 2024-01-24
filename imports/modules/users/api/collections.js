import { Random } from 'meteor/random';

/**
 *
 * @return {String}
 */
function generateRandomDisplayableToken() {
    // careful about changing the number of chars, because there are usages in which token
    // is concatenated (example: when exchanging data with strava)
    return Random.secret(43).toLowerCase();
}

const EmailNotificationsCollection = new Meteor.Collection("emailNotifications", {idGeneration: "STRING"});

EmailNotificationsCollection.attachSchema(new SimpleSchema({
    from: {type: String},
    to: {type: String},
    subject: {type: String},
    text: {type: String},
    html: {type: String, optional: true},
    processing: {type: Boolean, defaultValue: false}
}));


class EmailNotification {

    constructor(to, subject, text, html, from = 'Utter Coach <noreply@uttercoach.com>', processing = false, id = null) {
        this._from = from;
        this._to = to;
        this._subject = subject;
        this._text = text;
        this._html = html;
        this._processing = processing;
        this._id = id;
    }

    toJSON() {
        return {
            _id: this.id,
            from: this.from,
            to: this.to,
            subject: this.subject,
            text: this.text,
            html: this.html,
            processing: this.processing
        }
    }

    insert() {
        this.id = EmailNotificationsCollection.insert(this.toJSON());
    }

    /**
     * @param id
     * @return {EmailNotification}
     */
    static find(id) {
        return EmailNotification.instantiateFromRecord(EmailNotificationsCollection.findOne({_id: id}));
    }

    /**
     *
     * @param record
     * @return {null|EmailNotification}
     */
    static instantiateFromRecord(record) {
        if (!record) return null;
        return new EmailNotification(record.to, record.subject, record.text, record.html, record.from, record.processing, record._id)
    }


    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get from() {
        return this._from;
    }

    set from(value) {
        this._from = value;
    }

    get to() {
        return this._to;
    }

    set to(value) {
        this._to = value;
    }

    get subject() {
        return this._subject;
    }

    set subject(value) {
        this._subject = value;
    }

    get text() {
        return this._text;
    }

    set text(value) {
        this._text = value;
    }

    get html() {
        return this._html;
    }

    set html(value) {
        this._html = value;
    }

    get processing() {
        return this._processing;
    }

    set processing(value) {
        this._processing = value;
    }
}

const RecoverAccountCollection = new Meteor.Collection("recoverAccountTokens", {idGeneration: "STRING"});
RecoverAccountCollection.attachSchema(new SimpleSchema({
    token: {
        type: String,
        label: 'validation token'
    },
    existingAccountId: {
        type: String,
        label: 'existing user id'
    },
    newAccountId: {
        type: String,
        label: 'new user id'
    },
    email: {
        type: String,
        label: 'Account email'
    },
    used: {
        type: Boolean,
        label: 'Was already used?'
    },
    usedAt: {
        type: Number,
        label: "Timestamp of usage",
        optional: true
    }
}));

class RecoverAccount {
    constructor(id, token, existingAccountId, newAccountId,  email, used = false, usedAt = null) {
        this._id = id;
        this._token = token;
        this._existingAccountId = existingAccountId;
        this._newAccountId = newAccountId;
        this._email = email;
        this._used = used;
        this._usedAt = usedAt;

    }

    toJSON() {
        return {
            _id: this.id,
            token: this.token,
            existingAccountId: this.existingAccountId,
            newAccountId: this.newAccountId,
            email: this.email,
            used: this.used,
            usedAt: this.usedAt
        }
    }

    markAsUsed() {
        console.log('marking as used');
        RecoverAccountCollection.update({_id: this.id}, {$set: {used: true, usedAt: Date.now()}})
    }

    /**
     *
     * @param token
     * @return {RecoverAccount|null}
     */
    static findByToken(token) {
        const recover = RecoverAccountCollection.findOne({token: token});
        if (!recover) return null;
        return RecoverAccount.instantiateFromRecord(recover);
    }

    static instantiateFromRecord(json) {
        return new RecoverAccount(json._id, json.token, json.existingAccountId, json.newAccountId, json.email, json.used, json.usedAt);
    }

    static create(existingAccountId, newAccountId, email) {
        let token = generateRandomDisplayableToken();
        const instance = new RecoverAccount(null, token, existingAccountId, newAccountId, email, false, null);
        let json = instance.toJSON();
        delete json._id;
        instance.id = RecoverAccountCollection.insert(json);
        return instance;
    }

    static cursorFindByToken(token) {
        return RecoverAccountCollection.find({token: token});
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get token() {
        return this._token;
    }

    set token(value) {
        this._token = value;
    }

    get existingAccountId() {
        return this._existingAccountId;
    }

    set existingAccountId(value) {
        this._existingAccountId = value;
    }

    get newAccountId() {
        return this._newAccountId;
    }

    set newAccountId(value) {
        this._newAccountId = value;
    }

    get email() {
        return this._email;
    }

    set email(value) {
        this._email = value;
    }


    get used() {
        return this._used;
    }

    set used(value) {
        this._used = value;
    }

    get usedAt() {
        return this._usedAt;
    }

    set usedAt(value) {
        this._usedAt = value;
    }
}


const InviteToJoinGoPaddlerCollection = new Meteor.Collection("joinGoPaddlerInvites", {idGeneration: "STRING"});
InviteToJoinGoPaddlerCollection.attachSchema(new SimpleSchema({
    token: {
        type: String,
        label: 'validation token'
    },
    source: {
        type: String,
        label: 'were was it created at'
    },
    from: {
        type: String,
        label: 'user id'
    },
    to: {
        type: String,
        label: 'Email'
    },
    name: {
        type: String,
        label: 'name of the user',
        optional: true
    },
    createdAt: {
        type: Number,
        label: "Timestamp of creation",
        optional: true
    },
    used: {
        type: Boolean,
        label: 'Was already used?'
    },
    usedAt: {
        type: Number,
        label: "Timestamp of usage",
        optional: true
    }
}));

class InviteToJoinGoPaddler {
    constructor(id, token, source, from, to, name, createdAt = Date.now(), used = false, usedAt = null) {

        this._id = id;
        this._token = token;
        this._source = source;
        this._from = from;
        this._to = to;
        this._name = name;
        this._createdAt = createdAt;
        this._used = used;
        this._usedAt = usedAt;
    }

    /**
     *
     * @return {{createdAt: number, from: *, usedAt: boolean, _id: *, source: *, to: *, used: boolean, token: *}}
     */
    toJSON() {
        return {
            _id: this.id,
            token: this.token,
            source: this.source,
            from: this.from,
            to: this.to,
            name: this.name,
            createdAt: this.createdAt,
            used: this.used,
            usedAt: this.usedAt
        }
    }

    /**
     *
     * @param json
     * @return {InviteToJoinGoPaddler}
     */
    static instantiateFromRecord(json) {
        if (!json) return null;
        return new InviteToJoinGoPaddler(json._id, json.token, json.source, json.from, json.to, json.name
            , json.createdAt, json.used, json.usedAt);
    }

    /**
     *
     * @param email
     * @return {Array<InviteToJoinGoPaddler>}
     */
    static findByEmail(email) {
        let list = [];
        let invites = InviteToJoinGoPaddlerCollection.find({to: email}).fetch();
        for (let invite of invites) {
            list.push(InviteToJoinGoPaddler.instantiateFromRecord(invite))
        }
        return list;
    }

    /**
     *
     * @param token
     * @return {InviteToJoinGoPaddler}
     */
    static findByToken(token) {
        return InviteToJoinGoPaddler.instantiateFromRecord(InviteToJoinGoPaddlerCollection.findOne({token: token}))
    }

    /**
     *
     * @param token
     * @return {Mongo.Cursor}
     */
    static cursorFindByToken(token) {
        return InviteToJoinGoPaddlerCollection.find({token: token})
    }

    /**
     *
     * @param athleteId
     * @param email
     * @return {InviteToJoinGoPaddler}
     */
    static inviteCoach(athleteId, email) {
        return InviteToJoinGoPaddler.createInvite('App', athleteId, email);
    }

    static inviteAthlete(coachId, email, name) {
        return InviteToJoinGoPaddler.createInvite('Web', coachId, email, name);
    }

    /**
     *
     * @param source
     * @param id
     * @param email
     * @param name
     * @private
     * @return {InviteToJoinGoPaddler}
     */
    static createInvite(source, id, email, name = null) {
        let token = generateRandomDisplayableToken();
        let invite = new InviteToJoinGoPaddler(null, token, source, id, email, name);
        invite.insert();
        return invite;
    }

    insert() {
        this.id = InviteToJoinGoPaddlerCollection.insert(this.toJSON());
    }

    markAsUsed() {
        InviteToJoinGoPaddlerCollection.update({_id: this.id}, {$set: {used: true, usedAt: Date.now()}})
    }

    isCoachToAthlete() {
        return this.source === "Web";
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get token() {
        return this._token;
    }

    set token(value) {
        this._token = value;
    }

    get source() {
        return this._source;
    }

    set source(value) {
        this._source = value;
    }

    get from() {
        return this._from;
    }

    set from(value) {
        this._from = value;
    }

    get to() {
        return this._to;
    }

    set to(value) {
        this._to = value;
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

    get createdAt() {
        return this._createdAt;
    }

    set createdAt(value) {
        this._createdAt = value;
    }

    get used() {
        return this._used;
    }

    set used(value) {
        this._used = value;
    }

    get usedAt() {
        return this._usedAt;
    }

    set usedAt(value) {
        this._usedAt = value;
    }
}


const AppAuthTokenCollection = new Meteor.Collection("appAuthTokens", {idGeneration: "STRING"});
AppAuthTokenCollection.attachSchema({
    token: {
        type: String,
        label: 'validation token'
    },
    athleteId: {
        type: String,
        label: 'athlete id'
    },
    createdAt: {
        type: Number,
        label: 'Timestamp of creation',
        optional: true
    },
    used: {
        type: Boolean,
        label: 'Was already used?'
    },
    usedAt: {
        type: Number,
        label: 'Timestamp of usage',
        optional: true
    }
});

class AppAuthToken {
    constructor(id, athleteId, token, createdAt = Date.now(), used = false, usedAt = null) {
        this._id = id;
        this._athleteId = athleteId;
        this._token = token;
        this._createdAt = createdAt;
        this._used = used;
        this._usedAt = usedAt;
    }

    /**
     *
     * @return {{createdAt: number, athleteId: *, usedAt: *, _id: *, used: boolean, token: *}}
     */
    toJSON() {
        return {
            _id: this.id,
            athleteId: this.athleteId,
            token: this.token,
            createdAt: this.createdAt,
            used: this.used,
            usedAt: this.usedAt
        }
    }

    markAsUsed() {
        AppAuthTokenCollection.update({_id: this.id}, {$set: {used: true, usedAt: Date.now()}})
    }

    /**
     *
     * @param token
     * @return {AppAuthToken|null}
     */
    static findByToken(token) {
        const instance = AppAuthTokenCollection.findOne({token: token});
        if (!instance) return null;
        return AppAuthToken.instantiateFromRecord(instance);
    }

    static instantiateFromRecord(json) {
        return new AppAuthToken(json._id, json.athleteId, json.token, json.existingAccountId, json.newAccountId, json.email, json.used, json.usedAt);
    }

    /**
     *
     * @param athleteId
     * @return {AppAuthToken}
     */
    static create(athleteId) {
        let token = generateRandomDisplayableToken();
        const instance = new AppAuthToken(null, athleteId, token);
        let json = instance.toJSON();
        delete json._id;
        instance.id = AppAuthTokenCollection.insert(json);
        return instance;
    }

    static cursorFindByToken(token) {
        return AppAuthTokenCollection.find({token: token});
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get athleteId() {
        return this._athleteId;
    }

    set athleteId(value) {
        this._athleteId = value;
    }

    get token() {
        return this._token;
    }

    set token(value) {
        this._token = value;
    }

    get createdAt() {
        return this._createdAt;
    }

    set createdAt(value) {
        this._createdAt = value;
    }

    get used() {
        return this._used;
    }

    set used(value) {
        this._used = value;
    }

    get usedAt() {
        return this._usedAt;
    }

    set usedAt(value) {
        this._usedAt = value;
    }
}

export {
    EmailNotification,
    InviteToJoinGoPaddler,
    RecoverAccount,
    AppAuthToken
}

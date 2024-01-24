import {Meteor} from "meteor/meteor";
import {logger} from "../../../utils/logger";
import {Athlete} from "../../athletes/api/collections";
import {TrainingSession} from "../../training-sessions/api/collections";

/**
 * Coach training sessions collection.
 */
var CoachTrainingSessions = new Meteor.Collection('coachTrainingSessions', {idGeneration: 'STRING'});


/**
 * Find all training sessions created by a given coach for the provided year and month.
 *
 * @param userId
 * @param year
 * @param month
 *
 * @returns {*}
 */
CoachTrainingSessions.byMonth = function (userId, year, month) {

    return this.find(
        {user: userId, date: {$gte: new Date(year, month, 1), $lt: new Date(year, month + 1, 1)}}
    );
};

/**
 * Find all training sessions created by a given coach for the provided interval.
 *
 * @param userId
 * @param startDate
 * @param endDate
 *
 * @returns {*}
 */
CoachTrainingSessions.byInterval = function (userId, startDate, endDate) {

    return this.find({ user: userId, date: {$gte: startDate, $lt: endDate}, deleted: false });
};

/**
 * Find the training session with the provided id for a given coach.
 *
 * @param userId
 * @param id
 * @param findOne
 *
 * @returns {*}
 */
CoachTrainingSessions.byId = function (userId, id, findOne) {

    return this[findOne ? 'findOne' : 'find']({user: userId, _id: id});
};

CoachTrainingSessions.findSessionById = function (id) {
    return this.findOne({_id: id});
};

/**
 * Find the training sessions that use the specified expression id for a given coach.
 *
 * @param userId
 * @param expressionId
 *
 * @returns {*}
 */
CoachTrainingSessions.byExpressionId = function (userId, expressionId) {

    return this.find({user: userId, expressionId: expressionId});
};

/**
 * Coach athlete groups collection.
 */
const CoachAthleteGroupsCollection = new Meteor.Collection('coachAthleteGroups', {idGeneration: 'STRING'});

const CoachGroupAthletesSchema = new SimpleSchema({
    user: {
        type: String,
        label: 'Athlete id'
    }
});

CoachAthleteGroupsCollection.attachSchema(new SimpleSchema({
    name: {
        type: String,
        label: 'Group name',
        optional: true
    },
    user: {
        type: String,
        label: 'Coach'
    },
    athletes: {
        type: [CoachGroupAthletesSchema]
    },
    createdAt: {
        type: Number
    },
    updatedAt: {
        type: Number,
        optional: true
    }
}));

class CoachAthleteGroup {

    constructor(coachId, name, athletes, id, createdAt = Date.now(), updatedAt = null) {
        this._coachId = coachId;
        this._name = name;
        /**@type Array<String> */
        this._athletes = athletes;
        this._id = id === undefined ? null : id;
        this._createdAt = createdAt;
        this._updatedAt = updatedAt;
    }

    toJSON() {
        return {
            _id: this.id,
            user: this.coachId,
            name: this.name,
            athletes: this.athletes.map((id) => { return {user: id} }),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        }
    }

    save() {
        if (this.id) {
            this.updatedAt = Date.now();
            CoachAthleteGroupsCollection.update({_id: this.id}, {$set: this.toJSON()})
        } else {
            this.id = CoachAthleteGroupsCollection.insert(this.toJSON());

        }
        return this.id;
    }

    delete() {
        CoachAthleteGroupsCollection.remove({_id: this.id});
    }

    /**
     * Used in fixtures
     * @deprecated
     * @return {Array<CoachAthleteGroup>}
     */
    static all() {
        let groups = CoachAthleteGroupsCollection.find({}).fetch();
        let result = [];
        for (let group of groups) {
            result.push(CoachAthleteGroup.instantiateFromRecord(group));
        }
        return result;
    }

    /**
     *
     * @param id
     * @return {CoachAthleteGroup}
     */
    static find(id) {
        return CoachAthleteGroup.instantiateFromRecord(CoachAthleteGroupsCollection.findOne({_id: id}));
    }

    /**
     *
     * @param coachId
     * @param reactive
     * @return {Mongo.Cursor}
     */
    static cursorFindCoachGroups(coachId, reactive = true) {
        return CoachAthleteGroupsCollection.find({user: coachId}, {reactive: reactive});
    }

    /**
     *
     * @param coachId
     * @param reactive
     * @return {Array<CoachAthleteGroup>}
     */
    static findCoachGroups(coachId, reactive = true) {
        let groups = CoachAthleteGroup.cursorFindCoachGroups(coachId, reactive).fetch();
        let result = [];
        for (let group of groups) {
            result.push(CoachAthleteGroup.instantiateFromRecord(group));
        }
        return result;
    }

    /**
     *
     * @param {Array<String>} groups
     * @param {String} athleteId
     * @return {CoachAthleteGroup}
     */
    static findGroupWithin(groups, athleteId) {
        return CoachAthleteGroup.instantiateFromRecord(CoachAthleteGroupsCollection.findOne({
            _id: {$in: groups},
            "athletes.user": athleteId
        }));
    }

    static coachNbrOfAthletes(coachId) {
        const groups = CoachAthleteGroup.findCoachGroups(coachId);
        let total = 0;
        for (let group of groups) {
            for (let athleteId of group.athletes) {
                if (athleteId !== coachId) {
                    total++;
                }
            }
        }
        return total;
    }

    static cursorFindAllForCoach(coachId) {
        return CoachAthleteGroupsCollection.find({user: coachId});
    }

    static cursorFindCoachGroupForAthlete(coachId, athleteId) {
        return CoachAthleteGroupsCollection.find({user: coachId, athletes: {user: athleteId}});
    }

    /**
     *
     * @param coachId
     * @param athleteId
     * @return {CoachAthleteGroup}
     */
    static findCoachGroupForAthlete(coachId, athleteId) {
        let group = CoachAthleteGroup.cursorFindCoachGroupForAthlete(coachId, athleteId).fetch()[0];
        if (!group) return null;
        return CoachAthleteGroup.instantiateFromRecord(group);
    }

    /**
     * Find groups athlete belongs to
     * @param athleteId
     * @return {Mongo.Cursor}
     */
    static cursorFindAllAthleteGroups(athleteId) {
        return CoachAthleteGroupsCollection.find({athletes: {user: athleteId}})
    }

    /**
     *
     * @param athleteId
     * @return {Array<CoachAthleteGroup>}
     */
    static findAllAthleteGroups(athleteId) {
        let groups = CoachAthleteGroup.cursorFindAllAthleteGroups(athleteId).fetch();
        let result = [];
        for (let group of groups) {
            let instance = CoachAthleteGroup.instantiateFromRecord(group);
            if (instance) result.push(instance);
        }
        return result;

    }

    static removeAthleteFromAllGroups(coachId, athleteId) {
        CoachAthleteGroupsCollection.update({
            user: coachId,
            athletes: {user: athleteId}
        }, {$pull: {athletes: {user: athleteId}}, $set: {updatedAt: Date.now()}}, {multi: true});

    }

    static appendAthleteToGroup(coachId, groupId, athleteId) {
        let group = CoachAthleteGroup.find(groupId);
        group.athletes.push(athleteId);
        // make athletes distinct
        group.athletes = [... new Set(group.athletes)];
        group.save();

    }

    static createInitialGroups(coachId) {
        // create groups
        let k1 = new CoachAthleteGroup(coachId, "K1's", [], null);
        k1.save();
        new CoachAthleteGroup(coachId, "C1's", [], null).save();
        return k1.id;
    }

    /**
     *
     * @param record
     * @return {CoachAthleteGroup}
     */
    static instantiateFromRecord(record) {
        if (!record) return null;

        if (!record.athletes) record.athletes = [];

        let athletes = record.athletes.map((athlete) => {
            return athlete.user
        });

        return new CoachAthleteGroup(record.user, record.name, athletes, record._id, record.createdAt, record.updatedAt);
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get coachId() {
        return this._coachId;
    }

    set coachId(value) {
        this._coachId = value;
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

    get athletes() {
        return this._athletes;
    }

    set athletes(value) {
        this._athletes = value;
    }

    get createdAt() {
        return this._createdAt;
    }

    set createdAt(value) {
        this._createdAt = value;
    }

    get updatedAt() {
        return this._updatedAt;
    }

    set updatedAt(value) {
        this._updatedAt = value;
    }
}

/**
 * Coach training expressions collection.
 */
const CoachTrainingExpressions = new Meteor.Collection('coachTrainingExpressions', {idGeneration: 'STRING'});

/**
 * Get all training expressions for a given coach.
 *
 * @param userId
 *
 * @returns {*}
 */
CoachTrainingExpressions.getAll = function (userId) {
    return this.find({user: userId}, {sort: {createdAt: -1}});
};


/**
 * Find the training expression with the provided id
 *
 * @param id
 *
 * @returns {*}
 */
CoachTrainingExpressions.byId = function (id) {

    return this.findOne({_id: id});
};

const CoachCollection = new Mongo.Collection('coaches');

const StripeSchema = new SimpleSchema({
    customerId: {
        type: String,
        label: "Stripe internal customer id",
        optional: true
    },
    subscriptionId: {
        type: String,
        label: "Stripe subscription id",
        optional: true
    },
    paymentMethodId: {
        type: String,
        label: "Current payment method",
        optional: true
    }
});

const InvoicesSchema = new SimpleSchema({
    id: {
        type: String,
        label: "Invoice id"
    },
    createdAt: {
        type: Number,
        label: "Timestamp created"
    },
    paid: {
        type: Boolean,
        label: "Was it paid",
        defaultValue: false
    },
    amount: {
        type: Number,
        label: "Amount due",
        decimal: true
    },
    currency: {
        type: String,
        label: "currency"
    },
    number: {
        type: String,
        label: "Invoice number"
    },
    invoiceUrl: {
        type: String,
        label: "online invoice in stripe",
        optional: true
    },
    pdfUrl: {
        type: String,
        label: "invoice url",
        optional: true
    },
    receiptUrl: {
        type: String,
        label: "receipt url",
        optional: true
    },
    status: {
        type: String,
        label: "Stripe status"
    },
    billingReason: {
        type: String,
        label: "Why is costumer being billed"
    },
    subscriptionId: {
        type: String,
        label: "Subscription this invoice refers to"
    },
    transactionPeriodStart: {
        type: Number,
        label: "transaction period start"
    },
    transactionPeriodEnd: {
        type: Number,
        label: "transaction period end"
    }
});

const LatencySchema = new SimpleSchema({
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
    }
});

const COACH_STATES = {
    TRIAL: "trial",
    AWAITING_SUBSCRIPTION: "awaiting_subscription",
    SUBSCRIBED: "subscribed",
    INVOICE_OVERDUE: "invoice_overdue",
    INVOICE_UNPAID: "invoice_unpaid",
    BEFORE_SUBSCRIPTION: "before_sub",
    CANCELED: "canceled"
};

class Invoice {
    /**
     *
     * @param id
     * @param paid
     * @param amount
     * @param currency
     * @param number
     * @param createdAt
     * @param status
     * @param billingReason
     * @param subscriptionId
     * @param transactionPeriodStart
     * @param transactionPeriodEnd
     * @param invoiceUrl
     * @param pdfUrl
     * @param receiptUrl
     */
    constructor(id, paid, amount, currency, number, createdAt, status, billingReason, subscriptionId
                , transactionPeriodStart, transactionPeriodEnd
                , invoiceUrl = null, pdfUrl = null, receiptUrl = null) {
        this._id = id;
        this._paid = paid === true;
        this._createdAt = createdAt;
        this._status = status;
        this._billingReason = billingReason;
        this._subscriptionId = subscriptionId;
        this._amount = amount;
        this._currency = currency;
        this._number = number;
        this._invoiceUrl = invoiceUrl;
        this._pdfUrl = pdfUrl;
        this._receiptUrl = receiptUrl;
        this._transactionPeriodStart = transactionPeriodStart;
        this._transactionPeriodEnd = transactionPeriodEnd;
    }

    toJSON() {
        return {
            id: this.id,
            paid: this.paid,
            createdAt: this.createdAt,
            status: this.status,
            billingReason: this.billingReason,
            subscriptionId: this.subscriptionId,
            amount: this.amount,
            currency: this.currency,
            number: this.number,
            invoiceUrl: this.invoiceUrl,
            pdfUrl: this.pdfUrl,
            receiptUrl: this.receiptUrl,
            transactionPeriodStart: this.transactionPeriodStart,
            transactionPeriodEnd: this.transactionPeriodEnd
        }
    }

    /**
     *
     * @param record
     * @return {Invoice}
     */
    static instantiateFromRecord(record) {
        if (!record) return null;
        return new Invoice(record.id, record.paid === true, record.amount
            , record.currency, record.number, record.createdAt, record.status
            , record.billingReason, record.subscriptionId, record.transactionPeriodStart, record.transactionPeriodEnd
            , record.invoiceUrl, record.pdfUrl, record.receiptUrl
        );
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get paid() {
        return this._paid;
    }

    set paid(value) {
        this._paid = value;
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

    get billingReason() {
        return this._billingReason;
    }

    set billingReason(value) {
        this._billingReason = value;
    }

    get subscriptionId() {
        return this._subscriptionId;
    }

    set subscriptionId(value) {
        this._subscriptionId = value;
    }

    get amount() {
        return this._amount;
    }

    set amount(value) {
        this._amount = value;
    }

    get currency() {
        return this._currency;
    }

    set currency(value) {
        this._currency = value;
    }

    get number() {
        return this._number;
    }

    set number(value) {
        this._number = value;
    }

    get invoiceUrl() {
        return this._invoiceUrl;
    }

    set invoiceUrl(value) {
        this._invoiceUrl = value;
    }

    get pdfUrl() {
        return this._pdfUrl;
    }

    set pdfUrl(value) {
        this._pdfUrl = value;
    }

    get receiptUrl() {
        return this._receiptUrl;
    }

    set receiptUrl(value) {
        this._receiptUrl = value;
    }

    get transactionPeriodStart() {
        return this._transactionPeriodStart;
    }

    set transactionPeriodStart(value) {
        this._transactionPeriodStart = value;
    }

    get transactionPeriodEnd() {
        return this._transactionPeriodEnd;
    }

    set transactionPeriodEnd(value) {
        this._transactionPeriodEnd = value;
    }
}

const TRIAL_PERIOD_IN_DAYS = 30;
const COST_PER_ATHLETE = 10;

CoachCollection.attachSchema(new SimpleSchema({
    latency: {
        type: LatencySchema,
        label: "Last known latency data for coach (in live sessions)",
        optional: true
    },
    name: {
        type: String,
        label: "Coach name"
    },
    email: {
        type: String,
        label: "Coach e-mail",
        optional: true
    },
    state: {
        type: String,
        label: "Coach subscription state"
    },
    daysLeftInTrial: {
        type: Number,
        label: "Number of days until trial finishes",
        defaultValue: TRIAL_PERIOD_IN_DAYS
    },
    invoices: {
        type: [InvoicesSchema],
        label: "Coach invoices"
    },
    stripe: {
        type: StripeSchema,
        label: "Stripe related meta"
    },
    costPerAthlete: {
        type: Number,
        label: "Cost per athlete",
        defaultValue: COST_PER_ATHLETE
    },
    paidUntil: {
        type: Number,
        label: "until when did the coach paid his subscription",
        optional: true
    },
    createdAt: {
        type: Number,
        label: "Timestamp created"
    },
    nbrOfLogins: {
        type: Number,
        label: "Timestamp created"
    },
    lastLoginAt: {
        type: Number,
        label: "Last time coach logged in",
        optional: true
    },
    invitationCode : {
        type: Number,
        label: "Coach invitation code"
    },
    notifications: {
        type: [String],
        label: "Emails sent to coaches to recover from churn"
    },
    suppression: {
        type: [String],
        label: "list of session coach does not want to see",
        defaultValue: []
    },
    sport: {
        type: String,
        label: "Coach primary sport",
        allowedValues: ['canoeing', 'cycling'],
        optional: true // required for the signup form to work
    }
}));

class Coach {
    /**
     *
     * @param id
     * @param name
     * @param email
     * @param createdAt
     * @param invitationCode
     * @param latency
     * @param state
     * @param costPerAthlete
     * @param daysLeftInTrial
     * @param invoices
     * @param stripeCustomerId
     * @param stripeSubscriptionId
     * @param stripePaymentMethodId
     * @param paidUntil
     * @param lastLoginAt
     * @param nbrOfLogins
     * @param {Array<String>} notifications
     * @param {Array<String>} suppression
     * @param {String} sport
     */
    constructor(id, name, email, createdAt, invitationCode, latency = null
                , state = COACH_STATES.TRIAL, costPerAthlete = COST_PER_ATHLETE, daysLeftInTrial = TRIAL_PERIOD_IN_DAYS
                , invoices = [], stripeCustomerId = null
                , stripeSubscriptionId = null, stripePaymentMethodId = null, paidUntil = null
                , lastLoginAt = null, nbrOfLogins = 0, notifications = [], suppression
                , sport = null) {
        this._id = id;
        this._latency = latency;
        this._name = name;
        this._email = email;
        this._createdAt = createdAt;
        this._state = state;
        /**@type Array<Invoice>*/
        this._invoices = invoices || [];
        this._stripeCustomerId = stripeCustomerId;
        this._stripeSubscriptionId = stripeSubscriptionId;
        this._stripePaymentMethodId = stripePaymentMethodId;
        this._costPerAthlete = costPerAthlete;
        this._daysLeftInTrial = daysLeftInTrial;
        this._paidUntil = paidUntil;
        this._lastLoginAt = lastLoginAt;
        this._invitationCode = invitationCode;
        this._nbrOfLogins = nbrOfLogins;
        this._notifications = notifications;
        this._suppression = suppression;
        this._sport = sport;
    }

    insert() {
        return CoachCollection.insert(this.toJSON());
    }

    save() {
        CoachCollection.update({_id: this.id}, {$set: this.toJSON()});
    }

    toJSON() {
        return {
            _id: this.id,
            latency: this.latency,
            name: this.name,
            email: this.email,
            state: this.state,
            daysLeftInTrial: this.daysLeftInTrial,
            invoices: this.invoices.map((r)=>{ return r.toJSON() }),
            stripe: {
                customerId: this.stripeCustomerId,
                subscriptionId: this.stripeSubscriptionId,
                paymentMethodId: this.stripePaymentMethodId
            },
            costPerAthlete: this.costPerAthlete,
            paidUntil: this.paidUntil,
            createdAt: this.createdAt,
            lastLoginAt: this.lastLoginAt,
            nbrOfLogins: this.nbrOfLogins,
            invitationCode: this.invitationCode,
            notifications: this.notifications,
            sport: this.sport
        }
    }

    isSubscriptionValid() {
        let periodLeft =  moment(this.paidUntil).startOf('day').diff(moment().startOf('day'));

        if (this.state === COACH_STATES.TRIAL || this.state === COACH_STATES.BEFORE_SUBSCRIPTION) return true;

        if (this.state === COACH_STATES.SUBSCRIBED) {
            return periodLeft >= 0;
        }

        if (this.state === COACH_STATES.CANCELED) {
            return moment().startOf('day').add(1, 'days').diff(this.paidUntil) <= 0
        }

        return this.state === COACH_STATES.TRIAL || this.state === COACH_STATES.SUBSCRIBED
            || this.state === COACH_STATES.BEFORE_SUBSCRIPTION;
    }

    bypassCoachSubscription() {
        return this.state === COACH_STATES.BEFORE_SUBSCRIPTION;
    }

    isTollFree() {
        return this.state === COACH_STATES.BEFORE_SUBSCRIPTION
    }

    isInTrial() {
        return this.state === COACH_STATES.TRIAL
    }

    setAwaitingSubscription() {
        this.state = COACH_STATES.AWAITING_SUBSCRIPTION;
        this.daysLeftInTrial = 0;
        this.save();
    }

    isAwaitingSubscription() {
        return COACH_STATES.AWAITING_SUBSCRIPTION === this.state
    }

    setSubscribed() {
        this.state = COACH_STATES.SUBSCRIBED;
        this.save();
    }

    isSubscribed() {
        return this.state === COACH_STATES.SUBSCRIBED;
    }

    isCanceled() {
        return this.state = COACH_STATES.CANCELED;
    }

    hasInvoicesOverdue() {
        for (let invoice of this.invoices) {
            if (!invoice.paid) return true;
        }
        return false;
    }

    setInvoiceOverdue() {
        this.state = COACH_STATES.INVOICE_OVERDUE;
        this.save();
    }

    isOverdue() {
        return this.state === COACH_STATES.INVOICE_OVERDUE;
    }

    setInvoiceUnpaid() {
        this.state = COACH_STATES.INVOICE_UNPAID;
        this.save();
    }

    hasPaymentInfo() {
        return !!this.stripePaymentMethodId;
    }

    getReadableSubscriptStatus() {
        switch (this.state) {
            case COACH_STATES.TRIAL:
                return 'coach_billing_subscription_status_trial';
            case COACH_STATES.SUBSCRIBED:
                return 'coach_billing_subscription_status_subscribed';
            case COACH_STATES.AWAITING_SUBSCRIPTION:
                return 'coach_billing_subscription_status_awaiting_subscription';
            case COACH_STATES.INVOICE_OVERDUE:
                return 'coach_billing_subscription_status_invoice_overdue';
            case COACH_STATES.INVOICE_UNPAID:
                return 'coach_billing_subscription_status_invoice_unpaid';
            case COACH_STATES.BEFORE_SUBSCRIPTION:
                return 'coach_billing_subscription_status_before_subscript_was_implemented';
            case COACH_STATES.CANCELED:
                return 'coach_billing_subscription_status_canceled';
        }
    }

    getReadableSubscriptAction() {
        switch (this.state) {
            case COACH_STATES.TRIAL:
                return 'coach_billing_subscription_action_cancel';
            case COACH_STATES.SUBSCRIBED:
                return 'coach_billing_subscription_action_cancel';
            case COACH_STATES.AWAITING_SUBSCRIPTION:
                return 'coach_billing_subscription_action_subscribe';
            case COACH_STATES.INVOICE_OVERDUE:
                return 'coach_billing_subscription_action_cancel';
            case COACH_STATES.INVOICE_UNPAID:
                return 'coach_billing_subscription_action_cancel';
            case COACH_STATES.BEFORE_SUBSCRIPTION:
                return 'coach_billing_subscription_action_cancel';
            case COACH_STATES.CANCELED:
                return 'coach_billing_subscription_action_subscribe';

        }
    }

    /**
     *
     * @return {number}
     */
    daysSinceInvoiceShouldHaveBeenPaid() {
        /**@type Invoice */
        let overdue = null;
        for (let invoice of this.invoices) {
            if (!invoice.paid) {
                overdue = invoice;
                break;
            }
        }

        if (overdue) {
            return moment().diff(new Date(overdue.createdAt), 'days')
        } else {
            return -1;
        }
    }

    calculateDaysLeftInTrial() {
        return Math.max(0, moment(this.paidUntil).diff(moment().startOf('day'), 'days'));
    }

    hasTrialExpired() {
        return this.calculateDaysLeftInTrial() === 0
    }

    coachCanceledSubscription() {
        this.state = COACH_STATES.CANCELED;
        this.save();
    }

    justLoggedIn() {
        this.lastLoginAt = Date.now();
        this.nbrOfLogins = this.nbrOfLogins + 1;
        this.save();
    }

    /**
     * in client, requires subscribing to groups
     * @return {number}
     */
    nbrOfAthletes() {
        return Team.size(this.id);
    }

    /**
     *
     * @return {Array<String>}
     */
    athleteIds() {
        return Team.athleteIds(this.id);
    }

    /**
     *
     * @return {Array<Athlete>}
     */
    athletes() {
        return Team.coachAthletes(this.id);
    }

    /**
     *
     * @param coachId
     * @return {number}
     */
    static nbrOfAthletesInTeam(coachId) {
        return Team.size(coachId);
    }

    /**
     * Called when an invite was send by athlete to coach (before coach account) or by
     * coach to athlete (before athlete has an account). When adding athlete to team, "acceptance" comes from the
     * invite itself
     *
     * @param athleteId
     * @return {boolean}
     */
    addAthleteToTeam(athleteId) {
        let added = Team.joinCoachTeam(athleteId, this.id, true);
        if (added >= 0) {
            let groups = CoachAthleteGroup.findCoachGroups(this.id);
            let id = groups[0].id;
            if (groups.length === 0) {
                id = CoachAthleteGroup.createInitialGroups(this.id);
            }
            CoachAthleteGroup.appendAthleteToGroup(this.id, id, athleteId);
        }
    }

    /**
     *
     * @param athleteId
     * @return {number}
     */
    acceptAthleteRequest(athleteId) {
        return Team.acceptRequest(this.id, athleteId);
    }

    /**
     *
     * @return {Array<Athlete>}
     */
    athletesPending() {
        return Team.pendingOnCoach(this.id)
    }

    /**
     *
     * @param athleteId
     * @return {boolean}
     */
    removeAthleteFromTeam(athleteId) {
        return Team.leaveTeam(this.id, athleteId) >= 0;
    }

    /**
     *
     * @param athleteId
     * @return {number}
     */
    rejectAthleteRequest(athleteId) {
        return Team.rejectRequest(this.id, athleteId);
    }

    recordNotificationSent(notification) {
        this.notifications.push(notification);
        CoachCollection.update({_id: this.id}, {$push: {notifications: notification}});
    }

    /**
     * Add session to coach suppression
     * @param {String} id
     */
    suppressSession(id) {
        this.suppression.push(id);
        return CoachCollection.update({_id: this.id}, {$push: {suppression: id}})
    }

    /**
     *
     * @param record
     * @return {Coach}
     */
    static instantiateFromRecord(record) {
        if (!record) return null;
        let rawInvoices = record.invoices || [], invoices = [];
        for (let invoice of rawInvoices) {
            invoices.push(Invoice.instantiateFromRecord(invoice));
        }

        return new Coach(record._id, record.name, record.email, record.createdAt, record.invitationCode
            , record.latency, record.state, record.costPerAthlete, record.daysLeftInTrial, invoices
            , record.stripe.customerId, record.stripe.subscriptionId
            , record.stripe.paymentMethodId, record.paidUntil, record.lastLoginAt
            , record.nbrOfLogins, record.notifications, record.suppression, record.sport);
    }

    static createDemoExpressions(coachId) {
        CoachTrainingExpressions.insert({user: coachId, text: "5 x (2'/1' + 1'/1' 30'')/5'", deleted: false, createdAt: Date.now()});
        CoachTrainingExpressions.insert({user: coachId, text: "2 x 1000m/8' + 2 x 750m/8'", deleted: false, createdAt: Date.now()});
    }

    /**
     *
     * @param id
     * @return {Mongo.Cursor}
     */
    static cursorFind(id) {
        return CoachCollection.find({_id: id});
    }

    /**
     *
     * @param id
     * @return {Coach}
     */
    static find(id) {
        return Coach.instantiateFromRecord(CoachCollection.findOne({_id: id}));
    }

    /**
     *
     * @param customerId
     * @return {Coach}
     */
    static findByStripeCustomerId(customerId) {
        return Coach.instantiateFromRecord(CoachCollection.findOne({"stripe.customerId": customerId}));
    }

    /**
     *
     * @param email
     * @return {Coach}
     */
    static findByEmail(email) {
        return Coach.instantiateFromRecord(CoachCollection.findOne({"email": email}));
    }

    /**
     *
     * @param code
     * @return {Coach}
     */
    static findByInvitationCode(code) {
        return Coach.instantiateFromRecord(CoachCollection.findOne({"invitationCode": code}));
    }

    /**
     *
     * @return {Mongo.Cursor}
     */
    static cursorAll() {
        return CoachCollection.find({});
    }

    /**
     *
     * @return {Array<Coach>}
     */
    static all() {
        let result = [], coaches = CoachCollection.find({}).fetch();
        for (let coach of coaches) {
            result.push(Coach.instantiateFromRecord(coach));
        }
        return result;
    }

    /**
     *
     * @param list
     * @return {Array<Coach>}
     */
    static allIn(list) {
        let result = [], coaches = CoachCollection.find({_id: {$in: list}}).fetch();
        for (let coach of coaches) {
            result.push(Coach.instantiateFromRecord(coach));
        }
        return result;
    }

    /**
     *
     * @return {Array<Coach>}
     */
    static findCoachesInStripe() {
        let result = [], coaches = CoachCollection.find({"stripe.customerId": {$ne: null}});
        for (let coach of coaches) {
            result.push(Coach.instantiateFromRecord(coach));
        }
        return result;
    }

    /**
     *
     * @return {Array<Coach>}
     */
    static findUnusedTrials() {
        let result = [], coaches = CoachCollection.find({
            lastLoginAt: {$lte: moment().add(-7, 'days').valueOf()},
            state: COACH_STATES.TRIAL,
            daysLeftInTrial: {$lte: 23}
        });

        for (let coach of coaches) {
            result.push(Coach.instantiateFromRecord(coach));
        }
        return result;
    }

    /**
     *
     * @return {Array<Coach>}
     */
    static findCoachesNotInStripe() {
        let result = [], coaches = CoachCollection.find({"stripe.customerId": null, lastLoginAt: {$ne: null}});
        for (let coach of coaches) {
            result.push(Coach.instantiateFromRecord(coach));
        }
        return result;
    }

    /**
     *
     * @param id            User id / coach id
     * @param count
     * @param roundTripTime
     * @param clock
     */
    static updateLatency(id, count, roundTripTime, clock) {
        logger.info(`update coach ${id} latency`);
        CoachCollection.update({_id: id}, {
            $set: {
                latency: {
                    count: count,
                    duration: roundTripTime,
                    clock: clock
                }
            }
        }, {upsert: false});
    }

    /**
     *
     * @param {String} coachId
     * @param {String} paymentMethodId
     */
    static updatePaymentMethodId(coachId, paymentMethodId) {
        CoachCollection.update({_id: coachId}, {
            $set: {"stripe.paymentMethodId": paymentMethodId}
        });
    }

    /**
     *
     * @param coachId
     * @param {Invoice} invoice
     */
    static appendInvoice(coachId, invoice) {
        CoachCollection.update({_id: coachId}, {$push: {"invoices": invoice.toJSON()}});
    }

    /**
     *
     * @param coach
     * @param invoiceId
     * @return {null|number}
     */
    static getInvoiceIndex(coach, invoiceId) {
        let i = 0;
        for (let invoice of coach.invoices) {
            if (invoice.id === invoiceId) {
                return i;
            }
            i++;
        }
        return null;
    }

    /**
     *
     * @param customerId    Stripe Customer Id
     * @param invoiceId     Invoice ID
     * @param receiptUrl    Receipt URL
     * @param paidUntil     Until when is this subscription valid
     */
    static setInvoicePaid(customerId, invoiceId, receiptUrl, paidUntil = 0) {
        const coach = Coach.findByStripeCustomerId(customerId);
        if (!coach) throw `customer not found: ${customerId}`;
        let position = Coach.getInvoiceIndex(coach, invoiceId);
        let invoice = coach.invoices[position];
        if (!invoice) throw `invoice not found ${invoiceId} in coach ${coach.id}`;

        let update = {};
        update[`invoices.${position}.status`] = 'paid';
        update[`invoices.${position}.paid`] = true;
        update[`invoices.${position}.receiptUrl`] = receiptUrl;

        if (paidUntil) {
            update.paidUntil = paidUntil;
        }

        CoachCollection.update({_id: coach.id}, {$set: update});
    }

    static isCoachAthlete(coachId, athleteId) {
        return Team.isCoachAthlete(coachId, athleteId)
    }

    /**
     * @param id
     * @param sport
     */
    static updatePrimarySport(id, sport) {
        logger.info(`update coach ${id} sport: ${sport}`);
        CoachCollection.update({_id: id}, {
            $set: {
                sport: sport
            }
        });
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get latency() {
        return this._latency;
    }

    set latency(value) {
        this._latency = value;
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

    get email() {
        return this._email;
    }

    set email(value) {
        this._email = value;
    }

    get createdAt() {
        return this._createdAt;
    }

    set createdAt(value) {
        this._createdAt = value;
    }

    get state() {
        return this._state;
    }

    set state(value) {
        this._state = value;
    }

    /**
     *
     * @return {Array<Invoice>}
     */
    get invoices() {
        return this._invoices;
    }

    set invoices(value) {
        this._invoices = value;
    }

    get stripeCustomerId() {
        return this._stripeCustomerId;
    }

    set stripeCustomerId(value) {
        this._stripeCustomerId = value;
    }

    get stripeSubscriptionId() {
        return this._stripeSubscriptionId;
    }

    set stripeSubscriptionId(value) {
        this._stripeSubscriptionId = value;
    }

    get stripePaymentMethodId() {
        return this._stripePaymentMethodId;
    }

    set stripePaymentMethodId(value) {
        this._stripePaymentMethodId = value;
    }

    get costPerAthlete() {
        return this._costPerAthlete;
    }

    set costPerAthlete(value) {
        this._costPerAthlete = value;
    }

    get daysLeftInTrial() {
        return this._daysLeftInTrial;
    }

    set daysLeftInTrial(value) {
        this._daysLeftInTrial = value;
    }


    get paidUntil() {
        return this._paidUntil;
    }

    set paidUntil(value) {
        this._paidUntil = value;
    }

    get lastLoginAt() {
        return this._lastLoginAt;
    }

    set lastLoginAt(value) {
        this._lastLoginAt = value;
    }

    get invitationCode() {
        return this._invitationCode;
    }

    set invitationCode(value) {
        this._invitationCode = value;
    }

    get nbrOfLogins() {
        return this._nbrOfLogins;
    }

    set nbrOfLogins(value) {
        this._nbrOfLogins = value;
    }

    get notifications() {
        return this._notifications;
    }

    set notifications(value) {
        this._notifications = value;
    }

    get suppression() {
        return this._suppression;
    }

    set suppression(value) {
        this._suppression = value;
    }

    get sport() {
        return this._sport;
    }

    set sport(value) {
        this._sport = value;
    }

    static getDefaultTrialPeriodDurationInDays() {
        return TRIAL_PERIOD_IN_DAYS;
    }
}


const TeamMembersCollections = new Meteor.Collection('teamMembers', {idGeneration: 'STRING'});

class TeamMember {

    constructor(id, coachId, athleteId, pendingOnWho , pending = true, createdAt = Date.now(), acceptedAt = null) {
        this._id = id;
        this._coachId = coachId;
        this._athleteId = athleteId;
        this._pendingOnWho = pendingOnWho;
        this._pending = pending;
        this._createdAt = createdAt;
        this._acceptedAt = acceptedAt;
    }

    toJSON() {
        return {
            _id: this.id,
            coachId: this.coachId,
            athleteId: this.athleteId,
            pendingOnWho: this.pendingOnWho,
            pending: this.pending,
            createdAt: this.createdAt,
            acceptedAt: this.acceptedAt
        }
    }

    /**
     *
     * @param athleteId
     * @param coachId
     * @return {TeamMember}
     */
    static findByCoachAndAthlete(athleteId, coachId) {
        return TeamMember.instantiateFromRecord(TeamMembersCollections.findOne({coachId: coachId, athleteId: athleteId}))
    }
    /**
     *
     * @param coachId
     * @return {Array<TeamMember>}
     */
    static findAthletes(coachId) {
        let members = TeamMembersCollections.find({coachId: coachId}).fetch();
        let result = [];
        for (let member of members) {
            result.push(TeamMember.instantiateFromRecord(member));
        }
        return result;
    }

    /**
     *
     * @param coachId
     * @return {Mongo.Cursor}
     */
    static cursorFindAthletes(coachId) {
        return TeamMembersCollections.find({coachId: coachId === undefined ? null : coachId});
    }

    /**
     *
     * @param athleteId
     * @return {Array<TeamMember>}
     */
    static findCoaches(athleteId) {
        let members = TeamMembersCollections.find({athleteId: athleteId}).fetch();
        let result = [];
        for (let member of members) {
            result.push(TeamMember.instantiateFromRecord(member));
        }
        return result;
    }

    /**
     *
     * @param coachId
     * @param athleteId
     */
    static leaveTeam(coachId, athleteId) {
        return TeamMembersCollections.remove({coachId: coachId, athleteId: athleteId})
    }

    /**
     *
     * @param coachId
     * @param athleteId
     * @return {number}
     */
    static acceptRequest(coachId, athleteId) {
        return TeamMembersCollections.update({
            coachId: coachId,
            athleteId: athleteId,
            pending: true
        }, {$set: {pending: false, acceptedAt: Date.now()}})
    }

    /**
     *
     * @param coachId
     * @param athleteId
     * @return {number}
     */
    static rejectRequest(coachId, athleteId) {
        return TeamMembersCollections.remove({coachId: coachId, athleteId: athleteId, pending: true})
    }

    save() {
        if (!this.id) {
            let json = this.toJSON();
            delete json._id;
            this.id = TeamMembersCollections.insert(json)
        } else {
            TeamMembersCollections.update({_id: this.id}, this.toJSON())
        }
    }

    pendingOnCoach() {
        return this.pending === true && this.pendingOnWho === 'coach'
    }

    pendingOnAthlete() {
        return this.pending === true && this.pendingOnWho === 'athlete';
    }

    /**
     *
     * @param json
     * @return {TeamMember}
     */
    static instantiateFromRecord(json) {
        if (!json) return null;
        return new TeamMember(json.id, json.coachId, json.athleteId, json.pendingOnWho, json.pending
            , json.createdAt, json.acceptedAt)
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get coachId() {
        return this._coachId;
    }

    set coachId(value) {
        this._coachId = value;
    }

    get athleteId() {
        return this._athleteId;
    }

    set athleteId(value) {
        this._athleteId = value;
    }

    get pendingOnWho() {
        return this._pendingOnWho;
    }

    set pendingOnWho(value) {
        this._pendingOnWho = value;
    }

    get pending() {
        return this._pending;
    }

    set pending(value) {
        this._pending = value;
    }

    get createdAt() {
        return this._createdAt;
    }

    set createdAt(value) {
        this._createdAt = value;
    }

    get acceptedAt() {
        return this._acceptedAt;
    }

    set acceptedAt(value) {
        this._acceptedAt = value;
    }
}

class Team {


    constructor(coachId, coach = null) {
        this._coachId = coachId;

        if (coach) {
            this._coach = coach;
        }
    }

    /**
     * @param coachId
     * @return {Array<Athlete>}
     */
    static pendingOnCoach(coachId) {
        let members = TeamMember.findAthletes(coachId);
        let pending = [];
        for (let member of members) {
            if (member.pendingOnCoach() === false) continue;
            pending.push(member.athleteId);
        }
        return Athlete.findInList(pending)
    }

    /**
     *
     * @param coachId
     * @param includePending
     * @return {Array<Athlete>}
     */
    static coachAthletes(coachId, includePending = false) {
        let members = TeamMember.findAthletes(coachId);
        let ids = members.map((m)=>{
            return m.athleteId
        });
        if (ids.length === 0) return [];
        return Athlete.findInList(ids);
    }


    /**
     *
     * @param coachId
     * @return {Mongo.Cursor}
     */
    static cursorCoachAthletes(coachId) {
        return TeamMember.cursorFindAthletes(coachId)
    }

    /**
     * returns all coaches
     * @param athleteId
     * @param includePending
     * @return {Array<Coach>}
     */
    static athleteCoaches(athleteId, includePending = false) {
        let members = TeamMember.findCoaches(athleteId);
        let ids = [];
        for (let member of members) {
            if (includePending === false && member.pending === true) continue;
            ids.push(member.coachId);
        }

        if (ids.length === 0) return [];

        return Coach.allIn(ids);
    }

    /**
     *
     * @param coachId
     * @param includePending
     * @return {Array<String>}
     */
    static coachAthletesIds(coachId, includePending = false) {
        let members = TeamMember.findAthletes(coachId);
        let ids = members.map((m) => {
            return m.athleteId
        });
        if (ids.length === 0) return [];
        return ids;
    }

    /**
     *
     * @param athleteId
     * @param coachId
     * @param forceAccept
     * @return {number}
     */
    static joinCoachTeam(athleteId, coachId, forceAccept = false) {
        let pending = forceAccept === false;

        if (!Coach.find(coachId)) throw 'coach not found';

        let member = TeamMember.findByCoachAndAthlete(athleteId, coachId);
        if (!member) {
            member = new TeamMember(null, coachId, athleteId, 'coach'
                , pending, Date.now(), pending === false ? Date.now() : null);
            member.save();
            return 1;
        }

        if (member.pending === false) {
            throw 'already on team';
        }

        // already have a request - don't duplicate
        return 0;

    }

    /**
     *
     * @param coachId
     * @param athleteId
     */
    static leaveTeam(coachId, athleteId) {
        CoachAthleteGroup.removeAthleteFromAllGroups(coachId, athleteId);
        TeamMember.leaveTeam(coachId, athleteId);
    }

    /**
     *
     * @param coachId
     * @param athleteId
     * @return {number}
     */
    static acceptRequest(coachId, athleteId) {
        return TeamMember.acceptRequest(coachId, athleteId);
    }

    /**
     *
     * @param coachId
     * @param athleteId
     * @return {number}
     */
    static rejectRequest(coachId, athleteId) {
        return TeamMember.rejectRequest(coachId, athleteId);
    }

    /**
     *
     * @param coachId
     * @return {number}
     */
    static size(coachId) {
        return TeamMembersCollections.find({coachId: coachId, pending: false}).count()
    }

    /**
     *
     * @param coachId
     * @return {Array<String>}
     */
    static athleteIds(coachId) {
        let members = TeamMembersCollections.find({coachId: coachId, pending: false}).fetch();
        let result = [];
        for (let json of members) {
            let member = TeamMember.instantiateFromRecord(json);
            result.push(member.athleteId)
        }
        return result;
    }

    /**
     *
     * @param coachId
     * @param athleteId
     * @return {boolean}
     */
    static isCoachAthlete(coachId, athleteId) {
        if (coachId === athleteId) return true;
        return TeamMember.findByCoachAndAthlete(athleteId, coachId) !== null;
    }

    get coachId() {
        return this._coachId;
    }

    set coachId(value) {
        this._coachId = value;
    }
}


export {
    CoachTrainingSessions,
    CoachTrainingExpressions,
    Coach,
    Invoice,
    CoachAthleteGroup,
    Team
};

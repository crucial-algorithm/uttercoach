import {Meteor} from "meteor/meteor";
import {Athlete} from "../modules/athletes/api/collections";
import {Coach} from "../modules/coaches/api/collections";

const [administratorId, athleteId, coachId] = ["mzNME2AJWYXtMDoxc", "Q8PQgL6J6KgzCF2FJ", "8KK8g5Y3QDCHu6tac"];



function createUsers() {

    TestUtils.overrideUsersSchema();

    Meteor.users.insert({
        "_id": administratorId,
        "createdAt": new Date(),
        "profile": {
            "name": "The Administrator",
            "email": "administrator@gopaddler.com",
            "country": null,
            "gender": "male",
            "birthdate": null,
            "about": null,
            "debug": false
        },
        "services": {
            "facebook": {
                "id": "117557155376606"
            }
        },
        "roles": ['admin']
    });

    Meteor.users.insert({
        "_id": athleteId,
        "createdAt": new Date(),
        "profile": {
            "name": "The Athlete",
            "email": "athlete@gopaddler.com",
            "country": null,
            "gender": "male",
            "birthdate": null,
            "about": null,
            "debug": false
        },
        "services": {
            "facebook": {
                "id": "102882346848146"
            }
        },
        "roles": ['athlete']
    });

    Meteor.users.insert({
        "_id": coachId,
        "createdAt": new Date(),
        "profile": {
            "name": "The Coach",
            "email": "coach@gopaddler.com",
            "country": null,
            "gender": "female",
            "birthdate": null,
            "about": null,
            "debug": false
        },
        "services": {
            "facebook": {
                "id": "112820045851430"
            }
        },
        "roles": ['coach']
    });

    const athlete = Athlete.instantiateFromRecord({
        "_id" : athleteId,
        "measurements" : [],
        "strokeRateZones" : [{"start" : 0, "end" : 59 }, {"start" : 60, "end" : 69 }, {"start" : 70, "end" : 79 }, {"start" : 80, "end" : 89 }, {"start" : 90, "end" : 99 }, {"start" : 100, "end" : 109 }, {"start" : 110, "end" : 119 }, {"start" : 120, "end" : Infinity } ],
        "heartRateZones" : [{"start" : 50, "end" : 59 }, {"start" : 60, "end" : 69 }, {"start" : 70, "end" : 79 }, {"start" : 80, "end" : 89 }, {"start" : 90, "end" : Infinity } ],
        "speedZones" : [{"start" : 0, "end" : 9 }, {"start" : 10, "end" : 19 }, {"start" : 20, "end" : 29 }, {"start" : 30, "end" : 39 }, {"start" : 40, "end" : 49 }, {"start" : 50, "end" : 59 }, {"start" : 60, "end" : 69 }, {"start" : 70, "end" : Infinity } ],
        "gender" : null,
        "boat" : "K",
        "heartRate" : {"max" : 200, "resting" : 60 },
        "birthDate" : null,
        "strava" : { "athleteId" : "12345678", "app" : "uttercycling", "athleteName" : "Cycling Athlete", "accessToken" : "yy", "refreshToken" : "xx", "accessTokenExpiresAt" : 1598995984 },
        "name" : "Cycling athlete"
    });
    athlete.insert();

    const coach = Coach.instantiateFromRecord({
        "_id" : coachId,
        "latency" : null,
        "name" : "Coach 01",
        "email" : "coach.01@uttercoach.com",
        "state" : "awaiting_subscription",
        "daysLeftInTrial" : 0,
        "invoices" : [
            {
                "id" : "in_1HIuOCEYZqyt4LT2xiWegcTM",
                "paid" : true,
                "createdAt" : 1598093760000.0,
                "status" : "paid",
                "billingReason" : "subscription_create",
                "subscriptionId" : "sub_HsfjatBORiNrUb",
                "amount" : 0,
                "currency" : "eur",
                "number" : "BF65BB93-0001",
                "invoiceUrl" : "https://pay.stripe.com/invoice/xxx/zzz",
                "pdfUrl" : "https://pay.stripe.com/invoice/xxx/zzz/pdf",
                "receiptUrl" : null,
                "transactionPeriodStart" : 1598093760000.0,
                "transactionPeriodEnd" : 1598093760000.0
            }
        ],
        "stripe" : {
            "customerId" : "cus_HsfjSeTQHQasq9",
            "subscriptionId" : "sub_HsfjatBORiNrUb",
            "paymentMethodId" : "pm_1HIuR7EYZqyt4LT2zSBeZRnv"
        },
        "costPerAthlete" : 10,
        "paidUntil" : 1600732800000.0,
        "createdAt" : 1598093687789.0,
        "lastLoginAt" : 1598094411396.0,
        "nbrOfLogins" : 6,
        "invitationCode" : 153080,
        "notifications" : [],
        "sport" : "canoeing",
        "suppression" : []
    });
    coach.insert();
}

const TestUtils = {

    platformImpl: {
        userId: null,
        user: null,
        userIsInRole: null
    },


    /**
     *
     * @param {string} userLabel
     */
    login: function (userLabel) {

        let self = this,
            userId;

        switch (userLabel) {

            case 'administrator':
                userId = administratorId;
                break;

            case 'athlete':
                userId = athleteId;
                break;

            case 'coach':
                userId = coachId;
                break;

            default:
                throw 'Unknown user "' + userLabel + '"'
        }

        let user = Meteor.users.findOne({_id: userId});

        self.platformImpl.userId = Meteor.userId;
        Meteor.userId = function () {
            return userId;
        };

        self.platformImpl.user = Meteor.user;
        Meteor.user = function () {
            return user;
        };

        self.platformImpl.userIsInRole = Roles.userIsInRole;
        Roles.userIsInRole = function () {
            return true;
        }
    },


    logout: function () {

        let self = this;

        Meteor.userId = self.platformImpl.userId;
        Meteor.user = self.platformImpl.user;
    },

    overrideUsersSchema() {
        let UsersSchema = new SimpleSchema({
            username: {
                type: String,
                label: "Username",
                optional: true
            },
            emails: {
                type: Array,
                optional: true,
                label: "Emails"
            },
            'emails.$': {
                type: Object,
                label: "Emails"
            },
            'emails.$.address': {
                type: String,
                regEx: SimpleSchema.RegEx.Email,
                label: "Address"
            },
            'emails.$.verified': {
                optional: true,
                type: Boolean,
                label: "Verified"
            },
            'emails.$.default': {
                optional: true,
                type: Boolean,
                label: "Default"
            },
            createdAt: {
                type: Date,
                label: "Created at"
            },
            services: {
                optional: true,
                type: Object,
                blackbox: true,
                label: "Services"
            },
            heartbeat: {
                optional: true,
                type: Date,
                label: "Heartbeat"
            },
            profile: {
                type: Object,
                blackbox: true,
                label: "profile"
            },
            roles: {
                type: Array,
                label: "Roles"
            },
            'roles.$': {
                type: String,
                label: "Roles"
            }
        });
        Meteor.users.attachSchema(UsersSchema, {replace: true});
    },

    /**
     *
     * @param name
     * @param userId
     * @return {function}
     */
    method(name, userId = athleteId) {
        return function () {
            const args = Array.from(arguments);
            if (!Meteor.server.method_handlers[name]) throw `method ${name} not found`;
            return Meteor.server.method_handlers[name].apply({userId: userId}, args)
        }
    }

};

if (Meteor.users.find().count() === 0) {
    createUsers();
}

export default TestUtils;
export {TestUtils, athleteId, administratorId, coachId};
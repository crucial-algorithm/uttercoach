import '../imports/startup/server/social.js';
import '../imports/startup/server/fixtures.js';
import '../imports/startup/server/accounts';

import '../imports/modules/training-sessions/server.js';
import '../imports/modules/coaches/server.js';
import '../imports/modules/athletes/server.js';
import '../imports/modules/live/server.js';
import '../imports/modules/users/server.js';
import '../imports/modules/administration/server.js';
import '../imports/modules/batch/server.js';
import '../imports/modules/integrations/server.js';
import '../imports/modules/strava/server';
import {logger} from "../imports/utils/logger";
import {EmailNotification} from "../imports/modules/users/api/collections";


Meteor.startup(function () {
    if (!Meteor.settings.stripe) throw 'Missing METEOR_SETTINGS';
    let sendEmail = _.bind(Email.send, Email);
    _.extend(Email, {
        send: function (options) {
            if (options.async === false) {
                sendEmail(options);
            } else {
                try {
                    const record = new EmailNotification(options.to, options.subject, options.text, options.html || null);
                    record.insert();
                } catch (err) {
                    logger.error(err)
                }
            }
        }
    })
});


DDPRateLimiter.addRule({
    type: "method", name: "syncDeviceClock", connectionId() {
        return true;
    }
}, 1, 60000);

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
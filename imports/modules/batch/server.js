import JobAggregateTrainingSessionData from "./job-aggregate-training-sessions";
import JobRegisterStripeCostumer from "./job-register-stripe-costumer";
import JobUpdateCoachSubscriptionState from "./job-update-coach-subscription-state";
import JobProcessWebHooks from "./job-process-webhooks";
import JobSendAthleteWelcomeMail from "./job-send-athlete-welcome-mail";
import JobAttachLocationToSession from "./job-attach-location-to-session";
import JobSendActivityHistory from "./job-send-activity-history";
import JobRecoverUnusedCoachTrials from "./job-recover-unused-coach-trials";
import JobUploadStravaSession from "./job-upload-strava-session";


SyncedCron.add({
    name: 'Generate Training Sessions Aggregations',
    schedule: function(parser) {
        // parser is a later.parse object
        return parser.text('every 1 minute');
    },
    job: JobAggregateTrainingSessionData.run
});

SyncedCron.add({
    name: 'Register Stripe Users',
    schedule: function (parser) {
        // parser is a later.parse object
        return parser.text('every 1 minute');
    },
    job: JobRegisterStripeCostumer.run
});


SyncedCron.add({
    name: 'Update Coach Subscription State',
    schedule: function (parser) {
        // parser is a later.parse object
        return parser.text('every 1 minute');
    },
    job: JobUpdateCoachSubscriptionState.run
});

SyncedCron.add({
    name: 'Process Webhook',
    schedule: function (parser) {
        // parser is a later.parse object
        return parser.text('every 1 minute');
    },
    job: JobProcessWebHooks.run
});

// SyncedCron.add({
//     name: 'Send welcome athlete email',
//     schedule: function (parser) {
//         // parser is a later.parse object
//         return parser.text('every 1 minute');
//     },
//     job: JobSendAthleteWelcomeMail.run
// });

SyncedCron.add({
    name: 'Attach location to session',
    schedule: function (parser) {
        // parser is a later.parse object
        return parser.text('every 1 minute');
    },
    job: JobAttachLocationToSession.run
});

SyncedCron.add({
    name: 'Activity report',
    schedule: function (parser) {
        // parser is a later.parse object
        return parser.text(Meteor.settings.activity_report.schedule.replace(/_/g, ' '));
    },
    job: JobSendActivityHistory.run
});

SyncedCron.add({
    name: 'Recover Unused Coach Trials',
    schedule: function (parser) {
        // parser is a later.parse object
        return parser.text('every 1 minute');
    },
    job: JobRecoverUnusedCoachTrials.run
});

SyncedCron.add({
    name: 'Upload strava session',
    schedule: function (parser) {
        // parser is a later.parse object
        return parser.text('every 1 minute');
    },
    job: JobUploadStravaSession.run
});




Meteor.startup(function () {
    if (Meteor.settings.dont_run_batch === true) return;
    // code to run on server at startup
    SyncedCron.start();
});
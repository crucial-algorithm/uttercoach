'use strict';
import {Geteor} from "../../../../server/core";
import {
    Commands,
    DeviceLiveSessionSplit, LiveDevice, LiveDeviceData, LiveSession, LiveSessionSplit, LiveSessionSplits,
    LiveSplitSummary
} from "./collections";
import {Meteor} from "meteor/meteor";
import {Coach, Team} from "../../coaches/api/collections";
import {Athlete} from "../../athletes/api/collections";

Geteor.publish('coachLiveDevicesData', function(sessionId) {
    let session = LiveSession.find(sessionId);

    return LiveDeviceData.find({
        dv: {$in: session.devices},
        dr: {$gt: Date.now() - session.startedAt - 5000 }
    }, {sort: {ts: -1}, limit: 1});
});


Geteor.publish('coachLiveDevicesForSession', function(sessionId) {
    let session = LiveSession.find(sessionId);
    return LiveDevice.cursorFindDevices(session.devices);
});

Geteor.publish('coachLiveTeamInfo', function () {
    let athletes = Team.coachAthletes(this.userId);
    let ids = athletes.map(function (athlete) {
        return athlete.id
    });
    return [Coach.cursorFind(this.userId)
        , Athlete.cursorFindInList(ids)
        , Team.cursorCoachAthletes(this.userId)
    ]
});

Geteor.publish('coachLiveSessions', function() {
    return LiveSession.cursorCoachActiveSession(this.userId)
});

Geteor.publish('coachLiveActiveSessionsRoute', function() {
    return [LiveSession.cursorSessionsLastXDays(this.userId, 8)
        , Coach.cursorFind(this.userId)
    ]
});

Geteor.publish('coachLiveSession', function(sessionId) {
    return LiveSession.cursorFindSession(sessionId);
});

Geteor.publish('coachLiveSessionSplits', function (sessionId) {
    return LiveSessionSplit.cursorSplitsForSession(sessionId);
});

Geteor.publish('coachLiveSessionAthletes', function (sessionId) {
    let self = this;
    let liveSession = LiveSession.find(sessionId);
    let handle = Meteor.users.find({_id: {$in: liveSession.devices}}, {
        fields: {
            '_id': 1,
            'profile.name': 1,
            'profile.maxHeartRate': 1
        }
    }).observeChanges({
        added: function (id, fields) {
            self.added('sessionAthletes', id, fields);
        },
        changed: function (id, fields) {
            self.changed('sessionAthletes', id, fields);
        },
        removed: function (id) {
            self.removed('sessionAthletes', id);
        }
    });

    this.ready();
    this.onStop(function () {
        handle.stop();
    })
});

Geteor.publish('coach.live', function () {
    let athletes = Team.coachAthletesIds(this.userId);

    return [Coach.cursorFind(this.userId)
        , Athlete.cursorFindInList(athletes)
        , Team.cursorCoachAthletes(this.userId),
        LiveSession.cursorCoachActiveSession(this.userId),
        LiveDevice.cursorFindDevices(athletes)
    ]
});

Geteor.publish('coachLiveDevicesDataHist', function (sessionId, athleteId, splitId) {

    return [
        LiveSplitSummary.find({liveSession: sessionId}),
        LiveSession.cursorFindSession(sessionId),
        LiveSessionSplit.cursorSplitsForSession(sessionId)
    ];
});


Geteor.publish('coachLiveSessionRoute', function (sessionId) {
    let session = LiveSession.find(sessionId);

    return [
        LiveSession.cursorCoachActiveSession(this.userId),
        LiveDevice.cursorFindDevices(session.devices),
        LiveDeviceData.find({ss: sessionId, dv: {$in: session.devices}, dr: {$gte: Date.now() - session.startedAt - 5000}}, {sort: {dr: -1}}),
        LiveSessionSplit.cursorSplitsForSession(sessionId),
        DeviceLiveSessionSplit.cursorSplitInSession(sessionId),
        Coach.cursorFind(this.userId),
        Athlete.cursorFindInList(session.devices),
        Commands.find({createdAt: {$gte: session.createdAt}, device: {$exists: true}, parent: {$exists: true}})
    ]
});

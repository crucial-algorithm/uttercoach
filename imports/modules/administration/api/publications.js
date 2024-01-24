import { Meteor } from 'meteor/meteor';
import {Geteor} from "../../../../server/core";
import {CoachUtils} from "../../coaches/api/utils";
import {Coach, CoachAthleteGroup, Team} from "../../coaches/api/collections";
import {LiveDevice, LiveDeviceData} from "../../live/api/collections";
import {logger} from "../../../utils/logger";
import {PlatformLog} from "./collections";
import {Athlete} from "../../athletes/api/collections";

Meteor.publish('users.all', function () {

    if (!this.userId || !Roles.userIsInRole(this.userId, ['admin'])) {
        return this.ready();
    }

    return Meteor.users.find({}, {fields: {services: 0}});
});


Geteor.publish('debug.live.sessions', function () {
    return [
        Coach.cursorAll(),

    ];
});

Geteor.publish('debug.live.sessions.athletes', function (coachId) {
    const athletes = Team.coachAthletesIds(coachId);
    logger.debug(`athletes for ${coachId}: ${athletes.join(', ')}`);
    return [
        Athlete.cursorFindInList(athletes)
        , Team.cursorCoachAthletes(coachId)
        , LiveDevice.cursorFindDevices(athletes)
        , LiveDeviceData.find({dv: {$in: athletes}, ca: {$gte: Date.now() - 5000}}, {sort: {dr: -1}}),
    ];
});


Geteor.publish('debug.live.sessions.athlete.commands.log', function (userId) {
    return PlatformLog.cursorFindLatestForUser(userId);
});


Geteor.publish('users.latest', function () {

    if (!this.userId || !Roles.userIsInRole(this.userId, ['admin'])) {
        return this.ready();
    }

    return Meteor.users.find({createdAt:{$gte: new Date(Date.now() - 30 * 86400 * 1000)}}, {fields: {services: 0}});
});

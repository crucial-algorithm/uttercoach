import { Meteor } from 'meteor/meteor';

import { TrainingSessions, TrainingSessionsMonthlySummary, TrainingSessionsWeeklySummary } from './collections.js';
import {Commands} from '../../live/api/collections';
import {Geteor} from "../../../../server/core";
import {Athlete} from "../../athletes/api/collections";
import {TrainingSession} from "./collections";
import {logger} from "../../../utils/logger";
import {Coach} from "../../coaches/api/collections";
import {Utils} from "../../../utils/utils";

/**
 * Fetch training sessions by month.
 */
Meteor.publish('trainingSessions.month', function (year, month) {

    if (!this.userId) {
        return this.ready();
    }

    return [
        TrainingSessions.byMonth(this.userId, year, month),
        TrainingSessionsMonthlySummary.byDateRange(this.userId, new Date(year, month, 1))
    ];
});


/**
 * Fetch a training session by identifier.
 * Make sure that it's the athlete himself or one of his coaches trying to retrieve the data
 */
Meteor.publish('trainingSessions.detail', function (id) {

    if (!this.userId) {
        return this.ready();
    }

    let session = TrainingSession.find(id);

    if (session.user !== this.userId) {
        const coaches = Athlete.getCoaches(session.user);
        let isAthleteCoach = false;
        for (let coach of coaches) {
            if (coach.id === this.userId) {
                isAthleteCoach = true;
                break;
            }
        }

        if (!isAthleteCoach) {
            logger.error(`Attempt to access session by user that is not allowed to do so`);
            return this.ready();
        }
    }

    return [
        TrainingSession.cursorFindSession(id)
        , Athlete.cursorFindAthlete(session.user)
    ];
});

/**
 * Fetch a training session by coach session identifier.
 */
Meteor.publish('trainingSessions.coachSession', function (sessionId) {

    if (!this.userId) {
        return this.ready();
    }

    return TrainingSessions.byCoachSessionId(sessionId);
});

/**
 * Fetch a training session by multiple coach session identifiers.
 */
Meteor.publish('trainingSessions.coachSessions', function (sessionIds) {

    if (!this.userId) {
        return this.ready();
    }

    return TrainingSessions.byCoachSessionIds(sessionIds);
});


Geteor.publish('trainingSessions.forCoachAthletes', function (date) {
    let coach = Coach.find(this.userId);
    if (!coach) return this.ready();
    let athletes = coach.athleteIds();
    let range =  Utils.getDateRange(date, "week");
    return TrainingSession.cursorFindSessionsBetweenDatesForAthletes(athletes, range.start, range.end);
});


/**
 * Fetch the latest training sessions.
 */
Meteor.publish('trainingSessions.latest', function () {

    if (!this.userId) {
        return this.ready();
    }

    return TrainingSessions.latest(this.userId);
});

/**
 * Fetch the latest training sessions.
 */
Meteor.publish('trainingSessions.athlete.latest', function (id) {

    if (!this.userId) {
        return this.ready();
    }

    if (!Roles.userIsInRole(this.userId, ['coach']) && this.userId !== id)
        return this.ready();

    if (Roles.userIsInRole(this.userId, ['coach']) && !Coach.isCoachAthlete(this.userId, id))
        return this.ready();

    return TrainingSessions.latest(id);
});

Meteor.publish('trainingSessions.athlete.week', function (userId, startDate) {

    if (!this.userId) {
        return this.ready();
    }

    if (!Roles.userIsInRole(this.userId, ['coach']) && this.userId !== userId)
        return this.ready();

    if (Roles.userIsInRole(this.userId, ['coach']) && !Coach.isCoachAthlete(this.userId, userId))
        return this.ready();

    return TrainingSessions.weekDataForAthlete(userId, startDate);
});


Meteor.publish('trainingSessions.athlete.week.summary', function (userId, startDate) {

    if (!this.userId) {
        return this.ready();
    }

    if (!Roles.userIsInRole(this.userId, ['coach']) && this.userId !== userId)
        return this.ready();

    if (Roles.userIsInRole(this.userId, ['coach']) && !Coach.isCoachAthlete(this.userId, userId))
        return this.ready();

    return TrainingSessionsWeeklySummary.weekDataForAthlete(userId, startDate);
});

Meteor.publish('trainingSessions.athlete.week.interval', function (athleteId, startDate, endDate) {

    if (!this.userId) {
        return this.ready();
    }

    if (!Roles.userIsInRole(this.userId, ['coach']) && this.userId !== athleteId)
        return this.ready();

    if (Roles.userIsInRole(this.userId, ['coach']) && !Coach.isCoachAthlete(this.userId, athleteId))
        return this.ready();

    return TrainingSessionsWeeklySummary.interval(athleteId, startDate, endDate, false);
});

/**
 * 
 */
Meteor.publish('trainingSessionsWeeklySummary.weekDataForAthletes', function (weekStartDate, athletes) {

    if (!this.userId || !Roles.userIsInRole(this.userId, ['coach'])) {
        return this.ready();
    }

    return TrainingSessionsWeeklySummary.weekDataForAthletes(weekStartDate, athletes);
});

Meteor.publish('coachRemoteCommands', function () {

    if (!this.userId) {
        return this.ready();
    }

    return Commands.find({device: this.userId, synced: false, createdAt: {$gt: Date.now() - 5000}});
});

Geteor.publish('trainingSessions.for.day', /**@param {Date} day */ function (day) {
    const range = Utils.getDateRange(day ,'day');
    return TrainingSession.cursorFindSessionsBetween(this.userId, range.start, range.end, false);
});
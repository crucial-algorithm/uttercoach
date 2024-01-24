'use strict';
import {CoachTrainingSessions, CoachAthleteGroup, Coach} from "./collections";
import {ExpressionUtils} from "../../../expressions/utils";
import {
    TrainingSession,
    TrainingSessionsWeeklySummary
} from '../../training-sessions/api/collections';
import {Athlete} from "../../athletes/api/collections";
import {Meteor} from "meteor/meteor";


export class CoachUtils {

    /**
     *
     * @param trainingSession
     *
     * @returns {{date: Date, expression: String, users: Array, groups: Array, labels: Array}}
     */
    static processTrainingSession(trainingSession) {

        if (!trainingSession) {
            throw 'Invalid training session';
        }

        if (!(trainingSession.date instanceof Date)) {
            throw new Meteor.Error(500, 'Invalid date');
        }

        // TODO: parse the expression to validate
        if (!trainingSession.expressionId) {
            throw new Meteor.Error(500, 'Invalid training session expression');
        }

        let hasGroups = (trainingSession.groups && Array.isArray(trainingSession.groups) && trainingSession.groups.length > 0);

        return {
            date: trainingSession.date,
            expressionId: trainingSession.expressionId,
            groups: (hasGroups ? trainingSession.groups : []),
            trainingSessionIds: [],
            deleted: false
        };
    }


    /**
     *
     * @param expression
     *
     * @returns {{text: *}}
     */
    static processExpression(expression) {

        if (!expression) {
            throw 'Invalid expression';
        }

        try {

            ExpressionUtils.parse(expression.text);

        } catch (e) {

            throw new Meteor.Error(500, 'Invalid training expression');
        }

        return {
            text: expression.text
        };
    }


    /**
     * Register this training session in the coach training session.
     *
     * @param coachTrainingSessionId
     * @param trainingSessionId
     * @param userId
     */
    static updateCoachTrainingSession(coachTrainingSessionId, trainingSessionId, userId) {

        // no coach training session to associate with
        if (!coachTrainingSessionId) {
            return;
        }

        let coachTrainingSession = CoachTrainingSessions.byId(coachTrainingSessionId);

        // no coach training session exists with the specified identifier
        if (!coachTrainingSession) {
            return;
        }

        CoachTrainingSessions.update({_id: coachTrainingSessionId}, {
            $push: {
                trainingSessionIds: trainingSessionId
            }
        });
    }

    static removeAthleteSessionFromCoachTrainingSession(coachTrainingSessionId, trainingSessionId) {
        "use strict";

        // no coach training session to associate with
        if (!coachTrainingSessionId) {
            return;
        }

        let coachTrainingSession = CoachTrainingSessions.byId(coachTrainingSessionId);

        // no coach training session exists with the specified identifier
        if (!coachTrainingSession) {
            return;
        }

        CoachTrainingSessions.update({_id: coachTrainingSessionId}, {
            $pull: {
                trainingSessionIds: trainingSessionId
            }
        });


    }

    static getCoachAthletesInfo(userId) {
        const coach = Coach.find(userId);
        if (!coach) return [];
        let ids = coach.athleteIds();
        let athletes = Athlete.findInList(ids);
        let result = {};
        for (let athlete of athletes) {
            result[athlete.id] = {_id: athlete.id, name: athlete.name, boat: athlete.boat};
        }
        return result;
    }


    static isAthleteInSession(coachTrainingSession, athleteId) {
        let sessions = coachTrainingSession.trainingSessionIds;
        return TrainingSession.isAthleteOwnerOfOneOfTheseSessions(athleteId, sessions);
    }


    static getCoachAthletesSessionsForAWeek(userId, weekStartDate) {
        const coach = Coach.find(userId);
        if (!coach) return;
        return TrainingSessionsWeeklySummary.weekDataForAthletes(weekStartDate, coach.athleteIds()).fetch();
    }

 }

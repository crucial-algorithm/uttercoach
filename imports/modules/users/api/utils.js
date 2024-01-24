'use strict';

import {CoachTrainingSessions} from "../../coaches/api/collections.js";
import {CoachTrainingExpressions} from "../../coaches/api/collections.js";

import {ExpressionUtils} from "../../../expressions/utils";
import {TrainingSessionsWeeklySummary} from "../../training-sessions/api/collections";
import {LiveDevice} from "../../live/api/collections";
import {Utils} from "../../../utils/utils";
import {Meteor} from "meteor/meteor";
import {CoachAthleteGroup} from "../../coaches/api/collections";


export const UserUtils = {

    ORIGINS: {
        WEB: "Web",
        APP: "App",
        GOPADDLER: "gopaddler",
        UTTER_CYCLING: "uttercycling"
    },

    /**
     *
     * @param {string} currentUserId
     * @param {string} search
     *
     * @returns {*}
     */
    searchUsers: function (currentUserId, search) {
        return Meteor.users.find({
            'profile.name': {$regex: new RegExp(search, "i")},
            _id: {$ne: currentUserId}
        }, {
            fields: {
                _id: 1,
                'profile.name': 1,
                'services.facebook.id': 1
            }
        });
    },

    /**
     *
     * @param userId
     * @param groups
     */
    hasGroup: function(userId, groups) {
        for (let group of groups) {
            for (let athlete of group.athletes) {
                if (userId === athlete.user)
                    return true;
            }
        }
        return false;
    },

    getScheduledSessions: function(user) {
        let groups = UserUtils.getAthleteGroups(user);


        let sessions = [], coaches = {}, expressions = {}, splits = {};

        for (let g = 0; g < groups.length; g++) {
            let group = groups[g];

            let groupSessions = CoachTrainingSessions.find({
                groups: group._id,
                deleted: false,
                date: {$gte: moment().startOf('isoWeek').toDate(), $lt: moment().endOf('isoWeek').toDate()}
            }, {sort: {date: 1}}).fetch();

            for (let s = 0; s < groupSessions.length; s++) {
                let session = groupSessions[s];

                // check if we already have the coach...
                if (!coaches[session.user]) {
                    coaches[session.user] = Meteor.users.findOne({_id: session.user});
                }

                if (!expressions[session.expressionId]) {
                    let expr = CoachTrainingExpressions.findOne({_id: session.expressionId});
                    splits[expr._id] = ExpressionUtils.flatten(expr.text);
                    expressions[session.expressionId] = expr;
                }

                sessions.push({
                    coach: coaches[session.user],
                    expression: expressions[session.expressionId],
                    session: {id: session._id, splits: splits[expressions[session.expressionId]._id]},
                    date: session.date.getTime()
                });

            }
        }

        return sessions;
    },

    getAthleteGroups: function (user) {
        return CoachAthleteGroup.findAllAthleteGroups(user._id);

    },

    getVisibleAthletesData: function (userId, weekStartDate) {
        let groups = CoachAthleteGroup.findAllAthleteGroups(userId);
        let athletes = [];
        for (let group of groups) {
            for (let athleteId of group.athletes) {
                if (athleteId === userId) {
                    continue;
                }
                athletes.push(athleteId);
            }
        }

        let metrics = TrainingSessionsWeeklySummary.weekDataForAthletes(weekStartDate, athletes).fetch();
        for (let i = 0; i < metrics.length; i++) {
            metrics[i].user = Meteor.users.findOne(metrics[i].user)
        }

        return metrics;
    },

    calculateDeviceOffset: function(userId) {
        let device = LiveDevice.find(userId);
        return Utils.cristianClockSynchronization(device.latency);
    }
};

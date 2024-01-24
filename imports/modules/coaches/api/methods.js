"use strict";

import {Meteor} from "meteor/meteor";
import {CoachTrainingExpressions, CoachTrainingSessions} from "./collections.js";
import {CoachUtils} from "./utils.js";
import {TrainingSession} from "../../training-sessions/api/collections";
import Notifier from "../../../utils/notifier";
import {Geteor} from "../../../../server/core";
import {Coach, CoachAthleteGroup} from "./collections";
import {ServerPaymentTools} from "../../../utils/payments/server-payments";
import {Commands} from "../../live/api/collections";
import {LiveDeviceCommands} from "../../live/api/liveDevicesConstants";
import i18n from "../../../utils/i18n";
import {InviteToJoinGoPaddler, RecoverAccount} from "../../users/api/collections";
import EmailGenerationUtils from "../../../utils/email-generation-utils";
import {Athlete} from "../../athletes/api/collections";
import {logger} from "../../../utils/logger";
import UtterCoachSettings from "../../../utils/settings";

/**
 *
 */
Geteor.methods({

    /**
     *
     * @param trainingSession
     *
     * @returns {*}
     */
    saveCoachTrainingSession: function (trainingSession) {
        let trainingSessionObj = CoachUtils.processTrainingSession(trainingSession);

        trainingSessionObj.user = Meteor.userId();

        // TODO: notify users that they have a new scheduled training session

        if (trainingSession._id) {

            // make sure we keep the relations to training sessions on coach training session update
            let existingTrainingSession = CoachTrainingSessions.byId(Meteor.userId(), trainingSession._id, true);

            if (existingTrainingSession) {

                trainingSessionObj.trainingSessionIds = existingTrainingSession.trainingSessionIds;
            }

            return CoachTrainingSessions.update({_id: trainingSession._id}, trainingSessionObj);
        }

        Notifier.info("Created new scheduled session");

        return CoachTrainingSessions.insert(trainingSessionObj);
    },


    /**
     *
     * @param id
     */
    deleteCoachTrainingSession: function (id) {
        if (CoachTrainingSessions.byId(Meteor.userId(), id, false).count() === 0) {
            throw 'Unknown training session: ' + id;
        }

        Notifier.info("Deleted scheduled session");

        return CoachTrainingSessions.update(id, {$set: {deleted: true}});
    },


    /**
     *
     * @param group
     *
     * @returns {*}
     */
    saveCoachAthleteGroup: function (group) {
        if (!group._id) {
            // create new group
            let newGroup = CoachAthleteGroup.instantiateFromRecord(group);
            newGroup.coachId = Meteor.userId();
            return newGroup.save();
        }
        /**@type CoachAthleteGroup */
        const instance = CoachAthleteGroup.find(group._id);
        if (instance.coachId !== Meteor.userId()) {
            throw new Meteor.Error('403', 'Forbidden');
        }

        instance.name = group.name;
        instance.athletes = group.athletes.map((v) => v.user ? v.user: v);
        return instance.save();
    },

    acceptAthleteRequestToJoinTeam: async function (athleteId, groupId) {
        const coachId = Meteor.userId(), coach = Coach.find(coachId);
        let teamSize = coach.nbrOfAthletes() + 1;

        Commands.insert({
            command: LiveDeviceCommands.COACH_ACCEPTED_TEAM_REQUEST,
            createdAt: Date.now(),
            device: athleteId,
            payload: {coachId: coachId, name: coach.name},
            synced: false
        });

        if (coach.isTollFree()) {
            coach.acceptAthleteRequest(athleteId);
            return CoachAthleteGroup.appendAthleteToGroup(coachId, groupId, athleteId);
        }

        // handle changes in subscription
        let subscription = await ServerPaymentTools.retrieveSubscription(coach.stripeSubscriptionId);
        if (subscription === null || subscription.quantity >= teamSize) {
            coach.acceptAthleteRequest(athleteId);
            return CoachAthleteGroup.appendAthleteToGroup(coachId, groupId, athleteId);
        }

        try {
            await ServerPaymentTools.updateSubscription(coach, teamSize);
            await ServerPaymentTools.invoiceForNewAthlete(coach);
        } catch (err) {
            throw err;
        }

        coach.acceptAthleteRequest(athleteId);
        CoachAthleteGroup.appendAthleteToGroup(coachId, groupId, athleteId);
    },

    removeAthleteFromTeam: async function (athleteId) {
        const coachId = Meteor.userId(), coach = Coach.find(coachId);

        coach.removeAthleteFromTeam(athleteId);

        if (coach.isTollFree()) return;

        try {
            const athletes = coach.nbrOfAthletes();
            let qty = athletes === 0 ? 1 : athletes;
            await ServerPaymentTools.updateSubscription(coach, qty);
        } catch (err) {
            throw err;
        }
    },

    rejectAthleteRequest: async function (athleteId) {
        const coachId = Meteor.userId(), coach = Coach.find(coachId);
        coach.rejectAthleteRequest(athleteId);
    },

    coachInviteAthletesToJoinTeam: function (athletes, customMessage) {
        if (!Array.isArray(athletes)) {
            throw new Meteor.Error('empty_athletes', 'array is empty');
        }

        const coach = Coach.find(this.userId);
        if (!coach) {
            throw new Meteor.Error('user_is_not_a_coach', 'Only coaches can call this method');
        }

        let language = i18n.languageByUserId(this.userId);
        if (!customMessage) {
            customMessage = i18n.translate('coach_invite_athletes_modal_custom_message', [], language);
        }

        const utterSettings = UtterCoachSettings.getInstance();
        for (let athlete of athletes) {
            let invite = InviteToJoinGoPaddler.inviteAthlete(coach.id, athlete.email, athlete.name);
            const link = Meteor.absoluteUrl(`app-links/join-coach-team/${invite.token}`);
            EmailGenerationUtils.generateAndSend(athlete.email
                , /* Subject = */ i18n.translate("coach_invite_athletes_email_subject", [coach.name], language)
                , /* Text    = */i18n.translate("coach_invite_athletes_email_text", [link], language)
                , "invite-athlete-to-team"
                , {
                    footerBackgroundColor: "#cccccc",
                    message: customMessage,
                    coach: coach.name,
                    greeting: i18n.translate("coach_invite_athletes_email_greeting", [athlete.name, coach.name, utterSettings.getAppName(coach.sport)], language),
                    on_your_phone: i18n.translate("coach_invite_athletes_email_on_your_phone", [], language),
                    instructions: i18n.translate("coach_invite_athletes_email_instructions", [coach.name], language),
                    action: i18n.translate("coach_invite_athletes_email_action", [], language),
                    link: link
                }
                , language);
        }
    },

    saveCoachPrimarySport: function (sport) {
        if (TrainingSession.TYPES_LIST().indexOf(sport) < 0) {
            throw new Meteor.Error('400', 'invalid sport');
        }
        const coachId = Meteor.userId()
        Coach.updatePrimarySport(coachId, sport);
    },

    createPaymentSession: async function() {
        return await ServerPaymentTools.createCheckoutSession();
    },

    startCoachSubscription: async function (qty = null) {
        const coach = Coach.find(Meteor.userId());
        if (qty === null) {
            qty = CoachAthleteGroup.coachNbrOfAthletes(coach.id);
        }
        await ServerPaymentTools.updateSubscription(coach, qty);
        // potential problem here - we should validate the subscription status, in stripe, is actually properly updated
        coach.setSubscribed();
    },

    redeemActiveDiscount: async function () {
        const coach = Coach.find(Meteor.userId());

        return await ServerPaymentTools.redeemDiscount(coach, Math.max(coach.nbrOfAthletes(), 5));
    },

    cancelCoachSubscription: async function () {
        const coach = Coach.find(Meteor.userId());
        try {
            let confirmation = await ServerPaymentTools.cancelCoachSubscription(coach);
            coach.coachCanceledSubscription();
            return confirmation;
        } catch (err) {
            throw new Meteor.Error(typeof err === "string" ? err : JSON.stringify(err));
        }
    },

    /**
     * Returns amount (zero if no increase will happen)
     * @return {Promise<number|*>}
     */
    isAddingAnAthleteToTeamGoingToIncreaseCost: async function () {
        const coach = Coach.find(Meteor.userId());
        if (coach.isInTrial() || coach.isTollFree()) return 0;

        let subscription = await ServerPaymentTools.retrieveSubscription(coach.stripeSubscriptionId);
        if (subscription === null || subscription.quantity > CoachAthleteGroup.coachNbrOfAthletes(coach.id) + 1) {
            return 0;
        } else {
            return coach.costPerAthlete;
        }
    },

    /**
     *
     * @return {Promise<StripePaymentMethod>}
     */
    retrieveStripeCoachPaymentInfo: async function () {
        return new Promise((resolve, reject) => {
            const coach = Coach.find(Meteor.userId());
            try {
                logger.info(`Get coach payment info: ${coach.id} - ${coach.stripePaymentMethodId}`);
                if (!coach.stripePaymentMethodId) return resolve(null);
                ServerPaymentTools.retrievePaymentMethod(coach.stripePaymentMethodId).then((paymentMethod) => {
                    resolve(paymentMethod.toJSON());
                });
            } catch(err) {
                reject(err);
            }
        });

    },

   /**
    *
    * @return {Promise<StripePaymentMethod>}
    */
    updateCoachPaymentMethod: async function (stripePaymentMethodId) {
        return new Promise(async (resolve, reject) => {
            const coach = Coach.find(Meteor.userId());
            logger.info(`Update coach payment info: ${coach.id} - ${stripePaymentMethodId}`);
            try {
                await ServerPaymentTools.updateCustomerInformation(coach, stripePaymentMethodId, coach.stripeCustomerId);
                resolve();
            } catch(err) {
                reject(err);
            }
        });

    },




    /**
     * Change athlete group
     *
     * @param athleteId
     * @param groupId
     */
    swapAthlete: function (athleteId, groupId) {

        CoachAthleteGroup.removeAthleteFromAllGroups(Meteor.userId(), athleteId);
        CoachAthleteGroup.appendAthleteToGroup(Meteor.userId(), groupId, athleteId);

        // TODO: count number of athletes and update coach subscription accordingly
    },


    /**
     *
     * @param id
     */
    deleteCoachAthleteGroup: function (id) {
        let group = CoachAthleteGroup.find(id);
        if (!group) {
            throw 'Unknown group: ' + id;
        }

        Notifier.info("Deleted group");

        return group.delete();
    },

    /**
     *
     * @param expression
     *
     * @returns {*}
     */
    saveCoachTrainingExpression: function (expression) {
        let expressionObj = CoachUtils.processExpression(expression);

        expressionObj.user = Meteor.userId();

        if (expression._id) {
            return CoachTrainingExpressions.update({_id: expression._id}, expressionObj);
        }

        expressionObj.createdAt = moment().unix();
        expressionObj.deleted = false;

        Notifier.info("Created new \"expression\"");

        return CoachTrainingExpressions.insert(expressionObj);
    },


    /**
     *
     * @param id
     */
    deleteCoachTrainingExpression: function (id) {
        Notifier.info("Deleted \"expression\"");

        return CoachTrainingExpressions.update(id, {$set: {deleted: true}});
    },

    getCoachAthletesSessionsForAWeek: function (weekStartDate) {
        return CoachUtils.getCoachAthletesSessionsForAWeek(Meteor.userId(), weekStartDate);
    },

    /**
     *
     */
    getCoachSession: function (id) {

        let userId,
            athletes = [];

        if (!(userId = Meteor.userId())) {
            throw new Meteor.Error("not-authorized");
        }

        let session = CoachTrainingSessions.findOne(id),
            expression = CoachTrainingExpressions.findOne(session.expressionId),
            filter;

        if (session.deleted === true) {
            throw new Meteor.Error("not-authorized");
        }

        // it's a coach?
        let coach = Coach.find(userId);
        if (Roles.userIsInRole(userId, ['coach']) && coach) {

            if (session.user !== userId) {
                throw new Meteor.Error("not-authorized");
            }

            const athleteIds = coach.athleteIds();

            filter = function (session) {
                return athleteIds.indexOf(session.user) < 0 && userId !== session.user;
            };

        } else {

            // we are now an athlete
            if (!CoachUtils.isAthleteInSession(session, userId)) {
                throw new Meteor.Error("not-authorized");
            }

            let group = CoachAthleteGroup.findGroupWithin(session.groups, userId);

            if (group) {

                group.athletes = group.athletes.map(function (e) {
                    return e.user
                });

                filter = function (session) {
                    return (group.athletes.indexOf(session.user) < 0)
                };
            }
        }

        if (filter) {

            for (let id of session.trainingSessionIds) {

                let athleteSession = TrainingSession.find(id);

                // check if user can see athletes stats
                if (filter(athleteSession)) continue;

                athletes.push({
                    athlete: Athlete.find(athleteSession.user).toJSON(),
                    session: id
                });
            }
        }

        Notifier.info("Analysing scheduled session");

        return {
            coachSession: session,
            athletes: athletes,
            expression: expression
        }
    },

    coachAthletesInfo: function () {
        return CoachUtils.getCoachAthletesInfo(Meteor.userId());
    },

    suppressSession: function (id) {
        let coach = Coach.find(Meteor.userId());
        if (!coach) throw new Meteor.Error("not-authorized");
        coach.suppressSession(id);
    }
});

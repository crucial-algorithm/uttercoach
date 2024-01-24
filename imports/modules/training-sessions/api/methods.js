'use strict';
import {Meteor} from "meteor/meteor";
import {DebugSessions, TrainingSession} from "./collections.js";
import {LiveDevice, LiveDeviceData, LiveSession} from "../../live/api/collections.js";
import {TrainingSessionsUtils} from "./utils.js";
import {CoachUtils} from "../../coaches/api/utils";
import {logger} from "../../../utils/logger";
import Notifier from "../../../utils/notifier";
import {UserUtils} from "../../users/api/utils";
import {IntervalType, LiveDevicesStatus} from "../../live/api/liveDevicesConstants";
import {SessionAlreadyExistsException} from "./utils";
import {DeviceLiveSessionSplit, LiveSessionSplit} from "../../live/api/collections";
import {Geteor} from "../../../../server/core";
import {TrainingSessionProcessFailure} from "./collections";
import {Athlete} from "../../athletes/api/collections";

/**
 *
 */
Geteor.methods({

    listScheduledSessions: function () {
        let user = Meteor.user();

        if (!user) {
            throw new Meteor.Error("not-authorized");
        }

        logger.info("syncing scheduled sessions for " + user.profile.name);

        return UserUtils.getScheduledSessions(user);
    },

    /**
     *
     * @param trainingSession
     */
    saveTrainingSession: function (trainingSession) {

        // check authentication
        let user = Meteor.user();

        if (!user) {
            logger.info(["[Unknown] Unauthorized attempt to save training session"].join(' '));
            throw new Meteor.Error("not-authorized");
        }
        trainingSession.user = Meteor.userId();

        logger.info(`[${ user.profile.name}] saving training session with server offset of ${trainingSession.serverClockGap}`);
        /**
         * @type {TrainingSession}
         */
        let tSession;
        try {
            tSession = TrainingSessionsUtils.processTrainingSession(trainingSession, false);
        } catch (err) {

            if (err instanceof SessionAlreadyExistsException) {
                logger.info(`[${user.profile.name}] session already exists width id ${err.id} - discarding`);
                Notifier.info(`[${user.profile.name}] tried to upload an existing session (${err.id}) - App v.${(user.profile.device || {}).paddler}`);
                return err.id
            }

            new TrainingSessionProcessFailure(trainingSession, err).insert();

            logger.info(["[", user.profile.name, "] session ignored with error:", err].join(' '));
            throw new Meteor.Error(err);
        }


        let id = tSession.insert();
        logger.info(`[${user.profile.name}] Training session ${id} processed. Distance = ${tSession.distance}, Avg Length: ${tSession.avgSpmEfficiency}`);

        CoachUtils.updateCoachTrainingSession(tSession.coachTrainingSessionId, id, Meteor.userId());

        Notifier.info(["[", user.profile.name, "] uploaded a new session ", id, "@", tSession.date].join(' '));

        try {
            let emailsSent = tSession.notifyCoach();
            logger.info(["[", user.profile.name, "] sent notifications to", emailsSent, "coach"].join(' '));
        } catch (err) {
            logger.info(["[", user.profile.name, "] failed to send notification to coach"].join(' '));
        }
        return id;
    },

    /**
     *
     * @param id
     */
    deleteTrainingSession: function (id) {

        // check authentication
        let user = Meteor.user();
        if (!user) {
            throw new Meteor.Error("not-authorized");
        }


        let tSession = TrainingSession.find(id);
        if (!tSession) {
            throw 'Unknown training session: ' + id;
        }

        TrainingSessionsUtils.updateSummaryData(tSession, true);
        if (tSession.coachTrainingSessionId) {
            CoachUtils.removeAthleteSessionFromCoachTrainingSession(tSession.coachTrainingSessionId, tSession._id);
        }

        return tSession.delete();
    },

    /**
     *
     * @param debugSession
     */
    saveTrainingSessionDebug: function (debugSession) {

        let user = Meteor.user();
        if (!user) {
            throw new Meteor.Error("not-authorized");
        }

        try {
            let user = Meteor.user();
            logger.info(["[", user.profile.name, "] saving debug training session"].join(' '));

            var dSession = TrainingSessionsUtils.processTrainingSessionDebug(debugSession);
            logger.info(["[", user.profile.name, "] debug training session processed"].join(' '));

            let tSession = TrainingSession.find(dSession.trainingSession);
            logger.info(["[", user.profile.name, "] training session exists? "].join(''), tSession !== null);

            if (tSession === null) {
                throw 'Unknown training session: ' + dSession.trainingSession;
            }

            logger.info(["[", user.profile.name, "] debug training, training session exists passed... now found debug session?"
                , DebugSessions.byTrainingSession(dSession.trainingSession)].join(' '));

            if (DebugSessions.byTrainingSession(dSession.trainingSession).count() === 0) {

                // this session doesn't have any debug information
                dSession.user = Meteor.userId();

                DebugSessions.insert(dSession);

                Notifier.info("Uploaded a new debug session");

            } else {

                // this session already contains some debug information (append to it)
                DebugSessions.update({trainingSession: dSession.trainingSession}, {
                    $push: {
                        data: {
                            $each: dSession.data
                        }
                    }
                });
            }
        } catch (err) {
            logger.info(["[", user.profile.name, "] debug training session failed with error: ", err].join(' '));
        }
    },

    getGroupAthletesData: function (weekStartdate) {
        let user = Meteor.user();
        if (!user) {
            throw new Meteor.Error("not-authorized");
        }

        return UserUtils.getVisibleAthletesData(Meteor.userId(), weekStartdate);

    },

    deviceReadyToStart: function () {
        let user = Meteor.user();

        if (!user) {
            throw new Meteor.Error("not-authorized");
        }

        logger.debug(`[${user.profile.name}] ready to start (${user._id})`);


        let record = LiveDevice.find(user._id);

        // there is no live device: create one
        if (!record) {
            new LiveDevice(user._id, LiveDevicesStatus.READY).insert();
            return user._id;
        }

        // we have a live device: is it performing a session? No, so just update last seen and reset all values
        if (!record.activeSessionId) {
            LiveDevice.setDeviceReady(user._id, record.activeSessionId);
            return user._id;
        }

        // we have a live device, but it has a groupKey (meaning, it may be already in a live session);
        // lets check if session is active an not older than 3 hours
        const liveSession = LiveSession.find(record.activeSessionId);
        if (liveSession !== null && liveSession.active === true && liveSession.finishedAt === null && Date.now() - liveSession.startedAt < 3600 * 3 * 1000) {
            LiveDevice.justSeen(user._id);
            return user._id;
        }

        // live session is old... let's just update as if it did not exist
        LiveDevice.setDeviceReady(user._id, record.activeSessionId);

        return user._id;
    },

    deviceDisconnected: function () {
        let user = Meteor.user();

        if (!user) {
            throw new Meteor.Error("not-authorized");
        }

        LiveDevice.resetDeviceState(user._id, LiveDevicesStatus.OFFLINE);

        return user._id;
    },

    deviceStarted: function (startedAt, expression) {
        let user = Meteor.user();

        if (!user) {
            throw new Meteor.Error("not-authorized");
        }

        logger.debug(`[${user._id}] started session @${startedAt}`);

        let record = LiveDevice.find(user._id);

        if (!record) return;

        startedAt += UserUtils.calculateDeviceOffset(user._id);

        let athlete = Athlete.find(user._id);

        // if we are not in a live session, create one, so if coach later goes into live sessions, it can still
        // follow athlete session
        let activeSessionId = record.activeSessionId;
        logger.debug(`[${user.profile.name}] Device started by ${record.activeSessionId ? 'Coach' : 'Athlete'}`);
        if (!record.activeSessionId && user.profile.liveUpdateEvery > 0) {
            logger.debug(`[${user.profile.name}] Creating live session`);
            // in case there are running solo sessions for this device, finish them
            LiveSession.finishRunningAthleteSoloLiveSessions(user._id);
            let coach = athlete.findCoaches()[0];
            if (coach) {
                logger.debug(`[${user.profile.name}] adding session to ${coach.id}`);
                let session = new LiveSession(coach.id, true, expression, -1, startedAt, [user._id]);
                session.solo = true;
                logger.debug(`[${user.profile.name}] creating LiveSession from athlete`);
                activeSessionId = session.insert();
            } else {
                logger.debug(`[${user.profile.name}] no coach found...`);
            }
        }

        logger.debug(`[${user.profile.name} | ${user._id}] session started in device`);
        LiveDevice.startDevice(user._id, startedAt, activeSessionId, expression);

        return activeSessionId;
    },

    deviceFinishedWarmUp: function (duration, distance, isDistanceBased) {
        let user = Meteor.user();
        if (!user) {
            throw new Meteor.Error("not-authorized");
        }

        let record = LiveDevice.find(user._id);

        if (!record) {
            logger.error(`[${user.profile.name}] called finished warmup but live session does not exist`);
            return;
        }

        logger.debug(`[${user.profile.name}] Warm up finished - starting session`);

        const liveSession = LiveSession.findAthleteSoloLiveSession(user._id);
        let map = {};
        map[user._id] = distance;

        let type = isDistanceBased === true ? IntervalType.DISTANCE : IntervalType.TIME;
        let split = new LiveSessionSplit(liveSession._id, duration, /*isRecovery  = */ false, /* Split Nbr */ 0
            , map, type);
        split.insert();

        let d = new DeviceLiveSessionSplit(liveSession._id, user._id, split.id
            , duration, /* is Recovery = */ false, /* split nbr */ 0
            , /* Start Distance = */ distance
            , /* Displayed Distance = */ Math.round(distance - distance % 10), type);
        d.insert();

        LiveSession.finishWarmUp(liveSession._id, liveSession.startedAt + duration);
    },

    deviceFinished: function (finishedAt) {
        let user = Meteor.user();

        if (!user) {
            throw new Meteor.Error("not-authorized");
        }

        logger.debug(`${user.profile.name}] Session finished`);

        let record = LiveDevice.find(user._id);

        if (!record) {
            return;
        }

        if (record.activeSessionId) {
            logger.debug(`${user.profile.name}] Live session found ${record.activeSessionId}`);
            let liveSession = LiveSession.find(record.activeSessionId);
            logger.debug(`${user.profile.name}] is solo? ${liveSession.solo}`);
            if (liveSession.solo === true) {
                logger.debug(`${user.profile.name}] Live session started by athlete`);
                let tsAdjustment = UserUtils.calculateDeviceOffset(user._id);
                logger.debug(`${user.profile.name}] Closing session ${record.activeSessionId}`);
                LiveSession.finishSession(record.activeSessionId, finishedAt + tsAdjustment)
            }
        }


        LiveDevice.finish(user._id);

        return user._id;
    },

    liveUpdate: function (data) {
        let user = Meteor.user();

        if (!user) {
            logger.debug(`No User found in Live Update`);
            throw new Meteor.Error("not-authorized");
        }

        let record = LiveDevice.find(user._id);

        if (!record || record.activeSessionId === null) return;

        if (Math.round(Math.random() * 60) > 56) {
            LiveDevice.justSeen(user._id);
        }

        let liveSession = LiveSession.find(record.activeSessionId);
//        logger.debug(`[${user.profile.name}]; locationTs: ${data[9]}; speed: ${data[2]}; rawDistance: ${data[3]}; distance: ${data[3]}; cadence: ${data[4]}; displacement: ${data[5]}; heart rate: ${data[7]}; split: ${Math.max(data[8], liveSession.split)}; location changed? ${data[10]}; location accuracy: ${data[11]}`);

        LiveDeviceData.insert({
            /* device       = */ dv: user._id,
            /* live Session = */ ss: record.activeSessionId,
            /* duration     = */ dr: data[1],
            /* speed        = */ sd: data[2],
            /* distance     = */ dt: data[3],
            /* cadence      = */ cd: data[4],
            /* displacement = */ dp: data[5],
            /* heart rate   = */ hr: data[7],
            /* split        = */ st: Math.max(data[8], liveSession.split),
            /* location ts  = */ ls: data[9],
            /* loc changed? = */ lc: data[10] === true,
            /* created at   = */ ca: Date.now()

        });

//        logger.debug(`[${user.profile.name}] Saved live data`);

        return user._id;
    },

    updateDeviceStatus: function (status, sessionId) {
        let user = Meteor.user();

        if (!user) {
            logger.debug(`No User found in Live Update`);
            throw new Meteor.Error("not-authorized");
        }

        logger.debug('App ' + user._id + ' reported it\'s status');

        let record = LiveDevice.find(user._id);

        if (!record) return;

        // due to bug in version 1.3.0, we need to make sure that we don't override sessionId with null!!
        if (status === LiveDevicesStatus.RUNNING) {
            // Do nothing... everything should already be ok
        } else if (status === LiveDevicesStatus.OFFLINE) {
            LiveDevice.resetDeviceState(user._id, status, sessionId);
        }
    },

    calculateSplitsInFreeSession(sessionId, expressionStatement, startAt) {
        TrainingSessionsUtils.calculateSplitsInFreeSession(sessionId, expressionStatement, startAt, true);
    },

    rollbackToFreeSession(sessionId) {
        TrainingSessionsUtils.resetSessionBackToFreeSession(sessionId);
    }

});


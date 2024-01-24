"use strict";

import {Meteor} from "meteor/meteor";
import {Commands, LiveSession, LiveSplitPartialsPosition} from "./collections.js";
import { Random } from 'meteor/random';
import {Geteor} from "../../../../server/core";
import {IntervalType, LiveDeviceCommands, LiveDevicesStatus} from "./liveDevicesConstants";
import {Expression} from "../../../expressions/expression";
import {LiveUtils} from "./utils";
import {Coach, Team} from "../../coaches/api/collections";
import {
    DeviceLiveSessionSplit, DistanceStep, LiveDevice, LiveSessionSplit,
    LiveSessionSplitBuffer
} from "./collections";
import {logger} from "../../../utils/logger";
import {UserUtils} from "../../users/api/utils";
import CommandManager from "./commands";
import {CoachUtils} from "../../coaches/api/utils";

/**
 *
 */
Geteor.methods({

    listAllDevices: function () {
        let result = []
            , /**@type LiveDevice[] */ devices = LiveDevice.findDevices(Team.coachAthletesIds(Meteor.userId()));
        for (let device of devices) {
            result.push({
                _id: device.id,
                notSeenSince: Date.now() - device.lastSeenAt,
                status: device.status,
                liveSessionId: device.activeSessionId,
                latencyNotRefreshedSince: Date.now() - (device.latencyRefreshedAt === null ? 0 : device.latencyRefreshedAt)
            })
        }

        return result;
    },

    /**
     * Device got the command from coach and replied back saying it finished processing
     * @param id command identifier
     * @param type command identifier
     * @param payload command identifier
     */
    commandSyncedInDevice: function (id, type, payload) {

        let command = Commands.findOne({_id: id});
        if (!command) {
            throw new Meteor.Error("no-live-device-for-user");
        }

        if (type === LiveDeviceCommands.SYNC_CLOCK) {
            let rtt = Date.now() - payload.begin;
            LiveDevice.updateLatency(payload.device, rtt / 2
                , payload.clock ? payload.begin + rtt / 2 - payload.clock : 0);

            logger.debug(`Syncing clock for ${payload.device}; Server TS: ${payload.begin} | Device TS: ${payload.clock} | RTT: ${rtt / 2} | Diff: ${payload.begin + rtt / 2 - payload.clock}`);

            /**@type LiveDevice */
            let device = LiveDevice.find(payload.device);
            if (device.latency.count >= 3) {
                let deviceOffset = UserUtils.calculateDeviceOffset(device.id);
                logger.debug(`Finish syncing clock for ${payload.device}: push to device ${deviceOffset}`);
                LiveDevice.latencyCalcFinished(device.id);
                Commands.insert({
                    command: LiveDeviceCommands.CLOCK_SYNCED,
                    createdAt: Date.now(),
                    device: payload.device,
                    payload: {serverClock: deviceOffset},
                    synced: false
                })
            }
        }

        logger.debug(`synced command ${id} for device ${command.device}`);

        return Commands.update({_id: id}, {
            $set: {
                synced: true
            }
        });
    },

    /**
     * Initiate calculation of clock difference between server and device
     * Called from device
     *
     * @param device
     */
    syncDeviceClock: function (device) {
        let instance = LiveDevice.find(device);
        if (!instance) {
            instance = new LiveDevice(device, LiveDevicesStatus.OFFLINE);
            instance.insert();
        } else {
            LiveDevice.resetLatency(device);
        }

        logger.debug(`[${device}] requested clock sync`);
        const commandId = Random.id();
        let count = 1;
        let intervalId = Meteor.setInterval(function () {

            if (count > 3) {
                logger.debug(`[${device}] requested clock sync`);
                Meteor.clearInterval(intervalId);
                return;
            }

            logger.debug(`[${device}] Starting fround trip ${count} on clock sync ${commandId}`);
            Commands.insert({
                command: LiveDeviceCommands.SYNC_CLOCK,
                createdAt: Date.now(),
                device: device,
                parent: commandId,
                payload: {begin: Date.now()},
                synced: false
            });

            count++;
        }, 1000);

    },

    getServerTime(clientTimestamp) {
        return {server: Date.now(), client: clientTimestamp};
    },

    /**
     * Set latency information for coach (to allow to convert coach timestamps into corresponding server time)
     * @param count
     * @param roundTripTime
     * @param clock
     */
    storeCoachLatency(count, roundTripTime, clock) {
        Coach.updateLatency(Meteor.userId(), count, roundTripTime, clock);
    },

    /**
     * @deprecated
     * @param id
     */
    deviceSpotted: function(id) {
        LiveDevice.justSeen(id);
    },

    /**
     * Send messages for devices to start session with that specific expression
     *
     * @param {string}  expression
     * @param {Array}   devices
     * @param {Number}  startedAt
     * @param {String}  commandId
     * @returns {String}
     */
     pushStartSessionToLiveDevices: async function (expression, devices, startedAt, commandId) {
        logger.debug(`Push start session for ${devices.length} devices [${commandId}]`);

        let command = Commands.findOne({commandId: commandId});
        if (command) {
            logger.debug(`Push start session for ${devices.length} devices [${commandId}]`);
            return null;
        }

        if (!devices || devices.length === 0) {
            return null;
        }

        let splits = [];
        if (expression) {
            let expr = new Expression(expression);
            splits = expr.flatten();
        }

        let coachId = Meteor.userId();
        // convert to server time
        startedAt += LiveUtils.coachOffset(coachId);

        let session = new LiveSession(coachId, true, expression, -1, startedAt, devices);
        let sessionId = session.insert();

        // added before sending command to make sure that we have updated device when "deviceStarted" is triggered
        // by the device
        await LiveDevice.addDevicesToLiveSession(devices, sessionId);

        await CommandManager.create(LiveDeviceCommands.START_SESSION, devices, sessionId, function (device) {
            return {
                expression: expression,
                splits: splits,
                rawStartedAt: startedAt,
                startedAt: LiveUtils.serverToDeviceTime(startedAt, null, device),
                sessionId: sessionId
            }
        }, false).catch(function (error) {
            return sessionId;
        });

        return sessionId;
    },

    /**
     * Send messages for devices to start split
     *
     * @param liveSessionId
     * @param devices
     * @param durationFinishedAt         Duration when coach triggered start (adjusted to server time)
     * @param type                       IntervalType
     * @returns {boolean}
     */
    pushFinishWarmUpToLiveDevices: function (liveSessionId, devices, durationFinishedAt, type) {
        if (!devices || devices.length === 0) {
            logger.error(`Push finish warm up for zero device in live Session ${liveSessionId}`);
            return false;
        }

        logger.debug(`Finish warm-up @ ${durationFinishedAt}`);

        let liveSession = LiveSession.find(liveSessionId);
        let finishedAt = liveSession.startedAt + durationFinishedAt;

        let map = {}, distances = {};
        devices.map(function (d) {
            map[d.deviceId] = d.distance;
            distances[d.deviceId] = d.displayedDistance;
        });

        let split = new LiveSessionSplit(liveSessionId, durationFinishedAt, /*isRecovery  = */ false, /* Split Nbr */ 0
            , map, type);
        split.insert();

        for (let meta of devices) {
            Commands.insert({
                command: LiveDeviceCommands.FINISH_WARMUP,
                createdAt: finishedAt,
                device: meta.deviceId,
                payload: {durationFinishedAt: durationFinishedAt, distanceFinishedAt: map[meta.deviceId]},
                synced: false
            });

            let d = new DeviceLiveSessionSplit(liveSessionId, meta.deviceId, split.id
                , durationFinishedAt, /* is Recovery = */ false, /* split nbr */ 0
                , /* Start Distance = */ map[meta.deviceId]
                , /* Displayed Distance = */ distances[meta.deviceId], type);
            d.insert();
        }

        LiveSession.finishWarmUp(liveSessionId, finishedAt);
    },

    /**
     * Send messages for devices to start split
     *
     * @param liveSessionId
     * @param devices
     * @param duration         Duration when coach triggered start (adjusted to server time)
     * @returns {boolean}
     */
    pushStartSplitToLiveDevices: function (liveSessionId, devices, duration) {
        logger.debug(`Push start split for live session [${liveSessionId}] @ ${duration}`);

        if (!devices || devices.length === 0) {
            return false;
        }

        LiveSessionSplit.finishRunningSplits(liveSessionId, duration, true, devices);

        let liveSession = LiveSession.find(liveSessionId);
        LiveSession.incrementSplit(liveSessionId);
        let splitNumber = (liveSession.split + 1);

        let map = {}, distances = {};
        devices.map(function (d) {
            map[d.deviceId] = d.distance;
            distances[d.deviceId] = d.displayedDistance;
        });

        let split = new LiveSessionSplit(liveSessionId, duration, false, splitNumber, map, IntervalType.FREE);
        split.insert();

        for (let meta of devices) {
            Commands.insert({
                command: LiveDeviceCommands.START,
                createdAt: Date.now(),
                device: meta.deviceId,
                payload: {split: split.id, duration: duration},
                synced: false
            });

            let d = new DeviceLiveSessionSplit(liveSessionId, meta.deviceId, split.id
                , duration, false, splitNumber, map[meta.deviceId], distances[meta.deviceId], IntervalType.FREE);
            d.insert();
        }
    },

    /**
     * Send messages for devices to stop split
     *
     * @param liveSessionId
     * @param devices
     * @param stoppedAt         Duration when coach triggered stop (adjusted to server time)
     * @returns {boolean}
     */
    pushStopSplitToLiveDevices: function (liveSessionId, devices, stoppedAt) {
        logger.debug(`pushStopSplitToLiveDevices for live session [${liveSessionId}] @ ${stoppedAt}`);

        LiveSessionSplit.finishRunningSplits(liveSessionId, stoppedAt, true, devices);

        let liveSession = LiveSession.find(liveSessionId);
        LiveSession.incrementSplit(liveSessionId);
        let splitNumber = (liveSession.split + 1);
        /** @type LiveSessionSplit */
        let finishedLiveSessionSplit = LiveSessionSplit.findSplitByNumber(liveSessionId, liveSession.split);

        let map = {}, distances = {};
        devices.map(function (d) {
            map[d.deviceId] = d.distance;
            distances[d.deviceId] = d.displayedDistance;
        });

        let split = new LiveSessionSplit(liveSessionId, stoppedAt, true, splitNumber, map, IntervalType.FREE);
        split.insert();

        let createdAt = Date.now();
        for (let meta of devices) {

            let startedAt = stoppedAt;
            if (meta.alreadyStopped === true) {
                let split = DeviceLiveSessionSplit.findSplitByNumber(liveSessionId, meta.deviceId, liveSession.split);
                startedAt = split.finishedAt;
            }

            let d = new DeviceLiveSessionSplit(liveSessionId,  meta.deviceId, split.id, startedAt
                , true, splitNumber, map[meta.deviceId], distances[meta.deviceId], IntervalType.FREE);
            d.insert();


            if (meta.alreadyStopped === true) continue;
            Commands.insert({
                command: LiveDeviceCommands.START,
                createdAt: createdAt,
                device: meta.deviceId,
                payload: {split: split.id, duration: stoppedAt},
                synced: false
            });
        }

        LiveUtils.generatePartials(liveSession, LiveSessionSplit.findSplitByFinishTime(stoppedAt)).catch(function (error) {
            logger.error(`Unhandled exception when creating pushStopSplitToLiveDevices, trying to generatePartials: ${error}`);
        });
    },

    /**
     *
     * @param liveSessionId
     * @param deviceId
     * @param distance
     * @param displayedDistance
     * @param stoppedAt             Duration
     * @returns {boolean}
     */
    pushStopSplitInDevice: function (liveSessionId, deviceId, distance, displayedDistance, stoppedAt) {
        logger.debug(`pushStopSplitInDevice for ${deviceId}, in live session [${liveSessionId}] @ ${stoppedAt}`);

        if (!deviceId) {
            return false;
        }

        DeviceLiveSessionSplit.finish(liveSessionId, deviceId, stoppedAt, distance, displayedDistance);
        //
        // let liveSession = LiveSession.find(liveSessionId);
        // LiveSession.incrementSplit(liveSessionId);
        // let splitNumber = (liveSession.split + 1);
        //
        // let d = new DeviceLiveSessionSplit(liveSessionId,  deviceId, split.id
        //     , stoppedAt, true, splitNumber, distance, displayedDistance, IntervalType.FREE);
        // d.insert();

        Commands.insert({
            command: LiveDeviceCommands.START,
            createdAt: Date.now(),
            device: deviceId,
            payload: {split: null, duration: stoppedAt},
            synced: false
        });
    },

    /**
     *
     * @param liveSessionId
     * @param devices
     * @param {number} duration
     * @returns {boolean}
     */
    pushNextSplitToLiveDevices: function (liveSessionId, devices, duration) {

        if (!devices || devices.length === 0) {
            return false;
        }

        for (let meta of devices) {
            Commands.insert({
                command: LiveDeviceCommands.RESUME,
                createdAt: Date.now(),
                device: meta.deviceId,
                payload: {duration: duration},
                synced: false
            });
        }

        return true;
    },

    createPartialInSplit: function (liveSessionId, deviceId, splitId, timestamp, standardizedDistance) {
        LiveSplitPartialsPosition.insert({
            device: deviceId,
            split: splitId,
            liveSession: liveSessionId,
            timestamp: timestamp,
            distance: standardizedDistance
        })
    },

    /**
     * Send messages to devices to finish session
     * @param liveSessionId
     * @param devices
     * @param finishedAt
     * @param duration
     * @returns {boolean}
     */
    pushFinishToLiveDevices: function (liveSessionId, devices, finishedAt, duration) {

        if (!devices) {
            devices = [];
        }

        logger.debug(`Push finish session for ${devices.join(', ')}`);

        finishedAt += LiveUtils.coachOffset(Meteor.userId());

        if (liveSessionId) {
            LiveSession.finishSession(liveSessionId, finishedAt);
            LiveSessionSplit.finishRunningSplits(liveSessionId, duration);
        }

        let now = Date.now();
        for (let device of devices) {
            Commands.insert({
                command: LiveDeviceCommands.FINISH_SESSION,
                createdAt: now,
                device: device,
                payload: null,
                synced: false
            });
        }
    },

    pushPingLiveDevices: function () {
        for (let athleteId of Team.coachAthletesIds(this.userId)) {
            Commands.insert({
                command: LiveDeviceCommands.PING,
                createdAt: new Date().getTime(),
                device: athleteId,
                payload: null,
                synced: false
            });
        }
    },

    pushHardResetToDevice: function (id) {
        Commands.insert({
            command: LiveDeviceCommands.HARD_RESET,
            createdAt: new Date().getTime(),
            device: id,
            payload: null,
            synced: false
        });
    },

    splitChangedInLiveDevice: async function (from, to) {
        let userId = Meteor.userId()
            /** @type LiveSessionSplitBuffer */
            , split
            , finished = !to
            , liveSessionId;

        if (!from) {
            return;
        }

        let record = LiveDevice.find(userId);
        if (!record || record.activeSessionId === null) {
            logger.debug(`\n\n${userId} - no active live session found - skipping split change`);
            return;
        }
        liveSessionId = record.activeSessionId;

        let liveSession = LiveSession.find(liveSessionId);
        if (liveSession.expression === null) {
            return;
        }
        logger.debug(`\n\n${userId} - ${liveSession.split} changed @ ${from.finish.time} \t distance: ${from.finish.distance}\t START ------------------ `);

        /**@type DeviceLiveSessionSplit */
        let deviceSplit = DeviceLiveSessionSplit.findSplit(userId, liveSessionId, from.position);

        // finish running split for this device
        deviceSplit.finish(from);
        if (!to) {
            to = {
                isRecovery: true,
                position: deviceSplit.number +1 ,
                isDistanceBased: false,
                start: {time: from.finish.time, distance: from.finish.distance},
                finish: {time: null, distance: null}
            }
        }

        // create split for device
        let deviceLiveSessionForNextSplit = new DeviceLiveSessionSplit(liveSessionId, userId, deviceSplit.splitId
            , to.start.time, to.isRecovery, to.position
            , to.start.distance, Math.round(to.start.distance)
            , to.isDistanceBased ? IntervalType.DISTANCE : IntervalType.TIME);
        deviceLiveSessionForNextSplit.id = Random.id();

        // Check if session split already exists - if not, create it
        split = new LiveSessionSplitBuffer(liveSessionId, to.start.time, to.isRecovery, to.position
            , to.isDistanceBased ? IntervalType.DISTANCE : IntervalType.TIME);
        try {
            split.devices = [deviceLiveSessionForNextSplit];
            split.insert();
            logger.debug(`created buffer upon request from ${userId}`);
        } catch(excp) {
            if (excp.err !== undefined && (excp.err.code === 11000 || excp.err.code === 3 || excp.err.code === 84)) {
                logger.debug(`Buffer already created when ${userId} completed it's split`);
                split = await LiveSessionSplitBuffer.appendDevice(liveSessionId, to.position, deviceLiveSessionForNextSplit);
            } else {
                logger.error(`Unhandled exception when creating LiveSessionSplitBuffer`);
                console.log('[logging Unhandled exception] ----------------------------------------');
                console.log(excp);
                console.log('[Finished logging Unhandled exception] -------------------------------');
            }
        }

        // if all other devices have finished their running splits, finish session split and start next one
        if (Object.keys(liveSession.devices).length === split.devices.length) {
            logger.debug(`${userId} - ${liveSession.split}\tAll devices finished - recording split finished`);

            // close live session running split
            LiveSessionSplit.finishSplitByNumber(liveSessionId, from.position, from.finish.time);

            if (!finished) {
                // create new liveSessionSplit with running devices
                split.populateFinalCollections();

                // increment split number
                LiveSession.incrementSplit(liveSessionId);
            }

            // generate summary for split (in case it's no recovery)
            if (from.isRecovery === false) {
                await LiveUtils.generatePartials(liveSession, LiveSessionSplit.findLastNonRecoverySplit(liveSessionId));
            }
        } else {
            logger.debug(`${userId} Buffer not closed - ${Object.keys(liveSession.devices).length} != ${split.devices.length}`);
        }

    },

    removeDeviceFromSession(sessionId, deviceIds) {
        const liveSession = LiveSession.find(sessionId);
        if (!liveSession) {
            return 0;
        }

        let devices = liveSession.devices;
        for (let id of deviceIds) {
            devices.splice(devices.indexOf(id), 1);
        }

        LiveSession.updateDevices(sessionId, devices);

        LiveDevice.removeDevicesFromSession(deviceIds);

        let now = Date.now();
        for (let device of deviceIds) {
            Commands.insert({
                command: LiveDeviceCommands.FINISH_SESSION,
                createdAt: now,
                device: device,
                payload: null,
                synced: false
            });
        }
    },

    updateLiveSessionNotes(sessionId, notes) {
        const liveSession = LiveSession.find(sessionId);
        if (!liveSession) {
            return 0;
        }

        LiveSession.updateNotes(sessionId, notes);
    },

    async debugScheduledSessions() {
        if (1 === 1) {
            return;
        }
        logger.debug('debugScheduledSessions!!! Should not run in production');
        // verificar - sumário faz 100 metros, seguidos de 97!!
//        let deviceSplit = DeviceLiveSessionSplit.find("rg4S3eFMy5q3QfHyX");
        let deviceSplit = DeviceLiveSessionSplit.find("YdB5cgkLNQqxQ3ZbT");
        let liveSession = LiveSession.find(deviceSplit.sessionId);
        let liveSessionSplit = LiveSessionSplit.find(deviceSplit.splitId);
        let deviceId = deviceSplit.device;

        let metrics = await LiveUtils.fetchMetricsForSplit(liveSession, deviceId, deviceSplit);

        let steps = LiveUtils.collapseMetrics(metrics, deviceSplit);
        for (/**@type DistanceStep */ let step of steps) {
            console.log(step.duration, step.distance);
        }

        console.log(LiveUtils.generatePartialsForAthlete(liveSession, liveSessionSplit, deviceSplit, deviceId, metrics));
    },

    listCoachDevices() {
        let coach = Coach.find(this.userId);
        let devices = LiveDevice.findDevices(coach.athleteIds());
        return devices.map(function (d) {
            return d.toJson()
        });
    },

    async addDeviceToSession(deviceId, liveSessionId) {
        console.log('adding athlete to session!!', deviceId);

        LiveSession.appendDevice(liveSessionId, deviceId);
        await LiveDevice.addDevicesToLiveSession([deviceId], liveSessionId);

        const liveSession = LiveSession.find(liveSessionId);
        let splits = [];
        if (liveSession.expression) {
            let expr = new Expression(liveSession.expression);
            splits = expr.flatten();


        }

        await CommandManager.create(LiveDeviceCommands.APPEND_TO_SESSION, [deviceId], liveSessionId, function (device) {
            return {
                expression: liveSession.expression,
                splits: splits,
                rawStartedAt: liveSession.startedAt,
                startedAt: LiveUtils.serverToDeviceTime(liveSession.startedAt, null, device),
                sessionId: liveSessionId
            }
        }, false).catch(function (error) {
            logger.error(error);
        });
    }

});

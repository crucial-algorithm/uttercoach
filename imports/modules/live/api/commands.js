import {Commands} from './collections';
import {logger} from "../../../utils/logger";

export default class CommandManager {

    static async create(command, devices, sessionId, payload, waitForFeedback = false) {

        return new Promise(function (resolve, reject) {
            const now = Date.now();

            // coach command
            let commandId = Commands.insert({
                command: command,
                createdAt: now,
                finished: false,
                devices: devices,
                sessionId: sessionId
            });

            // commands to be consumed by devices
            let commands = [];
            for (let device of devices) {
                commands.push(Commands.insert({
                    command: command,
                    createdAt: now,
                    device: device,
                    payload: payload(device),
                    synced: false,
                    parent: commandId,
                    canceled: false,
                    sessionId: sessionId
                }));
            }

            if (waitForFeedback === false) {
                resolve();
                return;
            }

            let retries = 1;
            let interval = Meteor.setInterval(async function () {
                if (!Commands.findOne({_id: {$in: commands}, synced: false})) {
                    Meteor.clearInterval(interval);
                    console.log('after finishing command and before ack');
                    resolve();
                    console.log('after finishing command and after ack');
                }

                if (retries >= 5) {
                    Meteor.clearInterval(interval);
                    await CommandManager.cancel(commandId);
                    reject(new Error('Failed to get all devices to start'));
                }

                retries++;
            }, 1000);
        });
    }

    static async cancel(commandId) {
        return new Promise((resolve, reject) => {
            Commands.update({
                _$or: [{id: commandId}, {
                    parent: commandId,
                    synced: false
                }]
            }, {$set: {canceled: true}}, {multi: true}, function (err, updated) {
                if (err) logger.error(`Couldn't cancel promise due to error ${err}`);
                resolve(err, updated);
            });
        })
    }
}
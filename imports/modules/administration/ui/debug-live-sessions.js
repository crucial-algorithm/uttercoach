import './debug-live-sessions.html';
import './debug-live-sessions.scss';
import {DeviceData, LiveDevice, LiveDeviceData} from "../../live/api/collections";
import {PlatformLog} from "../api/collections";
import {Coach} from "../../coaches/api/collections";
import {Athlete} from "../../athletes/api/collections";

const devicesDependency = new Tracker.Dependency();
let athleteIds = [], lastDeviceMetric = {}, deviceMetricsMeta = {}, deviceStatus = {};

Template.debugLiveSession.onRendered(function () {

    const $select = $('select[name="coach"]');
    $select.on('change', function (e) {

        const id = $select.val();
        if (!id) {
            return;
        }

        athleteIds = [];

        Meteor.subscribe('debug.live.sessions.athletes', id, {
            onReady: function () {
                const coach = Coach.find(id);
                athleteIds = coach.athleteIds();

                Tracker.autorun(() => {
                    const devices = LiveDevice.findDevices(athleteIds);
                    for (let device of devices) {
                        deviceStatus[device.id] = device;
                    }
                    devicesDependency.changed();
                });

                devicesDependency.changed();
            }
        });

        Tracker.autorun(() => {
            let records = [];
            if (athleteIds.length === 0 || Object.keys(deviceMetricsMeta).length === 0) {
                records = LiveDeviceData.find().fetch();
            } else {
                let filter = {$or:[]};
                for (let athlete of athleteIds) {
                    if (!deviceMetricsMeta[athlete]) {
                        filter.$or.push({dv: athlete});
                    } else {

                        filter.$or.push({dv: athlete, ca: {$gt: deviceMetricsMeta[athlete].duration}})
                    }
                }
                records = LiveDeviceData.find(filter).fetch();
            }

            for (let i = 0, l = records.length; i < l; i++) {
                let metric = new DeviceData(records[i]);
                if (!deviceMetricsMeta[metric.getDevice()] || metric.getDuration() > deviceMetricsMeta[metric.getDevice()].duration) {
                    lastDeviceMetric[metric.getDevice()] = metric;
                    deviceMetricsMeta[metric.getDevice()] =  {duration: metric.getDuration(), updatedAt: Date.now()};
                }
            }

            devicesDependency.changed();
        });
    });


    $('.debug-live-sessions-devices').on('click', '.debug-live-sessions-device', function (e) {
        const $device = $(this), id = $device.data('id');
        const $history = $(".debug-live-sessions-device-history");
        const $reset = $(".debug-live-sessions-device-hard-reset");
        Meteor.subscribe('debug.live.sessions.athlete.commands.log', id, {
            onReady: function () {
                Tracker.autorun(() => {
                    let latestLogs = PlatformLog.findLatestForUser(id).reverse();
                    let print = [];
                    for (let /**@type PlatformLog */ log of latestLogs) {
                        print.push(`<p>${moment(log.timestamp).format("mm'ss")} | ${log.action}</p>`)
                    }
                    $history.empty();
                    $history.html(print.join(''));
                    $history.show();
                });
            }
        });

        $reset.off('click').on('click', function () {
            Meteor.call('pushHardResetToDevice', id);
        });

        $reset.show();
    });

});


Template.debugLiveSession.helpers({
    coach: function () {
        return Coach.all();
    },

    devices: function () {
        devicesDependency.depend();

        const result = [];
        for (let athleteId of athleteIds) {
            const deviceMetric = lastDeviceMetric[athleteId] || null;
            let info = '-';
            if (deviceMetric) {
                info = `spm: ${deviceMetric.cadence} | speed: ${deviceMetric.speed} | ln: ${deviceMetric.displacement} | ${moment(deviceMetric.getCreatedAt()).format("mm'ss")}`;
            }

            const /**@type LiveDevice */ dvStatus = deviceStatus[athleteId] || null;
            let extra = '-';
            if (dvStatus) {
                extra = `${dvStatus.activeSessionId === null ? 'No Session': dvStatus.activeSessionId} | Last Seen At: ${moment(dvStatus.lastSeenAt).format("mm'ss")}`;
            }
            result.push({
                id: athleteId,
                info: info,
                extra: extra
            })
        }

        return result;
    }
});
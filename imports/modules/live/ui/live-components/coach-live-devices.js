'use strict';
import {LiveDevicesStatus} from "../../api/liveDevicesConstants";
import {Utils} from "../../../../utils/utils";
import numbro from 'numbro';
import Hammer from 'hammerjs';
import {DistanceHandler} from "../../api/utils";
import {DeviceData, DeviceLiveSessionSplit} from "../../api/collections";
import LiveSessionState from "./coach-live-state";
import {Athlete, DEFAULT_HR_RANGE} from "../../../athletes/api/collections";


class DeviceListView {
    constructor($container, state) {
        this.$container = $container;
        this.devices = {};
        /**@type LiveSessionState */
        this.state = state;
        this.awakeDevice = {};
        this.init();
    }

    init() {
        let devices = this.state.getDevices();
        let split = this.state.getCurrentSplit();
        let splitDevices = split ? split.devices : {};
        let inSplit = split && split.isRecovery === false;
        for (let device of devices) {
            this.createInstance(device, inSplit, inSplit ? splitDevices[device.id] : 0
                , this.state.getDeviceRestingHr(device.id)
                , this.state.getDeviceMaxHr(device.id)
                , this.state.getServerOffset()
            );
        }
    }

    updateSplits() {
        let devices = this.state.getDevices();

        if (this.state.areSplitsFinished()) {
            // TODO: handle
        }
        let split = this.state.getCurrentSplit();
        if (!split) return;

        let splitDevices = split.devices;

        for (let device of devices) {
            this.devices[device.id].setInSplit(split.isRecovery === false);
            this.devices[device.id].setSplitStartDistance(splitDevices[device.id]);
        }
    }

    setMetrics(metrics) {

        for (let metric of metrics) {
            let id;
            /** @type Device */
            let device = this.devices[(id = metric.getDevice())];

            if (device) {
                device.record(metric, this.state.timer.getFullDuration());
                continue;
            }

            if (!this.awakeDevice[id]) {
                this.awakeDevice[id] = Utils.throttle(() => Meteor.call('deviceSpotted', id), 5000);
            }
            this.awakeDevice[id]();
        }
    }

    setOffline(deviceId) {
        /** @type Device */
        let device = this.devices[deviceId];

        if (device) device.setOffline();
    }

    setOnline(deviceId) {
        /** @type Device */
        let device = this.devices[deviceId];

        if (device) device.setOnline();
    }

    isUnknownDevice(id) {
        return this.devices[id] === undefined;
    }

    /**
     *
     * @param {LiveDevice} device
     * @param inSplit
     * @param startDistance
     * @param restingHr
     * @param maxHr
     * @param clockDifference   Difference, in milis, between server and coach
     * @returns {*}
     */
    createInstance(device, inSplit, startDistance, restingHr, maxHr, clockDifference) {

        this.devices[device.id] = new Device($('<div/>').appendTo(this.$container)
            , device.id, device.status, this.state, clockDifference);

        if (inSplit === true) {
            this.devices[device.id].setInSplit(true);
            this.devices[device.id].setSplitStartDistance(startDistance);
        }

        if (maxHr) {
            this.devices[device.id].setMaxHr(maxHr);
        }

        if (restingHr) {
            this.devices[device.id].setRestingHr(restingHr);
        }

        return this.devices[device.id];
    }

    destroy() {
        for (let id of Object.keys(this.devices)) {
            this.devices[id].destroy();
        }
        this.devices = {};
    }

    getDeviceCurrentDisplayedDistance(id) {
        if (this.devices[id] === undefined) return 0;
        return this.devices[id].getDisplayedDistance()
    }

    calculateDeviceEstimatedDistance(id, timestamp) {
        if (this.devices[id] === undefined) return 0;
        let estimatedDistance = this.devices[id].calculateEstimatedDistance(timestamp);
        return estimatedDistance === null ? 0 : estimatedDistance;
    }

    calculateDeviceRelativeDistance(id, timestamp) {
        let distance = this.calculateDeviceEstimatedDistance(id, timestamp);
        return distance - this.devices[id].splitStartDistance;
    }


    /**
     * returns {number}
     */
    countDevices() {
        return this.state.getDevices().length;
    }

    countDevicesInRecovery() {
        let total = 0;
        for (let id of Object.keys(this.devices)) {
            total += this.devices[id].inRecovery() ? 1 : 0;
        }
        return total;
    }

    /**
     *
     * @returns {Device}
     */
    getFastestRunningDevice() {
        let fastest = null, max = -1, now = Date.now();
        for (let id of Object.keys(this.devices)) {
            /**@type Device */
            let device = this.devices[id];
            if (device.inRecovery()) {
                continue;
            }
            let distance = device.calculateEstimatedDistance(now);
            if (distance > max) {
                max = distance;
                fastest = device;
            }
        }

        return fastest;
    }

    getRunningDeviceIds() {
        let devices = [];
        for (let id of Object.keys(this.devices)) {
            if (!this.devices[id].inRecovery()) {
                devices.push(id);
            }
        }
        return devices;
    }

    updateDeviceSplits() {
        const splits = this.state.getDeviceSplits();
        let devices = {};
        for (let i = splits.length - 1; i >= 0; i--) {
            if (!devices[splits[i].device])
                devices[splits[i].device] = splits[i];

        }

        for (let id of Object.keys(devices)) {
            /**@type DeviceLiveSessionSplit */
            let deviceSplit = devices[id];
            this.devices[id].setInSplit(deviceSplit.finishedAt === null && deviceSplit.isRecovery === false)
        }
    }

    removeDevice(deviceId) {

        /**@type Device */
        const device = this.devices[deviceId] || null;
        if (device) {
            device.destroy();
            delete this.devices[deviceId];
        }
    }

}


class Device {
    /**
     *
     * @param $container
     * @param id
     * @param status
     * @param {LiveSessionState} state
     * @param offset
     */
    constructor($container, id, status, state, offset) {
        this.duration = null;
        this.spm = null;
        this.speed = null;
        this.distance = null;
        this.standardizedDistance = null;
        this.efficiency = null;
        this.heartRate = 0;
        this.timestamp = 0;
        this.latestUpdate = null;
        this.distanceHandler = new DistanceHandler(offset);
        this.id = id;
        this.state = state;
        this.status = status;
        this.group = null;
        this.startedAt = null;
        this.restingHeartRate = DEFAULT_HR_RANGE.RESTING;
        this.maxHeartRate = DEFAULT_HR_RANGE.MAX;
        this.$target = $container;
        this.splitStartDistance = 0;
        this.inSplit = false;
        this.zone = 0;
        /**@Athlete */
        this.athlete = Athlete.find(id);
        this.id = id;
        this.offline = false;

        this.initDom();

        this.heartRateColorScheme = Utils.getGradientColorScheme()[this.athlete.heartRateZones.length].slice(0).reverse();

        let self = this;
        state.registerForTimerUpdates(function () {
            self.refresh(self.getLatestMetrics())
        });
    }

    initDom() {
        Blaze.renderWithData(Template.device, {
            status: LiveDevicesStatus.RUNNING.toLowerCase(),
            _id: this.id,
            data: {
                spm: this.spm,
                speed: this.speed,
                efficiency: this.efficiency,
                distance: this.distance
            }
        }, this.$target[0]);

        this.$device = this.$target.find('[data-id="' + this.id + '"]');
//        this.$main = this.$device.find('.coach-live-session-device-layout-others-main');
        this.$spm = this.$device.find('[data-selector="spm"]');
        this.$speed = this.$device.find('[data-selector="speed"]');
        this.$distance = this.$device.find('[data-selector="distance"]');
        this.$efficiency = this.$device.find('[data-selector="efficiency"]');
        this.$heartRate = this.$device.find('[data-selector="hr"]');
        this.$heartRateZone = this.$device.find('.coach-live-session-device-layout-hr');
        this.$tap = this.$device.find('.coach-live-session-device-layout-tap-4-split');


        Device.update(this.$spm, this.spm);
        Device.update(this.$speed, this.speed);
        Device.update(this.$distance, this.distance);
        Device.update(this.$efficiency, this.efficiency);

        let hammer = new Hammer(this.$device[0]);
        let self = this;
        hammer.on('tap', function (e) {
            if (self.inSplit !== true) return;

            throw 'Code won\'t work because partials are using timestamp instead of duration';

            self.$tap.show().fadeOut('slow');

            let split = self.state.getCurrentSplit();
            if (!split) return;
            Meteor.call('createPartialInSplit', self.state.getLiveSessionId(), self.id, split.id
                , self.timestamp
                , self.standardizedDistance
                , function (err, response) {
                    console.log(err, response);
                });
        });
    }

    static update($dom, value) {
        $dom.text(value === null ? '-' : value);
    }

    /**
     *
     * @param {DeviceData} metrics
     * @param {number} sessionDuration
     */
    record(metrics, sessionDuration) {
        this.latestUpdate = {time: Date.now(), metrics: metrics};
        this.distanceHandler
            .record(metrics.getDistance() * 1000
                , metrics.getSpeed()
                /* use timestamp instead of location timestamp because distance is automatically adjusted to timestamp */
                , metrics.getDuration()
                , metrics.isLocationChanged()
                , this.splitStartDistance
            )
    }

    getLatestMetrics() {
        if (this.latestUpdate === null) return null;

        return (Date.now() - this.latestUpdate.time > 5000) ? null : this.latestUpdate.metrics;
    }

    /**
     *
     * @param {DeviceData} metrics
     */
    refresh(metrics) {
        if (metrics === null) {
            this.reset();
            return;
        }

        if (!this.isChanged(metrics)) {
            return;
        }

        if (metrics.getCadence() !== this.spm) {
            Device.update(this.$spm, metrics.getCadence());
            this.spm = metrics.getCadence();
        }

        if (metrics.getSpeed() !== this.speed) {
            Device.update(this.$speed, numbro(metrics.getSpeed()).format("00.00"));
            this.speed = metrics.getSpeed();
        }

        if (metrics.getDistance() !== this.distance) {
            this.refreshDistance(metrics);
        }

        if (metrics.getDisplacement() !== this.efficiency) {
            Device.update(this.$efficiency, numbro(metrics.getDisplacement()).format('00.00'));
            this.efficiency = metrics.getDisplacement();
        }

        if (metrics.getHeartRate() !== this.heartRate) {
            this.refreshHeartRate(metrics);
        }

        this.timestamp = metrics.getDuration();

    }

    /**
     *
     * @param {DeviceData} metrics
     */
    refreshDistance(metrics) {
        if (this.inInterval() && this.splitStartDistance) {
            let duration = this.state.getFullSessionDuration();
            this.standardizedDistance = DistanceHandler.standardizeDistance(this.distanceHandler.calculate(true, duration) - this.splitStartDistance);
        } else {
            this.standardizedDistance = this.distanceHandler.calculate(false, this.state.getFullSessionDuration());
        }

        this.distance = metrics.getDistance();
        let distance = this.standardizedDistance;

        if (this.state.isSessionInADistanceBasedSplit()) {
            distance = this.state.getCurrentSplitDistanceInKm() * 1000 - this.standardizedDistance;
            if (distance < 0) distance = 0;
        }
        Device.update(this.$distance, distance);
    }

    /**
     * Get current displayed distance, without adjusting it with current timestamp
     * @returns {number}
     */
    getDisplayedDistance() {
        return this.standardizedDistance;
    }

    /**
     *
     * @param timestamp in local time
     * @returns {*}
     */
    calculateEstimatedDistance(timestamp) {
        return this.distanceHandler.calculateForTimestamp(timestamp);
    }

    refreshHeartRate(metrics) {
        Device.update(this.$heartRate, metrics.getHeartRate());
        if (metrics.getHeartRate() === 0) {
            this.heartRate = metrics.getHeartRate();
            return this.$heartRateZone.css("background-color", "");
        }
        let currentZone = this.calculateHeartZone(metrics.getHeartRate());
        if (currentZone !== this.zone) {
            this.$heartRateZone.css("background-color", this.heartRateColorScheme[currentZone]);
            this.zone = currentZone;
        }
        this.heartRate = metrics.getHeartRate();
    }

    reset() {
        Device.update(this.$spm, 0);
        Device.update(this.$speed, 0);
        Device.update(this.$distance, 0);
        Device.update(this.$efficiency, 0);
        Device.update(this.$heartRate, 0);
        this.$heartRateZone.css("background-color", "");
    }

    setInSplit(value) {
        if (!this.inSplit && value) {
            this.onSplitStarted();
        }
        this.inSplit = value;
    }

    inRecovery() {
        return this.inSplit === false;
    }

    inInterval() {
        let split = this.state.getCurrentSplit();
        if (split === null) {
            return false;
        }

        return split.isRecovery === false && this.inSplit === true
    }

    setSplitStartDistance(value) {
        this.splitStartDistance = value;
    }

    destroy() {
        clearInterval(this.updateInterval);
        this.$device.remove();
    }

    setRestingHr(value) {
        this.restingHeartRate = value;
    }

    setMaxHr (value) {
        this.maxHeartRate = value;
    }

    onSplitStarted() {
        Device.update(this.$distance, numbro(0).format('0,0'));
    }

    calculateHeartZone(hr) {
        let ratio = Utils.heartRateReserveCalculation(this.restingHeartRate, this.maxHeartRate, hr), position = 0;
        for (let zone of this.athlete.heartRateZones) {
            if (ratio >= zone.start && ratio <= zone.end) {
                return position
            }
            position++;
        }
        return 0;
    }

    hashCode() {
        return [this.speed, this.distance, this.spm, this.efficiency, this.heartRate].join('-');
    }

    /**
     *
     * @param {DeviceData} metrics
     */
    isChanged (metrics) {
        return metrics.hashCode() !== this.hashCode();
    }

    getDistance() {
        return this.distance;
    }

    getId() {
        return this.id;
    }

    getTimestamp() {
        return this.timestamp
    }

    getInitials() {
        return this.athlete.initials()
    }

    setOffline() {
        if (this.offline === true) return;
        this.$device.addClass('offline');
        this.offline = true;
    }

    setOnline() {
        if (this.offline === false) return;
        this.$device.removeClass('offline');
        this.offline = false;
    }

}

export {
    DeviceListView
}

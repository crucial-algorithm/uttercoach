import {IntervalType, LiveSessionType} from "../../api/liveDevicesConstants";
import {DeviceListView} from "./coach-live-devices";
import LiveTimer from "./coach-live-timer";
import LiveSessionState from "./coach-live-state";
import {Expression, Interval} from "../../../../expressions/expression";
import {ExpressionUtils} from "../../../../expressions/utils";
import i18n from "../../../../utils/i18n";


const STOP_BUTTON_TEMPLATE = '<div class="button live-sessions-full-button live-sessions-full-button-interval stop" role="button">' + i18n.translate("coach_live_session_action_stop_interval") + '<div>' + i18n.translate("coach_live_session_action_stop_interval_secondary") + '</div></div>';

const STOP_BUTTON_SLIDER_TEMPLATE = [''
    , '<div class="live-session-slide-button">'
    , '    <div class="button live-sessions-full-button live-sessions-full-button-interval stop" role="button" data-action="stop"><label>' + i18n.translate("coach_live_session_action_stop_all_intervals") + '</label><div>' + i18n.translate("coach_live_session_action_stop_all_intervals_secondary") + '</div></div>'
    , '    <div class="button live-sessions-full-button live-sessions-full-button-interval stop" role="button" data-action="stop-device"><label>' + i18n.translate("coach_live_session_action_stop_interval") + ' <span data-selector="device">&nbsp;</span></label><div>' + i18n.translate("coach_live_session_action_stop_interval_secondary") + '</div></div>'
    , '</div>'
].join('');

const ACTIONS = {
    PUSH_FINISH_WARM_UP: "pushFinishWarmUpToLiveDevices",
    PUSH_START_SESSION: "pushStartSessionToLiveDevices",
    PUSH_START_SPLIT: "pushStartSplitToLiveDevices",
    PUSH_NEXT_SPLIT: "pushNextSplitToLiveDevices",
    PUSH_STOP_SPLIT_IN_DEVICE: "pushStopSplitInDevice",
    PUSH_STOP_SPLIT: "pushStopSplitToLiveDevices",
};

class ActionBar {
    /**
     *
     * @param {LiveSessionState} state
     * @param {DeviceListView}  deviceListView
     * @param {LiveTimer}       timer
     */
    constructor(state, deviceListView, timer) {
        this.state = state;
        this.deviceListView = deviceListView;
        this.timer = timer;

        this.$footerContainer = $('#footer');
        this.$footer = this.$footerContainer.find('[data-selector="menu"]');
        this.$mainContent = $('#page');
        this.$devices = $('.coach-live-session-devices');
        this.$startScheduled = $('<div class="button live-sessions-full-button live-sessions-full-button-interval" role="button">' + i18n.translate("coach_live_session_action_start_intervals") + '<div data-selector="what">' + i18n.translate("coach_live_session_action_start_intervals_secondary") +'</div></div>');
        this.$nextSplit = $('<div class="button live-sessions-full-button live-sessions-full-button-interval" role="button">' + i18n.translate("coach_live_session_action_start_next_interval") + '<div data-selector="what">' + i18n.translate("coach_live_session_action_start_next_interval_secondary") + '</div></div>');
        this.$startFree = $('<div class="button live-sessions-half-button">Free</div>');
        this.$start = $('<div class="button live-sessions-full-button live-sessions-full-button-interval" role="button">' + i18n.translate("coach_live_session_action_start_interval") + '<div>' + i18n.translate("coach_live_session_action_start_interval_secondary") + '</div></div>');
        this.$pause = $('<div class="button live-sessions-full-button live-sessions-full-button-interval" role="button">' + i18n.translate("coach_live_session_action_pause") +'</div>');
        if (deviceListView.countDevices() > 1) {
            this.$stop = $(STOP_BUTTON_SLIDER_TEMPLATE);
        } else {
            this.$stop = $(STOP_BUTTON_TEMPLATE);
        }

        this.footerContainerHeight = this.$footerContainer.height();
        this.devicesHeight = this.$devices.height();
        this.mainContentHeight = this.$mainContent.height();
        this.footerVisible = true;

        this.STATUS = {
            FREE_RECOVERY: 'FREE_RECOVERY',
            FREE_INTERVAL: 'FREE_INTERVAL',
            TIME_BASED_WARM_UP: 'TIME_BASED_WARM_UP',
            TIME_BASED_INTERVALS: 'TIME_BASED_INTERVALS',

            HYBRID_MOVE_TO_NEXT_SPLIT: 'HYBRID_MOVE_TO_NEXT_SPLIT',
            HYBRID_RUNNING: 'HYBRID_RUNNING',
            HYBRID_WARM_UP: 'HYBRID_WARM_UP',

            SESSION_FINISHED: 'SESSION_FINISHED',

            SESSION_DISPLAY: 'SESSION_DISPLAY',


            HYBRID_START_DISTANCE_INTERVAL: 'START_DISTANCE_INTERVAL',
            HYBRID_STOP_DISTANCE_INTERVAL: 'STOP_DISTANCE_INTERVAL',
            HYBRID_START_TIMED_INTERVALS: 'START_TIMED_INTERVALS'

        };

        this.sessionPlannedIntervals = null;
        if (this.state.getSessionExpression()) {
            let expression = new Expression(this.state.getSessionExpression());
            this.sessionPlannedIntervals = ExpressionUtils.expand(expression);
        }

        this.lastActionCalled = null;
    }


    refresh() {
        this.render(this.calculateStatus());
    }

    splitChanged() {
        this.refresh();
    }

    calculateStatus() {
        if (this.state.getLiveSession().isFinished()) {
            return this.STATUS.SESSION_DISPLAY;
        }

        if (!this.state.inLiveSession()) {
            return null;
        }
        let liveSession = this.state.getLiveSession();

        if (liveSession.type === LiveSessionType.FREE) {
            return this.calcStatusFreeSession(liveSession);
        }

        if (liveSession.type === LiveSessionType.TIME) {
            return this.calcStatusTimedSession(liveSession);
        }

        if (liveSession.type === LiveSessionType.DISTANCE) {
            return this.calculateStatusHybridSession(liveSession);
        }

        return null;
    }

    /**
     *
     * @returns {Interval}
     */
    calcNextWorkingInterval() {
        let liveSession = this.state.getLiveSession();
        if (!liveSession) {
            return null;
        }

        for (let i = liveSession.split + 1, l = this.sessionPlannedIntervals.length; i < l; i++) {
            /** @type Interval */
            let interval = this.sessionPlannedIntervals[i];
            if (!interval.isRecovery()) {
                return interval;
            }
        }
        return null;
    }

    calcStatusFreeSession() {
        if (this.state.getSplits().length > 0 && this.state.getSplits().length % 2 === 1)
            return this.STATUS.FREE_INTERVAL;

        return this.STATUS.FREE_RECOVERY;
    }

    /**
     *
     * @param {LiveSession} liveSession
     * @returns {string}
     */
    calcStatusTimedSession(liveSession) {
        if (this.state.getSplits().length > 0)
            return this.STATUS.TIME_BASED_INTERVALS;

        return this.STATUS.TIME_BASED_WARM_UP;
    }

    /**
     * Sessions that are distance based (but prepared to handle also distance + timed intervals)
     * @param {LiveSession} liveSession
     */
    calculateStatusHybridSession(liveSession) {
        if (this.sessionPlannedIntervals === null) {
            let expression = new Expression(liveSession.expression);
            this.sessionPlannedIntervals = ExpressionUtils.expand(expression);
        }

        if (!liveSession.finishedWarmUpAt) {
            return this.STATUS.HYBRID_WARM_UP;
        }

        let currentSplit = this.state.getCurrentSplit();
        if (!currentSplit) {
            return this.STATUS.SESSION_FINISHED;
        }

        // during distance based interval
        let currentInterval = this.sessionPlannedIntervals[currentSplit.number];
        if (currentInterval.isBasedInDistance()) {
            return this.STATUS.HYBRID_MOVE_TO_NEXT_SPLIT;
        }

        let lastWorkingSplit = this.state.getLastWorkingSplit();
        if (lastWorkingSplit === null) {
            return this.STATUS.HYBRID_RUNNING;
        }



        let interval = this.sessionPlannedIntervals[lastWorkingSplit.number];
        if (interval.isBasedInDistance() && lastWorkingSplit.number < this.sessionPlannedIntervals.length - 1) {
            return this.STATUS.HYBRID_MOVE_TO_NEXT_SPLIT;
        }

        return this.STATUS.HYBRID_RUNNING;
    }

    hideFooter() {
        if (!this.footerVisible) {
            return;
        }
        this.$footerContainer.hide();
        this.$devices.height(this.devicesHeight + this.footerContainerHeight);
        this.$mainContent.height(this.mainContentHeight + this.footerContainerHeight);
        this.footerVisible = false;
    }

    showFooter() {
        if (this.footerVisible) {
            return;
        }
        this.$devices.height(this.devicesHeight);
        this.$mainContent.height(this.mainContentHeight);
        this.$footerContainer.show();
        this.footerVisible = true;
    }

    render(status) {
        this.$footer.empty();

        if (status === this.STATUS.SESSION_DISPLAY) return;

        this.$footer.addClass('disabled');
        this.showFooter();
        clearInterval(this.refreshFastestDeviceIntervalId);


        if (this.STATUS.TIME_BASED_WARM_UP === status) {
            this.$footer.append(this.$startScheduled);
        }

        if (this.STATUS.TIME_BASED_INTERVALS === status) {
            this.hideFooter();
        }

        if (this.STATUS.FREE_RECOVERY === status) {
            this.$footer.append(this.$start);
        }

        if (this.STATUS.FREE_INTERVAL === status) {

            if (this.deviceListView.countDevices() > 1) {
                this.$stop = $(STOP_BUTTON_SLIDER_TEMPLATE);
                let $fastestDevice =this.$stop.find('[data-selector="device"]');
                let device = this.deviceListView.getFastestRunningDevice();
                if (device)
                    $fastestDevice.html(device.getInitials());
                this.$footer.append(this.$stop);
                let $stop = this.$stop, deviceListView = this.deviceListView;
                setTimeout(function () {
                    $stop.slick({
                        dots: false,
                        infinite: false,
                        arrows: true,
                        mobileFirst: true
                    })
                }, 0);

                this.refreshFastestDeviceIntervalId = setInterval(function () {
                    let device = deviceListView.getFastestRunningDevice();
                    if (!device) return;
                    $fastestDevice.html(device.getInitials());
                }, 500);

            } else {
                this.$stop = $(STOP_BUTTON_TEMPLATE);
                this.$footer.append(this.$stop);
            }
        }

        if (this.STATUS.HYBRID_WARM_UP === status) {
            this.$footer.append(this.$startScheduled);
        }

        if (this.STATUS.HYBRID_MOVE_TO_NEXT_SPLIT === status) {
            let nextInterval = this.calcNextWorkingInterval();
            if (nextInterval !== null) {
                this.$nextSplit.find('[data-selector="what"]').html(`${nextInterval.getDuration()} ${nextInterval.getUnit()}`);
                let nbrOfDevices = this.deviceListView.countDevices();
                let nbrOfDevicesInRecovery = this.deviceListView.countDevicesInRecovery();
                if (nbrOfDevices === nbrOfDevicesInRecovery) {
                    this.$footer.append(this.$nextSplit);
                } else {
                    this.hideFooter();
                }
            } else {
                this.hideFooter();
            }
        }

        if (this.STATUS.HYBRID_RUNNING === status) {
            this.hideFooter();
        }

        this.$startScheduled.off('click').one('click', this.startScheduledHandler.bind(this));
        this.$startFree.off('click').one('click', this.startFreeHandler.bind(this));
        this.$nextSplit.off('click').one('click', this.nextSplitHandler.bind(this));
        this.$start.off('click').one('click', this.startHandler.bind(this));
        this.$pause.off('click').one('click', this.pauseHandler.bind(this));
        this.$stop.off('click').on('click', this.stopHandler.bind(this));

    }

    startScheduledHandler(e) {

        if (this.lastActionCalled === ACTIONS.PUSH_FINISH_WARM_UP) {
            console.log('duplicate call to ', this.lastActionCalled);
            return;
        }

        let devices = [], list = this.state.getDeviceList(), startAt, type = null;

        if (this.sessionPlannedIntervals[0].isBasedInDistance()) {
            startAt = this.timer.getFullDuration();
            type = IntervalType.DISTANCE;
        } else {
            startAt = this.timer.getDurationAtNextSecondChange();
            type = IntervalType.TIME;

        }

        for (let deviceId of list) {
            devices.push({
                deviceId: deviceId,
                distance: this.deviceListView.calculateDeviceEstimatedDistance(deviceId, startAt),
                displayedDistance: this.deviceListView.getDeviceCurrentDisplayedDistance(deviceId)
            });
        }

        this.timer.startScheduledSession(startAt);
        let liveSession = this.state.getLiveSession();
        Meteor.call(ACTIONS.PUSH_FINISH_WARM_UP, liveSession._id
            , devices
            , startAt
            , type
            , function (err, response) {
                console.log(err, response);
            });
        this.lastActionCalled = ACTIONS.PUSH_FINISH_WARM_UP;
        console.log('... action: ', this.lastActionCalled);

        if (liveSession.type === LiveSessionType.TIME) {
            this.render(this.STATUS.TIME_BASED_INTERVALS);
        } else {
            this.render(this.STATUS.HYBRID_RUNNING);
        }
    }

    startFreeHandler(e) {
        Meteor.call(ACTIONS.PUSH_START_SESSION, null, this.state.getDeviceList(), Date.now()
            , function (err, response) {
                console.log(err, response);
            });
        this.lastActionCalled = ACTIONS.PUSH_START_SESSION;
        console.log('... action: ', this.lastActionCalled);
    }

    startHandler(e) {

        if (this.lastActionCalled === ACTIONS.PUSH_START_SPLIT) {
            console.log('duplicate call to ', this.lastActionCalled);
            return;
        }

        let devices = [], list = this.state.getDeviceList();

        let now = Date.now();

        for (let deviceId of list) {
            devices.push({
                deviceId: deviceId,
                distance: this.deviceListView.calculateDeviceEstimatedDistance(deviceId, this.timer.getFullDuration()),
                displayedDistance: this.deviceListView.getDeviceCurrentDisplayedDistance(deviceId)
            });
        }

        this.timer.startSplitImmediately(now + this.state.getServerOffset());
        Meteor.call(ACTIONS.PUSH_START_SPLIT, this.state.getLiveSession().id
            , devices
            , this.timer.getFullDuration()
            , function (err, response) {
                if (err) {
                    console.error(err, response);
                }
            });
        this.lastActionCalled = ACTIONS.PUSH_START_SPLIT;
        console.log('... action: ', this.lastActionCalled);
    }

    /**
     * Called by the coach in distance based sessions in order to move to the next interval
     *
     * @param e
     */
    nextSplitHandler(e) {
        let devices = [], list = this.state.getDeviceList();

        let now = Date.now();

        for (let deviceId of list) {
            devices.push({
                deviceId: deviceId,
                distance: this.deviceListView.calculateDeviceEstimatedDistance(deviceId, now),
                displayedDistance: this.deviceListView.getDeviceCurrentDisplayedDistance(deviceId)
            });
        }

        this.timer.startSplitImmediately(now + this.state.getServerOffset());
        Meteor.call(ACTIONS.PUSH_NEXT_SPLIT, this.state.getLiveSession()._id
            , devices
            , this.timer.getFullDuration()
            , function (err, response) {
                if (err) {
                    console.error(err, response);
                }
            });
        this.lastActionCalled = ACTIONS.PUSH_NEXT_SPLIT;
        console.log('... action:', this.lastActionCalled);
    }

    pauseHandler(e) {
    }

    stopHandler(e) {
        let $elem = $(e.target)
            , $button = $elem.closest('.live-sessions-full-button')
            , action = $button.data('action');

        let devices = [], now = Date.now(), duration = this.timer.getFullDuration();

        if (action === 'stop-device') {
            let device = this.deviceListView.getFastestRunningDevice();
            Meteor.call(ACTIONS.PUSH_STOP_SPLIT_IN_DEVICE, this.state.getLiveSession().id
                , device.getId()
                , this.deviceListView.calculateDeviceRelativeDistance(device.getId(), duration)
                , this.deviceListView.getDeviceCurrentDisplayedDistance(device.getId())
                , duration
                , function (err, response) {
                    console.log(err, response);
                });
            this.lastActionCalled = ACTIONS.PUSH_STOP_SPLIT_IN_DEVICE;
            console.log('... action:', this.lastActionCalled);

            device.setInSplit(false);
            if (this.deviceListView.countDevicesInRecovery() !== this.deviceListView.countDevices()) {
                return;
            }
        }

        if (this.lastActionCalled === ACTIONS.PUSH_STOP_SPLIT) {
            console.log('duplicate call to ', this.lastActionCalled);
            return;
        }

        clearInterval(this.refreshFastestDeviceIntervalId);

        let list = this.deviceListView.getRunningDeviceIds(), deviceList = this.state.getDeviceList();
        for (let deviceId of deviceList) {
            devices.push({
                deviceId: deviceId,
                distance: this.deviceListView.calculateDeviceRelativeDistance(deviceId, duration),
                displayedDistance: this.deviceListView.getDeviceCurrentDisplayedDistance(deviceId),
                recorded: now,
                alreadyStopped: list.indexOf(deviceId) < 0
            });
        }

        this.timer.stopSplitImmediately();
        Meteor.call(ACTIONS.PUSH_STOP_SPLIT, this.state.getLiveSession()._id
            , devices
            , duration
            , function (err, response) {
                if (err) {
                    console.error(err, response);
                }
            });
        this.lastActionCalled = ACTIONS.PUSH_STOP_SPLIT;
        console.log('... action: ', this.lastActionCalled);
    }

    destroy() {
        this.$footer.remove();
        clearInterval(this.refreshFastestDeviceIntervalId);
    }
}

export default ActionBar;

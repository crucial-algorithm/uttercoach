'use strict';

import './coach-live-session.html';
import './coach-live-session.scss';
import {DeviceListView} from "./live-components/coach-live-devices";
import {
    LiveDeviceData, LiveSession, LiveSessionSplits, DeviceData,
    DeviceLiveSessionSplit, LiveSessionSplit, Commands, LiveDevice
} from "../api/collections";
import LiveSessionState from "./live-components/coach-live-state";
import ActionBar from "./live-components/coach-live-actionbar";
import LiveTimer from "./live-components/coach-live-timer";
import {Meteor} from "meteor/meteor";
import {Coach} from "../../coaches/api/collections";
import i18n from "../../../utils/i18n";
import {LiveDevicesStatus} from "../api/liveDevicesConstants";
import {Athlete} from "../../athletes/api/collections";

let Users = new Meteor.Collection('sessionAthletes');

class App {
    /**
     *
     * @param {LiveSession} session
     * @param {LiveDevice[]} devices
     * @param users
     * @param {Coach} coach
     * @param {Athlete[]} athletes
     */
    constructor(session, devices, users, coach, athletes) {
        this.state = new LiveSessionState(session, devices, null, users, coach);
        this.rendered = false;
        this.destroyed = false;
        this.deviceMetrics = {};
        /**@type String[] */
        this.devices = [];
        this.deviceStatus = {};
        for (let device of devices) {
            this.deviceMetrics[device.id] = {duration: 0, updatedAt: session.startedAt};
            this.devices.push(device.id);
            this.deviceStatus[device.id] = null;
        }

        this.athletes = athletes;
        this.startAutorun();



        if (session.isFinished()) return;



        const self = this;
        self.interval = setInterval(function () {
            if (self.destroyed === true) return clearInterval(self.interval);

            try {
                const failed = self.verifyIfDeviceIsStillInSession();
                if (failed.length > 0) return;

                self.verifyIfDevicesAreStillAlive();

            } catch (e) {
                // intentionally left blank
            }

        }, 10000);
    }

    /**
     * Used at the beginning to verify the integrity of the session;
     * Used afterwards, to make sure that state of the devices as not changed
     *
     * @returns {Array}
     */
    verifyIfDeviceIsStillInSession() {
        const self = this;

        let failed = [], discarded = 0;
        for (let id of self.devices) {

            if (self.deviceStatus[id] === null) {
                failed.push(id);
                continue;
            }

            if (self.deviceStatus[id].discarded === true) {
                discarded++;
                continue;
            }

            if (self.deviceStatus[id].failed === true) {
                failed.push(id);
            }

        }

        if (failed.length === 0) {
            console.log('All devices running in this session');
            return [];
        }

        if (failed.length + discarded === self.devices.length) {
            self.warnCoachOfEmptySession(failed);
            throw new Error('no devices left')
        }

        self.warnCoachOfAthleteLeavingSession(failed);
        return failed;
    }

    verifyIfDevicesAreStillAlive() {
        const self = this;

        for (let id of self.devices) {
            const updatedAt = this.deviceMetrics[id].updatedAt;

            if (Date.now() - updatedAt > 25000) {
                self.deviceListView.setOffline(id);
            } else {
                self.deviceListView.setOnline(id);
            }
        }
    }

    /**
     * Show notification when athletes are no longer active in session
     * @param athleteIds
     */
    warnCoachOfAthleteLeavingSession(athleteIds) {
        const self = this;
        if (self.notificationOpen === true) {
            return;
        }

        self.notificationOpen = true;
        let coachWantsToFinish = false;
        const $modal = $('#modal-acknowledge')
            , $modalMessage = $modal.find('.modal-confirm-message')
            , $modalPrimary = $modal.find('.modal-confirm-primary')
            , $modalSecondary = $modal.find('.modal-confirm-secondary');

        let athletes = [];
        let list = Athlete.findInList(athleteIds);
        for (let athlete of list) {
            athletes.push(athlete.name);
        }

        const suffix = i18n.translate(athletes.length > 1 ?
            'coach_live_session_athletes_left_session_suffix_plural' : 'coach_live_session_athletes_left_session_suffix_singular');

        $modalMessage.html(i18n.translate("coach_live_session_athletes_left_session"
            , [athletes.join(', '), suffix]));
        $modal.modal({});

        $modal.on('hidden.bs.modal', function () {
            self.notificationOpen = false;
            if (coachWantsToFinish === true) {
                Meteor.call('pushFinishToLiveDevices', self.state.getLiveSessionId(), [], Date.now(), self.timer.getFullDuration()
                    , function (err, response) {
                        Router.go('coachLive');
                    });
            } else {
                self.removeDevices(athleteIds);
            }
        });

        $modalPrimary.off('click').on('click', function () {
            for (let id of self.devices) {
                if (athleteIds.indexOf(id) >= 0) {
                    self.deviceStatus[id].discarded = true;
                }
            }
            $modal.modal('hide');
        });

        $modalSecondary.off('click').on('click', function () {
            $modal.modal('hide');
            coachWantsToFinish = true;
        });
    }

    warnCoachOfEmptySession(athleteIds) {
        const self = this;
        if (self.forceCloseOpened === true) {
            return;
        }

        self.forceCloseOpened = true;
        const $modal = $('#modal-force-finish')
            , $modalPrimary = $modal.find('.modal-confirm-primary')
            , $modalSecondary = $modal.find('.modal-confirm-secondary');

        $modal.on('hidden.bs.modal', function () {
            self.forceCloseOpened = false;
        });

        $modalPrimary.off('click').on('click', function () {
            console.log(athleteIds);
            Meteor.call('pushFinishToLiveDevices', self.state.getLiveSessionId(), athleteIds, Date.now(), self.timer.getFullDuration()
                , function (err, response) {
                    $modal.modal('hide');
                    Router.go('coachLive');
                });
        });

        $modalSecondary.off('click').on('click', function () {
            $modal.modal('hide');
            self.forceCloseOpened = false;
        });

        $modal.modal({});
    }

    /**
     *
     * @param deviceIds
     * @param localOnly
     */
    removeDevices(deviceIds, localOnly = false) {
        for (let id of deviceIds) {
            this.deviceListView.removeDevice(id);
            this.state.removeDevice(id);
            this.devices.splice(this.devices.indexOf(id), 1);
        }
        if (localOnly === false)
            Meteor.call('removeDeviceFromSession', this.state.getLiveSessionId(), deviceIds);
    }

    startAutorun() {
        let self = this;

        // changes in splits
        Tracker.autorun(() => {
            if (self.destroyed === true) return;
            let splits = LiveSessionSplits.find({liveSession: self.state.getLiveSessionId()}).fetch();
            let records = [];
            for (let split of splits) {
                records.push(LiveSessionSplit.instantiateFromRecord(split));
            }
            self.updateSplits(records);
        });

        // update in metrics
        Tracker.autorun(() => {
            if (self.destroyed === true) return;
            let records = [];
            if (self.devices.length === 0) {
                records = LiveDeviceData.find().fetch();
            } else {
                let filter = {$or:[]};
                for (let deviceId of self.devices) {
                    filter.$or.push({dv: deviceId, dr: {$gt:self.deviceMetrics[deviceId].duration}})
                }
                records = LiveDeviceData.find(filter).fetch();
            }
            self.updateDeviceData(records);
        });

        Tracker.autorun(() => {
            if (self.destroyed === true) return;
            let records = DeviceLiveSessionSplit.findSplitsInSession(self.state.getLiveSessionId());
            self.updateDeviceLiveSessionSplit(records);
        });

        Tracker.autorun(() => {
            if (self.destroyed === true) return;

            let devices = LiveDevice.findDevices(self.devices);
            for (let device of devices) {
                self.deviceStatus[device.id] = self.deviceStatus[device.id] || {};

                self.deviceStatus[device.id].failed = device.status !== LiveDevicesStatus.RUNNING
                    || (device.status === LiveDevicesStatus.RUNNING && device.activeSessionId !== self.state.getLiveSessionId());
            }
        });


    }

    updateSplits(splits) {
        this.state.setSplits(splits);
        if (!this.isRendered()) {
            return;
        }

        this.deviceListView.updateSplits();
        this.actionBar.refresh();
        this.timer.splitChanged();
    }

    updateDeviceData(metrics) {
        if (!this.deviceListView) {
            return;
        }

        if (!this.isRendered()) {
            return;
        }

        let mtr = [];
        for (let i = 0, l = metrics.length; i < l; i++) {
            let metric = new DeviceData(metrics[i]);
            if (!this.deviceMetrics[metric.getDevice()].duration || metric.getDuration() > this.deviceMetrics[metric.getDevice()].duration) {
                mtr.push(metric);
                this.deviceMetrics[metric.getDevice()].duration = metric.getDuration();
                this.deviceMetrics[metric.getDevice()].updatedAt = Date.now();
            }
        }

        this.deviceListView.setMetrics(mtr);
    }

    updateDeviceLiveSessionSplit(records) {
        this.state.setDeviceSplits(records);
        if (!this.isRendered()) {
            return;
        }
        this.deviceListView.updateDeviceSplits();
    }

    setRendered() {
        this.rendered = true;

        this.timer = new LiveTimer(this.state);
        this.timer.refresh();
        this.state.setTimer(this.timer);

        this.deviceListView = new DeviceListView($('#device-view'), this.state);
        this.actionBar = new ActionBar(this.state, this.deviceListView, this.timer);
        this.actionBar.refresh();
        this.deviceListView.updateDeviceSplits();
    }

    isRendered() {
        return this.rendered;
    }

    isDestroyed() {
        return this.destroyed === true;
    }

    destroy() {
        if (this.rendered === false) return;
        if (this.destroyed === true) return;

        this.deviceListView.destroy();
        this.timer.destroy();
        this.actionBar.destroy();

        this.deviceListView = null;
        this.timer = null;
        this.actionBar = null;
        this.state = null;

        this.destroyed = true;
        clearInterval(this.interval);
    }

    /**
     *
     * @returns {LiveSessionState}
     */
    getState() {
        return this.state;
    }

    getFirstDeviceId() {
        return this.devices[0];
    }

    getLatestWorkingSplitId() {
        const split = this.state.getLastWorkingSplit();
        if (split === null) return null;
        return split.id;
    }
}

Template.coachLiveSession.onCreated(function () {
    let self = this;
    let liveSession = LiveSession.find(this.data.sessionId);
    let devices = LiveDevice.findDevices(liveSession.devices);
    let coach = Coach.find(Meteor.userId());
    const users = Users.find().fetch(), athleteIds = [];

    for (let user of users) {
        athleteIds.push(user._id);
    }


    self.app = new App(liveSession, devices, users, coach, Athlete.findInList(athleteIds));
});

Template.coachLiveSession.onRendered(function () {
    let self = this
        , $modal = $('#modal-confirm')
        , $addDevice = $('#add-device')
        , $addDeviceModal = $('#select-athletes')
        , $athletesList = $addDeviceModal.find('ul')
        , $modalPrimary = $modal.find('.modal-confirm-primary')
        , $modalSecondary = $modal.find('.modal-confirm-secondary')
        , confirmed = false;
    self.app.setRendered();

    $('#finish-session').off('click').on('click', function () {
        if (LiveSession.find(self.data.sessionId).isFinished() === true) {
            Router.go('coachLiveActiveSessions');
            return;
        }
        // confirm
        $modal.modal({});
        confirmed = false;
    });

    $modalPrimary.off('click').on('click', function () {
        let state = self.app.getState();
        Meteor.call('pushFinishToLiveDevices', state.getLiveSessionId(), state.getDeviceList(), Date.now(), self.app.timer.getFullDuration()
            , function (err, response) {
                confirmed = true;
                $modal.modal('hide');
            })
    });

    $modalSecondary.off('click').on('click', function () {
        $modal.modal('hide');
    });

    $modal.on('hidden.bs.modal', function () {
        if (confirmed) {
            Router.go('coachLive');
        }
    });

    $('div[data-selector="back"]').off('click').on('click', function () {
        Router.go('coachLive');
    });

    $addDevice.off('click').on('click', function () {
        Meteor.call("listCoachDevices", function (error, list) {
            let isFirst = true;
            for (let dev of list) {
                const device = LiveDevice.instantiateFromRecord(dev);
                if (!device.isDeviceAvailable() || device.activeSessionId === self.app.getState().getLiveSessionId())
                    continue;

                if (isFirst) {
                    $athletesList.empty();
                    isFirst = false;
                }
                const athlete = Athlete.find(device.id);
                $athletesList.append($(`<li class="live-select-option" value="${athlete.id}">${athlete.name}</li>`))
            }
            $addDeviceModal.modal({});
        });

    });

    $athletesList.off('click').on('click', 'li', function (e) {
        const $li = $(e.target), id = $li.attr('value');
        Meteor.call('addDeviceToSession', id, self.app.getState().getLiveSessionId(), function (error) {
            if (error) return console.error(error);

            location.reload();
        });
    });

    const $devices = $('.coach-live-session-devices');
    $devices.height($(window.document).innerHeight() - $devices.offset().top - $("#footer").height() - 2);

    $('#intervals').off('click').on('click', function (e) {
        setTimeout(() => {
            Router.go('coachLiveSplits', {
                sessionId: self.app.getState().getLiveSessionId(),
                athlete: self.app.getFirstDeviceId(),
                split: self.app.getLatestWorkingSplitId()
            })
        }, 400);
    });

    const $notes = $('.coach-live-session-add-notes');
    $notes.on('click', function () {
        const $modal = $('#modal-session-add-note')
            , $save = $('.modal-action-primary')
            , $discard = $('.modal-action-secondary')
            , $text = $modal.find('textarea');

        $save.off('click').on('click', function () {
            Meteor.call('updateLiveSessionNotes', self.app.getState().getLiveSessionId(), $text.val());
            $modal.modal('hide');
        });
        $discard.off('click').on('click', function () {
            $modal.modal('hide');
        });

        $modal.modal({});
    });

});

Template.coachLiveSession.onDestroyed(function () {
    this.app.destroy();
});

Template.coachLiveSession.helpers({
    sessionId: function() {
        return this.sessionId;
    },

    isLoaded: function () {
        const session = LiveSession.find(this.sessionId);
        if (session === null) return false;
        return session.isFinished()
    },

    totalSplits: function () {
        return LiveSessionSplits.find({recovery: false, finishedAt: {$ne: null}}).fetch().length;
    },

    notes: function () {
        const session = LiveSession.find(this.sessionId);
        if (!session) return '';
        if (session.notes === null) return '';
        return session.notes;
    },

    areThereAvailableAthletes: function () {
        return false;
    },

    hasPreviousSession: function () {
        const sessions = LiveSession.findAll();
        for (let i = 0, l = sessions.length; i < l; i++) {
            if (sessions[i].id === this.sessionId) {
                return i > 0
            }
        }
        return false;
    },

    hasNextSession: function () {
        const sessions = LiveSession.findAll();
        for (let i = 0, l = sessions.length; i < l; i++) {
            if (sessions[i].id === this.sessionId) {
                return i < l - 1
            }
        }
        return false;
    },

    previousLink: function () {
        const sessions = LiveSession.findAll();
        for (let i = 0, l = sessions.length; i < l; i++) {
            if (sessions[i].id === this.sessionId) {
                if (i - 1 >= 0) {
                    return sessions[i - 1].id
                }
            }
        }
        return null;
    },

    nextLink: function () {
        const sessions = LiveSession.findAll();
        for (let i = 0, l = sessions.length; i < l; i++) {
            if (sessions[i].id === this.sessionId) {
                if (i + 1 <= l - 1) {
                    return sessions[i + 1].id
                }
            }
        }
        return null;
    }
});

Template.coachLiveSession.events({
    'click #intervals': function () {
        console.log('clicked here');
    }
});

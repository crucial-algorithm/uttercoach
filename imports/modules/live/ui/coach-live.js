'use strict';
import {LiveSession} from '../api/collections.js';
import {CoachTrainingExpressions, Team} from "../../coaches/api/collections";

import './coach-live.html';
import './coach-live.scss';

import 'bootstrap-select/dist/js/bootstrap-select.min';
import 'bootstrap-select/dist/css/bootstrap-select.min.css';
import {Modal, Utils} from "../../../utils/utils";
import { Random } from 'meteor/random';
import {LiveDevice} from "../api/collections";
import {LiveDevicesStatus, LiveSessionDelays} from "../api/liveDevicesConstants";
import i18n from "../../../utils/i18n";

let expressions = {}, showAllDependency = new Tracker.Dependency()
    , isShowAllDevicesOptionSelected = false;

/**@type Array<String> */
let teamIds;

Template.coachLive.onCreated(function () {
    teamIds = Team.coachAthletesIds(Meteor.userId());
});

Template.coachLive.onRendered(function () {
    let isFree = false, sessionSelected = false, isDisabled = true, expression = null
        , $start = $('#start')
        , $topBar = $('.layout-header-top-bar')
        , $select = $('.coach-live-scheduled-session')
        , $modal = $('#select-session')
        , $devices = $('.coach-live-devices')
    ;

    // handle select of scheduled vs free session
    // ------------------------------------------
    $topBar.off('click').on('click', '[data-selector="option"]', function () {
        let $option = $(this);

        $topBar.find('a').removeClass('selected');
        $option.addClass('selected');

        isFree = $option.data('type') === 'free';

        if (isFree) {
            $start.removeClass('disabled');
            $select.addClass('disabled');
            return;
        }

        $select.removeClass('disabled');
        if (!sessionSelected) {
            $start.addClass('disabled');
        }
    });

    // handle select scheduled session type
    // ------------------------------------
    const selectSessionModal =  Modal.factory(Modal.types().CONFIRM, $modal, {
        title: i18n.translate("coach_live_select_session_modal"),
        primary: {
            label: i18n.translate('modal_acknowledge'),
            callback: function () {
                selectSessionModal.hide();
            }
        },
        extraCss: "coach-live"
    });

    let $list = null;

    $select.off('click').on('click', function () {
        if (isFree) return;
        selectSessionModal.show().then(() => {
            if ($list === null) {
                $list = selectSessionModal.$modal.find('ul');
            }
            selectSessionModal.$modal.off('click').on('click', 'li', selectSelectionHandler);
        });
    });

    let selectSelectionHandler = function (e) {
        let $li = $(this);
        $list.find('.selected').removeClass('selected');
        $li.addClass('selected');
        expression = $li.text();
        $select.text(expression);
        selectSessionModal.hide();

        sessionSelected = true;
        $start.removeClass('disabled');
    };


    // handle start
    // ------------------------------------------
    const commandId = Random.id();
    Utils.onClickMethodCall($start, function (e, resolved, failed, abort) {
        if (isFree === false && sessionSelected === false) {
            $select.addClass("highlight");
            setTimeout(function () {
                $select.removeClass('highlight');
            }, 1000);
            abort();
            return;
        }

        let devices = [], $devicesSelected = $devices.find('.coach-live-device-ready.selected');
        if ($devicesSelected.length > 0) {
            $devicesSelected.each(function () {
                devices.push($(this).data('id'));
            });
        } else {
            LiveDevice.findActiveDevices(teamIds).map(function (d) {
                if (isOffline(d)) return;
                devices.push(d.id)
            });
        }

        Meteor.apply('pushStartSessionToLiveDevices', [expression, devices, Date.now(), commandId]
            , {noRetry: true}
            , function (err, response) {
                console.log('start finished');
                if (err || !response) {
                    return failed();
                }
                resolved();
                Router.go('coachLiveSession', {sessionId: response})
            });

    } , true);

    // sync clock
    // ------------------------------------------
    let times = [], interval;
    interval = setInterval(function () {
        if (times.length >= 3) {
            clearInterval(interval);
            let total = times.length;
            let rtt = 0, offset = 0;
            for (let time of times) {
                rtt += time.end - time.begin;
                offset += time.server + (time.end - time.begin) / 2 - time.begin;
            }
            Meteor.call('storeCoachLatency', total, rtt, offset, function (error) {
                if (error) console.error(error)
            });
            return;
        }

        Meteor.call('getServerTime', Date.now(), function (error, time) {
            if (error) {
                return;
            }
            times.push({
                begin: time.client,
                end: Date.now(),
                server: time.server
            });
        })
    }, 500);

    Meteor.call('pushPingLiveDevices');

    window.onfocus = function () {
        Meteor.call('pushPingLiveDevices');
    };
});

/**
 *
 * @param {LiveDevice} device
 * @return {boolean}
 */
function isOffline(device) {
    return device.status === LiveDevicesStatus.OFFLINE ||
        (!isReady(device) && !isRunning(device))
}

/**
 *
 * @param {LiveDevice} device
 * @return {boolean}
 */
function isReady(device) {
    return device.status === LiveDevicesStatus.READY
        && (Date.now() - device.lastSeenAt) < LiveSessionDelays.DELAY_TO_CONSIDER_ATHLETE_VISIBLE
}

/**
 *
 * @param {LiveDevice} device
 * @return {boolean}
 */
function isRunning(device) {
    return device.status === LiveDevicesStatus.RUNNING
}


Template.coachLive.helpers({

    devices: function () {
        return LiveDevice.findDevices(teamIds)
    },

    nbrOfAvailableDevices: function () {
        return LiveDevice.findActiveDevices(teamIds).length;
    },

    nbrOfDevices: function () {
        return LiveDevice.findDevices(teamIds).length;
    },

    isOffline: function () {
        return isOffline(this)
    },

    isRunning: function () {
        return isRunning(this)
    },

    isReady: function () {
        return isReady(this);
    },

    showRunning: function () {
        /**@type LiveSession[] */
        const sessions = LiveSession.findActive();
        for (let session of sessions) {
            if (Date.now() - session.startedAt >= (6 * 3600 * 1000)) continue;
            return true;
        }
        return false;
    },

    totalSessions: function () {
        return LiveSession.findAll().length;
    },

    expressions: function () {
        let set = CoachTrainingExpressions.find({deleted: false}).fetch();
        for (let i = 0, l = set.length; i < l; i++) {
            let expr = set[i];
            expressions[expr._id] = expr;
        }
        return set;
    },

    isShowAll: function () {
        showAllDependency.depend();
        return isShowAllDevicesOptionSelected
    },

    isShowAvailable: function () {
        return isShowAllDevicesOptionSelected === false
    }
});

Template.coachLive.events({

    'click .coach-live-device': function (e) {
        let $device = $(e.target).closest('.coach-live-device');
        let $status = $device.find('.coach-live-device-status');

        if ($status.hasClass('offline')) {
            $device.removeClass('selected');
            $status.removeClass('selected');
            return;
        }

        if ($status.hasClass('running')) {
            let device = LiveDevice.find($device.data('id'));
            Router.go('coachLiveSession', {sessionId: device.activeSessionId});
            return;
        }

        $device.toggleClass('selected');
        $status.toggleClass('selected');
    },

    'click .secondary-navigation-menu': function (e) {
        const $option = $(e.target)
            , action = $option.data('action')
            , $parent = $(e.target).parent();

        $parent.find('.secondary-navigation-menu.active').removeClass('active');
        $option.addClass('active');

        isShowAllDevicesOptionSelected = action === 'all';
        showAllDependency.changed();
    }

});

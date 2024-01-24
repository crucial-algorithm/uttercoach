import './coach-live-active-sessions.html';
import './coach-live-active-sessions.scss';

import {LiveSession} from '../api/collections.js';
import {Utils} from "../../../utils/utils";
import {Coach} from "../../coaches/api/collections";

Template.coachLiveActiveSessions.onRendered(function () {
    let self = this;
    self.timers = [];

    let coach = Coach.find(Meteor.userId());
    let serverOffset = Utils.cristianClockSynchronization(coach.latency);

    $('.coach-live-active-sessions-entry-footer-timer-value').each(function () {
        let $div = $(this);
        let startedAt = $div.data('started');
        self.timers.push(setInterval(function () {
            $div.text(Utils.formatDurationInTime(new Date(Date.now() + serverOffset) - startedAt));
        }, 1000));
    });

    $('div[data-selector="back"]').off('click').on('click', function () {
        Router.go('coachLive');
    });
});

Template.coachLiveActiveSessions.onDestroyed(function () {
    for (let timer of this.timers) {
        clearInterval(timer);
    }
});

function displayDates(timestamp) {
    let reference = moment(timestamp), today = moment();
    if (reference.startOf('day').diff(today.startOf('day')) === 0) {
        return moment(timestamp).fromNow();
    }
    return reference.startOf('day').from(moment().startOf('day'))
}


Template.coachLiveActiveSessions.helpers({

    areThereNoSessions: function () {
        return LiveSession.findAll() > 0;
    },

    areThereRunningSessions: function () {
        return LiveSession.findActive().length > 0;
    },

    areThereFinishedSessions: function () {
        return LiveSession.findFinished().length > 0;
    },

    runningSessions: function () {
        return LiveSession.findActive();
    },

    finishedSessions: function () {
        return LiveSession.findFinished().sort(function (a, b) {
            if (a.startedAt > b.startedAt) return -1;
            if (a.startedAt < b.startedAt) return  1;
            return 0;
        });
    },

    duration: function(start, finish) {
        return Utils.formatDurationInTime(finish - start);
    },

    isDifferentDayOfWeek: function(position) {
        /**@type LiveSession[] */
        let sessions = LiveSession.findFinished().sort(function (a, b) {
            if (a.startedAt > b.startedAt) return -1;
            if (a.startedAt < b.startedAt) return  1;
            return 0;
        });
        let /**@type LiveSession */ previous = sessions[position -1], current = sessions[position];
        if (!previous) return true;

        return displayDates(previous.finishedAt) !== displayDates(current.finishedAt);
    },

    dayOfWeek: function(timestamp) {
        return displayDates(timestamp);
    }

});

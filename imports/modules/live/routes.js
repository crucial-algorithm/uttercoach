import {Router} from 'meteor/iron:router';
import './ui/coach-live.js';
import './ui/coach-live-active-sessions.js';
import './ui/coach-live-splits.js'
import './ui/coach-live-session.js';
import './ui/coach-live-desktop';


Router.route('/coach-live-desktop', {
    name: 'coachLiveDesktop',
    template: 'coachLiveDesktop',
    title: 'Live'
});

/**
 * Live sessions
 */
Router.route('/coach-live', {
    name: 'coachLive',
    template: 'coachLive',
    title: 'Live',

    /**
     * Wait for the subscription to be ready
     *
     * @returns {any|*}
     */
    waitOn: function () {

        if (!Meteor.userId()) {
            return;
        }

        return [
            Meteor.subscribe('coachTrainingExpressions.all'),
            Meteor.subscribe('coach.live')
        ];
    }
});

Router.route('/coach-live-active-sessions', {
    name: 'coachLiveActiveSessions',
    template: 'coachLiveActiveSessions',
    title: 'Live',
    /**
     * Wait for the subscription to be ready
     *
     * @returns {any|*}
     */
    waitOn: function () {

        if (!Meteor.userId()) {
            return;
        }

        return [
            Meteor.subscribe('coachLiveActiveSessionsRoute'),
        ];
    }
});

Router.route('/coach-live-session/:sessionId', {
    name: 'coachLiveSession',
    title: 'Session',
    template: 'coachLiveSession',
    /**
     * Wait for the subscription to be ready
     *
     * @returns {any|*}
     */
    waitOn: function () {

        if (!Meteor.userId()) {
            return;
        }

        return [
            Meteor.subscribe('coachLiveSessionRoute', this.params.sessionId),
            Meteor.subscribe('coachLiveSessionAthletes', this.params.sessionId),
            Meteor.subscribe('coachLiveTeamInfo')
        ];
    },

    data: function () {
        return {
            sessionId: this.params.sessionId
        }
    }
});

Router.route('/coach-live-splits/:sessionId/athlete/:athlete/split/:split', {
    name: 'coachLiveSplits',
    title: 'Split Stats',
    template: 'coachLiveSplits',
    /**
     * Wait for the subscription to be ready
     *
     * @returns {any|*}
     */
    waitOn: function () {

        if (!Meteor.userId()) {
            return;
        }

        return [
            Meteor.subscribe('coachLiveDevicesDataHist', this.params.sessionId, this.params.athlete, this.params.split)
        ];
    },

    data: function () {
        return {
            sessionId: this.params.sessionId,
            activeAthleteId: this.params.athlete,
            activeSplitId: this.params.split
        }
    }
});

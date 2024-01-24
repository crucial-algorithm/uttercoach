import { Meteor } from 'meteor/meteor';
import { Router } from 'meteor/iron:router';
import i18n from '../../utils/i18n';

import './ui/profile.js';
import './ui/measurements.js';
import './ui/zones.js';
import './ui/email-validated';
import './ui/join-coach-team';
import './ui/auth-token';
import {Athlete} from "../athletes/api/collections";

/**
 * Profile controller.
 */

Router.route('/profile/:id', {
    name: 'profile',
    title: 'Profile',
    template: 'profile',
    parent: 'athlete',
    waitOn: function () {
        return Meteor.subscribe('athlete', this.params.id);
    },
    data: function () {
        return {
            athleteId: this.params.id,
            athlete: Athlete.findInList(this.params.id)
        }
    }
});

Router.route('/profile/measurements/:id', {
    name: 'profile.measurements',
    title: function() {
        return i18n.translate("profile_title")
    },
    template: 'profileMeasurements',
    parent: 'athlete',
    waitOn: function () {
        return Meteor.subscribe('athlete', this.params.id);
    },
    data: function () {
        return {
            athleteId: this.params.id,
            athlete: Athlete.find(this.params.id)
        }
    }
});

Router.route('/profile/zones/:id', {
    name: 'profile.zones',
    title: function() {
        return i18n.translate("profile_title")
    },
    template: 'profileZones',
    parent: 'athlete',
    waitOn: function () {
        return [Meteor.subscribe('athlete', this.params.id)
            , Meteor.subscribe('coachAthleteGroups.all')
            , Meteor.subscribe('coach.basic')
        ];
    },
    data: function () {
        return {
            athleteId: this.params.id,
            athlete: Athlete.find(this.params.id)
        }
    }
});

Router.route('/email-validated', {
    name: 'email.validated',
    layoutTemplate: null,
    template: 'emailValidated'
});

Router.route('/app-links/join-coach-team/:token', {
    name: 'app.join.team',
    layoutTemplate: null,
    template: 'appLinkJoinCoachTeam',
    data: function () {
        return {
            token: this.params.token
        }
    }
});

Router.route('/uttcoach/:token/:route', {
    name: 'app.redirect.route',
    layoutTemplate: null,
    template: 'appRedirectRoute',
    data: function () {
        return {
            token: this.params.token,
            route: this.params.route
        }
    }
});
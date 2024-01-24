import {Router} from 'meteor/iron:router';

import './ui/strava-connect.js';
import './ui/strava-connected.js';
import './ui/strava-error.js';


Router.route('/strava/connect/:app/:token', {
    name: 'strava.connect.launcher',
    layoutTemplate: null,
    template: 'stravaConnectLauncher',
    title: 'Strava',
    data: function () {
        return {
            app: this.params.app,
            token: this.params.token
        }
    }
});

Router.route('/strava/connected', {
    name: 'strava.connected',
    layoutTemplate: null,
    template: 'stravaConnected',
    title: 'Strava'
});

Router.route('/strava/error', {
    name: 'strava.error',
    layoutTemplate: null,
    template: 'stravaError',
    title: 'Strava'
});
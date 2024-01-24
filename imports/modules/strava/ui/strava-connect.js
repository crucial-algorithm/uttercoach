import {Random} from 'meteor/random';

import './strava-connect.html';


Template.stravaConnectLauncher.onCreated(function () {});

Template.stravaConnectLauncher.onRendered(function () {
    loginWithStrava(this.data.app, this.data.token);
});


/**
 * @param app
 * @param token
 */
function loginWithStrava(app, token) {
    Meteor.call('strava.authUrl', app, token, (err, loginUrl) => {
        if (err) return console.log(err);
        if (loginUrl === null) return console.log('login url could not be generated');
        // navigate directly in same window instead of popup (not working in ios)
        window.location.href = loginUrl;
    });
}

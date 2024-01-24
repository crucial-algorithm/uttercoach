"use strict";

import {Geteor} from "../../../../server/core";
import {AppAuthToken} from "../../users/api/collections";
import StravaAuth from "../strava-auth";
import {Meteor} from "meteor/meteor";

/**
 *
 */
Geteor.methods({
    'strava.authUrl': function (app, token) {

        const authToken = AppAuthToken.findByToken(token);
        if (authToken === null) {
            throw new Meteor.Error("not-authorized");
        }
        return StravaAuth.authenticationUrl(app, authToken);
    },

    'strava.disconnect': function () {
        return StravaAuth.disconnect(this.userId);
    }
});

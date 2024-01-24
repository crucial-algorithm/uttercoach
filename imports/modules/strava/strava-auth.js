import {HTTP} from "meteor/http";
import {Athlete} from "../athletes/api/collections";
import {logger} from "../../utils/logger";


/**
 * Take an object and generate request body for POST
 * @param {Object} obj
 * @return {string}
 */
function generateReqBody(obj) {
    let paramList = [];
    for (let pk in obj) {
        paramList.push(pk + "=" + obj[pk]);
    }
    return paramList.join("&");
}

export default class StravaAuth {

    /**
     *
     * @param {string}  app
     * @param {AppAuthToken} authToken
     * @return {string}
     */
    static authenticationUrl(app, authToken) {

        const baseUrl = 'https://www.strava.com/oauth/authorize';
        const redirectUrl = `${Meteor.absoluteUrl()}strava/callback/${authToken.athleteId}`;
        const clientId = Meteor.settings.strava[app].client_id;
        const scope = ['read', 'activity:write'].join(',').trim();
        const state = `${authToken.token}${app}`;

        return `${baseUrl}?response_type=code&redirect_uri=${redirectUrl}&client_id=${clientId}&scope=${scope}&state=${state}`;
    }

    /**
     * Step 7a on Authentication process
     * After athlete authorization, we need to get the exchange authorization code
     * for short lived access token
     *
     * @param {String} athleteId
     * @param {String} code
     * @param {String} stravaApplication
     * @return {String}
     */
    static exchangeShortLivedAccessToken(athleteId, code, stravaApplication) {
        let params = {
            client_id: Meteor.settings.strava[stravaApplication].client_id,
            client_secret: Meteor.settings.strava[stravaApplication].secret,
            code: code,
            grant_type: "authorization_code"
        };

        let requestBody = generateReqBody(params);

        let response = HTTP.call('POST', 'https://www.strava.com/oauth/token', {query: requestBody});

        const stravaAthlete = response.data.athlete;
        let name = `${stravaAthlete.firstname} ${stravaAthlete.lastname}`;
        Athlete.updateStravaCredentials(athleteId, stravaApplication, stravaAthlete.id
            , `${name}`
            , response.data.access_token, response.data.refresh_token, response.data.expires_at);

        return name;
    }


    /**
     * Disconnect from strava account
     * @param athleteId
     * @return {boolean}
     */
    static disconnect(athleteId) {
        try {
            StravaAuth.call(athleteId, 'https://www.strava.com/oauth/deauthorize');
            Athlete.resetStravaCredentials(athleteId);
            return true;
        } catch (err) {
            logger.error(err);
            return false;
        }
    }


    /**
     *
     * @param {Athlete} athlete
     * @return {Athlete}
     */
    static refreshToken(athlete) {
        if (athlete.stravaTokenExpiresAt > Date.now()) return athlete;

        const stravaApplication = athlete.stravaApplication;

        let params = {
            client_id: Meteor.settings.strava[stravaApplication].client_id,
            client_secret: Meteor.settings.strava[stravaApplication].secret,
            refresh_token: athlete.stravaRefreshToken,
            grant_type: "refresh_token"
        };
        let response = HTTP.call('POST', 'https://www.strava.com/oauth/token', {query: generateReqBody(params)});

        Athlete.updateStravaCredentials(athlete.id, stravaApplication, athlete.stravaAthleteId
            , `${athlete.stravaAthleteName}`
            , response.data.access_token, response.data.refresh_token, response.data.expires_at);

        return Athlete.find(athlete.id)
    }


    /**
     *
     * @param athleteId
     * @param endpoint
     * @param params
     */
    static call(athleteId, endpoint, params = {}) {
        let athlete = Athlete.find(athleteId);
        if (!athlete.hasStrava()) return;
        athlete = StravaAuth.refreshToken(athlete);

        params.client_id = Meteor.settings.strava[athlete.stravaApplication].client_id;
        params.client_secret = Meteor.settings.strava[athlete.stravaApplication].secret;
        params.access_token = athlete.stravaAccessToken;

        return HTTP.call('POST', endpoint, {query: generateReqBody(params)});
    }

}
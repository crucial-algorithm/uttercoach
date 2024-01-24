import {Router} from 'meteor/iron:router';
import StravaAuth from "./strava-auth";
import './api/methods';
import {AppAuthToken} from "../users/api/collections";
import {logger} from "../../utils/logger";
import {Commands} from "../live/api/collections";
import {LiveDeviceCommands} from "../live/api/liveDevicesConstants";


function redirectError(request, response) {
    response.writeHead(307, {'Location': '/strava/error'});
    response.end('OK' + request.url);
}

Router.route('/strava/callback/:athleteId', {where: 'server', name: 'strava.callback'})
    .get(function () {

        logger.debug('strava webhook triggered');

        const request = this.request;
        const query = request.query;

        if (query.error) {
            logger.error('strava authorization error');
            return redirectError(request, this.response);
        }

        const url = request.url;
        const athleteId = url.split('/').pop().split('?').shift();
        const token = query.state.substr(0, 43);
        const stravaApplication = query.state.substr(43);

        logger.debug(`Handling strava webhook for athlete ${athleteId} from ${stravaApplication}`);

        // ensure that this callback is for the proper user
        const authToken = AppAuthToken.findByToken(token);
        if (authToken === null
            || authToken.athleteId !== athleteId
            || authToken.used === true
            || Date.now() - authToken.createdAt > 300000
        ) {
            logger.debug(`Strava webhook failed: auth token not found`);
            return redirectError(request, this.response);
        }

        try {
            logger.debug(`Strava: exchangeShortLivedAccessToken`);
            // actual connect to strava
            let name = StravaAuth.exchangeShortLivedAccessToken(authToken.athleteId, query.code, stravaApplication);
            logger.debug(`Strava connection succeeded with account ${name}`);

            Commands.insert({
                command: LiveDeviceCommands.USER_CONNECTED_TO_STRAVA,
                createdAt: Date.now(),
                device: authToken.athleteId,
                payload: {name: name},
                synced: false
            });

            authToken.markAsUsed();

            this.response.writeHead(307, {'Location': `/strava/connected`});
            this.response.end('OK' + request.url);
        } catch(err) {
            logger.debug(`Strava connection failed`);
            logger.error(err);
            redirectError(request, this.response);
        }
    });
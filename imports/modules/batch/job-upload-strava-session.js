import {TrainingSession} from "../training-sessions/api/collections";
const fs = Npm.require('fs');
const {createReadStream, createWriteStream} = Npm.require('fs');
const {createGzip} = Npm.require('zlib');
const {pipeline} = Npm.require('stream');
import StravaApiV3 from 'strava_api_v3';
import {Athlete} from "../athletes/api/collections";
import {Utils} from "../../utils/utils";
import StravaAuth from "../strava/strava-auth";
import {logger} from "../../utils/logger";

export default class JobUploadStravaSession {
    static async run() {
        const sessions = TrainingSession.findSessionsNotInStrava();
        logger.info(`found ${sessions.length} session not in strava`);
        Utils.loopAsync(sessions, async (iterator) => {
            /**@type TrainingSession */
            const session = iterator.current();
            const athlete = Athlete.find(session.user);
            if (!athlete.hasStrava() || session.distance < 1) {
                session.markHasUploadedToStrava();
            } else {
                await JobUploadStravaSession.processSession(session, athlete);
            }
            if (iterator.isFinished()) return;
            iterator.next();
        }, 500);
    }

    /**
     *
     * @param {TrainingSession} session
     * @param {Athlete} athlete
     */
    static async processSession(session, athlete) {
        try {
            athlete = StravaAuth.refreshToken(athlete);
            let file = await JobUploadStravaSession.createXMLFile(session);
            let gzipFile = await JobUploadStravaSession.zipFile(file);
            let upload = await JobUploadStravaSession.upload(session, gzipFile, athlete.stravaAccessToken);
            session.markHasUploadedToStrava();
            // cleanup
            fs.unlinkSync(file);
            fs.unlinkSync(gzipFile);
            logger.debug(`Session ${session.id} uploaded to Strava with id ${upload.id}`);
        } catch (err) {
            logger.error('failed to upload session to strava');
            logger.error(err);
        }
    }



    /**
     *
     * @param {TrainingSession} session
     * @return {Promise<string>}
     */
    static createXMLFile(session) {
        return new Promise((resolve, reject) => {
            const file = `/tmp/strava-${session.id}-${Date.now()}.gpx`;
            fs.writeFile(file, session.generateGPX(), (err) => {
                if (err) return reject(err);
                resolve(file)
            })
        })
    }


    /**
     *
     * @param input
     * @return {Promise<string>}
     */
    static zipFile(input) {
        return new Promise((resolve, reject) => {
            const gzip = createGzip();
            const source = createReadStream(input);
            const outputFileName = input + '.gz';
            const destination = createWriteStream(outputFileName);

            pipeline(source, gzip, destination, (err) => {
                if (err) return reject(err);
                resolve(outputFileName);
            });
        });
    }

    /**
     *
     * @param {TrainingSession} session
     * @param {string} file
     * @param {string|null} token
     * @return {Promise<Upload>}
     */
    static upload(session, file, token) {
        return new Promise((resolve, reject) => {
            const defaultClient = StravaApiV3.ApiClient.instance;
            const stravaOauth = defaultClient.authentications['strava_oauth'];
            stravaOauth.accessToken = token;
            const api = new StravaApiV3.UploadsApi();

            const opts = {
                'file': fs.createReadStream(file),
                'dataType': 'gpx.gz'
            };

            api.createUpload(opts, (error, data, response) => {
                if (error) return reject(error);
                resolve(data);
            })
        });
    }


}
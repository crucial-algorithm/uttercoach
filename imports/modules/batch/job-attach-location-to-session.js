import {Utils} from "../../utils/utils";
import {logger} from "../../utils/logger";
import {TrainingSession} from "../training-sessions/api/collections";
import GeocodingTools from "../../utils/geocoding";

const BATCH_SIZE = Meteor.settings.maps.batch_size || 0;

export default class JobAttachLocationToSession {
    static async run() {

        let sessions = TrainingSession.findSessionsWithoutGeo(BATCH_SIZE);
        logger.info(`JobAttachLocationToSession ${sessions.length} sessions found that haven't got location info`);
        Utils.loopAsync(sessions, async function (iterator) {
            /**@type TrainingSession */
            const session = iterator.current();
            logger.info(`JobAttachLocationToSession: processing ${session.id}`);
            await GeocodingTools.processSession(session);
            if (iterator.isFinished()) return;
            iterator.next();
        }, 500);
    }
}
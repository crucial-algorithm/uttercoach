import {TrainingSession} from "../training-sessions/api/collections";
import {TrainingSessionsUtils} from "../training-sessions/api/utils";
import {logger} from "../../utils/logger";
import GeocodingTools from "../../utils/geocoding";

const AGGREGATE_BATCH_SIZE = Meteor.settings.aggregate_batch_size || 100;

export default class JobAggregateTrainingSessionData {
    static async run() {

        const sessions = TrainingSession.findUnProcessedSessions(AGGREGATE_BATCH_SIZE);

        for (let session of sessions) {
            logger.info(`processing session ${session.id}`);
            TrainingSessionsUtils.calculateAggregations(session, true, null);
            TrainingSessionsUtils.updateSummaryData(session, false);
            session.finishProcessing();
            try {
                await GeocodingTools.processSession(session);
            } catch(err) {
                // intentionally left blank
            }
        }
    }
}
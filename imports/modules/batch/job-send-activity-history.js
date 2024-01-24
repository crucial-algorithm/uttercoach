import numbro from "numbro";
import {logger} from "../../utils/logger";

import EmailGenerationUtils from "../../utils/email-generation-utils";
import {TrainingSession} from "../training-sessions/api/collections";
import {Athlete} from "../athletes/api/collections";

const TO = Meteor.settings.activity_report.address || null;

export default class JobSendActivityHistory {
    static async run() {

        if (!TO) {
            logger.error('No target email found for job JobSendActivityHistory in activity_report.address');
            return;
        }

        logger.info(`JobSendActivityHistory: generating report`);
        let from = moment().subtract(30, 'days').startOf('day').toDate();
        let to = moment().add(-1, 'day').endOf('day').toDate();
        const sessions = TrainingSession.findAllSessionsBetween(from, to);

        let activeUsers = {};
        for (let session of sessions) {
            if (session.distance === 0) continue;
            let history = activeUsers[session.user];
            if (!history) activeUsers[session.user] = history = {sessions: 0, lastSessionAt: 0, distance: 0, country: 0};

            history.sessions++;
            history.distance += session.fullDistance;
            if (session.date.getTime() > history.lastSessionAt) {
                history.lastSessionAt = session.date.getTime();
                if (session.location && session.location.country) history.country = session.location.country;
            }

        }

        // get athlete names
        const ids = Object.keys(activeUsers);
        const athletes = Athlete.findInList(ids);
        let data = [];
        for (let athlete of athletes) {
            let history = activeUsers[athlete.id];
            if (history.distance < 5) continue;
            data.push({
                id: athlete.id,
                sessions: history.sessions,
                unix: history.lastSessionAt,
                lastSessionAt: moment().diff(history.lastSessionAt, 'days'),
                distance: numbro(history.distance).format('0.00'),
                name: athlete.name,
                country: history.country
            });
        }

        data = data.sort((a, b) => {
            if (a.unix > b.unix) return 1;
            if (a.unix < b.unix) return -1;
            return 0
        }).reverse();

        EmailGenerationUtils.generateAndSend(TO
            , /* subject  = */ `${data.length} athletes active in the last 30 days`
            , /* text     = */ "."
            , /* template = */ "activity-history"
            , /* values   = */ {
                footerBackgroundColor: "#cccccc",
                athletes: data
            }
            , /* language = */ "en"
        );
    }
}
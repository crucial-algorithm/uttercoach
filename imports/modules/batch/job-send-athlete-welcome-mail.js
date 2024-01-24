import {Utils} from "../../utils/utils";
import {Coach} from "../coaches/api/collections";
import {logger} from "../../utils/logger";
import EmailGenerationUtils from "../../utils/email-generation-utils";


export default class JobSendAthleteWelcomeMail {
    static async run() {

        /**
         * @deprecated
         * Since the onboarding process changed, user does not give the e-mail upfront and the content of this email
         * is not appropriate for a later creation of an account, thus discontinuing this job
         */
        if ( 1 === 1) return;

        const users = Meteor.users.find({"profile.welcomeEmailSent": false, "profile.email": {$ne: null}}).fetch();
        logger.info(`JobSendAthleteWelcomeMail ${users.length} athletes found that haven't received welcome email`);
        
        Utils.loopAsync(users, async function (iterator) {
            /**@type Coach */
            const user = iterator.current();
            logger.info(`JobSendAthleteWelcomeMail: processing ${user._id}`);
            try {
                EmailGenerationUtils.generateAndSend(user.profile.email
                    , /* subject  = */ "Welcome to GoPaddler"
                    , /* text     = */ "Welcome to GoPaddler"
                    , /* template = */ "welcome-athlete"
                    , /* values   = */ {
                        footerBackgroundColor: "#cccccc",
                        athlete: user.profile.name || ""
                    }
                    , /* language = */ "en"
                );
                logger.info(`JobSendAthleteWelcomeMail welcome email sent for ${user._id}`);
                Meteor.users.update({_id: user._id}, {$set: {"profile.welcomeEmailSent": true}});
            } catch (error) {
                logger.error(`JobSendAthleteWelcomeMail: athlete ${user._id} failed with message - ${typeof error === 'string' ? error : JSON.stringify(error)}`);
            }
            if (iterator.isFinished()) return;
            iterator.next();
        });
    }
}
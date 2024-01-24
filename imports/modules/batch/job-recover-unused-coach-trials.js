import {Utils} from "../../utils/utils";
import {Coach, CoachAthleteGroup} from "../coaches/api/collections";
import {logger} from "../../utils/logger";
import EmailGenerationUtils from "../../utils/email-generation-utils";
import i18n from "../../utils/i18n";
import {Meteor} from "meteor/meteor";


const NOTIFICATION = 'recover-unused-coach-trial';
export default class JobRecoverUnusedCoachTrials {
    static async run() {
        const coaches = Coach.findUnusedTrials();

        Utils.loopAsync(coaches, function (iterator) {
            /**@type Coach */
            const coach = iterator.current();

            if (coach === null) return;

            if (coach.isInTrial() === false || coach.notifications.includes(NOTIFICATION)) {
                return iterator.next();
            }


            logger.info(`JobRecoverUnusedCoachTrials: processing ${coach.name}`);
            try {

                const language = i18n.languageByUserId(coach.id)
                    , callToAction = i18n.translate('coach_billing_email_trial_ending_action', [], language)
                    , link = Meteor.absoluteUrl('login');

                EmailGenerationUtils.generateAndSend(coach.email
                    , /* subject  = */ i18n.translate("coach_trial_unused_recover_email_subject", [], language)
                    , /* text     = */ i18n.translate("coach_trial_unused_recover_email_text", [link], language)
                    , /* template = */ "recover-coach-your-trial-is-waiting"
                    , /* values   = */ {
                        footerBackgroundColor: "#cccccc",
                        link: link,
                        greeting: i18n.translate("coach_trial_unused_recover_email_greeting", [coach.name], language),
                        why_keep_using: i18n.translate("coach_trial_unused_recover_email_message", [], language),
                        action: i18n.translate("coach_trial_unused_recover_email_action", [], language),
                        features: i18n.translate("coach_trial_unused_recover_email_features", [], language),
                        highlight1_title: i18n.translate("coach_trial_unused_recover_email_highlight1_title", [], language),
                        highlight1_text: i18n.translate("coach_trial_unused_recover_email_highlight1_text", [], language),
                        highlight2_title: i18n.translate("coach_trial_unused_recover_email_highlight2_title", [], language),
                        highlight2_text: i18n.translate("coach_trial_unused_recover_email_highlight2_text", [], language),
                        highlight3_title: i18n.translate("coach_trial_unused_recover_email_highlight3_title", [], language),
                        highlight3_text: i18n.translate("coach_trial_unused_recover_email_highlight3_text", [], language)
                    }
                    , /* language = */ language
                );
                logger.info(`JobRecoverUnusedCoachTrials email sent for ${coach.name}`);
                coach.recordNotificationSent(NOTIFICATION);
            } catch (error) {
                logger.error(`JobRecoverUnusedCoachTrials: coach ${coach.name} failed with message - ${typeof error === 'string' ? error : JSON.stringify(error)}`);
            }
            if (iterator.isFinished()) return;
            iterator.next();
        });
    }
}
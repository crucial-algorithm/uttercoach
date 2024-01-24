import {HTTP} from "meteor/http";
import {logger} from "./logger";

const SLACK_NOTIFICATION_URL = process.env.SLACK_NOTIFICATION_URL;

/**
 * Generate the Facebook profile picture URL.
 *
 * @param {string|null} id
 *
 * @returns {string|null}
 */
function avatar(id) {

    if (!id) {
        return null;
    }

    return "http://graph.facebook.com/" + id + "/picture?type=square";
}

/**
 * Generate a Slack message payload with user information.
 *
 * @param {string} text
 *
 * @returns {{text: string, username: string, icon_url: string}}
 */
function payload(text) {

    const user = Meteor.user();

    return {
        text: text,
        username: user.profile.name,
        icon_url: avatar(user.services.facebook ? user.services.facebook.id : null)
    };
}

/**
 * Send an information message to Slack.
 *
 * @param {string} message
 * @param {boolean} withUser
 */
function info(message, withUser) {

    if (!SLACK_NOTIFICATION_URL) {
        return;
    }

    if (Meteor.isDevelopment)
        return;

    const data = withUser ? payload(message) : {text: message};

    HTTP.call("POST", SLACK_NOTIFICATION_URL,
        {data: data},
        function (error) {
            if (error) {
                logger.error("Error trying to publish notification with message: " + error.message);
            }
        });
}

class Notifier {

    /**
     * Log a message to the Slack channel with user information.
     *
     * @param {string} message
     */
    static info(message) {

        info(message, true);
    }


    /**
     * Log a message to the Slack channel without user information.
     *
     * @param {string} message
     */
    static infoWithoutUser(message) {

        info(message, false);
    }
}

export default Notifier;

import {Router} from "meteor/iron:router";
import {TrainingSessionsUtils} from "./api/utils.js";
import i18n from '../../utils/i18n';

import "./ui/training-sessions.js";
import "./ui/training-session.js";

/**
 * Training sessions calendar view controller.
 */
Router.route('/training-sessions', {
    name: 'training-sessions',
    title: function () {
        return i18n.translate("main_sidebar_menu_athlete_training_sessions")
    },
    template: 'trainingSessions'
});


/**
 * Training session detail controller.
 */
Router.route('/training-session/:type/:_id', {
    name: 'training-session',
    title: function () {
        return TrainingSessionsUtils.trainingSessionTitle(this.data().trainingSession);
    },
    parent: function () {

        const previousRoute = Router.previousRoute;

        if (!previousRoute) {
            return 'training-sessions';
        }

        return previousRoute;
    },
    template: 'trainingSession',

    /**
     * Make the training session details available to the template.
     *
     * @returns {{trainingSession: *}}
     */
    data: function () {


        if (this.params.type === 's') {
            return {
                coachSessionId: this.params._id,
                freeSessionId: null
            }
        }

        if (this.params.type === 'f') {
            return {
                coachSessionId: null,
                freeSessionId: this.params._id
            }
        }
    }
});

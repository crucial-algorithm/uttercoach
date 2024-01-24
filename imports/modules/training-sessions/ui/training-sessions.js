import {Template} from 'meteor/templating';
import {Session} from 'meteor/session'
import {Button} from "../../../utils/utils";
import './training-sessions.html';
import './training-sessions.scss';
import '../../coaches/ui/dashboard.scss';
import DateNavigation from "../../../utils/widgets/date-navigation";
import {TrainingSession} from "../../training-sessions/api/collections";
import SessionUI from "../../coaches/ui/dashboard-session";

const FROM_DATE_KEY = 'dashboardFromDate';

let sessionsDependency = new Tracker.Dependency()
    , refresh = null;


/**
 * On Render
 */
Template.trainingSessions.onRendered(function () {
    refresh = function (context) {
        return function () {
            let from = Session.get(FROM_DATE_KEY);
            context.subscribe('trainingSessions.for.day', from, { onReady: () => { sessionsDependency.changed(); } });
        }
    }(this);

    new DateNavigation(document.getElementById('date-navigation'), (date, type) => {
        Session.set(FROM_DATE_KEY, date);
        refresh();
    }, Session.get(FROM_DATE_KEY));
});


/**
 * Helpers
 */
Template.trainingSessions.helpers({
    sessions: function () {
        sessionsDependency.depend();
        let day = Session.get(FROM_DATE_KEY);
        if (!day) return [];

        let sessions = TrainingSession.findSessionsForDay(Meteor.userId(), day);
        sessions = sessions.map((session) => {
            return new SessionUI(session.date, session.user, session.id, session.expression
                , session.distance, session.duration, session.fullDistance, session.fullDuration
                , session.avgSpm, 1, false);
        });
        return sessions;
    },

    fieldsList: function () {
        return ["header", "date", "distance", "duration", "speed", "spm", "footer"];
    }
});

Template.trainingSessions.events({
    'click [data-action="delete"]': function(e) {
        /**@type HTMLElement */
        let button = e.target;
        let id = button.getAttribute('data-id');
        e.stopPropagation();
        Button.confirm(button, () => {
            Meteor.call('deleteTrainingSession', id, function (err, response) {
                refresh();
                sessionsDependency.changed();
            });
        });
    }
})

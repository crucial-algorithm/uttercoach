import { Template }   from 'meteor/templating';
import i18n from '../../../utils/i18n';

import './dashboard.scss';
import './dashboard.html';

import {TrainingSession} from "../../training-sessions/api/collections";
import {Coach} from "../api/collections";
import DateNavigation from "../../../utils/widgets/date-navigation";
import SessionUI from "./dashboard-session";
import {Button} from "../../../utils/utils";
import UtterCoachSettings from "../../../utils/settings";

let sessionsDependency = new Tracker.Dependency()
    , /**@type Coach */ coach = null
    , /**@type Date */ day = null
    , /**@type string */ period = DateNavigation.types().DAY
    , refresh = null
    ;

const FROM_DATE_KEY = 'dashboardFromDate';
const TO_DATE_KEY = 'dashboardToDate';


/**
 * On Create
 */
Template.dashboard.onCreated(function () {
    coach = Coach.find(Meteor.userId());
    Tracker.autorun(() => {
        coach = Coach.find(Meteor.userId());
    });
});

/**
 * On Render
 */
Template.dashboard.onRendered(function () {
    let self = this;
    day = new Date();

    refresh = function (context) {
        return function () {
            let from = Session.get(FROM_DATE_KEY);
            let to = Session.get(TO_DATE_KEY);
            context.subscribe('coach.trainingSessions', from, to, { onReady: () => { sessionsDependency.changed(); } });
        }
    }(this);

    const dateNavigation = new DateNavigation(document.getElementById('date-navigation'), (date, type) => {
        let from = date, offset = 1, to = null;
        if (type === DateNavigation.types().WEEK) {
            offset = 8;
        }
        to = new Date(from.getTime() + offset * 86400000);
        day = date;

        Session.set(FROM_DATE_KEY, from);
        Session.set(TO_DATE_KEY, to);
        refresh();
    }, Session.get(FROM_DATE_KEY));

    $('#choose-period').on('click', '.secondary-navigation-menu', (event) => {
        $('.secondary-navigation-menu.active').removeClass('active');
        let $menu = $(event.target);
        $menu.addClass('active');
        const type = $menu.data('action');
        period = type;
        dateNavigation.swapPeriodType(type, type === 'week' ? 16 : 31);
    });

    const key = 'wasBuildTeamDialogShown.' + coach.id;
    let wasShown = Session.get(key);
    if (coach.nbrOfLogins === 1 && wasShown !== true) {
        showChooseSportDialog().finally(() => {
            showInviteAthletesDialog(coach, key)
        });
    }
});

function showChooseSportDialog() {
    return new Promise((resolve) => {
        console.log('showChooseSportDialog');
        let coach = Coach.find(Meteor.userId());
        if (coach.sport) return resolve();
        Tracker.autorun(() => {
            const coach = Coach.find(Meteor.userId());
            if (coach.sport)
                resolve(coach.sport);
        });
        Blaze.render(Template.coachChooseSportDialog, document.getElementsByTagName('body')[0]);
    })
}


function showInviteAthletesDialog(coach, key) {
    if (coach.nbrOfAthletes() === 0) {
        setTimeout(function () {
            Blaze.render(Template.coachInviteAthletes, document.getElementsByTagName('body')[0]);
        }, 800);
    } else {
        setTimeout(function () {
            let athlete = coach.athletes()[0];
            Blaze.renderWithData(Template.coachInviteAthletes, {
                header: i18n.translate('coach_invite_athletes_modal_new_coach_header', []),
                description: i18n.translate('coach_invite_athletes_modal_new_coach_detail', [athlete.name])
            }, document.getElementsByTagName('body')[0]);
        }, 800);
    }
    Session.set(key, true)
}

/**
 * Helpers
 */
Template.dashboard.helpers({
    sessions: function () {
        if (coach === null) return [];
        let ids = coach.athleteIds();
        sessionsDependency.depend();

        let from = Session.get(FROM_DATE_KEY);
        let to = Session.get(TO_DATE_KEY);
        let sessions = TrainingSession.findAllSessionsBetweenDatesForAthletes(ids, from, to, false, coach.suppression);
        if (period === DateNavigation.types().WEEK) {
            sessions = SessionUI.group(sessions);
        } else {
            sessions = sessions.map((session) => {
                return new SessionUI(session.date, session.user, session.id, session.expression
                    , session.distance, session.duration, session.fullDistance, session.fullDuration
                    , session.avgSpm, 1, false);
            })
        }
        return sessions;
    },

    showFooter: function () {
        return period === DateNavigation.types().DAY;
    },

    showOnBoardingSteps: function () {
        return !(Meteor.user() && Meteor.user().profile.hideOnboardTutorial === true)
    },

    fieldsList: function () {
        if (period === DateNavigation.types().WEEK) {
            return ["header", "distance", "duration", "count"];
        }
        return ["header", "date", "distance", "duration", "speed", "spm", "footer"];
    },

    appName: function () {
        const coach = Coach.find(Meteor.userId());
        if (!coach) return '';
        return UtterCoachSettings.getInstance().getAppName(coach.sport);
    }
});

Template.dashboard.events({
    'click .dashboard-tutorial-dont-show-again': function (e) {
        Meteor.call('hideOnboardTutorial');
    },

    'click [data-action="delete"]': function(e) {
        /**@type HTMLElement */
        let button = e.target;
        let id = button.getAttribute('data-id');
        e.stopPropagation();
        Button.confirm(button, () => {
            Meteor.call('suppressSession', id, function (err, response) {
                refresh();
                sessionsDependency.changed();
            });
        });
    }
});

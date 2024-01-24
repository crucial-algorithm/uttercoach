import { Router }                from 'meteor/iron:router';

import './ui/coach-schedule.js';
import './ui/coach-team.js';
import './ui/dashboard.js';
import './ui/coach-billing.js';
import './ui/coach-payment-method.js';
import './ui/coach-invite-athletes';
import './ui/coach-choose-sport';
import i18n from "../../utils/i18n";

/**
 * Dashboard controller.
 */
Router.route('/dashboard', {
    name: 'dashboard',
    title: function () {
        return i18n.translate("main_sidebar_menu_dashboard")
    },
    template: 'dashboard',
    waitOn: function () {

        if (!Meteor.userId()) {
            return;
        }

        return [
            Meteor.subscribe('dashboard')
        ];
    }
});


/**
 * Coach schedule calendar view controller.
 */
Router.route('/coach-schedule', {
    name:     'coach-schedule',
    title: function () {
        return i18n.translate("main_sidebar_menu_schedule")
    },
    template: 'coachSchedule',
    /**
     * Wait for the subscription to be ready
     *
     * @returns {any|*}
     */
    waitOn: function () {

        if (!Meteor.userId()) {
            return;
        }

        return [
            Meteor.subscribe('coach.schedule')
        ];
    },
});

/**
 * Coach team setup view controller.
 */
Router.route('/coach-team', {
    name:     'coach-team',
    title: function () {
        return i18n.translate("main_sidebar_menu_team")
    },
    template: 'coachTeam',
    /**
     * Wait for the subscription to be ready
     *
     * @returns {any|*}
     */
    waitOn: function () {

        if (!Meteor.userId()) {
            return;
        }

        return [
            Meteor.subscribe('coach.team')
        ];
    },
});

/**
 * Coach billing view controller.
 */
Router.route('/coach-billing', {
    name:     'coach-billing',
    title: function () {
        return i18n.translate("main_top_bar_billing_btn")
    },
    template: 'coachBilling',
    /**
     * Wait for the subscription to be ready
     *
     * @returns {any|*}
     */
    waitOn: function () {
        if (!Meteor.userId()) {
            return;
        }

        return [
            Meteor.subscribe('coach.info'),
            Meteor.subscribe('coach.basic')
        ]
    }
});

/**
 * Coach billing view controller.
 */
Router.route('/coach-payment-method', {
    name:     'coachPaymentMethod',
    parent:   'coach-billing',
    title: function () {
        return i18n.translate("coach_payment_method_title")
    },
    template: 'coachPaymentMethod',
    /**
     * Wait for the subscription to be ready
     *
     * @returns {any|*}
     */
    waitOn: function () {
        if (!Meteor.userId()) {
            return;
        }

        return [
            Meteor.subscribe('coach.info'),
            Meteor.subscribe('coach.basic')
        ]
    }
});

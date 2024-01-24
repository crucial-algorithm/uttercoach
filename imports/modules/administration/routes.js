import { Meteor } from 'meteor/meteor';
import { Router } from 'meteor/iron:router';

import './ui/users.js';
import './ui/reporting.js';
import './ui/debug-live-sessions';
import i18n from "../../utils/i18n";
import {Coach} from "../coaches/api/collections";

/**
 * Administration area controllers.
 */
Router.route('/administration', {
    name: 'administration',
    title: 'Administration',
    protected: true,
    allowedRoles: ['admin'],
    controller: RouteController.extend({
        action: function () {
            Router.go('administration-users');
        }
    })
});

Router.route('/administration/users', {
    name: 'administration-users',
    title: i18n.translate("main_sidebar_menu_admin_users"),
    parent: 'administration',
    template: 'administrationUsers',
    protected: true,
    allowedRoles: ['admin'],
    waitOn: function () {

        if (!Meteor.userId()) {
            return;
        }

        return [Meteor.subscribe('users.latest'), Meteor.subscribe('coach.all')];
    },
    data: function () {

        if (!Meteor.userId()) {
            return;
        }

        return {
            latestUsers: Meteor.users.find(),
            coaches: Coach.all()
        };
    }
});


Router.route('/administration/reporting', {
    name: 'administration-reporting',
    title: i18n.translate("main_sidebar_menu_admin_reports"),
    parent: 'administration',
    template: 'administrationReporting',
    protected: true,
    allowedRoles: ['admin'],
    waitOn: function () {

        if (!Meteor.userId()) {
            return;
        }

        return Meteor.subscribe('users.all');
    },
    data: function () {

        if (!Meteor.userId()) {
            return;
        }

        return {
            allUsers: Meteor.users.find()
        };
    }
});

Router.route('/administration/debug-live-sessions', {
    name: 'administration-debug-live-sessions',
    title: i18n.translate("main_sidebar_menu_admin_debug_live"),
    parent: 'administration',
    template: 'debugLiveSession',
    protected: true,
    allowedRoles: ['admin'],
    waitOn: function () {

        if (!Meteor.userId()) {
            return;
        }
        return Meteor.subscribe('debug.live.sessions');
    }
});
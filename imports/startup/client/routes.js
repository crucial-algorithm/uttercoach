"use strict";

import {Meteor} from "meteor/meteor";
import {RouteController, Router} from "meteor/iron:router";
import "../../ui/pages/login.js";
import "../../ui/pages/back-to-app.js";

import "../../ui/layout/main.js";
import "../../ui/layout/blank.js";
import "../../ui/layout/not-found.js";

import '../../ui/global/picture';
/**
 * Pages.
 */
import "../../ui/pages/login.js";
import "../../ui/pages/back-to-app.js";
import {Coach} from "../../modules/coaches/api/collections";
import {Utils} from "../../utils/utils";
import i18n from "../../utils/i18n";



 // Handle coaches with expired account
Router.onBeforeAction(function () {
    const self = this;
    let next = self.next || function () { console.log('empty next') };

    if (!Meteor.userId()) return next();

    if (Router.current().route.getName() === 'app.redirect.route') return next();

    Utils.getCurrentLoggedInCoach().then(/**@param {Coach} coach */ function (coach) {
        if (coach.isSubscriptionValid()) return;
        self.stop();
        setTimeout(() => {
            Router.go('coach-billing');
        }, 500);
    }).catch((err) => {
    });
    next();
}, {
    except: ['coach-billing', 'coachPaymentMethod', 'coach-team', 'dashboard']
});

// Close menu modal if still open
Router.onBeforeAction(function () {
    let $menuModal = $('#menu-modal');

    if ($menuModal) {
        $menuModal.modal('hide');
        $('.modal-backdrop.show').remove();
    }

    this.next();
});

// redirect users to app
Router.onBeforeAction(function () {

    if (this.url === "/join" && this.params.query.source === "app") {
        // user already created... but still, coming from app
        if (Meteor.userId()) {
            Router.go('back-to-app');
            return;
        }
        console.log("from app - save state somehow");
    }
    this.next();
});

/**
 * Base configuration.
 */
Router.configure({
    layoutTemplate: 'main',
    notFoundTemplate: 'notFound',
    defaultBreadcrumbLastLink: false
});

Router.route('/back-to-app', {
    name: 'back-to-app',
    controller: RouteController.extend({
        action: function () {
            this.render('back-to-app');
            this.layout('blankLayout');
        }
    })
});

AccountsTemplates.configure({
    defaultLayout: 'accountsTemplate',
    showForgotPasswordLink: true,
    homeRoutePath: "/",
    confirmPassword: false,
    onSubmitHook: function(error, state) {
        console.log('onSubmitHook', error, state);
        if (!error && state === 'resetPwd') Router.go('/');
    }
});

AccountsTemplates.configureRoute('signIn', {
    path: "/",
    redirect: function() {
        const coachDefaultRoute = '/dashboard';
        let user = Meteor.user();
        if (!user) Router.go(coachDefaultRoute);
        try {
            if (user.roles.indexOf('coach') > -1) {
                return Router.go(coachDefaultRoute);
            }
            if (user.roles.indexOf('athlete') > -1) {
                return Router.go('training-sessions');
            }
            return Router.go(coachDefaultRoute);
        } catch(err) {
            return Router.go(coachDefaultRoute);
        }
    },
    template: "login",
    name: "login"
});

AccountsTemplates.configureRoute('signUp', {
    path: "/join",
    redirect: "/",
    template: "createAccount"
});

AccountsTemplates.configureRoute('forgotPwd', {
    template: 'forgotPassword',
    redirect: "/"
});
AccountsTemplates.configureRoute('resetPwd', {
    path: "/reset-password",
    template: "resetPassword"
});
AccountsTemplates.configureRoute('verifyEmail');
AccountsTemplates.configureRoute('resendVerificationEmail');

AccountsTemplates.addField({
    _id: "name",
    type: "text",
    displayName: "Name",
    required: true
});

AccountsTemplates.configure({
    texts: {
        title: {
            signIn: "Account Login",
            signUp: "Create Account",
        },
        button: {
            signIn: "Login",
            signUp: "Create Coach and Start Trial",
        }
    }
});


/**
 * Check if the user is authenticated.
 */
function isAuthenticated() {
    return !!(Meteor.user() || Meteor.loggingIn())
}


// Protect all Routes
Router.plugin('ensureSignedIn', {
    except: ['login', 'atSignIn', 'atSignUp', 'atForgotPwd', 'atResetPwd'
        , 'email.validated', 'app.join.team', 'app.redirect.route'
        , 'strava.connect.launcher', 'strava.connected', 'strava.error']
});

Router.onStop(function () {
    Router.previousRoute = {name: this.route.getName(), params: this.params};
});


if (Meteor.isCordova) {
    let connected = false, wasConnected = false, retryInterval = 0, status = null;
    Tracker.autorun(() => {
        status = Meteor.status();
        connected = status.connected === true;
        console.log('connected to the internet?', connected);
        if (connected) {
            document.body.classList.remove("offline");
            wasConnected = true;
            clearInterval(retryInterval);
            return;
        }

        if (wasConnected === false) return;

        setTimeout(() => {
            if (connected === true) return;
            document.body.classList.add("offline");
            retryInterval = setInterval(() => {
                let retryIn = Math.max(Math.round((status.retryTime - Date.now()) / 1000), 0);
                $('.bottom-message-overlay .secondary')
                    .html(i18n.translate('lost_connection_call_to_action', [isNaN(retryIn) ? 0 : retryIn]));
            }, 1000);
        }, 5000);

        wasConnected = false;
    });
}
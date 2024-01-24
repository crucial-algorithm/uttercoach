import {Meteor} from "meteor/meteor";
import {Template} from "meteor/templating";
import {Router} from "meteor/iron:router";

import "../style/vendor-override.scss";
import "./main.scss";
import "./main.html";
import i18n from "../../utils/i18n";
import {Utils} from "../../utils/utils";
import {Accounts} from "meteor/accounts-base";

const coachLoadedDependency = new Tracker.Dependency();
/**@type Coach */
let coach = null;

Reload._onMigrate(function() {
    return [Meteor.isCordova];
});

Template.main.onRendered(function () {
    let $mobileMenu = $('.mobile-header-actions');
    let $mobileToggleButton = $('#mobile-toggle-button');
    $mobileMenu.on('click', 'a', function () {
        setTimeout(function () {
            $mobileToggleButton.attr('checked', false);
        }, 300);
    });

    $('.header-lang').off('click').on('click', '.dropdown-item', function (e) {
        let $lang = $(e.target);

        Meteor.call('saveUserLang', $lang.data('lang'), function (error) {
            location.reload();
        });
    });

    i18n.setup();
    Tracker.autorun(async function () {
        let user = Meteor.user();
        if (!user) return;

        i18n.setup();
        try {
            coach = await Utils.getCurrentLoggedInCoach();
            coachLoadedDependency.changed();
        } catch(err) {
            console.log(err);
        }

    });
});

Template.main.helpers({

    pageTitle: function () {

        const breadcrumb = Breadcrumb.getAll();

        return (breadcrumb.length ? breadcrumb[breadcrumb.length - 1].title : '');
    },

    coachHasRequests: function () {
        return Meteor.user.numRequests > 0;
    },

    routeName: function () {
        return Router.current().route.getName()
    },

    showPromotion: function() {
        coachLoadedDependency.depend();
        if (!coach) return false;
        // disable promotion option per now
        // return coach.isInTrial() && Router.current().route.getName() !== 'coach-billing';
        return false;
    },

    daysLeftInTrial: function () {
        coachLoadedDependency.depend();
        if (!coach) return false;
        return coach.daysLeftInTrial
    }
});

Template.actions.onRendered(function () {
    let $menu = $('#menu-modal');
    const $language = $('.gopaddler-mobile-menu select[name="language"]');

    $language.off('click').on('click', (e) => {
        e.stopPropagation();
    });
    $language.off('change').on('change', (event) => {
        Meteor.call('saveUserLang',  $language.val(), function (error) {
            if (Meteor.isCordova) {
                $menu.modal('hide');
                setTimeout(() => {
                    Meteor.go('dashboard');
                }, 200);
                return;
            }
            location.reload();
        });
    });

});

Template.actions.helpers({
    isRoute: function () {
        let args = Array.from(arguments);
        return args.indexOf(Router.current()
            .route.getName()) >= 0;
    },

    showBilling: function () {
        if (Meteor.isCordova === false) return true;
        return (window.device || {}).platform !== "iOS"
    }
});


Template.main.events({

    'click .logout': function (e) {
        Meteor.logout(function (err) {
            if (err) {
                throw new Meteor.Error("Logout failed");
            }
            Router.go('/');
        });
    },

    'click #coach-demo': function() {
        let $dialog = $('#request-demo-dialog')
            , $email = $('#request-demo-contact')
            , $foundUs = $('#request-demo-how-did-you-found-us')
            , $howMany = $('#request-demo-how-many')
            , $why = $('#request-demo-why')
            , $discard = $('#request-demo-discard')
            , $request = $('#request-demo-submit');


        validateRequired($email);
        validateRequired($foundUs);
        validateRequired($howMany);
        validateRequired($why);

        $email.off('change.format').on('change.format', function () {
            if (!validEmail($email.val())) {
                setError($email);
            } else {
                setValid($email);
            }
        });

        $request.on('click', function () {
            let valid = true;
            if (!defined($email) || !validEmail($email.val())) {
                setError($email);
                valid = false;
            }

            if (!defined($foundUs)) {
                setError($foundUs);
                valid = false;
            }

            if (!defined($howMany)) {
                setError($howMany);
                valid = false;
            }

            if (!defined($why)) {
                setError($why);
                valid = false;
            }


            if (valid === false) return;

            Meteor.call('notify', ['-- Promote to coach --'
                , 'user: ', Meteor.user()._id
                , 'email: ', $email.val()
                , 'Found us by: ', $foundUs.val()
                , 'How many athletes: ', $howMany.val()
                , 'WHy: ', $why.val()
            ].join('\n'));

            $dialog.modal('hide');
        });

        $discard.on('click', function () {
            $dialog.modal('hide');
        });


        $dialog.modal({});
    },

    'click .gopaddler-mobile-menu ul li': function () {
        let $menuModal = $('#menu-modal');
        $menuModal.modal('hide');
        $('.modal-backdrop.show').remove();
    }
});

function setError($field) {
    $field.closest('.form-group').addClass('has-error');
}

function setValid($field) {
    $field.closest('.form-group').removeClass('has-error');
}

function defined($field) {
    return !!$field.val().trim();
}

function validateRequired($field) {

    $field.off('change.required').on('change.required', function () {
        if (!defined($field)) {
            setError($field);
        } else {
            setValid($field);
        }
    });
}

function validEmail(email) {
    let re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+/;
    return re.test(email.toLowerCase());
}

Accounts.onEmailVerificationLink((token, done) => {
    console.log('email verified');
    Accounts.verifyEmail(token, done);
});
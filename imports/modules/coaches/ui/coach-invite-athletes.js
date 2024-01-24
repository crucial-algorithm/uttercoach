import './coach-invite-athletes.html';
import './coach-invite-athletes.scss';
import {Modal, Utils} from "../../../utils/utils";
import i18n from "../../../utils/i18n";

let invites = [], modal = null;
Template.coachInviteAthletes.onCreated(function () {
    invites = [];
    for (let i = 0; i < 5; i++) {
        invites.push({email: null, name: null})
    }

});




Template.coachInviteAthletes.onRendered(function () {

    if (modal) {
        modal.destroy();
    }

    modal = Modal.factory(Modal.types().CONFIRM, $('#invite-athlete'), {
        title: i18n.translate("coach_invite_athletes_modal_title"),
        primary: {
            label: i18n.translate('coach_invite_athletes_modal_main_action'),
            callback: function () {
                let invalid = false, invites = [];
                modal.$body.find('.coach-invite-athletes-invites-list-entry').each((position, elem) => {
                    let $div = $(elem);
                    let $email = $div.find('input[name="email"]'), $name = $div.find('input[name="name"]');
                    let email = $email.val().trim();
                    if (!email) return;
                    let name = $name.val().trim();

                    if (Utils.validateEmail(email) === false) {
                        $email.addClass('error');
                        invalid = true;
                    } else {
                        $email.removeClass('error');
                    }

                    if (!name) {
                        $name.addClass('error');
                        invalid = true;
                    } else {
                        $name.removeClass('error');
                    }

                    invites.push({email, name})
                });

                if (invalid || invites.length === 0) return;

                Meteor.call('coachInviteAthletesToJoinTeam', invites, modal.$body.find('textarea').val(), function (err, result) {
                    if (err) return console.error(err);
                    modal.hide();
                });

            }
        },
        secondary: {
            label: i18n.translate('modal_discard')
        }
    });

    modal.show();

    $('.coach-invite-athletes-invites-list').on('change', 'input', (e) => {
        let $input = $(e.target);
        let isEmail = $input.attr('name') === 'email';
        if (isEmail === false) {
            if ($input.val()) {
                $input.removeClass('error');
            }
            return;
        }

        let email = $input.val();
        $input.removeClass('error');
        if (Utils.validateEmail(email) === false ) {
            $input.addClass('error');
        }


    });
});


Template.coachInviteAthletes.helpers({
    invites: function () {
        return invites;
    },

    showHeader() {
        return !!this.header;
    },

    header() {
        return this.header;
    },

    customDescription() {
        return !!this.description
    },

    description() {
        return this.description
    }
});

Template.coachInviteAthletes.events({
    'change input': (e) => {
        console.log(e);
    },
    'input #dummmy': (e) => {
        console.log(e);
    }
});
import './coach-choose-sport.html';
import './coach-choose-sport.scss';
import {Modal, Utils} from "../../../utils/utils";
import i18n from "../../../utils/i18n";

/**@type Modal */
let modal = null;
Template.coachChooseSportDialog.onCreated(function() { });

Template.coachChooseSportDialog.onRendered(function () {

    if (modal) {
        modal.destroy();
    }

    modal = Modal.factory(Modal.types().CONFIRM, $('#choose-sport'), {
        title: i18n.translate("coach_choose_sport_modal_title"),
        primary: {
            label: i18n.translate('coach_choose_sport_modal_main_action'),
            disabled: true,
            callback: function () {
                let $li = $($('.coach-choose-sport-list > li.selected')[0]);

                Meteor.call('saveCoachPrimarySport', $li.data('value'), function (err, result) {
                    if (err) return console.error(err);
                    modal.hide();
                });
            }
        },
        secondary: {
            label: i18n.translate('modal_discard')
        }
    });

    modal.show().then(() => {
        $('.coach-choose-sport-list').on('click', 'li', (e) => {
            const $li = $(e.currentTarget);
            $li.parent().find('.selected').removeClass('selected');
            $li.addClass('selected');
            modal.enablePrimaryButton();
        });
    });


});

Template.coachChooseSportDialog.helpers(function(){});



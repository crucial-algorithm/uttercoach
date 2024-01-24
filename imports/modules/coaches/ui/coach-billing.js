import './coach-billing.html';
import './coach-billing.scss';

import {Coach} from "../api/collections";
import ClientPaymentTools from "../../../utils/payments/client-payments";
import {StripePaymentMethod} from "../../../utils/payments/stripe-entities";
import i18n from "../../../utils/i18n";
import {Modal, Utils} from "../../../utils/utils";

const coachPaymentMethodDependency = new Tracker.Dependency();
/**@type StripePaymentMethod*/
let coachPaymentMethod;

if (Meteor.isCordova === false) {
    window.cordova = {
        InAppBrowser: {
            open: (url) => {console.log(url)}
        }
    }
}

/**
 * Initialize events
 */
Template.coachBilling.onCreated(function () {
});


Template.coachBilling.onRendered(async function () {

    const processingPaymentModal =  Modal.factory(Modal.types().ACKNOWLEDGE, $('#payment-processing'), {
        title: i18n.translate("coach_billing_modal_payment_processing_title"),
        primary: {
            label: i18n.translate('modal_acknowledge'),
            callback: function () {
                processingPaymentModal.hide().then(() => {
                    Router.go('coach-billing');
                })
            }
        }
    });

    ClientPaymentTools.retrievePaymentInfo().then((payment) => {
        coachPaymentMethod = payment;
        coachPaymentMethodDependency.changed()
    });

    const coach = Coach.find(Meteor.userId());

    const subscriptionSuccessModal =  Modal.factory(Modal.types().ACKNOWLEDGE, $('#subscribe-success'), {
        title: i18n.translate("coach_billing_modal_subscribe_success_title")
    });

    const subscriptionConfirmModal = Modal.factory(Modal.types().CONFIRM, $('#subscribe-confirm'), {
        title: i18n.translate("coach_billing_modal_subscribe_confirm_title"),
        primary: {
            label: i18n.translate('coach_billing_modal_subscribe_confirm_action_subscribe'),
            callback: function () {
                subscriptionConfirmModal.hide();
                Meteor.call('startCoachSubscription', function (err, result) {
                    if (err) return console.err(err);
                    subscriptionSuccessModal.show();
                });
            }
        },
        secondary: {
            label: i18n.translate('modal_discard')
        }
    });

    const subscriptionTermsModal = Modal.factory(Modal.types().CONFIRM, $('#subscribe-notification'), {
        title: i18n.translate("coach_billing_modal_subscribe_title"),
        primary: {
            label: i18n.translate('coach_billing_modal_subscribe_confirm_action'),
            callback: function () {
                subscriptionTermsModal.hide().then(function () {
                    subscriptionConfirmModal.show();
                });
            }
        },
        secondary: {
            label: i18n.translate('coach_billing_modal_trial_ended_discard')
        }
    });

    const trialEndedDialog = Modal.factory(Modal.types().CONFIRM, $('#trial-ended-notification'), {
        title: i18n.translate("coach_billing_modal_trial_ended_title"),
        primary: {
            label: i18n.translate(coach.hasPaymentInfo() ? 'coach_billing_modal_trial_ended_subscribe' : 'coach_billing_modal_trial_ended_add_card'),
            callback: function () {
                if (coach.hasPaymentInfo()) {
                    trialEndedDialog.hide().then(function () {
                        subscriptionTermsModal.show();
                    });
                } else if (Meteor.isCordova) {
                    trialEndedDialog.hide();
                    Meteor.call('createAppAuthToken', (err, token) => {
                        cordova.InAppBrowser.open(`${Meteor.absoluteUrl()}uttcoach/${token}/coachPaymentMethod`, '_system');
                    });
                } else {
                    trialEndedDialog.hide().then(function () {
                        Router.go('coachPaymentMethod')
                    });
                }
            }
        },
        secondary: {
            label: i18n.translate('coach_billing_modal_trial_ended_discard')
        }
    });

    const cancelSubscriptionSuccessModal =  Modal.factory(Modal.types().ACKNOWLEDGE, $('#cancel-subscription-success'), {
        title: i18n.translate("coach_billing_modal_cancel_subscription_success_title")
    });

    const cancelSubscriptionConfirmModal = Modal.factory(Modal.types().CONFIRM, $('#cancel-subscription-confirm'), {
        title: i18n.translate("coach_billing_modal_cancel_subscription_confirm_title"),
        primary: {
            label: i18n.translate('coach_billing_modal_cancel_subscription_confirm_action'),
            callback: function () {
                cancelSubscriptionConfirmModal.hide();
                Meteor.call('cancelCoachSubscription', function (err, result) {
                    if (err) return console.error(err);
                    console.log(result);
                    cancelSubscriptionSuccessModal.show();
                });
            }
        },
        secondary: {
            label: i18n.translate('modal_discard')
        }
    });

    const tryingToSubscribeWithoutPaymentInfoModal = Modal.factory(Modal.types().CONFIRM, $('#subscribe-with-no-payment-info'), {
        title: i18n.translate("coach_billing_modal_subscribe_with_no_payment_title"),
        primary: {
            label: i18n.translate('coach_billing_modal_subscribe_with_no_payment_action'),
            callback: function () {
                tryingToSubscribeWithoutPaymentInfoModal.hide().then(function () {
                    Router.go('coachPaymentMethod')
                });
            }
        },
        secondary: {
            label: i18n.translate('modal_discard')
        }
    });

    const redeemPromotionSuccessModal =  Modal.factory(Modal.types().ACKNOWLEDGE, $('#redeem-promotion-success'), {
        title: i18n.translate("coach_billing_modal_redeem_promotion_title")
    });

    if (coach.isAwaitingSubscription()) {
        trialEndedDialog.show();
    }

    $('#subscribe').on('click', function () {
        if (coach.isSubscribed() || coach.isInTrial()) {
            cancelSubscriptionConfirmModal.show();
            return;
        }

        // we are not considering the possibility of not having payment info at this point
        if (coach.isCanceled()) {
            if (!coach.hasPaymentInfo()) return tryingToSubscribeWithoutPaymentInfoModal.show();
            subscriptionTermsModal.show();
        }
    });


});

Template.coachBilling.helpers({
    isThereNoPaymentInfo() {
        const coach = Coach.find(Meteor.userId());
        return coach.stripePaymentMethodId === null
    },

    subscriptStatus: function () {
        const coach = Coach.find(Meteor.userId());
        return i18n.translate(coach.getReadableSubscriptStatus())
    },

    teamSize: function () {
        return Coach.nbrOfAthletesInTeam(Meteor.userId());
    },

    monthlyBilling: function() {
        const coach = Coach.find(Meteor.userId());
        return Math.max(Coach.nbrOfAthletesInTeam(Meteor.userId()), 1) * coach.costPerAthlete;
    },

    invoices: function () {
        const coach = Coach.find(Meteor.userId());
        if (coach === null) return [];
        return coach.invoices;
    },
    month: function () {
        return moment(this.createdAt).format('MMMM')
    },
    year: function () {
        return moment(this.createdAt).format('YYYY')
    },
    status: function () {
        return this.paid === true ? 'Paid' : 'Open'
    },
    amount: function () {
        const amount = Math.round(this.amount / 100);
        if (this.currency === 'eur') {
            return `€${amount}`;
        } else {
            return `${amount}\$`;
        }
    },

    /**
     * @return {StripePaymentMethod}
     */
    paymentInfo: function () {
        coachPaymentMethodDependency.depend();
        return coachPaymentMethod || {};
    },

    subscriptionAction: function () {
        const coach = Coach.find(Meteor.userId());
        return i18n.translate(coach.getReadableSubscriptAction())
    },

    coachHasPaymentInfo: function () {
        const coach = Coach.find(Meteor.userId());
        return coach.hasPaymentInfo()
    },

    coachCostPerAthlete: function () {
        const coach = Coach.find(Meteor.userId());
        return coach.costPerAthlete
    },

    cartLast4Digits: function () {
        coachPaymentMethodDependency.depend();
        if (coachPaymentMethod) return coachPaymentMethod.last4;
        return '****'
    },

    cartExpirationMonth: function () {
        coachPaymentMethodDependency.depend();
        if (coachPaymentMethod) return Utils.lpad(coachPaymentMethod.expirationMonth, 2);
        return '****'
    },

    cartExpirationYear: function () {
        coachPaymentMethodDependency.depend();
        if (coachPaymentMethod) return coachPaymentMethod.expirationYear;
        return '****'
    },

    validUntil: function () {
        const coach = Coach.find(Meteor.userId());
        return Utils.formatDate(coach.paidUntil);
    }

});


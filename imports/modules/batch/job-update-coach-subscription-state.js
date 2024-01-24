import {ServerPaymentTools} from "../../utils/payments/server-payments";
import {Utils} from "../../utils/utils";
import {Coach, CoachAthleteGroup} from "../coaches/api/collections";


export default class JobUpdateCoachSubscriptionState {
    static async run() {
        const coaches = Coach.findCoachesInStripe();

        Utils.loopAsync(coaches, function (iterator) {
            /**@type Coach */
            const coach = iterator.current();

            if (coach === null) return;

            if (coach.bypassCoachSubscription()) return iterator.next();

            if (coach.isInTrial()) {
                if (coach.hasTrialExpired()) {
                    coach.setAwaitingSubscription();
                } else {
                    let daysLeft = coach.calculateDaysLeftInTrial();
                    if (daysLeft !== coach.daysLeftInTrial) {
                        coach.daysLeftInTrial = daysLeft;
                        coach.save();
                    }
                }
                return iterator.next();
            }

            if (coach.isSubscribed()) {
                if (coach.hasInvoicesOverdue()) {
                    if (coach.daysSinceInvoiceShouldHaveBeenPaid() > 5) {
                        coach.setInvoiceUnpaid();
                    } else {
                        coach.setInvoiceOverdue();
                    }
                }
            }

            if (coach.isOverdue()) {
                if (coach.hasInvoicesOverdue()) return iterator.next();
                coach.setSubscribed();
            }

            if (!coach.isSubscriptionValid()) return iterator.next();

            const athletes = CoachAthleteGroup.coachNbrOfAthletes(coach._id);
            let qty = Math.max(athletes, 1);

            console.log(`subscribing user ${coach._id} with qty ${qty} - should be replaced with updating subscription`);

            if (1 === 1) return;

            ServerPaymentTools.updateSubscription(coach, qty).then(function () {
                iterator.next();
            });
        });
    }
}
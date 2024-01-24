import {StripePaymentMethod} from "./stripe-entities";

export default class ClientPaymentTools {

    /**
     *
     * @return {Promise<Stripe>}
     */
    static getStripe() {
        const key = Meteor.settings.public.stripe.publishable_key;
        return new Promise((resolve, reject) => {
            let Stripe = window.Stripe;
            if (Stripe) return resolve(Stripe(key));

            let attempts = 1;
            let interval = setInterval(function () {
                if (!window.Stripe) {
                    console.log(attempts);
                    if (attempts >= 5) {
                        clearInterval(interval);
                        reject("max attempts reached");
                    }
                    attempts++;
                    return;
                }

                clearInterval(interval);
                resolve(window.Stripe(key));
            }, 250);

        });
    }

    /**
     *
     * @return {Promise<StripePaymentMethod>}
     */
    static retrievePaymentInfo() {
        return new Promise((resolve, reject) => {
            Meteor.call('retrieveStripeCoachPaymentInfo', function (err, result) {
                if (err) {
                    reject(err);
                    return console.error(err);
                }
                if (!result) return resolve(null);

                let coachPaymentMethod = new StripePaymentMethod(result.name, result.email, result.address, result.card);
                resolve(coachPaymentMethod)
            });
        });
    }
}
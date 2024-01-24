import stripe from 'stripe';
import {Coach} from "../../modules/coaches/api/collections";
import {logger} from "../logger";
import {StripePaymentMethod, StripeSubscription} from "./stripe-entities";

stripe = stripe(Meteor.settings.stripe.secret_key);

const WEBHOOK_SIGNING_SECRET = Meteor.settings.stripe.webhook_signing_secret;


/**
 *
 * @param path
 * @param query
 * @return {string}
 */
function getUrl(path, query = null) {
    const ROOT_URL = process.env.ROOT_URL;
    let url = `${ROOT_URL}/${path}`;
    if (query !== null) url += `?${query}`;
    return url;
}


/**
 * This class should be used on server only
 */
class ServerPaymentTools {

    /**
     *
     * @param {Coach} coach
     * @return {Promise<void>}
     */
    static async createCostumer(coach) {
        if (!coach.email) throw 'no email found';
        const customer = await stripe.customers.create({
            email: coach.email
        });

        coach.stripeCustomerId = customer.id;
        coach.save();
    }


    static async createCheckoutSession() {
        let user = Meteor.user();
        let coach = Coach.find(user._id);

        let result = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            client_reference_id: coach.id,
            customer: coach.stripeCustomerId,
            billing_address_collection: 'required',
            subscription_data: {
//                trial_period_days: 0,
                items: [{
                    plan: Meteor.settings.stripe.plan,
                    quantity: Coach.nbrOfAthletesInTeam(coach.id)
                }],
            },
            success_url: getUrl('coach-billing'),
            cancel_url: getUrl('coach-billing')
        });

        return result.id;
    }

    /**
     *
     * @param {Coach} coach
     * @param paymentMethodId
     * @param costumerId
     * @return {Promise<void>}
     */
    static async updateCustomerInformation(coach, paymentMethodId, costumerId) {
        try {
            await ServerPaymentTools.attachPaymentMethod(paymentMethodId, costumerId);
            const paymentInfo = await ServerPaymentTools.retrievePaymentMethod(paymentMethodId);
            await ServerPaymentTools.updateCustomerData(paymentMethodId, costumerId, paymentInfo);

            Coach.updatePaymentMethodId(coach.id, paymentMethodId)
        } catch (err) {
            logger.error(err);
        }
    }

    /**
     *
     * @param subscriptionId
     *
     * @return {Promise<StripeSubscription>}
     */
    static retrieveSubscription(subscriptionId) {
        return new Promise((resolve, reject) => {
            stripe.subscriptions.retrieve(
                subscriptionId,
                function(err, subscription) {
                    if (err) {
                        logger.error(err.toString());
                        resolve(null);
                    } else {
                        resolve(new StripeSubscription(subscription));
                    }
                }
            );
        })
    }

    /**
     *
     * @param paymentMethodId
     *
     * @return {Promise<StripePaymentMethod>}
     */
    static retrievePaymentMethod(paymentMethodId) {
        return new Promise((resolve, reject) => {
            if (!paymentMethodId) {
                return reject('No payment Id provided')
            }
            stripe.paymentMethods.retrieve(
                paymentMethodId,
                function(err, paymentMethod) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(new StripePaymentMethod(
                            paymentMethod.billing_details.name, paymentMethod.billing_details.email
                            , paymentMethod.billing_details.address, paymentMethod.card));
                    }
                }
            );
        })
    }

    /**
     *
     * @param paymentMethodId
     * @param costumerId
     * @return {Promise<any>}
     */
    static attachPaymentMethod(paymentMethodId, costumerId) {
        return new Promise((resolve, reject) => {
            stripe.paymentMethods.attach(paymentMethodId, {customer: costumerId}, function (err, paymentMethod) {
                if (err) {
                    reject(err);
                } else {
                    resolve(paymentMethod)
                }
            });
        })
    }

    /**
     *
     * @param paymentMethodId
     * @param costumerId
     * @param {StripePaymentMethod} paymentInfo
     * @return {Promise<any>}
     */
    static updateCustomerData(paymentMethodId, costumerId, paymentInfo) {
        return new Promise((resolve, reject) => {
            stripe.customers.update(costumerId, {
                    invoice_settings: {
                        default_payment_method: paymentMethodId
                    },
                    address: paymentInfo.address.toJSON()
                },
                function (err, customer) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(customer)
                    }
                }
            );
        })
    }

    /**
     *
     * @param {Coach} coach
     * @param qty
     * @return {Promise<void>}
     */
    static async startSubscription(coach, qty = 1) {

        if (!coach) throw 'missing user';

        qty = Math.max(qty, 1);

        let trialEnd = moment().add(1, 'day').startOf('day').add(Coach.getDefaultTrialPeriodDurationInDays(), 'days');
        const subscription = await stripe.subscriptions.create({
            customer: coach.stripeCustomerId,
            items: [{plan: Meteor.settings.stripe.plan, quantity: qty}],
            trial_end: trialEnd.unix()
        });

        coach.stripeSubscriptionId = subscription.id;
        coach.paidUntil = trialEnd.valueOf();
        coach.daysLeftInTrial = trialEnd.diff(Date.now(), 'days');
        coach.save();
    }


    /**
     *
     * @param {Coach} coach
     * @param qty
     * @return {Promise<void>}
     */
    static async updateSubscription(coach, qty = 1) {

        if (!coach) throw 'missing user';
        if (!coach.stripeSubscriptionId) throw 'no subscription';

        qty = Math.max(qty, 1);
        await stripe.subscriptions.update(coach.stripeSubscriptionId, {
            quantity: qty,
            cancel_at_period_end: false
        });
    }

    /**
     *
     * @param {Coach}   coach
     * @param {number}  qty        Number of athletes to use
     * @return {Promise<void>}
     */
    static async redeemDiscount(coach, qty) {
        await stripe.subscriptions.update(coach.stripeSubscriptionId, {
            trial_end: 'now',
            quantity: qty
        });
        coach.setSubscribed();

        await stripe.subscriptions.update(coach.stripeSubscriptionId, {
            coupon: Meteor.settings.stripe.coupon
        });
    }

    /**
     *
     * @param {Coach} coach
     * @return {Promise<void>}
     */
    static async invoiceForNewAthlete(coach) {
        return new Promise((resolve, reject) => {
            stripe.invoices.create({
                customer: coach.stripeCustomerId,
                subscription: coach.stripeSubscriptionId,
                auto_advance: true
            }, function (err, invoice) {
                // asynchronously called
                if (err) {
                    return reject(err);
                }
                stripe.invoices.finalizeInvoice(
                    invoice.id,
                    function (err, invoice) {
                        if (err) return reject(err);
                        resolve(invoice);
                    }
                );
            });
        });
    }

    /**
     *
     * @param {Coach} coach
     * @return {Promise<void>}
     */
    static async cancelCoachSubscription(coach) {

        if (!coach) throw 'missing user';

        if (!coach.stripeSubscriptionId) {
            throw 'coach has no active subscription';
        }

        return new Promise((resolve, reject) => {
            stripe.subscriptions.update(
                coach.stripeSubscriptionId, {
                    cancel_at_period_end: true
                },
                function (err, confirmation) {
                    if (err) return reject(err);
                    resolve(confirmation);
                }
            );
        });
    }


    static validateWebhook(body, signature) {
        try {
            stripe.webhooks.constructEvent(body, signature, WEBHOOK_SIGNING_SECRET);
            return true;
        }
        catch (err) {
            console.log(err);
            return false;
        }
    }
}

export {ServerPaymentTools}
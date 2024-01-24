import {ServerPaymentTools} from "../../utils/payments/server-payments";
import {Coach, Invoice} from "../coaches/api/collections";
import {WebHookPayload} from "../integrations/api/collections";
import {logger} from "../../utils/logger";
import EmailGenerationUtils from "../../utils/email-generation-utils";
import i18n from "../../utils/i18n";


/**
 * Process stripe webhooks; Active event types:
 *  - customer.subscription.trial_will_end
 *  - customer.subscription.updated
 *  - invoice.marked_uncollectible
 *  - invoice.payment_action_required
 *  - invoice.payment_failed
 *  - invoice.payment_succeeded
 *  - charge.succeeded
 *  - invoice.finalized
 *  - invoice.created
 *  - invoice.upcoming
 *  - checkout.session.completed
 */
export default class JobProcessWebHooks {
    static async run() {
        const startedAt = Date.now();
        for (let i = 0; i < 20; i++) {
            if (Date.now() - startedAt > 20000) break;
            let record = null;
            record = await WebHookPayload.lockRecordForProcessing();
            if (!record) break;
            let payload = record.payload, data = payload.data;
            logger.info(`JobProcessWebHooks: processing webhook ${record.id} (${payload.type})`);

            switch (payload.type) {
                case 'checkout.session.completed':
                    await JobProcessWebHooks.coachSubscribed(record, data);
                    break;
                case 'invoice.finalized':
                    JobProcessWebHooks.invoiceCreated(record, data);
                    break;
                case 'charge.succeeded':
                    await JobProcessWebHooks.invoicePaid(record, data);
                    break;
                case 'invoice.payment_succeeded':
                    await JobProcessWebHooks.invoicePaid(record, {
                        invoice: data.id,
                        receipt_url: null,
                        customer: data.customer
                    });
                    break;
                case 'customer.subscription.trial_will_end':
                    JobProcessWebHooks.warnUserOfEndOfTrial(record, data);
                    break;
                default:
                    record.markAsIgnored();
                    break;
            }
        }

    }

    /**
     *
     * @param {WebHookPayload} record
     * @param data
     * @return {Promise<void>}
     */
    static async coachSubscribed(record, data) {
        let coach = Coach.find(data.client_reference_id);
        const setupIntentId = data.setup_intent;
        await ServerPaymentTools.updateCustomerInformation(coach, setupIntentId, coach.stripeCustomerId)
            .then(function () {
                logger.info('updated customer information');
                record.markAsProcessed();
            }).catch(function(error){
                logger.info('failed to process checkout.session.completed');
                record.markAsFailed(typeof error === "string" ? error : JSON.stringify(error));
            });
    }

    /**
     * @param {WebHookPayload} record
     * @param data
     */
    static invoiceCreated(record, data) {

        let invoice = new Invoice(data.id, false, data.amount_due, data.currency
            , data.number, data.created * 1000, data.status, data.billing_reason, data.subscription
            , data.period_start * 1000, data.period_end * 1000
            , data.hosted_invoice_url, data.invoice_pdf);

        let coach = Coach.findByStripeCustomerId(data.customer);
        if (!coach) {
            logger.info(`webhook ${record.id} failed with error : costumer not found (attempt: ${record.attempts})`);
            record.markAsFailed('customer not found');
            return
        }
        Coach.appendInvoice(coach.id, invoice);
        record.markAsProcessed();
    }

    /**
     * Used both for charge.succeeded and invoice.payment_succeeded (which have different payloads)
     *
     * @param {WebHookPayload} record
     * @param data
     */
    static async invoicePaid(record, data) {
        try {
            const coach = Coach.findByStripeCustomerId(data.customer);
            const subscription = await ServerPaymentTools.retrieveSubscription(coach.stripeSubscriptionId);
            let paidUntil;
            if (subscription.discount) {
                paidUntil = subscription.discount.end;
            } else {
                paidUntil = subscription.currentPeriodEnd;
            }
            Coach.setInvoicePaid(data.customer, data.invoice, data.receipt_url, paidUntil);
            record.markAsProcessed();
        } catch (err) {
            record.markAsFailed(typeof err === 'string' ? err : JSON.stringify(err));
        }
    }

    /**
     *
     * @param {WebHookPayload} record
     * @param data
     */
    static warnUserOfEndOfTrial(record, data) {
        const coach = Coach.findByStripeCustomerId(data.customer);
        if (!coach) {
            logger.info(`JobProcessWebHooks: could not find coach with stripe customer id = ${data.customer}`);
            record.markAsFailed(`Couch not found`);
            return;
        }

        if (coach.stripePaymentMethodId) {
            record.markAsProcessed();
            logger.info(`JobProcessWebHooks: coach ${coach.id} already provided payment details; exiting...`);
            return;
        }

        try {
            const user = Meteor.users.findOne({_id: coach.id})
                , language = i18n.language(user)
                , callToAction = i18n.translate('coach_billing_email_trial_ending_action', [], language);

            EmailGenerationUtils.generateAndSend(coach.email
                , /* subject = */ i18n.translate('coach_billing_email_trial_ending_subject', [], language)
                , /* text = */ callToAction
                , 'trial-ending', {
                    hello: i18n.translate("coach_billing_email_trial_ending_hello", [coach.name], language),
                    callToAction: callToAction
                }, language);
            record.markAsProcessed();
        } catch (err) {
            record.markAsFailed(typeof err === 'string' ? err : JSON.stringify(err));
        }
    }
}
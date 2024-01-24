import {ServerPaymentTools} from "../../utils/payments/server-payments";
import {Utils} from "../../utils/utils";
import {Coach} from "../coaches/api/collections";
import {logger} from "../../utils/logger";

const LIMIT = Meteor.settings.create_stripe_customer_batch_size || 10;

export default class JobRegisterStripeCostumer {
    static async run() {

        const coaches = Coach.findCoachesNotInStripe();
        let count = 0;
        logger.info(`JobRegisterStripeCostumer ${coaches.length} coaches found without stripe customer`);
        Utils.loopAsync(coaches, async function (iterator) {
            /**@type Coach */
            const coach = iterator.current();
            if (count >= LIMIT) return iterator.finish();
            count++;
            logger.info(`JobRegisterStripeCostumer: processing ${coach.id}`);
            try {
                await ServerPaymentTools.createCostumer(coach);
                await ServerPaymentTools.startSubscription(coach, Coach.nbrOfAthletesInTeam(coach.id));
            } catch (error) {
                logger.error(`JobRegisterStripeCostumer: coach ${coach.id} failed with message - ${typeof error === 'string' ? error: JSON.stringify(error)}`);
            }
            logger.info(`JobRegisterStripeCostumer customer created for coach ${coach.id}`);
            if (iterator.isFinished()) return;
            iterator.next();
        });
    }
}
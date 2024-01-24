import {Expression, Interval} from "./expression";

export class ExpressionUtils {

    /**
     *
     * @param {string} expression
     *
     * @returns {Expression}
     */
    static parse(expression) {
        return new Expression(expression);
    }

    /**
     *
     * @param {string} expression
     *
     * @returns {*}
     */
    static flatten(expression) {
        return new Expression(expression).flatten();
    }

    /**
     *
     * @param {Expression} expression
     */
    static expand(expression) {
        let intervals = expression.flatten(), previous = null, result = [];
        for (let interval of intervals) {
            if (previous === null) {
                previous = interval;
                result.push(interval);
                continue;
            }

            // two sequential work splits
            if ((previous.isRecovery() === false && previous.isBasedInDistance()) && interval.isRecovery() === true) {
                if (interval.isBasedInDistance() === false) {
                    interval.setDuration(86400);
                    interval.setUnitToSeconds();
                }
            }

            // two sequential work splits
            if ((previous.isRecovery() === false && previous.isBasedInDistance()) && interval.isRecovery() === false) {
                result.push(new Interval(86400, Expression.Units.seconds, true));
            }



            result.push(interval);
            previous = interval;
        }

        return result;
    }

    /**
     *
     * @param {Array.Interval} intervals
     */
    static countWorkingIntervals(intervals) {
        let count = 0;
        for (let interval of intervals) {
            if (interval.isRecovery()) {
                continue;
            }
            count++;
        }

        return count;
    }

}

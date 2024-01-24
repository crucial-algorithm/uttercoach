import {Meteor} from "meteor/meteor";
import {chai, expect} from "meteor/practicalmeteor:chai";
import {ExpressionUtils} from "../expressions/utils";

if (Meteor.isServer) {

    describe('Expressions', function () {

        var tests = [];

        tests.push({
            expression: "2 x (10 x 70''/50'')/2' + (10 x 60''/60'')/4'",
            expected: "2 x (10 x 70 seconds descansa 50 seconds) descansa 2 minutes + (10 x 60 seconds descansa 60 seconds) descansa 4 minutes"
        });

        tests.forEach(function (test) {

            it('expression ' + test.expression + ' should parse correctly', function () {

                var expression = ExpressionUtils.parse(test.expression);

                expect(expression.toString()).to.equal(test.expected);
            });
        })
    });
}
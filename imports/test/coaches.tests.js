import {Meteor} from "meteor/meteor";
import {Random} from "meteor/random";
import {chai, expect} from "meteor/practicalmeteor:chai";
import {TestUtils, athleteId, coachId} from "./base.tests";
import {
    CoachTrainingSessions,
    CoachTrainingExpressions,
    CoachAthleteGroup
} from "../modules/coaches/api/collections.js";
import "../modules/coaches/api/methods.js";
import {Expression} from "../expressions/expression";

if (Meteor.isClient) return;

TestUtils.login('coach');

describe('Coach Training Sessions', function () {

    it('should be able to create a new training expression', function () {

        let expressionText = "2 x (2'/1' + 4'/2' + 6'/3')/5'",
            id = TestUtils.method('saveCoachTrainingExpression', coachId)({text: expressionText});

        new Expression(expressionText).toString();

        let coachTrainingExpression = CoachTrainingExpressions.byId(id);

        expect(coachTrainingExpression.text).to.equal(expressionText);
    });

    it('should be able to create, update and delete a coach training session', function () {

        /*
         * Save a new coach training session.
         */
        let date = new Date();
        const saveCoachTrainingExpression = TestUtils.method('saveCoachTrainingExpression', coachId);
        const saveCoachTrainingSession = TestUtils.method('saveCoachTrainingSession', coachId);

        let expressionId = saveCoachTrainingExpression({
            text: "2'/1' + 4'/2' + 6'/3'"
        });

        let id = saveCoachTrainingSession({
            date: date,
            expressionId: expressionId,
            groups: [{name: 'Group 1', athletes: [athleteId]}]
        });

        /*
         * Get the coach training session that we just saved.
         */
        let coachTrainingSession = CoachTrainingSessions.byId(Meteor.userId(), id, true);

        expect(coachTrainingSession.date.toString()).to.equal(date.toString());
        expect(coachTrainingSession.expressionId).to.equal(expressionId);
        expect(coachTrainingSession.groups[0].name).to.equal('Group 1');
        expect(coachTrainingSession.groups[0].athletes[0]).to.equal(athleteId);
        expect(coachTrainingSession.deleted).to.equal(false);

        /*
         * Update the training session.
         */
        const newDate = new Date(),
            newAthleteId = Random.id();

        expressionId = saveCoachTrainingExpression({
            text: "4'/2' + 4'/2' + 6'/3'"
        });

        saveCoachTrainingSession({
            _id: id,
            date: newDate,
            expressionId: expressionId,
            groups: [{name: 'Group 2', athletes: [newAthleteId]}]
        });

        /*
         * Get the coach training session that we just saved.
         */
        coachTrainingSession = CoachTrainingSessions.byId(Meteor.userId(), id, true);

        expect(coachTrainingSession.date.toString()).to.equal(newDate.toString());
        expect(coachTrainingSession.expressionId).to.equal(expressionId);
        expect(coachTrainingSession.groups[0].name).to.equal('Group 2');
        expect(coachTrainingSession.groups[0].athletes[0]).to.equal(newAthleteId);
        expect(coachTrainingSession.deleted).to.equal(false);

        /*
         * Delete the coach training session.
         */
        TestUtils.method('deleteCoachTrainingSession', coachId)(id);

        /*
         * Get the deleted coach training session and make sure it's undefined.
         */
        coachTrainingSession = CoachTrainingSessions.byId(Meteor.userId(), id, true);

        expect(coachTrainingSession.deleted).to.equal(true);
    });

    it('should be able to create a coach athletes group', function () {

        /*
         * Save a new coach athletes group.
         */
        let id = TestUtils.method('saveCoachAthleteGroup', coachId)({
            name: 'Juniors',
            athletes: [{user: athleteId}]
        });


        /**@type CoachAthleteGroup */
        let coachAthleteGroup = CoachAthleteGroup.find(id);
        expect(coachAthleteGroup).to.be.a('object');
        expect(coachAthleteGroup.name).to.equal('Juniors');
        expect(coachAthleteGroup.athletes[0]).to.equal(athleteId);
    });

    it('should be able to update a coach athletes group', function () {

        /*
         * Save a new coach athletes group.
         */
        let id = TestUtils.method('saveCoachAthleteGroup', coachId)({
            name: 'Juniors',
            athletes: [{user: athleteId}]
        });


        /**@type CoachAthleteGroup */
        let coachAthleteGroup = CoachAthleteGroup.find(id);
        expect(coachAthleteGroup).to.be.a('object');

        /*
         * Update the coach athletes group.
         */
        const newUserId = Random.id();

        TestUtils.method('saveCoachAthleteGroup', coachId)({
            _id: id,
            name: 'Seniors',
            athletes: [{user: newUserId}]
        });

        /*
         * Get the coach athletes group that we just saved.
         */
        coachAthleteGroup = CoachAthleteGroup.find(id);

        expect(coachAthleteGroup.name).to.equal('Seniors');
        expect(coachAthleteGroup.athletes.toString()).to.equal([newUserId].toString());
    });

    it('should be able to delete a coach athletes group', function () {

        /*
         * Save a new coach athletes group.
         */
        let id = TestUtils.method('saveCoachAthleteGroup', coachId)({
            name: 'Juniors',
            athletes: [{user: athleteId}]
        });


        /**@type CoachAthleteGroup */
        let coachAthleteGroup = CoachAthleteGroup.find(id);
        expect(coachAthleteGroup).to.be.a('object');

        /*
         * Delete the coach athletes group.
         */
        TestUtils.method('deleteCoachAthleteGroup', coachId)(id);

        /*
         * Get the deleted coach training session and make sure it's undefined.
         */
        coachAthleteGroup = CoachAthleteGroup.find(id);

        expect(coachAthleteGroup).to.equal(null);
    });
});



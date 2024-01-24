import {Meteor} from "meteor/meteor";
import {Random} from "meteor/random";
import {chai, expect} from "meteor/practicalmeteor:chai";
import TestUtils, {athleteId, coachId} from "./base.tests";
import {TrainingSession} from "../modules/training-sessions/api/collections";
import {CoachTrainingSessions} from "../modules/coaches/api/collections";
import "../modules/training-sessions/api/methods";
import "../modules/live/api/methods";
import {LiveDevice} from "../modules/live/api/collections";

if (Meteor.isClient) return;

TestUtils.login('athlete');

/**
 *
 * @param {Date} date
 * @return {String}
 */
function createSession(date) {
    let now = date.getTime();
    return TestUtils.method('saveTrainingSession')({
        description: 'Training Session 1',
        date: date,
        data: [
            {
                "timestamp": now + 1000,
                "spm": 20.00000,
                "speed": 10.00000,
                "distance": 0.00000,
                "spmEfficiency": 0.00000,
                "split": -1
            },
            {
                "timestamp": now + 2000,
                "spm": 40.00000,
                "speed": 12.00000,
                "distance": 0.01000,
                "spmEfficiency": 1.00000,
                "split": -1
            },
            {
                "timestamp": now + 3000,
                "spm": 20.00000,
                "speed": 10.00000,
                "distance": 0.02200,
                "spmEfficiency": 2.00000,
                "split": -1
            },
            {
                "timestamp": now + 4000,
                "spm": 40.00000,
                "speed": 12.00000,
                "distance": 0.03200,
                "spmEfficiency": 3.00000,
                "split": -1
            },
            {
                "timestamp": now + 5000,
                "spm": 20.00000,
                "speed": 10.00000,
                "distance": 0.04400,
                "spmEfficiency": 4.00000,
                "split": -1
            },
            {
                "timestamp": now + 6000,
                "spm": 40.00000,
                "speed": 12.00000,
                "distance": 0.05400,
                "spmEfficiency": 5.00000,
                "split": -1
            }
        ],
        angleZ: 0,
        noiseX: 0,
        noiseZ: 0,
        factorX: 0,
        factorZ: 0,
        axis: 0
    });
}

describe('Training Sessions', function () {

    it('should be able to create a training session', function () {
        let date = new Date();
        let id = createSession(date)
        let trainingSession = TrainingSession.find(id);

        expect(trainingSession).to.be.a('object');
        expect(trainingSession.date.toString()).to.equal(date.toString());
        expect(trainingSession.data.length).to.equal(6);
        expect(trainingSession.avgSpm).to.equal(30.00000);
        expect(trainingSession.avgSpeed).to.equal(38.879999999999995);
        expect(trainingSession.distance).to.equal(0.05400);
    });

    it('should be able to delete a training session', function () {

        let date = new Date();
        let id = createSession(date)
        let trainingSession = TrainingSession.find(id);
        expect(trainingSession.date.toString()).to.equal(date.toString());

        TestUtils.method('deleteTrainingSession')(id);

        /*
         * Get the deleted training session and make sure it's undefined.
         */
        trainingSession = TrainingSession.find(id);

        expect(trainingSession).to.equal(null);
    });

    it('should be able to create a training session associated with a coach training session', function () {

        let date = new Date(),
            athleteId = Random.id(),
            expressionId = TestUtils.method('saveCoachTrainingExpression', coachId) ({
                text: "2'/1' + 4'/2' + 6'/3'"
            }),
            coachTrainingSessionId = TestUtils.method('saveCoachTrainingSession', coachId)({
                date: date,
                expressionId: expressionId,
                groups: [{name: 'Group 1', athletes: [athleteId]}]
            }),
            trainingSessionId = TestUtils.method('saveTrainingSession')({
                description: 'Training Session 2',
                date: new Date(),
                data: [{
                    "timestamp": 1454755008000,
                    "spm": 20.00000,
                    "speed": 10.00000,
                    "distance": 0.00000,
                    "spmEfficiency": 0.00000,
                    "split": -1
                }],
                angleZ: 0,
                noiseX: 0,
                noiseZ: 0,
                factorX: 0,
                factorZ: 0,
                axis: 0,
                coachTrainingSessionId: coachTrainingSessionId
            });

        let trainingSession = TrainingSession.find(trainingSessionId);

        // check if the coach training session identifier was registered in the training session
        expect(trainingSession.coachTrainingSessionId).to.equal(coachTrainingSessionId);

        let coachTrainingSession = CoachTrainingSessions.byId(Meteor.userId(), coachTrainingSessionId, true);

        // check if the training session identifier was registered in the coach training session
        expect(coachTrainingSession.trainingSessionIds).to.eql([trainingSessionId]);

        // update the coach training session
        TestUtils.method('saveCoachTrainingSession', coachId)({
            _id: coachTrainingSessionId,
            date: date,
            expressionId: expressionId,
            groups: [{name: 'Group 1', athletes: [athleteId]}]
        });

        coachTrainingSession = CoachTrainingSessions.byId(Meteor.userId(), coachTrainingSessionId, true);

        // check if the training session identifier is still registered in the coach training session
        expect(coachTrainingSession.trainingSessionIds).to.eql([trainingSessionId]);
    });

    it('should fail to create a duplicate training session', function () {
        let date = new Date();
        let id = createSession(date)
        let trainingSession = TrainingSession.find(id);
        expect(trainingSession).to.be.a('object');

        let duplicate = createSession(date);
        expect(duplicate).to.equal(id);
    });

});


describe('Live training Sessions', function () {
    it('should update device status has ready to start', function () {
        let id = TestUtils.method('deviceReadyToStart')();
        expect(id).to.equal(athleteId);

        let liveDevice = LiveDevice.find(athleteId);
        expect(liveDevice).to.not.equal(null);
        expect(liveDevice.activeSessionId).to.equal(null);
    });

    it('should update device last seen timestamp', function () {
        let id = TestUtils.method('deviceReadyToStart')();
        expect(id).to.equal(athleteId);

        TestUtils.method('deviceSpotted')();
        let liveDevice = LiveDevice.find(athleteId);
        expect(liveDevice).to.not.equal(null);
        expect(liveDevice.lastSeenAt).to.be.above(Date.now() - 1000);
    });

});
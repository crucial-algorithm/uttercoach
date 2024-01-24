import {Meteor} from "meteor/meteor";
import {chai, expect} from "meteor/practicalmeteor:chai";
import {athleteId, TestUtils} from "./base.tests";
import "../modules/users/api/methods";
if (Meteor.isClient) return;

TestUtils.login('athlete');
TestUtils.overrideUsersSchema();

describe('User API', function () {

    it('should be able to save profile', function () {

        let profile = {
            name: 'Danny Athlete',
            email: 'danny@mailinator.com',
            origin: 'uttercycling'
        };

        TestUtils.method('saveProfile')(profile);

        const user = Meteor.users.findOne({_id: athleteId});
        expect(user.profile.name).to.be.equal(profile.name);

    });

    it('should be able to check if user has coach', function () {
        let hasCoach = TestUtils.method('hasCoach')(athleteId);
        expect(hasCoach).to.be.equal(false);
    });

    it('should fail because method is not declared in security', function () {
        try {
            TestUtils.method('dummyMethodForUnitTesting')(athleteId);
            expect(false).to.be.equal(true);
        } catch(e) {
            expect(e.error).to.be.equal('not-authorized:paddler');
        }

    });
});
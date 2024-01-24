import {CoachTrainingSessions, CoachTrainingExpressions} from "./collections.js";
import {Geteor} from "../../../../server/core";
import {Coach, CoachAthleteGroup, Team} from "./collections";
import {Athlete} from "../../athletes/api/collections";
import {TrainingSession} from "../../training-sessions/api/collections";

/**
 *
 * @param coachId
 * @param plus
 * @return {Mongo.Cursor[]}
 */
function team(coachId, plus) {
    let athletes = Team.coachAthletes(coachId);
    let ids = athletes.map(function (athlete) {
        return athlete.id
    });
    return [Coach.cursorFind(coachId)
        , Athlete.cursorFindInList(ids)
        , Team.cursorCoachAthletes(coachId)
    ].concat(plus)
}


/**
 * Fetch coach training sessions by month.
 */
Geteor.publish('coachTrainingSessions.month', function (year, month) {
    return CoachTrainingSessions.byMonth(this.userId, year, month);
});

/**
 * Fetch coach training sessions by interval.
 */
Geteor.publish('coachTrainingSessions.interval', function (startDate, endDate) {
    return CoachTrainingSessions.byInterval(this.userId, startDate, endDate);
});

/**
 * Fetch a coach training session by identifier.
 */
Geteor.publish('coachTrainingSessions.detail', function (id) {
    return CoachTrainingSessions.byId(this.userId, id);
});


/**
 * Fetch all athlete groups for a given coach.
 */
Geteor.publish('coachAthleteGroups.all', function () {
    return CoachAthleteGroup.cursorFindCoachGroups(this.userId);
});

/**
 * Fetch athlete group for a given coach.
 */
Geteor.publish('coachAthleteGroups.forAthlete', function (id) {
    return CoachAthleteGroup.cursorFindCoachGroupForAthlete(id, this.userId);
});

/**
 * Fetch all athlete groups, independent of coach
 */
Geteor.publish('coachAthleteGroups.allAthletesGroups', function (id) {
    return CoachAthleteGroup.cursorFindAllAthleteGroups(id);
});

/**
 * Publication for page with the same name
 */
Geteor.publish('dashboard', function () {
    return team(this.userId, [CoachTrainingExpressions.getAll(this.userId)
        , CoachAthleteGroup.cursorFindCoachGroups(this.userId)]);
});

/**
 * Publication for page with the same name
 */
Geteor.publish('coach.team', function () {
    return team(this.userId, [CoachAthleteGroup.cursorFindCoachGroups(this.userId)]);
});


/**
 * Fetch all training expressions for a given coach.
 */
Geteor.publish('coachTrainingExpressions.all', function () {
    return CoachTrainingExpressions.getAll(this.userId);
});


/**
 * Fetch a coach training expression by identifier.
 */
Geteor.publish('coachTrainingExpressions.forSession', function (sessionId) {
    let tSession = CoachTrainingSessions.findOne({_id: sessionId});
    return CoachTrainingExpressions.find({_id: tSession.expressionId})
});

Geteor.publish('coach.info', function () {
    return Coach.cursorFind(this.userId);
});

Geteor.publish('coach.all', function () {
    return Coach.cursorAll();
});

Geteor.publish('coach.basic', function () {
    return team(this.userId, []);
});

Geteor.publish('coach.trainingSessions', function (from, to) {
    let coach = Coach.find(this.userId);
    if (!coach) return this.ready();
    let athletes = coach.athleteIds();
    return TrainingSession.cursorFindSessionsBetweenDatesForAthletes(athletes, from, to, false, coach.suppression);
});

Geteor.publish('coach.schedule', function () {
    const startDate = moment().add(-5, 'weeks');
    const endDate = moment().add(5, 'weeks');
    return [
        CoachAthleteGroup.cursorFindCoachGroups(this.userId),
        CoachTrainingExpressions.getAll(this.userId),
        CoachTrainingSessions.byInterval(this.userId, startDate.toDate(), endDate.toDate())
    ]
});


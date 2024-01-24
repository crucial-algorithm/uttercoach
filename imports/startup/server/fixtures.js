import {TrainingSessionsUtils} from "../../modules/training-sessions/api/utils.js";
import {
    CoachTrainingSessions,
    CoachTrainingExpressions
}    from '../../modules/coaches/api/collections.js';

import {Meteor} from 'meteor/meteor';
import {Generator} from './session-generator';
import {Expression} from '../../expressions/expression';
import {CoachUtils} from "../../modules/coaches/api/utils";
import {CoachAthleteGroup} from "../../modules/coaches/api/collections";
import {TrainingSession} from "../../modules/training-sessions/api/collections";



const [administratorId, athleteId, coachId] = ["mzNME2AJWYXtMDoxc", "Q8PQgL6J6KgzCF2FJ", "8KK8g5Y3QDCHu6tac"];
const [coachGroup1Id, coachGroup2Id] = ['GEcBJtkPRJE4LJzJR', 'nBaAXL28YwzjJTRFM'];

const expressions = [
    {id: "eaaaaaaaaaaaaaaa1", expr: "2 x 1km/1'"},
    {id: "eaaaaaaaaaaaaaaa2", expr: "2 x 1km/2' + 10 x 15''/95''"},
    {id: "eaaaaaaaaaaaaaaa3", expr: "2 x 1km/2' + 3 x 750m/1'"},
    {id: "eaaaaaaaaaaaaaaa4", expr: "10 x 70''/50'' + 10 x 60''/60''"},
    {id: "eaaaaaaaaaaaaaaa5", expr: "10km"},
    {id: "eaaaaaaaaaaaaaaa6", expr: "2'/1' + 4'/2' + 6'/3' + 8'/4'"},
    {id: "eaaaaaaaaaaaaaaa7", expr: "2 x (2'/1' + 4'/2' + 6'/3' + 8'/4')/4'"},
    {id: "eaaaaaaaaaaaaaaa8", expr: "2 x (10 x 70''/50'')/2'"}
];

// users without facebook login
var athletes = [athleteId, "prjBoGbfiftyN9usz", "2GrL2fTPHs7f4oH5c", "79q7t83mugCiFKHdb", "cM249CbGcjKKKPoQ4"];


function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    return (s4() + s4() + s4() + s4() + s4()).substr(0, 17);
}

function random(min, max) {
    return parseInt(Math.random() * (max - min) + min);
}


/**
 * Generate Users
 */
function createUsers() {
    console.log('> GENERATING USERS');

    Meteor.users.insert({
        "_id": coachId,
        "createdAt": new Date(),
        "profile": {
            "name": "James Coach",
            "email": "james_rknjffn_coach@tfbnw.net",
            "country": null,
            "gender": "male",
            "birthdate": null,
            "about": null,
            "debug": false
        },
        "services": {
            "facebook": {
                "accessToken": "EAAHh5gxsEq4BAL4b0WwKfZAkEoA7fEAWI9TsNrMaRbcjgG4ThXlMoZBiBvMV939VevfNHMYIJiY0F8948YIVk5jLMBftV9v9nVcuVX0nlm7uIt2180TZAr9gVhm73YCe8VuXwr2pCXM0cQlcmUwdokB1ejrZBeuWY6xNHLhHiOt2OBZB3pKfr",
                "expiresAt": 1601936059000.0,
                "id": "112820045851430",
                "email": "james_rknjffn_coach@tfbnw.net",
                "name": "James Coach",
                "first_name": "James",
                "last_name": "Coach",
                "link": "https://www.facebook.com/app_scoped_user_id/112820045851430/",
                "gender": "male",
                "locale": "en_US",
                "age_range": {
                    "min": 21
                }
            }
        }
    });

    Meteor.users.insert({
        "_id": administratorId,
        "createdAt": new Date(),
        "profile": {
            "name": "Karen Administrator",
            "email": "karen_ibnedwm_administrator@tfbnw.net",
            "country": null,
            "gender": "female",
            "birthdate": null,
            "about": null,
            "debug": false
        },
        "services": {
            "facebook": {
                "accessToken": "EAAHh5gxsEq4BAB35CE6raKlVZACKxOLSyqjxOzqaNGZBEMiYd63Hjr4dZA3rHPDoCZB1wxHLrHCZBnUSuYAtVwZBza2oPDdAuUZA2KZAD0KZCPs2CckOBZAOA0ZCrsUfc9L3W0oGarZCOhJeT3WAxQLTlxnTifAKapMVbpYBszVJjD9irZCxEOvzWJrIx",
                "expiresAt": 1601936059000.0,
                "id": "117557155376606",
                "email": "karen_ibnedwm_administrator@tfbnw.net",
                "name": "Karen Administrator",
                "first_name": "Karen",
                "last_name": "Administrator",
                "link": "https://www.facebook.com/app_scoped_user_id/117557155376606/",
                "gender": "female",
                "locale": "en_US",
                "age_range": {
                    "min": 21
                }
            }
        }
    });

    Meteor.users.insert({
        "_id": athleteId,
        "createdAt": new Date(),
        "profile": {
            "name": "John Athlete",
            "email": "john_ehyxnrk_athlete@tfbnw.net",
            "country": null,
            "gender": "male",
            "birthdate": null,
            "about": null,
            "debug": false
        },
        "services": {
            "facebook": {
                "accessToken": "EAAHh5gxsEq4BAKEpewnnIlbHlgjWPZCfW8OacEVZAuZAFm4PuVGdBGjXBlGZChu8rId2nHf6tnyjvNcvMV9reOs8cIFr8RHbbwM6J9Ub8dpbOcRQdm5VHSXRnZCZCI5XxcbsiR8kuuFhifCfYbcSHO5Jq476g9ZA8pVo9SQ4WH4wEIFj2RLWnkU",
                "expiresAt": 1601936059000.0,
                "id": "102882346848146",
                "email": "john_ehyxnrk_athlete@tfbnw.net",
                "name": "John Athlete",
                "first_name": "John",
                "last_name": "Athlete",
                "link": "https://www.facebook.com/app_scoped_user_id/102882346848146/",
                "gender": "male",
                "locale": "en_US",
                "age_range": {
                    "min": 21
                }
            }
        }
    });

    Meteor.users.insert({
        "_id": "prjBoGbfiftyN9usz",
        "createdAt": new Date(),
        "services": {
            "facebook": {
                "accessToken": "EAAHh5gxsEq4BAAZAjCUqneZBwWihvG9pr7mw6RwlR80r5F0WVeRI6VX2laVqWjnvDVQv5Wld69lZApFTSOn5lFpDclTQ9NgHsRJMVzVRnlVdK4fWRvP5rxfgF9Ad2OZAvcKCNXXwbV2qtPgZA7RgZBI7UpLtq57fN2y2TWsYftFwZDZD",
                "expiresAt": 1482041624305.0,
                "id": "113066202497777",
                "email": "lisa_nzqvgjz_seligsteinberg@tfbnw.net",
                "name": "Lisa Seligsteinberg",
                "first_name": "Lisa",
                "last_name": "Seligsteinberg",
                "link": "https://www.facebook.com/app_scoped_user_id/113066202497777/",
                "gender": "female",
                "locale": "en_US",
                "age_range": {
                    "max": 20,
                    "min": 18
                }
            },
            "resume": {
                "loginTokens": []
            }
        },
        "profile": {
            "name": "Lisa Seligsteinberg",
            "email": "lisa_nzqvgjz_seligsteinberg@tfbnw.net",
            "country": null,
            "gender": "female",
            "birthdate": null,
            "about": null,
            "debug": false
        }
    });

    athletes.push(Meteor.users.insert({
        "_id": "2GrL2fTPHs7f4oH5c",
        "createdAt": new Date(),
        "services": {
            "facebook": {
                "accessToken": "EAAHh5gxsEq4BAEF1yDSc78uUd2R5AD0B8ivxGJrJcV33bAk4fijWcilZCou466prRZCYyHvtkZAiLGaEHZCqMZBnZCvQHrDx5MeI4wJugxHbourqmrQGsETvUfuETvZCFHguc7B2bRKcfJG6jB0mZBeUOgYtqNEZBWbWIwpEAeSCyfgZDZD",
                "expiresAt": 1482041700936.0,
                "id": "105151243293519",
                "email": "betty_jhashto_okelolason@tfbnw.net",
                "name": "Betty Okelolason",
                "first_name": "Betty",
                "last_name": "Okelolason",
                "link": "https://www.facebook.com/app_scoped_user_id/105151243293519/",
                "gender": "female",
                "locale": "en_US",
                "age_range": {
                    "max": 20,
                    "min": 18
                }
            },
            "resume": {
                "loginTokens": []
            }
        },
        "profile": {
            "name": "Betty Okelolason",
            "email": "betty_jhashto_okelolason@tfbnw.net",
            "country": null,
            "gender": "female",
            "birthdate": null,
            "about": null,
            "debug": false
        }
    }));

    Meteor.users.insert({
        "_id": "79q7t83mugCiFKHdb",
        "createdAt": new Date(),
        "services": {
            "facebook": {
                "accessToken": "EAAHh5gxsEq4BAHIyKzkeNVyW1ttQ48dIHaK2nwxXJ5HoxawHUF7n5jtZABZAxowJg48G3FLwgNjtZCZBc6GRDlZCstSbUES1BGXSjrKOaUdxb5SZA6Mh6M7ZCxD8NoKM2NVbopZCpMHaQZAbxjDCwL8NGPcjl7fgsvCgOkQ3AhVdUZAgZDZD",
                "expiresAt": 1482041735191.0,
                "id": "112059392598612",
                "email": "karen_dmqgama_mcdonaldsky@tfbnw.net",
                "name": "Karen McDonaldsky",
                "first_name": "Karen",
                "last_name": "McDonaldsky",
                "link": "https://www.facebook.com/app_scoped_user_id/112059392598612/",
                "gender": "female",
                "locale": "en_US",
                "age_range": {
                    "max": 20,
                    "min": 18
                }
            },
            "resume": {
                "loginTokens": []
            }
        },
        "profile": {
            "name": "Karen McDonaldsky",
            "email": "karen_dmqgama_mcdonaldsky@tfbnw.net",
            "country": null,
            "gender": "female",
            "birthdate": null,
            "about": null,
            "debug": false
        }
    });

    Meteor.users.insert({
        "_id": "cM249CbGcjKKKPoQ4",
        "createdAt": new Date(),
        "services": {
            "facebook": {
                "accessToken": "EAAHh5gxsEq4BAJUMmRCliBrNHALbd93ZBrJOZCkeRRgPFfVhBkI2Ogkqs5oFNuNwWelV9AW3KzBSCXMZBgMre3objVwj1alZBh5SKfooCDf6FBA3ZAssasZAC6aGkSTLmCstr7KPWPXnq6QSZBmLPOg7CrhOxAhUb5R2VvZC1lp4JAZDZD",
                "expiresAt": 1482041764410.0,
                "id": "111674402636959",
                "email": "dave_jryzfmy_fallerescu@tfbnw.net",
                "name": "Dave Fallerescu",
                "first_name": "Dave",
                "last_name": "Fallerescu",
                "link": "https://www.facebook.com/app_scoped_user_id/111674402636959/",
                "gender": "male",
                "locale": "en_US",
                "age_range": {
                    "max": 20,
                    "min": 18
                }
            },
            "resume": {
                "loginTokens": []
            }
        },
        "profile": {
            "name": "Dave Fallerescu",
            "email": "dave_jryzfmy_fallerescu@tfbnw.net",
            "country": null,
            "gender": "male",
            "birthdate": null,
            "about": null,
            "debug": false
        }
    });

    Roles.addUsersToRoles(administratorId, ['admin']);
    Roles.addUsersToRoles(coachId, ['coach']);
}

/**
 * Generate groups for coach
 */
function createCoachGroups() {
    console.log('> GENERATE COACH GROUPS');
    CoachAthleteGroup.instantiateFromRecord({
        _id: coachGroup1Id,
        name: 'Séniores K1',
        user: coachId,
        athletes: []
    }).save();

    CoachAthleteGroup.instantiateFromRecord({
        _id: coachGroup2Id,
        name: 'Séniores C1',
        user: coachId,
        athletes: []
    }).save();
}

/**
 * Create session definitions (expressions)
 */
function createSessionDefinitions() {
    for (let i = 0; i < expressions.length; i++) {
        CoachTrainingExpressions.insert({
            _id: expressions[i].id,
            text: expressions[i].expr,
            user: coachId,
            createdAt: moment().unix(),
            deleted: false
        })
    }
}

/**
 * Generate sessions for all athletes
 * @param {date} from   start generating from this date till the day before
 */
function generateTrainingSessions(from) {

    console.log('> GENERATING TRAINING SESSIONS');

    let date = from,
        yesterday = moment().add(-1, 'days');

    while (yesterday.diff(date, 'days') > 0) {

        if (moment(date).day() == 0) {
            date = moment(date).add(1, 'day');
            continue;
        }

        let expression = expressions[random(0, expressions.length - 1)],
            trainingSessionId = CoachTrainingSessions.insert({
                user: coachId,
                date: date.toDate(),
                expressionId: expression.id,
                groups: [coachGroup1Id, coachGroup2Id],
                trainingSessionIds: [],
                deleted: false
            });

        for (let i = 0; i < athletes.length; i++) {
            let athlete = athletes[i];

            console.log(athlete, ' Adding session ', expression.expr, " for ", athlete, " in ", date.format("YYYY-MM-DD HH:mm"));

            let expr = new Expression(expression.expr);
            let dt = date.unix() * 1000;

            let trainingSession = Generator.session(expr, dt);
            trainingSession.user = athlete;
            trainingSession.coachTrainingSessionId = trainingSessionId;
            try {
                trainingSession = TrainingSessionsUtils.processTrainingSession(trainingSession, false);
                trainingSession.createdAt = Date.now();
                TrainingSessionsUtils.updateSummaryData(trainingSession, false);

                let id = trainingSession.insert();

                CoachUtils.updateCoachTrainingSession(trainingSessionId, id, athlete);
            } catch (err) {
                console.log(err);
            }
        }

        date = moment(date).add(1, 'day');
    }
}

function run() {
    if (Meteor.users.find().count() === 0) {
        createUsers();
    }

    if (CoachAthleteGroup.all().length === 0) {
        createCoachGroups();
    }

    if (CoachTrainingExpressions.find().count() === 0) {
        createSessionDefinitions();
    }

    let lastSessions = TrainingSession.findAllSessionsBetween(moment.add(-365).getDate())

    let from;

// if we don't have any sessions, generate some session history
    if (lastSessions.count() === 0) {
        generateTrainingSessions(moment().add(-7, 'days'));
    }
// otherwise, generate from last session until yesterday
    else if (moment().add(-1, 'days').diff(from = lastSessions.fetch()[0].date, 'days') > 1) {
        generateTrainingSessions(moment(from));
    }
}

if (process.env.NODE_ENV === 'development' && parseInt(process.env.GEN_MOCK_SESSIONS) === 1) {
    run();
}

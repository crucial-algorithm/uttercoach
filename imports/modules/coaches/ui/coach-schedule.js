import { Meteor }          from 'meteor/meteor';
import { Template }        from 'meteor/templating';
import { Expression }      from '../../../expressions/expression';

import { CoachTrainingSessions }    from '../api/collections.js';
import { CoachTrainingExpressions } from '../api/collections.js';
import {Button, Modal, Utils} from "../../../utils/utils";

import './coach-schedule.scss';
import './coach-schedule.html';
import i18n from "../../../utils/i18n";
import {CoachAthleteGroup} from "../api/collections";
import {WeekPlanningView} from "../../../utils/widgets/week-view";

/**@type WeekPlanningView */
let week;

/**
 *
 * @param {WeekPlanningView} week
 */
function loadPlannedSessions(week) {
    let plannedSessions = CoachTrainingSessions.find().fetch();
    for (let session of plannedSessions) {

        let expression = CoachTrainingExpressions.findOne({_id: session.expressionId}).text;
        let duration = new Expression(expression, null).estimatedFullDuration();
        let groups = [];
        session.groups.map((id) => {
            const group = CoachAthleteGroup.find(id);
            if (group) groups.push(group.name);
        });
        let title = i18n.translate('schedule_session_one_liner',
            [expression, groups.join(', '), Utils.formatDurationInTimeShort(duration)]);
        week.appendToDay(session.date,`<div data-id="${session._id}" class="coach-schedule-session-one-liner">${title}</div>`);
    }
}

/**
 * Initialize events
 */
Template.coachSchedule.onCreated(function () {});

/**
 * Create the calendar once the template DOM is ready.
 */
Template.coachSchedule.onRendered(function () {
    Tracker.autorun(() => {

        // Keep this - force autorun to "link" CoachTrainingSessions to running this code
        console.log('...', CoachTrainingSessions.find().fetch());

        (function waitForModalToClose() {
            if (Modal.isAModalOpen()) {
                setTimeout(() => {
                    waitForModalToClose()
                }, 100);
            } else {
                startWeekPlanningView(week ? week.position : undefined)
            }
        })();
    });
});

Template.coachSchedule.helpers({

    coachTrainingExpressions: function () {
        return CoachTrainingExpressions.find({deleted: false}, {sort: {createdAt: -1}});
    },

    getGroups: function () {
        return CoachAthleteGroup.findCoachGroups(Meteor.userId());
    }
});


function startWeekPlanningView(position = undefined) {
    let calendar = document.getElementById('calendar');
    if (week) {
        calendar.style.minHeight = calendar.clientHeight + "px";
        week.destroy();
    }
    week = new WeekPlanningView(document.getElementById('calendar'), position);
    setTimeout(() => {
        loadPlannedSessions(week);
    }, 0);

    week.on('coach-schedule-session-one-liner', (e) => {
        console.log('Edit event', e.target.getAttribute('data-id'));
        let session = CoachTrainingSessions.findOne({_id: e.target.getAttribute('data-id')});
        if (!session) return;
        showSessionModal(session.date, session);
    });

    week.on(['coach-schedule-add-session', 'day-footer'], (e) => {
        let $li = $(e.target).closest('li')
            , dt = $li.data('day');

        if (!dt) return;

        showSessionModal(new Date(dt));
    });
}


/**
 *
 * @param {Date}    date
 * @param {}        session
 */
function showSessionModal(date, session = null) {
    let $body = null, $visual = null
        , $expression = null, $error = null
        , $groups
        , $requiredError = null
        , isEdit = session !== null
    ;

    const modal = Modal.factory(Modal.types().CONFIRM, $('#create-session'), {
        title: i18n.translate(isEdit ? "schedule_existing_session" : "schedule_new_session"),
        primary: {
            label: i18n.translate(isEdit ? 'schedule_update' : 'schedule_expression_create'),
            callback: function () {
                const expression = $expression.val(), groups = $groups.val();
                if (!validate(expression, $error)|| groups.length === 0) {
                    $requiredError.css('visibility', 'visible');

                    setTimeout(function () {
                        $requiredError.css('visibility', 'hidden')
                    }, 4000);

                    if (!expression)
                        $expression.focus();
                    return;
                }

                if (isEdit) {
                    session.groups = groups;
                    Meteor.call('saveCoachTrainingSession', session, (err) => {
                        if (!err) {
                            modal.hide();
                        }
                    });
                    return;
                }

                saveExpression(expression)
                    .then(function (exprId) {
                        return scheduleSession(exprId, date, groups)
                    })
                    .then(function (sessionId) {
                        modal.hide();
                    })
                    .fail(function () {
                        console.log('something went wrong');
                    });
            }
        },
        secondary: {
            label: i18n.translate('modal_discard')
        },
        destroyOnHide: true
    });

    modal.show().then(() => {
        $body = modal.$modal.find('.modal-body');
        $expression = $body.find('#new-expression');
        $error = $body.find('#new-expression-error');
        $visual = $body.find('#visual-session-representation');
        $groups = $body.find('#groups');
        $requiredError = $body.find('#fields-required-error');
        $groups.selectpicker();
        $body.find('.coach-schedule-day-label').html(formatDay(date));

        let $delete = $body.find('.coach-schedule-remove-session');

        $delete.off('click').on('click', (e) => {
            Button.confirm(e.target, () => {
                Meteor.call('deleteCoachTrainingSession', session._id, (err) => {
                    if (!err) {
                        modal.hide();
                    }
                });
            });
        });

        if (session !== null) {
            $body.find('#coach-schedule-session-container').addClass('coach-schedule-session-container-edit');
            let expr = CoachTrainingExpressions.findOne({_id: session.expressionId}).text;
            $expression.val(expr);
            $expression.prop('disabled', true);
            displayExpression(new Expression(expr, undefined), $visual);
            $groups.selectpicker('val', session.groups);
            $delete.show();
            let $tap = $body.find('.coach-schedule-session-tap-to-copy-message');
            $tap.off('click').on('click', () => {
                $expression.prop("disabled", false);

                let input = $expression[0];

                /* Select the text field */
                input.select();
                input.setSelectionRange(0, 99999); /*For mobile devices*/

                /* Copy the text inside the text field */
                document.execCommand("copy");


                $tap.text(i18n.translate("schedule_text_copied"));
                $expression.prop("disabled", true);
            });
            return;
        } else {
            $expression.off('click')
        }

        $expression.off('input').on('input', function () {
            let value = $expression.val();
            if (validate(value, $error)) {
                displayExpression(new Expression(value, undefined), $visual);
            }
        });

        $expression.focus();
    });

    function validate(value, $error) {
        try {
            new Expression(value, undefined);
            $error.css('visibility', 'hidden');
            return true;
        } catch (err) {
            $error.css('visibility', 'visible');
            return false;
        }
    }
}

function formatDay(date) {
    let lang = i18n.getDateLang();
    let dayOfWeek = date.toLocaleDateString(lang, {weekday: 'long'});
    let dayOfMonth = (date.getDate() + "").padStart(2, '0');
    let month = date.toLocaleDateString(lang, {month: 'short'});
    return `${dayOfWeek} (${dayOfMonth} ${month})`
}

/**
 * Save session intervals definition
 *
 * @param expression
 */
function saveExpression(expression) {
    let p = $.Deferred();

    Meteor.call('saveCoachTrainingExpression', {text: expression}, function (err, id) {

        if (err) {
            console.error(err);
            p.reject();
            return;
        }

        p.resolve(id);
    });

    return p.promise();
}

/**
 * Schedule session
 *
 * @param {Date} date
 * @param exprId
 * @param groups
 */
function scheduleSession(exprId, date, groups) {
    let p = $.Deferred();

    let sessionDefinition = {
        date: date,
        expressionId: exprId,
        groups: groups || []
    };

    Meteor.call('saveCoachTrainingSession', sessionDefinition, function (err, id) {

        if (err) {
            console.error(err);
            p.reject();
            return;
        }

        p.resolve(id);
    });

    return p.promise();
}

/**
 *
 * @param {Expression} expression
 * @param $target
 */
function displayExpression(expression, $target) {
    $target.empty();

    let secsToPixelsRatio = 0.5;
    let $blocks = $('<div/>'), $summary;


    let intervals = expression.flatten();
    let duration, total = 0, css, width, work = 0, seconds;
    for (let interval of intervals) {
        seconds = interval.estimatedDurationInSeconds();
        duration = Math.max(seconds, 50);
        total += duration;

        if (interval.isRecovery()) {
            css = 'recovery';
        } else {
            css = 'portion';
            work += (seconds * 1000);
        }

        width = duration * secsToPixelsRatio;
        $blocks.append(`<div class="${css}" style="width:${width}px">${interval.getDuration()}</div>`);
    }

    let fullDuration = expression.estimatedFullDuration();
    let summary = i18n.translate("schedule_visual_summary", [
        Utils.formatDurationInTimeShort(fullDuration)
        , Utils.formatDurationInTimeShort(work), Utils.formatDurationInTimeShort(fullDuration - work)]);
    $summary = `<div class="summary">${summary}</div>`;

    $blocks.width(total * secsToPixelsRatio + (intervals.length * 2));
    $target.append($summary);
    $target.append($blocks);
}

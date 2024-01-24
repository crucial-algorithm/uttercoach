'use static';
import "./athlete.scss";
import "./athlete.html";
import "highcharts";
import {TrainingSession} from "../../training-sessions/api/collections"
import {Utils, Modal, Button} from "../../../utils/utils";
import ChartBuilder from "../../../ui/charts";
import {Athlete} from "../api/collections";
import 'bootstrap-daterangepicker';
import 'bootstrap-daterangepicker/daterangepicker.css';
import i18n from "../../../utils/i18n";
import { Session } from 'meteor/session'
import SessionUI from "../../coaches/ui/dashboard-session";
import {Coach} from "../../coaches/api/collections";

let periodTracker = new Tracker.Dependency()
    , groupBy = ChartBuilder.groups().WEEK
    , from = moment().startOf('week').add(-5, 'weeks').toDate()
    , to = moment().add(7, 'days').startOf('week').toDate()
    , excludeFree = false
    , mobileFiltersModal = null
    , blameModal = null
;

const SESSION_VARIABLES = {
    FROM: 'athlete.filters.from',
    TO: 'athlete.filters.to',
    GROUP_BY: 'athlete.filters.groupBy',
    EXCLUDE_FREE_SESSIONS: 'athlete.filters.excludeFree'
};

Session.setDefault(SESSION_VARIABLES.FROM, from);
Session.setDefault(SESSION_VARIABLES.TO, to);
Session.setDefault(SESSION_VARIABLES.GROUP_BY, ChartBuilder.groups().WEEK);
Session.setDefault(SESSION_VARIABLES.EXCLUDE_FREE_SESSIONS, excludeFree);

function fetchSessions(athleteId) {
    let sessions = TrainingSession
        .findSessionsBetween(athleteId, Session.get(SESSION_VARIABLES.FROM), Session.get(SESSION_VARIABLES.TO)
            , Session.get(SESSION_VARIABLES.EXCLUDE_FREE_SESSIONS));
    let coach = Coach.find(Meteor.userId());
    if (!coach) return sessions;
    let suppression = coach.suppression || [];
    if (suppression.length === 0) return sessions;
    let result = [];
    for (let session of sessions) {
        if(suppression.indexOf(session.id) >= 0) continue;
        result.push(session);
    }
    return result;
}

const DATE_FORMAT = 'YYYY-MM-DD';

Template.athlete.onDestroyed(function () {
    $('input[name="dates"]').daterangepicker({})
});

Template.athlete.onRendered(function () {

    const self = this, $applyFilters = $('#apply-filters');
    /**@type Athlete */
    let athlete = Athlete.find(self.data.athleteId);
    let datesChanged = false;

    $('input[name="dates"]').daterangepicker({
        opens: 'left',
        endDate: Session.get(SESSION_VARIABLES.TO),
        startDate: Session.get(SESSION_VARIABLES.FROM),
        autoApply: true,
        locale: {
            format: DATE_FORMAT,
            applyLabel: i18n.translate('date_range_picker_apply'),
            cancelLabel: i18n.translate('date_range_picker_cancel')
        }
    }, function (start, end, label) {
        from = start.toDate();
        to = end.toDate();
        datesChanged = true;
        $applyFilters.removeClass('disabled');
    });

    $("input[name='aggregation']").off('change').on('change', function (e) {
        groupBy = $(this).val();
        $applyFilters.removeClass('disabled');
    });

    $('[data-selector="session-types"]').off('change').on('change', function () {
        excludeFree = $(this).val() === 'int';
        $applyFilters.removeClass('disabled');
    });

    function applyFilters() {
        if ($(this).hasClass('disabled')) return;
        if (!datesChanged) {
            periodTracker.changed();
            Session.set(SESSION_VARIABLES.FROM, from);
            Session.set(SESSION_VARIABLES.TO, to);
            Session.set(SESSION_VARIABLES.EXCLUDE_FREE_SESSIONS, excludeFree);
            Session.set(SESSION_VARIABLES.GROUP_BY, groupBy);
            setTimeout(function () {
                redraw();
            }, 0)
        } else {
            subscribe.apply(self, [athlete.id, from, to, excludeFree, groupBy, function () {
                datesChanged = false;
                redraw();
            }]);
        }
        $applyFilters.addClass('disabled');
    }

    $applyFilters.on('click', applyFilters);

    if (mobileFiltersModal === null) {
        mobileFiltersModal = Modal.factory('confirm', $('#mobile-filters-modal'), {
            title: '',
            primary: {
                label: i18n.translate('athlete_filters_apply'),
                callback: function () {
                    datesChanged = true;
                    applyFilters.apply($(), []);
                    mobileFiltersModal.hide();
                }
            }
        });
    }

    let $openFiltersDialogMobile = $('.athlete-filters-mobile');
    $openFiltersDialogMobile.off('click').on('click', function () {
        mobileFiltersModal.show();
    });

    setupFiltersModalMobile(mobileFiltersModal);

    subscribe.apply(this, [athlete.id, from, to, excludeFree, groupBy, function () {
        redraw();
    }]);

    function redraw() {
        let sessions = TrainingSession
            .findSessionsBetween(athlete.id, Session.get(SESSION_VARIABLES.FROM), Session.get(SESSION_VARIABLES.TO)
                , Session.get(SESSION_VARIABLES.EXCLUDE_FREE_SESSIONS));
        drawCharts(athlete, sessions);
        drawSpmToSpeedViz(athlete, sessions, Session.get(SESSION_VARIABLES.GROUP_BY));
    }
});


function subscribe(userId, from, to, excludeFree, groupBy, callback) {
    this.subscribe("athlete.progress", userId, from, to, {
        onReady: function () {
            periodTracker.changed();
            Session.set(SESSION_VARIABLES.FROM, from);
            Session.set(SESSION_VARIABLES.TO, to);
            Session.set(SESSION_VARIABLES.EXCLUDE_FREE_SESSIONS, excludeFree);
            Session.set(SESSION_VARIABLES.GROUP_BY, groupBy);
            callback = callback || function(){};
            callback.apply({}, []);
        }
    });
}

/**
 *
 * @param {Modal} modal
 */
function setupFiltersModalMobile(modal) {
    let $start = modal.$body.find('#start-date')
        , $end = modal.$body.find('#end-date');

    let startPicker = $start.daterangepicker({
        opens: 'center',
        singleDatePicker: true,
        startDate: Session.get(SESSION_VARIABLES.FROM),
        maxDate: moment(Session.get(SESSION_VARIABLES.TO)).add(-1, 'days'),
        locale: {
            format: DATE_FORMAT,
            applyLabel: i18n.translate('date_range_picker_apply'),
            cancelLabel: i18n.translate('date_range_picker_cancel')
        }
    }, function (start) {
        const minEndDate = start.clone().add(1, 'day');
        endPicker.minDate = minEndDate;
        from = start.clone().toDate();
        if (start.diff(to, 'days') >= 0) {
            endPicker.setStartDate(minEndDate);
        }
    }).data('daterangepicker');

    let endPicker = $end.daterangepicker({
        opens: 'left',
        singleDatePicker: true,
        startDate: Session.get(SESSION_VARIABLES.TO),
        minDate: moment(Session.get(SESSION_VARIABLES.FROM)).add(1, 'days'),
        locale: {
            format: DATE_FORMAT,
            applyLabel: i18n.translate('date_range_picker_apply'),
            cancelLabel: i18n.translate('date_range_picker_cancel')
        }
    }, function (end) {
        const maxStartDate = end.clone().add(-1, 'day');
        startPicker.maxDate = maxStartDate;
        to = end.clone().toDate();
        if (end.diff(from, 'days') <= 0) {
            startPicker.setStartDate(maxStartDate);
        }
    }).data('daterangepicker');


    $("input[name='aggregation-modal']").off('change').on('change', function (e) {
        groupBy = $(this).val();
    });
}

function periodFormatter(groupBy, date) {
    const groups = ChartBuilder.groups();
    switch (groupBy) {
        case groups.YEAR:
            return date.format('YY');
        case groups.MONTH:
            return date.format('MMM');
        case groups.WEEK:
            return date.format('MMM, DD');
    }

    return date.format('MMM, DD');
}

/**
 *
 * @param {Athlete} athlete
 * @param data
 */
function drawCharts(athlete, data) {

    const $distanceChart = $('#distance-chart')
        , $hoursChart = $('#hours-chart')
        , $sessionsChart = $('#sessions-chart')
        , $speedChart = $('#speed-chart')
        , $spmChart = $('#spm-chart')
        , $dpsChart = $('#dps-chart')
        , $heartRateChart = $('#hr-chart')
        , $spmZonesChart = $('#spm-zones-chart')
        , $speedZonesChart = $('#speed-zones-chart')
        , $heartRateZonesChart = $('#hr-zones-chart')
    ;


    let series = ChartBuilder.buildSeries(athlete, data, Session.get(SESSION_VARIABLES.GROUP_BY));

    let options, formatter;
    formatter = function () {
        let column = series.labels[this.value];
        return periodFormatter(Session.get(SESSION_VARIABLES.GROUP_BY), column);
    };

    options = ChartBuilder.getGenericChartConfig();
    options.xAxis.labels.formatter = formatter;
    options.series = series.sessions;
    $sessionsChart.highcharts(options);

    options.legend.enabled = false;
    options.series = series.distance;
    options.plotOptions.column.dataLabels.format = '{y} km';
    $distanceChart.highcharts(options);

    options.legend.enabled = false;
    options.series = series.hours;
    options.plotOptions.column.dataLabels.format = null;
    options.plotOptions.column.dataLabels.formatter = function () {
        return Utils.formatDurationInTimeShort(this.y * 3600000)
    };
    $hoursChart.highcharts(options);


    options = ChartBuilder.getGenericChartConfig();
    options.xAxis.labels.formatter = formatter;
    options.chart.type = 'area';
    options.series = series.speed;
    options.yAxis.min = series.boundaries.speed.min - 0.5;
    options.yAxis.max = series.boundaries.speed.max + 0.5;
    $speedChart.highcharts(options);

    options.chart.type = 'area';
    options.series = series.spm;
    options.yAxis.min = series.boundaries.spm.min - 0.5;
    options.yAxis.max = series.boundaries.spm.max + 0.5;
    $spmChart.highcharts(options);

    options.chart.type = 'area';
    options.series = series.dps;
    options.yAxis.min = series.boundaries.dps.min - .01;
    options.yAxis.max = series.boundaries.dps.max + .01;
    $dpsChart.highcharts(options);

    options.chart.type = 'area';
    options.series = series.heartRate;
    options.yAxis.min = series.boundaries.heartRate.min - 2;
    options.yAxis.max = series.boundaries.heartRate.max + 2;
    $heartRateChart.highcharts(options);

    const zoneOptions = ChartBuilder.buildZoneChartsConfig(series);
    $spmZonesChart.highcharts(zoneOptions.spmZones);
    $speedZonesChart.highcharts(zoneOptions.speedZones);
    $heartRateZonesChart.highcharts(zoneOptions.heartRateZones);
}

/**
 *
 * @param {Athlete} athlete
 * @param {TrainingSession[]} trainingSessions
 * @param {string} groupBy
 */
function drawSpmToSpeedViz(athlete, trainingSessions, groupBy) {
    const $tbody = $('#stroke-to-speed-tbody');
    let data = ChartBuilder.groupTrainingSessions(athlete, trainingSessions, groupBy);

    let columnNbr = data.length, rowNbr = athlete.strokeRateZones.length, blame = {}, index = 1;
    $tbody.empty();
    $tbody.closest('table').css({width: 100 * (columnNbr + 1)});
    for (let r = 0, rl = rowNbr; r < rl; r++) {
        let spm = athlete.strokeRateZones[r];
        let $tr = $('<tr/>').appendTo($tbody);

        let $td = $(`<th scope="row">${ChartBuilder.calcZoneLabel(spm)}</th>`);
        $tr.append($td);

        for (let c = 0; c < columnNbr; c++) {
            let record = data[c].spmZonesToSpeed[r];
            let $column = $('<td/>');
            let cleanedUp = cleanUpCell(record.sessions);
            record.total += cleanedUp.total;
            record.count += cleanedUp.count;

            let value = isNaN(record.total / record.count) ? ''
                : Utils.formatNumber(record.total / record.count);

            if (record.count < 120) {
                value = '';
            }

            $column.text(value);
            $column.attr('data-x', 'm' + index);
            blame['m' + index] = record.sessions;
            $column.appendTo($tr);
            index++;
        }
    }

    // append period label
    let $tr = $('<tr class="athlete-spm-to-speed-x-label"/>').appendTo($tbody);
    $('<th>&nbsp;</th>').appendTo($tr);
    for (let record of data) {
        let $column = $('<td/>');
        $column.text(periodFormatter(groupBy, moment(record.date)));
        $column.appendTo($tr);
    }
    $tbody.off('click').on('click', 'td', function () {
        let id = $(this).data('x');

        if (blameModal === null) {
            blameModal = Modal.factory('acknowledge', $('#show-sessions-in-column'), {
                title: ''
            })
        }

        showBlameDialog(blameModal, blame[id]);
    });
}

/**
 *
 * @param {{id: string, date: date, count: number, total: number, coachTrainingSessionId: string}[]} sessions
 * @returns {{total: number, count: number}}
 */
function cleanUpCell(sessions) {
    let count = 0, total = 0;
    for (let session of sessions) {
        if (session.count < 120) {
            count += session.count;
            total += session.total;
        }
    }
    return {
        count: count * -1,
        total: total * -1
    }
}

/**
 *
 * @param {Modal} modal
 * @param list
 */
function showBlameDialog(modal, list) {

    let $list = $('#modal-blame-sessions-list');
    $list.empty();
    let total = 0;
    for (let session of list) {
        total += session.count;
    }
    list.sort(function (a, b) {
        if (a.count > b.count) return 1;
        if (a.count < b.count) return -1;
        return 0;
    }).reverse();

    for (let session of list) {
        if (session.count === 0) continue;
        Blaze.renderWithData(Template.blameModelSessionListEntry, session, $list[0]);
    }

    $list.off('click').on('click', '.button', function () {
        modal.hide();
    });

    modal.show();
}

Template.athlete.helpers({

    summary: function() {
        periodTracker.depend();

        let sessions = fetchSessions(this.athleteId)
            , summary = { records: 0, working: 0, fullDuration: 0, duration: 0, fullDistance: 0, distance: 0
                , spm: 0
        };

        for (let session of sessions) {
            summary.fullDuration += session.fullDuration;
            summary.duration += session.duration;
            summary.fullDistance += session.fullDistance;
            summary.distance += session.distance;
            summary.records += session.aggregates.sumFullMetrics;
            summary.working += session.aggregates.sumMetrics;
            summary.spm += session.aggregates.sumSpm;
        }

        let avgSpeed =Utils.calculateAverageSpeed(summary.distance, summary.duration);
        let length = Utils.calculateStrokeLength(summary.spm / summary.working, avgSpeed);

        return { duration: summary.fullDuration
            , distance: summary.fullDistance
            , speed: avgSpeed
            , spm: summary.spm / summary.working
            , length: length
            , athleteId: this.athleteId
            , group: this.athleteGroup

            , sessionUI: new SessionUI(null, this.athleteId,  null, null
                , summary.distance, summary.duration, summary.fullDistance, summary.fullDuration
                , summary.spm / summary.working, null, sessions.length, true)
        }
    },

    sessions: function () {
        periodTracker.depend();
        let sessions = fetchSessions(this.athleteId);

        let result = [];
        for (let session of sessions) {
            result.push(Utils.trainingSessionToSessionUI(session));
        }
        return result;
    },

    period: function () {

        return `${moment(Session.get(SESSION_VARIABLES.FROM)).format(DATE_FORMAT)} - ${moment(Session.get(SESSION_VARIABLES.TO)).format(DATE_FORMAT)}`
    },

    sessionRouteId: function() {
        /**@type TrainingSession */
        let session  = this;
        if (session.expression && session.coachTrainingSessionId && session.coachTrainingSessionStart) {
            return session.coachTrainingSessionId
        }
        return session.id;
    },

    sessionType: function () {
        /**@type TrainingSession */
        let session  = this;
        if (session.expression && session.coachTrainingSessionId && session.coachTrainingSessionStart) {
            return "s"
        }
        return "f";
    },

    typeOfSessionsFilter() {
        let excludeFreeSessions = Session.get(SESSION_VARIABLES.EXCLUDE_FREE_SESSIONS);
        return excludeFreeSessions ? "int" : "all";
    },

    groupBy() {
        return Session.get(SESSION_VARIABLES.GROUP_BY)
    },

    summaryFieldsList: function () {
        return ["header", "distance", "duration", "speed", "spm", "dps", "count"];
    },

    fieldsList: function () {
        return ["header", "date", "distance", "duration", "speed", "spm", "dps", "footer"];
    }
});

Template.athlete.events({
    'click [data-action="delete"]': function(e) {
        console.log('aki');
        /**@type HTMLElement */
        let button = e.target;
        let id = button.getAttribute('data-id');
        e.stopPropagation();
        Button.confirm(button, () => {
            Meteor.call('suppressSession', id, function (err, response) {
                $('#apply-filters').removeClass('disabled').trigger('click');
            });
        });
    }
});
Template.blameModelSessionListEntry.helpers({
    sessionRouteId: function() {
        /**@type TrainingSession */
        let session  = this;
        if (session.coachTrainingSessionId) {
            return session.coachTrainingSessionId
        }
        return session.id;
    },

    sessionType: function () {
        /**@type TrainingSession */
        let session  = this;
        if (session.coachTrainingSessionId) {
            return "s"
        }
        return "f";
    },
});

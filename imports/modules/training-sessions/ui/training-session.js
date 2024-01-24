"use strict";

import {Template} from "meteor/templating";

import {TrainingSession} from "../api/collections.js";
import {Modal, Utils} from '../../../utils/utils';

import "./training-session.scss";
import "./training-session.html";

import numbro from "numbro";
import i18n from "../../../utils/i18n";
import ChartBuilder from "../../../ui/charts";
import {Athlete} from "../../athletes/api/collections";
import SessionSplitter from "./training-session.splitter";
import SessionUI from "../../coaches/ui/dashboard-session";
import UtterChart from "../../../utils/widgets/utter-chart";
import {TrainingSessionsUtils} from "../api/utils";


/**@type TrainingSession */
let trainingSession;

/**@type SessionSplitter */
let sessionSplitter = null;

function generateDefaultChartOptions() {
    return $.extend(true, {}, {
        chart: {type: 'area', backgroundColor: '#F8F8F8'},
        title: {text: '', align: 'left', y: 5},
        credits: {enabled: false},
        legend: {enabled: false},
        tooltip: {
            positioner: function () {
                return {
                    x: this.chart.chartWidth - this.label.width, // right aligned
                    y: -1 // align to title
                };
            },
            borderWidth: 0,
            backgroundColor: 'none',
            pointFormat: '{point.y:.2f}',
            headerFormat: '',
            shadow: false
        },
        colors: ['#666AAB', '#1D8A99'],
        xAxis: {
            crosshair: true,
            type: 'datetime',
            gridLineColor: '#D9D9D9',
            labels: {
                formatter: function () {}
            }
        },
        yAxis: {
            title: {text: ''},
            labels: {enabled: true, style: {fontSize: 10}, formatter: function(){return Math.round(this.value * 10) / 10}},
            gridLineWidth: 1,
            minorGridLineWidth: 0,
            plotLines: [generatePlotLineCfg()]
        },
        plotOptions: {
            area: {
                fillColor: '#666AAB'
            }
        },
        series: []
    })
}

/**
 * Enum string values.
 * @enum {string}
 */
const XAxisDimensions = {
    DURATION: "duration",
    DISTANCE: "distance"
};

/**
 * Chart x axis dimension type, either
 * @type {XAxisDimensions}
 */
let dimension = XAxisDimensions.DURATION;

let dataReadyDependency = new Tracker.Dependency(),
    sessionDependency = new Tracker.Dependency(),
    $progress;

/**
 *
 */
Template.trainingSession.onCreated(function () {
    let self = this;
    TrainingSessionView.loadSession(self.data.freeSessionId).then((trainingSession) => {
        trainingSessionView.session = trainingSession;
        trainingSessionView.renderSession();
        dataReadyDependency.changed();
    });
});


/**
 * Create the chart once the template DOM is ready.
 */
Template.trainingSession.onRendered(function () {

    let $table = $('#session-splits-body')
        , $confirm = $('#confirm');

    $progress = $('.progress');

    $('#session-splits').on('click', 'td', function (e) {

        if (!trainingSessionView.hasSplitsDefined()) return;

        let unselect = $(this).closest('tr').hasClass('selected');

        $table.find('tr').removeClass('selected');

        if (unselect) {
            trainingSessionView.split = null;
            return trainingSessionView.drawSessionCharts(trainingSessionView.session);
        }

        let $td = $(e.target);
        let $tr = $td.parent();
        let splitNbr = parseInt($tr.attr('data-split'));

        if (!(splitNbr >= 0)) {
            return;
        }

        $tr.addClass('selected');
        trainingSessionView.split = trainingSessionView.sessionSplits()[splitNbr];
        trainingSessionView.drawSessionCharts(trainingSessionView.session);
    });

    let deleted = false;

    $confirm.on('hidden.bs.modal', function (e) {
        if (deleted)
            history.back();
    });

    $confirm.find('.primary').on('click', function (e) {
        if (!trainingSession)
            return false;
        Meteor.call('deleteTrainingSession', trainingSession.id, function (err, result) {
            deleted = true;
            $confirm.modal('hide');
        });

        e.stopImmediatePropagation();
        e.preventDefault();

        return false;
    });

    let $export = $('#export');
    $export.click(function () {
        if (!trainingSessionView.session) {
            return;
        }

        let content = 'duration,distance,speed,stroke_rate,stroke_length,heart_rate,interval\n'
            , splits = trainingSessionView.sessionSplits().slice();

        for (let i = 0, l = splits.length; i < l; i++) {
            splits[i].number = i + 1;
        }

        if (trainingSession.data.length > 0) {
            let data = [], startedAt = trainingSession.date.getTime();

            for (let i = 0, l = trainingSession.data.length; i < l; i++) {
                let metrics = trainingSession.data[i], number = -1;

                if (splits[0]) {
                    if (i > splits[0].position.end) splits.shift();
                    if (splits[0] && i >= splits[0].position.start && i <= splits[0].position.end) number = splits[0].number;
                }

                data.push([Math.round((metrics.timestamp - startedAt) / 1000), metrics.distance * 1000
                    , metrics.speed, metrics.spm, metrics.spmEfficiency, metrics.heartRate, number].join(','));
            }
            content += data.join('\n');
        }


        let filename = "export.csv";
        filename = filename || "download";
        let mimeType = "application/octet-stream";
        let bb = new Blob([content], { type: mimeType });
        let link = document.createElement("a");
        link.download = filename;
        link.href= window.URL.createObjectURL(bb);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });


    $('[name="x-axis-dimension"]').off('change').on('change', function () {
        dimension = $(this).data('option');
        trainingSessionView.drawSessionCharts(trainingSessionView.session)
    });
});


/**
 * Bind events to DOM
 */
Template.trainingSession.events({

    'click #split-free-session': function (e) {

        if (sessionSplitter === null) {
            sessionSplitter = new SessionSplitter(trainingSession, generateDefaultChartOptions);
        } else {
            sessionSplitter.resume();
        }
    },

    'click #reset-into-free-session': function (e) {
        $('.loading').show();
        Meteor.call('rollbackToFreeSession', trainingSession.id, (err, response) => {
            if (err) {
                return console.error(err);
            }

            window.location.reload();
        });
    }
});

/**
 *
 */
Template.trainingSession.helpers({

    fieldsList: function () {
        return ["header", "date", "distance", "duration", "speed", "spm", "dps", "hr", "hr"];
    },

    sport: function () {
        sessionDependency.depend();
        if (trainingSessionView.session) return trainingSessionView.session.type;
        return '';
    },

    getSessionExpression: function () {
        sessionDependency.depend();
        let expression = trainingSessionView.sessionExpression();

        return expression === null ? i18n.translate("training_session_free_session") : expression;
    },

    getSessionHour: function () {
        sessionDependency.depend();

        if (trainingSessionView.session) {
            return moment(trainingSessionView.session.date).format('HH:mm')
        }
    },

    getSessionDate: function () {
        sessionDependency.depend();

        if (trainingSessionView.session) {
            return moment(trainingSessionView.session.date).format('DD, MMMM')
        }
    },

    getSessionStats: function () {
        sessionDependency.depend();
        if (!trainingSessionView) return undefined;

        return trainingSessionView.calculateSessionStats();
    },

    noSplitsDefined: function () {
        sessionDependency.depend();
        return trainingSessionView.hasSplitsDefined() === false;
    },

    isFreeSession: function () {
        sessionDependency.depend();
        return trainingSessionView.isFreeSession();
    },

    isOwnedSession: function () {
        sessionDependency.depend();
        if (!trainingSession)
            return false;

        return trainingSession.user === Meteor.userId();
    },

    isSessionEditable: function () {
        sessionDependency.depend();
        if (!trainingSession)
            return false;

        return trainingSession.edited === false;
    },

    isSessionResetable: function () {
        sessionDependency.depend();
        if (!trainingSession)
            return false;

        return trainingSession.edited === true && trainingSession.expression;
    },

    getSessionSplits: function () {
        sessionDependency.depend();
        const splits = trainingSessionView.sessionSplits();

        if (splits.length === 0) {
            return [];
        }

        const isFreeButHasLiveIntervals = !trainingSessionView.sessionExpression() && trainingSessionView.isFreeSession() === false;

        let result = [], split, counter = 0;
        for (let i = 0; i < splits.length; i++) {
            split = splits[i];

            if (split.recovery === true)
                continue;

            counter++;

            result.push({
                split: i,
                position: counter,
                avgSpeed: split.avgSpeed ? split.avgSpeed.toFixed(2) : '-',
                avgSpm: split.avgSpm ? split.avgSpm.toFixed(2) : '-',
                avgSpmEfficiency: split.avgSpmEfficiency ? split.avgSpmEfficiency.toFixed(2) : '-',
                duration: split.basedInDistance || isFreeButHasLiveIntervals === true ?
                    Utils.formatDurationInHundredth(split.end - split.start) : split.duration,
                distance: Math.round((split.distanceEnd - split.distanceStart) * 1000),
                avgHeartRate: Math.round(split.avgHeartRate)
            })
        }
        return result;
    }
});

class TrainingSessionView {
    /**
     *
     * @param {TrainingSession} session
     */
    constructor(session = null) {
        this._session = session;

        /**@type Athlete */
        this._athlete = null;

        /**@type UtterChart */
        this._altitudeChart = null;
        /**@type UtterChart */
        this._speedChart = null;
        /**@type UtterChart */
        this._cadenceChart = null;
        /**@type UtterChart */
        this._lengthChart = null;
        /**@type UtterChart */
        this._heartRateChart = null;
        /**@type UtterChart */
        this._boatBalanceChart = null;
        /**@type UtterChart */
        this._zoneCadenceChart = null;
        /**@type UtterChart */
        this._zoneSpeedChart = null;
        /**@type UtterChart */
        this._zoneHeartRateChart = null;
        /**@type SessionSplit|null */
        this._split = null;
    }

    /**
     * load screen for a specic session
     */
    renderSession() {
        $('.session-athlete.selected').removeClass('selected');
        $(`.session-athlete[data-session-id="${this.session.id}"]`).addClass('selected');

        this.drawSessionCharts(this.session);
        this.renderToolTip(this.session.data[0]);

        sessionDependency.changed();
        $progress.hide();

        // Fix tooltip div when scrolling in page
        setTimeout(() => {

            const $header = $('.training-session-details-charts-header');
            const $content = $('.training-session-details-container');
            const offset = $header.offset().top - 56;

            $(document.body).on('touchmove', onScroll); // for mobile
            $(window).on('scroll', onScroll);


            function onScroll() {
                if (window.pageYOffset > offset) {
                    $header.addClass("sticky");
                    $header.width($content.width());
                } else {
                    $header.removeClass("sticky");
                    $header.width('');
                }
            }
        }, 0);
    }

    /**
     *
     * @param {TrainingSession} session
     */
    drawSessionCharts(session) {
        this.destroyCharts();

        let data = session.extractSplit(this.split);
        if (dimension === XAxisDimensions.DISTANCE) {
            data = session.stepMetricsIntoReadableDistances(10, this.split);
        }

        let chartData = {};
        for (let record of data) {
            chartData[record[dimension] + ""] = record;
        }

        let labels = data.map((r) => {
            // if change distance dimension, careful that the number of values in x axis depends on the
            // maximum distance reached in the universe of the chart
            return r[dimension];
        });

        const self = this;
        /**@type ChartOptions */
        let options = {
            displayYAxisGridLines: true,
            displayXAxisGridLines: true,
            xAxisLabelMaxRotation: 0,
            xAxisLabelCallback: dimension === XAxisDimensions.DURATION ?
                function (value, index, values) {
                    return self.formatAxisDuration(value, true, values)
                }
                : function (value, index, values) {
                    return self.formatAxisDistance(value, true, values)
                },
            tooltip: (category) => {
                this.renderToolTip(chartData[category]);
            },
            labels: {
                display: true,
                formatter: function (value, meta) {
                    if (meta.dataset.utter.thisIsAAverageSet === true && meta.dataIndex === 0) {
                        return Utils.round(value, 2);
                    }

                    if (meta.dataset.utter.thisIsAAverageSet === true) return null;

                    if (meta.dataIndex === meta.dataset.utter.maxInDataSet.position) {
                        return value;
                    }

                    return null;
                },
                font: 14,
                align: 'right',
                offset: 10
            }
        };

        this.altitudeChart = new UtterChart($('#altitude-chart'), i18n.translate('training_session_chart_title_altitude')
            , UtterChart.TYPES().LINE, labels, UtterChart.dataset(data.map((r) => r.altitude), true), options);

        this.speedChart = new UtterChart($('#speed-chart'), i18n.translate('training_session_chart_title_speed')
            , UtterChart.TYPES().LINE, labels, UtterChart.dataset(data.map((r) => r.speed), true), options);

        this.cadenceChart = new UtterChart($('#spm-chart'), i18n.translate('training_session_chart_title_spm')
            , UtterChart.TYPES().LINE, labels, UtterChart.dataset(data.map((r) => r.spm), true), options);

        this.lengthChart = new UtterChart($('#dps-chart'), i18n.translate('training_session_chart_title_length')
            , UtterChart.TYPES().LINE, labels, UtterChart.dataset(data.map((r) => r.spmEfficiency), true), options);

        this.heartRateChart = new UtterChart($('#hr-chart'), i18n.translate('training_session_chart_title_heart_rate')
            , UtterChart.TYPES().LINE, labels, UtterChart.dataset(data.map((r) => r.heartRate), true), options);

        this.boatBalanceChart = new UtterChart($('#leftToRight-chart'), i18n.translate('training_session_chart_title_left_right')
            , UtterChart.TYPES().LINE, labels, [UtterChart.dataset(data.map((r) => r.left), true
                , UtterChart.YAxis().FIRST, true)
                , UtterChart.dataset(data.map((r) => r.right), true)
            ]
            , options);

        const athlete = Athlete.find(session.user);

        let aggregates = TrainingSessionsUtils.calculateAggregations(session, false, session.extractSplit(this.split));
        options = {
            displayYAxisGridLines: false,
            displayXAxisGridLines: true,
            xAxisLabelMaxRotation: 0,
            labels: {
                display: true,
                formatter: (value) => {
                    return Utils.formatDurationInTimeShort((value / aggregates.sumMetrics * 100) * (aggregates.sumMetrics * 1000));
                },
                font: (context) => {
                    let width = context.chart.width;
                    let size = Math.round(width / 48);

                    return {
                        size: size
                    };
                }
            }
        };

        this.zoneCadenceChart = new UtterChart($('#spm-zones-chart'), i18n.translate('training_session_chart_title_zones_spm')
            , UtterChart.TYPES().BAR
            , athlete.strokeRateZones.map((r) => ChartBuilder.calcZoneLabel(r))
            , UtterChart.dataset(aggregates.spmZones), options);

        this.zoneSpeedChart = new UtterChart($('#speed-zones-chart'), i18n.translate('training_session_chart_title_zones_speed')
            , UtterChart.TYPES().BAR
            , athlete.speedZones.map((r) => ChartBuilder.calcZoneLabel(r))
            , UtterChart.dataset(aggregates.speedZones), options);

        let heartRateZonesIndex = this.calculateHeartRateZonesIndex(athlete.restingHeartRate, athlete.maxHeartRate);
        this.zoneHeartRateChart = new UtterChart($('#hr-zones-chart'), i18n.translate('training_session_chart_title_zones_heart_rate')
            , UtterChart.TYPES().BAR, athlete.heartRateZones.map((zone) => ChartBuilder.calcZoneLabel({
                start: zone.start === 0 ? null : heartRateZonesIndex.indexOf(zone.start),
                end: zone.end === Infinity ? Infinity : heartRateZonesIndex.indexOf(zone.end)
            }))
            , UtterChart.dataset(aggregates.heartRateZones.map((value) => Math.round(value / aggregates.sumMetrics * 100))), options);

    }

    destroyCharts() {
        if (this.altitudeChart) this.altitudeChart.destroy();
        if (this.speedChart) this.speedChart.destroy();
        if (this.cadenceChart) this.cadenceChart.destroy();
        if (this.lengthChart) this.lengthChart.destroy();
        if (this.heartRateChart) this.heartRateChart.destroy();
        if (this.boatBalanceChart) this.boatBalanceChart.destroy();
        if (this.zoneCadenceChart) this.zoneCadenceChart.destroy();
        if (this.zoneSpeedChart) this.zoneSpeedChart.destroy();
        if (this.zoneHeartRateChart) this.zoneHeartRateChart.destroy();
    }
    /**
     * Update metrics in a specific point of the chart
     * @param {TrainingSessionData} data
     */
    renderToolTip(data) {
        $('.training-session-tooltip').html([ ``
            , `<div class="training-session-tooltip-column">`
            , `    <div class="training-session-tooltip-column-row">`
            , `        <div class="training-session-tooltip-value">${this.formatAxisDuration(data.duration, false)}</div>`
            , `        <div class="training-session-tooltip-label">${i18n.translate('generic_session_label_duration')}</div>`
            , `    </div>`
            , `    <div class="training-session-tooltip-column-row">`
            , `        <div class="training-session-tooltip-value">${Math.round(data.distance * 1000)}</div>`
            , `        <div class="training-session-tooltip-label">${i18n.translate('generic_session_label_distance_in_meters')}</div>`
            , `    </div>`
            , `    <div class="training-session-tooltip-column-row">`
            , `        <div class="training-session-tooltip-value">${data.speed}</div>`
            , `        <div class="training-session-tooltip-label">${i18n.translate('generic_session_label_speed')}</div>`
            , `    </div>`
            , `</div>`
            , ``
            , `<div class="training-session-tooltip-column">`
            , `    <div class="training-session-tooltip-column-row">`
            , `        <div class="training-session-tooltip-value">${data.spm}</div>`
            , `        <div class="training-session-tooltip-label">${i18n.translate('generic_session_label_spm')}</div>`
            , `    </div>`
            , `    <div class="training-session-tooltip-column-row" data-sport="canoeing">`
            , `        <div class="training-session-tooltip-value">${data.spmEfficiency}</div>`
            , `        <div class="training-session-tooltip-label">${i18n.translate('generic_session_label_dps_abrv')}</div>`
            , `    </div>`
            , `    <div class="training-session-tooltip-column-row" data-sport="cycling">`
            , `        <div class="training-session-tooltip-value">${data.altitude}</div>`
            , `        <div class="training-session-tooltip-label">${i18n.translate('generic_session_label_altitude')}</div>`
            , `    </div>`
            , `    <div class="training-session-tooltip-column-row">`
            , `        <div class="training-session-tooltip-value">${data.heartRate}</div>`
            , `        <div class="training-session-tooltip-label">${i18n.translate('generic_session_label_hr')}</div>`
            , `    </div>`
            , `</div>`
        ].join(''));
    }

    /**
     *
     * @param value
     * @param autoSkip
     * @param universe
     * @return {string|null}
     */
    formatAxisDuration(value, autoSkip = true, universe = []) {
        let seconds = Math.floor(value / 1000);

        if (autoSkip === true) {
            let step = Math.floor(universe.length / 10);
            let gaps = [1, 15, 30, 60, 120, 300, 600, 900, 1200].map((r) => r - step)
                .sort((a, b)=> { return Math.abs(a) - Math.abs(b)});
            step = gaps[0] + step;

            if (seconds % step !== 0) return null;
        }

        return Utils.formatDurationInSportsNotation(value);
    }

    /**
     *
     * @param value
     * @param autoSkip
     * @param {Array<number>} universe   Array with all the values in axis
     * @return {null|string}
     */
    formatAxisDistance(value, autoSkip, universe = []) {
        if (autoSkip === true && universe.length > 0) {
            let last = universe[universe.length -1] * 1000; // convert to meters
            let step = Math.floor(last / 10);
            let gaps = [50, 100, 250, 500, 1000, 5000, 10000].map((r) => r - step)
                .sort((a, b)=> { return Math.abs(a) - Math.abs(b)});
            step = gaps[0] + step;

            if (value * 1000 % step !== 0) return null;
        }
        return (value * 1000) + "";
    }

    /**
     * @private
     *
     * @param resting
     * @param max
     * @return {Array<number>}
     */
    calculateHeartRateZonesIndex(resting, max) {
        let index = [];
        for (let i = 0; i < 300; i++) {
            index.push(Utils.heartRateReserveCalculation(resting, max, i));
        }
        return index;
    }

    /**
     *
     * @return {null|{duration: {raw: moment.Duration, weekComparison: string, weekPercentage: string, value: string}, fullDistance: string, sessionUI: SessionUI, distance: {raw: *, weekComparison: string, weekPercentage: string, value: string}, fullDuration: string, averageDPS: {raw: (number|*), weekComparison: string, weekPercentage: string, value: string}, avgSpm: {raw: *, weekComparison: string, weekPercentage: string, value: string}, averageHR: {raw: *, weekComparison: string, weekPercentage: string, value: number}, avgSpeed: {raw: (number|*), weekComparison: string, weekPercentage: string, value: string}}}
     */
    calculateSessionStats() {
        if (this.session === null) return null;

        let duration = this.session.duration,
            fullDuration = this.session.duration !== this.session.fullDuration ?
                this.session.fullDuration : null,
            distance = this.session.distance,
            fullDistance = Math.round(this.session.distance) !== Math.round(this.session.fullDistance) ? this.session.fullDistance : null,
            averageSpeed = Utils.calculateAverageSpeed(distance, duration),
            averageSPM = this.session.avgSpm,
            averageDPS = Utils.calculateStrokeLength(averageSPM, averageSpeed),
            averageHr = this.session.avgHeartRate;

        return {
            duration: {
                value: Utils.formatDurationInTime(duration),
                raw: duration,
                weekComparison: '',
                weekPercentage: '-'
            },
            fullDuration: Utils.formatDurationInTime(fullDuration),
            distance: {
                value: numbro(distance).format('0.00'),
                raw: distance,
                weekComparison: '',
                weekPercentage: '-'
            },
            fullDistance: fullDistance ? numbro(fullDistance).format('0.00') : '',
            avgSpeed: {
                value: numbro(averageSpeed).format('0.0'),
                raw: averageSpeed,
                weekComparison: '',
                weekPercentage: '-'
            },
            avgSpm: {
                value: numbro(averageSPM).format('0,0'),
                raw: averageSPM,
                weekComparison: '',
                weekPercentage: '-'
            },
            averageDPS: {
                value: numbro(averageDPS).format('0.00'),
                raw: averageDPS,
                weekComparison: '',
                weekPercentage: '-'
            },
            averageHR: {
                value: Math.round(averageHr),
                raw: averageHr,
                weekComparison: '',
                weekPercentage: '-'
            },

            sessionUI: new SessionUI(this.session.date, this.session.user,  this.session.id, this.session.expression
                , this.session.distance, this.session.duration, this.session.fullDistance, this.session.fullDuration
                , this.session.avgSpm, averageHr)
        }

    }

    /**
     *
     * @return {boolean}
     */
    hasSplitsDefined() {
        if (this.session === null) return false;
        return Array.isArray(this.session.splits) && this.session.splits.length > 0
    }

    /**
     *
     * @return {boolean}
     */
    isFreeSession() {
        return !this.hasSplitsDefined()
    }

    sessionExpression() {
        if (this.session === null) return null;
        return typeof this.session.expression === 'string' ? this.session.expression : null
    }

    /**
     * Get session splits for current training session
     * @return {Array<SessionSplit>|*[]}
     */
    sessionSplits() {
        if (this.session === null) return [];
        return this.session.splits;
    }

    /**
     *
     * @param id
     * @return {Promise<TrainingSession>}
     */
    static loadSession(id) {
        return new Promise((resolve, reject) => {
            Meteor.subscribe('trainingSessions.detail', id, {
                onReady: function () {
                    let session = TrainingSession.find(id);
                    if (session) return resolve(session);

                    $progress.hide();

                    const modal = Modal.factory(Modal.types().ACKNOWLEDGE, $("#no-data-found"), {
                        title: i18n.translate('training_session_no_data_found')
                    });
                    modal.show();

                }
            });
        });
    }

    get session() {
        return this._session;
    }

    /**
     *
     * @param {TrainingSession} value
     */
    set session(value) {
        this._session = value;
        this._athlete = Athlete.find(value.user);
    }

    get athlete() {
        return this._athlete;
    }

    set athlete(value) {
        this._athlete = value;
    }

    get altitudeChart() {
        return this._altitudeChart;
    }

    set altitudeChart(value) {
        this._altitudeChart = value;
    }

    get speedChart() {
        return this._speedChart;
    }

    set speedChart(value) {
        this._speedChart = value;
    }

    get cadenceChart() {
        return this._cadenceChart;
    }

    set cadenceChart(value) {
        this._cadenceChart = value;
    }

    get lengthChart() {
        return this._lengthChart;
    }

    set lengthChart(value) {
        this._lengthChart = value;
    }

    get heartRateChart() {
        return this._heartRateChart;
    }

    set heartRateChart(value) {
        this._heartRateChart = value;
    }

    get boatBalanceChart() {
        return this._boatBalanceChart;
    }

    set boatBalanceChart(value) {
        this._boatBalanceChart = value;
    }

    get zoneCadenceChart() {
        return this._zoneCadenceChart;
    }

    set zoneCadenceChart(value) {
        this._zoneCadenceChart = value;
    }

    get zoneSpeedChart() {
        return this._zoneSpeedChart;
    }

    set zoneSpeedChart(value) {
        this._zoneSpeedChart = value;
    }

    get zoneHeartRateChart() {
        return this._zoneHeartRateChart;
    }

    set zoneHeartRateChart(value) {
        this._zoneHeartRateChart = value;
    }

    get split() {
        return this._split;
    }

    set split(value) {
        this._split = value;
    }
}

/**@type TrainingSessionView */
let trainingSessionView = new TrainingSessionView();
import {Modal, Utils} from "../../../utils/utils";
import i18n from "../../../utils/i18n";
import numbro from "numbro";
import {Expression} from "../../../expressions/expression";
import {TrainingSessionsUtils} from "../api/utils";

export default class SessionSplitter {
    /**
     *
     * @param {TrainingSession} athleteSession
     * @param {function} chartOptionsGenerator
     */
    constructor(athleteSession, chartOptionsGenerator) {
        const self = this;

        self.chartOptionsGenerator = chartOptionsGenerator;
        self.expression = null;
        self.duration = 0;
        self.athleteSession = athleteSession;
        self.intervals = [];

        self.modal = Modal.factory(Modal.types().CONFIRM, $("#split-into-intervals-modal"), {
            title: i18n.translate('training_session_split_free_session_modal_title'),
            extraCss: 'wider-modal',
            primary: {
                label: i18n.translate('training_session_split_free_session_action', ['00:00']),
                callback: function () {
                    console.log(self.athleteSession.id, self.expression, self.duration);
                    Meteor.call('calculateSplitsInFreeSession', self.athleteSession.id, self.expression, self.duration, (e, r) => {
                        if (e) {
                            return console.error(e);
                        }
                        window.location.reload();
                    });
                    self.modal.hide().then(() => {
                        $('.loading').show();
                    });
                }
            },
            secondary: {
                label: i18n.translate('modal_discard')
            }
        });

        self.modal.show().then(() => {
            self.init();
        });
    }

    init() {
        const self = this, $chart = $('#split-session-chart');
        self.$expression = $('#new-expression');
        let chartOptions = self.chartOptionsGenerator();
        chartOptions.chart.zoomType = 'x';
        chartOptions.chart.events = chartOptions.chart.events || {};

        let dimension = "speed", startAt = 0, stopAt = self.athleteSession.fullDuration;
        chartOptions.xAxis.labels.formatter = function () {
            return SessionSplitter.formatter(this.value);
        };
        chartOptions.tooltip.formatter = function () {
            return SessionSplitter.formatter(this.x);
        };
        chartOptions.series = [{data: SessionSplitter.filter(self.athleteSession.data, dimension, startAt, stopAt), name: ""}];
        let tuple = [];
        chartOptions.plotOptions.series = {
            point: {
                events: {
                    click: function () {
                        tuple.push(this.x);
                        console.log('push ', this.x, tuple);

                        if (tuple.length === 2) {
                            self.appendInterval(Math.min(tuple[0], tuple[1]), Math.max(tuple[0], tuple[1]));
                            session = self.refresh();
                            tuple = [];
                        }
                    }
                }
            }
        };
        $chart.highcharts(chartOptions);

        let session = null;
        self.$start = $('#split-session-input');
        self.$start.off('change').on('change', function (e) {
            self.duration = SessionSplitter.parseTime($(this).val());
            chartOptions.series = [{data: SessionSplitter.filter(self.athleteSession.data, "speed", self.duration), name: ""}];
            $chart.highcharts(chartOptions);
            self.modal.updatePrimaryBtnLabel(i18n.translate('training_session_split_free_session_action'
                , [SessionSplitter.formatter(self.duration)]));

            session = self.preview();
        });

        $('[name="chart-options"]').off('change').on('change', function () {
            dimension = $(this).data('option');
            chartOptions.series = [{data: SessionSplitter.filter(self.athleteSession.data, dimension, self.duration), name: ""}];
            $chart.highcharts(chartOptions);
        });

        self.$tbody = $('#split-free-session-splits');
        self.$tbody.empty();

        const sessionStartedAt = this.athleteSession.date.getTime();
        self.$expression.off('input').on('input', function () {
            self.expression = self.$expression.val();
            if (!self.expression) {
                self.modal.$modal.find('.error-text').fadeOut();
                self.clear();
                return false;
            }
            try {
                self.modal.$modal.find('.error-text').fadeOut();
                session = self.preview();
                let expression = new Expression(self.expression, session);
                let splits = expression.splitsJson();
                self.intervals = [];
                for (let split of splits) {
                    if (split.recovery === true) continue;
                    self.intervals.push({start: split.start - sessionStartedAt, stop: split.end - sessionStartedAt});
                }
                console.log(self.intervals.map((r)=>{return `${r.start} -> ${r.stop}`}).join(' | '));
                return true;
            } catch (err) {
                self.modal.$modal.find('.error-text').fadeIn();
                return false;
            }
        });

        const $splitChartPreview = $('.training-session-split-session-review-chart');
        self.$tbody.on('click', 'tr', (e) => {
            if (!session) return;
            const $tr = $(e.currentTarget)
                , index = parseInt($tr.data('split'))
                , split = session.splits[index];

            chartOptions.series = [{data: session.data.map((r)=>{return [r.duration, r.speed]})
                    .slice(split.position.start, split.position.end), name: ""}];
            $splitChartPreview.highcharts(chartOptions);

        });

        self.$tbody.on('change', 'input', (e) => {
            const $input = $(e.target)
                , split = $input.data('split')
                , index = split / 2
                , type = $input.attr('name')
            ;

            self.intervals[index][type] = SessionSplitter.parseTime($input.val());
            session = self.refresh();
        });
    }

    refresh() {
        const self = this;
        self.expression = self.generateExpression();
        self.duration = self.intervals[0].start;

        self.$expression.val(self.expression);
        self.$start.val(SessionSplitter.formatter(self.duration));

        return self.preview();
    }

    /**
     *
     * @return {TrainingSession|null}
     */
    preview() {
        if (!this.expression) return null;
        console.log(this.expression);
        let session = TrainingSessionsUtils.calculateSplitsInFreeSession(this.athleteSession.id, this.expression, this.duration, false);
        let counter = 0;
        const sessionStartedAt = this.athleteSession.date.getTime();
        this.$tbody.empty();
        for (let i = 0; i < session.splits.length; i++) {
            let split = session.splits[i];
            if (split.recovery === true) continue;
            counter++;
            let start = split.start - sessionStartedAt;
            let end =  split.end - sessionStartedAt;
            this.$tbody.append($([
                `<tr data-split="${i}">`
                , `    <td width="06%">${counter}</td>`
                , `    <td width="14%"><input name="start" value="${SessionSplitter.formatter(start)}" class="training-session-interval-input" type="text" maxlength="6" data-split="${i}"></td>`
                , `    <td width="14%"><input name="stop" value="${SessionSplitter.formatter(end)}" class="training-session-interval-input" type="text" maxlength="6" data-split="${i}"></td>`
                , `    <td width="10%">${Utils.formatDurationInHundredth(split.end - split.start)}</td>`
                , `    <td width="10%">${Math.round((split.distanceEnd - split.distanceStart) * 1000)}</td>`
                , `    <td width="14%">${split.avgSpeed ? split.avgSpeed.toFixed(2) : '-'}</td>`
                , `    <td width="10%">${split.avgSpm ? split.avgSpm.toFixed(2) : '-'}</td>`
                , `    <td width="14%">${split.avgSpmEfficiency ? split.avgSpmEfficiency.toFixed(2) : '-'}</td>`
                , `    <td width="08%">${Math.round(split.avgHeartRate)}</td>`
                , `tr>`
            ].join('')))
        }
        return session;
    }

    clear() {
        this.$tbody.empty();
        this.intervals = [];
    }

    appendInterval(start, stop) {
        console.log({start, stop});
        this.intervals.push({start, stop});
        this.intervals = this.intervals.sort((a, b) => {
            if (a.start > b.start) return 1;
            if (a.start < b.start) return -1;
            return 0
        });

        console.log(this.intervals.map((r)=>{return `${r.start} -> ${r.stop}`}).join(' | '));

        return this.generateExpression();
    }

    generateExpression() {
        let duration = function (value) {
            let duration = SessionSplitter.splitDuration(value);
            if (duration.minutes > 0 && duration.seconds > 0) {
                return `${duration.minutes}'${duration.seconds}''`
            }

            if (duration.minutes > 0) {
                return `${duration.minutes}'`;
            }

            return `${duration.seconds}''`;
        };

        let expression = '', previous = null;
        for (let interval of this.intervals) {
            if (previous) {
                expression += `/${duration(interval.start - previous.stop)} + `;
            }
            expression += `${duration(interval.stop - interval.start)}`;
            previous = interval;
        }

        expression = expression.trim();
        if (expression[expression.length - 1] === '+') {
            expression = expression.trim().slice(0, -1);
        }
        return expression;

    }


    resume() {
        this.modal.show();
    }

    static splitDuration(milis) {
        let duration = moment.duration(milis), minutes, seconds;

        minutes = duration.hours() * 60 + duration.minutes();
        seconds = duration.seconds();
        return {minutes, seconds}
    }

    static formatter(x) {
        let duration = SessionSplitter.splitDuration(x);
        let minutes = numbro(duration.minutes).format('00');
        let seconds = numbro(duration.seconds).format('00');
        return `${minutes}:${seconds}`;
    }

    static parseTime(time) {
        if (!time) return 0;
        let parts = time.split(':');
        let minutes, seconds;
        if (parts.length > 1) {
            minutes = parseInt(parts[0]);
            seconds = parseInt(parts[1]);
        } else {
            minutes = parseInt(parts[0]);
            seconds = 0;
        }
        return (minutes * 60 + seconds) * 1000;
    }

    static filter(data, type, startAt, stopAt) {
        let output = [];
        for (let record of data) {
            if (record.duration < startAt) continue;
            if (record.duration >= stopAt) break;
            output.push([record.duration, record[type]]);
        }
        return output;
    }


}
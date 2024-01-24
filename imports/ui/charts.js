'use static';
import {Utils} from "../utils/utils";

const DEFAULT_CHART_OPTIONS = {

    chart: {type: 'column', backgroundColor: "#F8F8F8"},
    title: {text: '', align: 'left', y: 5, visible: false},
    credits: {enabled: false},
    legend: {
        enabled: false,
        reversed: true,
        itemStyle: {color: "#A7A7A7", fontSize: "7px", fontFamily: "Roboto", fontWeight: 900}
    },
    tooltip: {
        enabled: false
    },
    colors: ['#666AAB'],
    xAxis: {
        type: 'datetime',
        labels: {
            style: {color: "#A7A7A7", fontSize: "8px", fontFamily: "Roboto", fontWeight: 900}
        },
        crosshair: false,
        gridLineColor: '#D9D9D9'
    },
    yAxis: {
        title: {text: ''},
        labels: {enabled: false},
        stackLabels: {
            enabled: true,
            style: {color: "#FFFFFF", fontFamily: "Roboto", fontSize: "10px", fontWeight: 900}
        }
    },
    plotOptions: {
        column: {
            dataLabels: {
                inside: true,
                enabled: true,
                style: {color: "#FFFFFF", fontFamily: "Roboto", fontSize: "8px", fontWeight: 900}
            }
        },
        area: {
            fillOpacity: 1,
            marker: {
                enabled: false
            },
            dataLabels: {
                enabled: true,
                style: {color: "#FFFFFF", fontFamily: "Roboto", fontSize: "8px", fontWeight: 900}
            }
        },
        areaspline: {
            fillOpacity: 1,
            marker: {
                enabled: false
            },
            dataLabels: {
                enabled: true,
                style: {color: "#FFFFFF", fontFamily: "Roboto", fontSize: "8px", fontWeight: 900}
            }
        },
        pie: {
            dataLabels: {
                enabled: true,
                distance: -30,
                style: {color: "#FFFFFF", fontFamily: "Roboto", fontSize: "8px", fontWeight: 900},
                format: '{y} <span style="font-size: 7px">%</span>'
            },
            showInLegend: true
        },
        bar: {
            dataLabels: {
                enabled: true,
                distance: -30,
                style: {color: "#666AAB", fontFamily: "Roboto", fontSize: "8px", fontWeight: 900}
            },
            label: {
                enabled: false
            }
        }
    },
    series: []
};

const ZONE_GENERIC_COLOR_SCHEMES = Utils.getGradientColorScheme();

function incrementZones(from, to) {

    let index = 0;
    for (let value of from) {
        if (to[index] === undefined) to[index] = 0;
        to[index] += value;
        index++;
    }
}

function getGroupBy (option) {
    const groups = ChartBuilder.groups();
    option = option.toLowerCase();
    switch (option) {
        case groups.YEAR:
            return 'year';
        case groups.MONTH:
            return 'month';
        case groups.WEEK:
            return 'isoWeek';
    }
}

class ChartBuilder {


    /**
     *
     * @param {Athlete} athlete
     * @param {TrainingSession[]} trainingSessions
     * @param groupBy
     */
    static groupTrainingSessions(athlete, trainingSessions, groupBy) {
        let group = {};
        for (let session of trainingSessions) {
            let when = moment(session.date).hours(12).minutes(0).seconds(0).milliseconds(0)
                .startOf(getGroupBy(groupBy)).toDate().getTime();
            if (!group[when]) group[when] = [];
            group[when].push(session);
        }

        let output = {};
        for (let position in group) {
            position = parseInt(position);

            /**@type TrainingSession[] */
            let sessions = group[position];
            output[position] = {
                date: new Date(position),
                sumDistance: 0, sumFullDistance: 0, sumDuration: 0, sumFullDuration: 0,
                sumSpm: 0, sumFullSpm: 0, sumHeartRate: 0, sumFullHeartRate: 0, sumMetrics: 0,
                sumFullMetrics: 0, sumSessions: 0, spmZones: [], spmFullZones: [], speedZones: [],
                speedFullZones: [], heartRateZones: [], heartRateFullZones: [], spmZonesToSpeed: []
            };

            for (let session of sessions) {
                output[position].sumDistance += session.distance;
                output[position].sumFullDistance += session.fullDistance;
                output[position].sumDuration += session.duration;
                output[position].sumFullDuration += session.fullDuration;
                output[position].sumSpm += session.aggregates.sumSpm;
                output[position].sumFullSpm += session.aggregates.sumFullSpm;
                output[position].sumHeartRate += session.aggregates.sumHeartRate;
                output[position].sumFullHeartRate += session.aggregates.sumFullHeartRate;
                output[position].sumMetrics += session.aggregates.sumMetrics;
                output[position].sumFullMetrics += session.aggregates.sumFullMetrics;
                output[position].sumSessions++;


                incrementZones(session.aggregates.spmZones, output[position].spmZones);
                incrementZones(session.aggregates.spmFullZones, output[position].spmFullZones);
                incrementZones(session.aggregates.speedZones, output[position].speedZones);
                incrementZones(session.aggregates.speedFullZones, output[position].speedFullZones);
                incrementZones(session.aggregates.heartRateZones, output[position].heartRateZones);
                incrementZones(session.aggregates.heartRateFullZones, output[position].heartRateFullZones);

                for (let i = 0; i < session.aggregates.spmZonesToSpeed.length; i++) {
                    const zone = session.aggregates.spmZonesToSpeed[i];
                    if (output[position].spmZonesToSpeed[i] === undefined) {
                        output[position].spmZonesToSpeed[i] = {
                            count: 0, total: 0, sessions: []
                        };
                    }

                    output[position].spmZonesToSpeed[i].count += zone.count;
                    output[position].spmZonesToSpeed[i].total += zone.total;
                    output[position].spmZonesToSpeed[i].sessions.push({
                        id: session.id, date: session.date, count: zone.count, total: zone.total
                        , coachTrainingSessionId: session.coachTrainingSessionId
                    });
                }
            }
        }

        return Object.values(output).reverse();
    }

    /**
     *
     * @param {Athlete} athlete
     * @param {TrainingSession[]} trainingSessions
     * @param groupBy
     * @returns {{spm: {data: Array, name: string}[], sessions: {data: Array, name: string}[], hours: {data: Array, name: string}[], distance: {data: Array, name: string}[], heartRate: {data: Array, name: string}[], dps: {data: Array, name: string}[], speedZones: *[], boundaries: {spm: {min: number, max: number}, heartRate: {min: number, max: number}, dps: {min: number, max: number}, speed: {min: number, max: number}}, heartRateZones: {data: Array, name: string}[], speed: {data: Array, name: string}[], spmZones: null, labels: Array}}
     */
    static buildSeries(athlete, trainingSessions, groupBy) {

        let data = ChartBuilder.groupTrainingSessions(athlete, trainingSessions, groupBy);

        let distance = [], hours = [], sessions = []

            , heartRateZonesSeries = ChartBuilder.initializeSeriesForZone(athlete.heartRateZones)
            , spmZonesSeries = ChartBuilder.initializeSeriesForZone(athlete.strokeRateZones)
            , speedZonesSeries = ChartBuilder.initializeSeriesForZone(athlete.speedZones)

            , speed = [], spm = [], dps = [], heartRate = []
        ;

        let labels = []
            , minSpeed = Infinity, maxSpeed = -1
            , minSpm = Infinity, maxSpm = -1
            , minLength = Infinity, maxLength = -1
            , minHeartRate = Infinity, maxHeartRate = -1;

        for (let metrics of data) {

            let avgSpeed = Utils.calculateAverageSpeed(metrics.sumDistance, metrics.sumDuration)
                , avgSpm = metrics.sumSpm / metrics.sumMetrics
                , avgHeartRate = metrics.sumHeartRate / metrics.sumMetrics
                , avgLength = Utils.calculateStrokeLength(avgSpm, avgSpeed)
                , position = metrics.date
            ;

            if (avgSpeed < minSpeed) minSpeed = avgSpeed;
            if (avgSpeed > maxSpeed) maxSpeed = avgSpeed;

            if (avgSpm < minSpm) minSpm = avgSpm;
            if (avgSpm > maxSpm) maxSpm = avgSpm;

            if (avgLength < minLength) minLength = avgLength;
            if (avgLength > maxLength) maxLength = avgLength;

            if (avgHeartRate < minHeartRate) minHeartRate = avgHeartRate;
            if (avgHeartRate > maxHeartRate) maxHeartRate = avgHeartRate;

            labels.push(moment(metrics.date));

            distance.push([position, Utils.round(metrics.sumFullDistance, 1)]);
            hours.push([position, Utils.round(moment.duration(metrics.sumFullDuration).asHours(), 1)]);
            sessions.push([position, metrics.sumSessions]);
            speed.push([position, Utils.round(avgSpeed, 2)]);
            spm.push([position, Utils.round(avgSpm, 2)]);
            dps.push([position, Utils.round(avgLength, 2)]);
            heartRate.push([position, Utils.round(avgHeartRate, 2)]);

            for (let z = 0; z < metrics.spmZones.length; z++) {
                const value = metrics.spmZones[z];
                spmZonesSeries[z].data.push([position, Utils.round(value / metrics.sumMetrics * 100, 2)]);
            }

            for (let z = 0; z < metrics.speedZones.length; z++) {
                const value = metrics.speedZones[z];
                speedZonesSeries[z].data.push([position, Utils.round(value / metrics.sumMetrics * 100, 2)]);
            }

            for (let z = 0; z < metrics.heartRateZones.length; z++) {
                const value = metrics.heartRateZones[z];
                heartRateZonesSeries[z].data.push([position, Utils.round(value / metrics.sumMetrics * 100, 2)]);
            }

        }

        return {
            sessions: [{name: 'sessions', data: sessions}],
            hours: [{name: 'hours', data: hours}],
            distance: [{name: 'distance', data: distance}],
            speed: [{name: 'speed', data: speed}],
            spm: [{name: 'spm', data: spm}],
            dps: [{name: 'dps', data: dps}],
            heartRate: [{name: 'heartRate', data: heartRate}],
            spmZones: spmZonesSeries.reverse(),
            speedZones: speedZonesSeries.reverse(),
            heartRateZones: heartRateZonesSeries.reverse(),
            labels: labels,
            boundaries: {
                speed: {min: minSpeed, max: maxSpeed},
                spm: {min: minSpm, max: maxSpm},
                dps: {min: minLength, max: maxLength},
                heartRate: {min: minHeartRate, max: maxHeartRate}
            }
        }
    }

    /**
     *
     * @param {Athlete} athlete
     * @param metrics
     * @returns {{speedZones: Array, heartRateZones: Array, spmZones: Array}}
     */
    static buildSeriesForZonesChartsInSession(athlete, metrics) {

        let heartRateZonesSeries = [], spmZonesSeries = [], speedZonesSeries = [];

        let colors = ZONE_GENERIC_COLOR_SCHEMES[athlete.strokeRateZones.length].slice(0).reverse();
        for (let z = 0; z < metrics.spmZones.length; z++) {
            const value = metrics.spmZones[z];
            spmZonesSeries.push({
                name: ChartBuilder.calcZoneLabel(athlete.strokeRateZones[z]),
                y: Utils.round(value / metrics.sumMetrics * 100, 2),
                color: colors[z]
            });
        }

        colors = ZONE_GENERIC_COLOR_SCHEMES[athlete.speedZones.length].slice(0).reverse();
        for (let z = 0; z < metrics.speedZones.length; z++) {
            const value = metrics.speedZones[z];
            speedZonesSeries.push({
                name: ChartBuilder.calcZoneLabel(athlete.speedZones[z]),
                y: Utils.round(value / metrics.sumMetrics * 100, 2),
                color: colors[z]
            });
        }

        colors = ZONE_GENERIC_COLOR_SCHEMES[athlete.heartRateZones.length].slice(0).reverse();
        for (let z = 0; z < metrics.heartRateZones.length; z++) {
            const value = metrics.heartRateZones[z];
            heartRateZonesSeries.push({
                name: ChartBuilder.calcZoneLabel(athlete.heartRateZones[z]),
                y: Utils.round(value / metrics.sumMetrics * 100, 2),
                color: colors[z]
            });
        }

        return {
            spmZones: [{name: "spm-zones", data: spmZonesSeries.reverse()}],
            speedZones: [{name: "speed-zones", data: speedZonesSeries.reverse()}],
            heartRateZones: [{name: "hr-zones", data: heartRateZonesSeries.reverse()}]
        };

    }

    static  buildZoneChartsConfig(series) {
        let chartConfigs = {}, formatter = function () {
            let column = series.labels[this.value];
            return column.format('MMM, DD');
        };
        chartConfigs.spmZones = $.extend(true, {}, DEFAULT_CHART_OPTIONS);
        chartConfigs.spmZones.xAxis.labels.formatter = formatter;
        chartConfigs.spmZones.yAxis.stackLabels.enabled = false;
        chartConfigs.spmZones.plotOptions.column.dataLabels.format = '{y} <span style="font-size: 7px">%</span>';
        chartConfigs.spmZones.series = series.spmZones;
        chartConfigs.spmZones.colors = ZONE_GENERIC_COLOR_SCHEMES[series.spmZones.length];
        chartConfigs.spmZones.plotOptions.column.stacking = 'normal';
        chartConfigs.spmZones.legend.enabled = true;

        chartConfigs.speedZones = $.extend(true, {}, DEFAULT_CHART_OPTIONS);
        chartConfigs.speedZones.xAxis.labels.formatter = formatter;
        chartConfigs.speedZones.yAxis.stackLabels.enabled = false;
        chartConfigs.speedZones.plotOptions.column.dataLabels.format = '{y} <span style="font-size: 7px">%</span>';
        chartConfigs.speedZones.series = series.speedZones;
        chartConfigs.speedZones.plotOptions.column.stacking = 'normal';
        chartConfigs.speedZones.colors = ZONE_GENERIC_COLOR_SCHEMES[series.speedZones.length];
        chartConfigs.speedZones.legend.enabled = true;

        chartConfigs.heartRateZones = $.extend(true, {}, DEFAULT_CHART_OPTIONS);
        chartConfigs.heartRateZones.xAxis.labels.formatter = formatter;
        chartConfigs.heartRateZones.yAxis.stackLabels.enabled = false;
        chartConfigs.heartRateZones.plotOptions.column.dataLabels.format = '{y} <span style="font-size: 7px">%</span>';
        chartConfigs.heartRateZones.series = series.heartRateZones;
        chartConfigs.heartRateZones.plotOptions.column.stacking = 'normal';
        chartConfigs.heartRateZones.colors = ZONE_GENERIC_COLOR_SCHEMES[series.heartRateZones.length];
        chartConfigs.heartRateZones.legend.enabled = true;

        return chartConfigs;
    }

    static getGenericChartConfig() {
        return $.extend(true, {}, DEFAULT_CHART_OPTIONS);
    }

    static getGenericZoneColors() {
        return Utils.get12PaletteColorScheme();
    }

    static initializeSeriesForZone(zones) {
        let series = [], i = 0;
        for (let zone of zones) {
            series.push({name: ChartBuilder.calcZoneLabel(zone), data: []});
            i++;
        }
        return series;
    }

    static calcZoneLabel(zone) {
        if (!zone) return '';
        let name = `${zone.start}-${zone.end}`;

        if (!zone.start) {
            return '< ' + zone.end;
        }

        if (!zone.end || zone.end === Infinity) {
            return `>= ${zone.start}`;
        }

        if (zone.start === zone.end) {
            return zone.start + "";
        }

        return name;
    }

    static groups() {
        return {
            WEEK: "week",
            MONTH: "month",
            YEAR: "year"
        }
    }
}

export default ChartBuilder;
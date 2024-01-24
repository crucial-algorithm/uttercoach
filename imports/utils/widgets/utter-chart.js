'use strict';
import Chart from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Random } from 'meteor/random';

const labelColor = 'rgba(0, 0, 0, 0.5)';
let initialized = false;




/**
 * @typedef {Object} ChartLabelOptions
 * @property {boolean}  [display]
 * @property {string}   [align]       position related; defaults to 'end'
 * @property {string}   [anchor]      Position related; defaults to 'end'
 * @property {boolean}  [clamp]       enforces the anchor position to be calculated based on the visible geometry
 * @property {number}   [offset]      position offset
 * @property {string}   [color]       font color
 * @property {number}   [weight]      font weight
 * @property {number}   [size]        font size
 *
 */


/**
 * @typedef {Object} ChartOptions
 * @property {string}               [title]
 * @property {boolean}              [displayYAxisGridLines]
 * @property {boolean}              [displayXAxisGridLines]
 * @property {function}             [xAxisLabelCallback]        Null not to show label or grid line; '' to empty label;
 * @property {number}               [xAxisLabelMaxRotation]     defaults to 50
 */

/**
 * @typedef {Object} ChartDataSet
 * @property {Array<number>}    data
 * @property {string}           backgroundColor
 * @property {string}           borderColor
 * @property {number}           borderWidth
 * @property {number}           pointRadius
 * @property {string}           yAxisID
 *
 */

class UtterChart {

    static TYPES() {
        return {
            LINE: 'line',
            BAR: 'bar'
        }
    }

    static YAxis() {
        return {
            FIRST: 'y-axis-1',
            SECOND: 'y-axis-2'
        }
    }


    /**
     * @private
     * @param type
     * @param options
     * @return {Object}
     */
    static config(type, options) {
        const labelOptions = options.labels || {};

        return {
            type: type,
            plugins: [ChartDataLabels],

            data: {
                labels: null, // needs to be written
                datasets: null // needs to be written
            },
            options: {
                onClick: options.onClick || function(){},
                title: {
                    display: !!options.title,
                    text: options.title || null,
                    fontSize: 14,
                    fontStyle: 'bold',
                    fontColor: 'rgba(0, 0, 0, 0.5)'
                },
                cornerRadius: 0,
                legend: {
                    display: false
                },
                layout: {
                    padding: {
                        left: options.paddingLeft || 0,
                        right: options.paddingRight || 0,
                        top: options.paddingTop || 0,
                        bottom: options.paddingBottom || 0,
                    }
                },
                tooltips: {
                    enabled: false,
                    intersect: false,
                    custom: function (model) {
                        if (!model.title) return;
                        (options.tooltip || function(){})(model.title[0])
                    }
                },
                scales: {
                    xAxes: [{
                        display: options.displayXAxisGridLines === true,
                        ticks: {
                            fontColor: "rgba(0, 0, 0, 1)",
                            fontSize: 10,
                            autoSkipPadding: 20,
                            autoSkip: typeof options.xAxisLabelCallback !== 'function',
                            maxRotation: isNaN(options.xAxisLabelMaxRotation) ? 50 : options.xAxisLabelMaxRotation,
                            callback: options.xAxisLabelCallback || function(label){return label}
                        }
                    }],
                    yAxes: [{
                        display: options.displayYAxisGridLines === true,
                        id: 'y-axis-1',
                        ticks: {
                            fontColor: "rgba(0, 0, 0, 1)",
                            fontSize: 10,
                            maxTicksLimit: 8,
                            beginAtZero: false
                        }
                    }]
                },
                elements: {
                    line: {
                        tension: 0 // disables bezier curves
                    }
                },
                plugins: {
                    datalabels: {
                        display: labelOptions.display === true,
                        align: labelOptions.align || 'end', // https://chartjs-plugin-datalabels.netlify.app/guide/positioning.html#alignment-and-offset
                        anchor: labelOptions.anchor || 'end',
                        clamp: labelOptions.clamp === true,
                        offset: typeof labelOptions.offset === 'number' ? labelOptions.offset : undefined,
                        formatter: labelOptions.formatter || Math.round,
                        color: labelOptions.color || labelColor,
                        rotation: labelOptions.rotation || 0,
                        font: labelOptions.font || {
                            weight: labelOptions.weight || undefined,
                            size: labelOptions.size || undefined
                        }
                    }
                }
            }
        }
    }

    static config2Axis(type, options) {
        let config = UtterChart.config(type, options);
        config.options.scales.yAxes = [{
            display: options.displayYAxisGridLines === true,
            position: 'left',
            id: 'y-axis-1'
        }, {
            display: options.displayYAxisGridLines === true,
            position: 'left',
            ticks: {
//                callback: () => { return null },
            },
            id: 'y-axis-2'
        }]

        return config;
    }

    /**
     *
     * @param {Element} canvas
     * @param type
     * @param title
     * @param labels
     * @param {ChartDataSet|Array<ChartDataSet>} dataset
     * @param {ChartOptions} options
     * @param {boolean} displayAverage
     */
    constructor(canvas, title, type, labels, dataset, options, displayAverage = false) {

        if (initialized === false) {
            extend();
            initialized = true;
        }
        options = {...options};
        options.title = title;

        let config;
        let datasets;

        if (UtterChart.shouldDrawSecondaryYAxis(dataset)) {
            config = UtterChart.config2Axis(type, options);
            datasets = dataset;
        } else {
            config = UtterChart.config(type, options);
            datasets = Array.isArray(dataset) ? dataset : [dataset];
        }

        this.generateAverageDataSets(datasets);

        config.data.labels = labels;
        config.data.datasets = datasets;

        this._chart = new Chart(canvas, config);
    }

    generateAverageDataSets(datasets) {
        for (let dataset of datasets) {
            if (dataset.utter.displayAverage !== true) continue;

            let averageSet = {
                type: UtterChart.TYPES().LINE,
                name: 'gen-avg' + Random.id(),
                borderColor: 'rgba(0, 0, 0, 0.2)',
                borderWidth: 1,
                pointRadius: 0,
                borderDash: [5, 15],
                utter: {
                    displayAverage: false,
                    thisIsAAverageSet: true
                }
            };

            let total = 0, average = [], l = datasets[0].data.length;
            for (let i = 0; i < l; i++) {
                total += isNaN(dataset.data[i]) ? 0 : dataset.data[i];
                average.push(0);
            }
            let avg = total / l;
            average = average.map(function () {
                return avg
            });

            averageSet.data = average;
            datasets.push(averageSet);
        }
    }

    destroy() {
        this.chart.destroy();
    }

    /**
     *
     * @param {Array<ChartDataSet>} datasets
     * @return {boolean}
     */
    static shouldDrawSecondaryYAxis(datasets) {
        if (Array.isArray(datasets) === false) return false;
        /**@type {null|string} */
        let axis = null;
        for (let dataset of datasets) {
            if (axis === null) {
                axis = dataset.yAxisID;
                continue;
            }
            if (axis !== dataset.yAxisID) return true;
        }
        return false;
    }

    /**
     *
     * @param {Array<number>} values
     * @param {boolean} displayAverage
     * @param {string} id
     * @param {boolean} reverse
     * @return {ChartDataSet}
     */
    static dataset(values, displayAverage = false, id = 'y-axis-1', reverse = false) {

        let max = null, position = -1;
        for (let i = 0, l = values.length; i < l; i++) {
            if (max === null || values[i] >= max) {
                max = values[i];
                position = i;
            }
        }
        return {
            data: reverse ? values.map((v) => v * -1) : values,
            backgroundColor: 'rgba(102, 106, 171, 0.4)',
            borderColor: id === 'y-axis-1' ? 'rgba(102, 106, 171, 0.4)' : 'rgba(255, 255, 255, 0)',
            borderWidth: id === 'y-axis-1' ? 1 : 0,
            pointRadius: 0,
            yAxisID: id,

            datalabels: {
//                align: 'start',
//                anchor: 'start',
//                color: '#212529'
                offset: 0
            },

            // custom properties, not part of chartjs specs
            utter: {
                displayAverage: displayAverage,
                thisIsAAverageSet: false,
                maxInDataSet: {
                    value: max,
                    position: position
                }
            }
        }
    }


    get chart() {
        return this._chart;
    }

    set chart(value) {
        this._chart = value;
    }
}

function extend() {
    Chart.defaults.global.defaultFontFamily = "'Roboto', sans-serif";
    Chart.defaults.global.defaultFontSize = 14;
    Chart.defaults.global.defaultFontColor = "#000";
}

export default UtterChart;

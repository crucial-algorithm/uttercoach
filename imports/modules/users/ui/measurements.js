'use static';
import "./measurements.html";
import "./measurements.scss";
import {Utils} from  "../../../utils/utils";
import {Athlete} from "../../athletes/api/collections";

let editing = false, editingRecordFrom = null;

Template.profileMeasurements.onRendered(function () {

    const self = this;

    let athlete = Athlete.find(this.data.athleteId)
        , $save = $('#create')
        , $discard = $('#discard')
        , $weight = $('#weight-athlete')
        , $height = $('#height-athlete')
        , $fat = $('#fat-athlete')
        , $formMeasurements = $('#form-measurements')
        , $showPhysicalDataModalButton = $('#add-physical-data')
        , $modal = $('#add-physical-data-modal')
        , $inputs = $formMeasurements.find('input');

    $showPhysicalDataModalButton.on('click', function () {
        editing = false;
        Utils.dialog($modal);
    });

    $save.on("click", function () {
        let weight = parseFloat($weight.val());
        let height = parseFloat($height.val());
        let fat = parseFloat($fat.val());

        $formMeasurements.addClass('was-validated');
        if ($formMeasurements[0].checkValidity() === false) {
            return;

        }

        weight = isNaN(weight) ? null : weight;
        height = isNaN(height) ? null : height;
        fat = isNaN(fat) ? null : fat;


        if (editing === true) {
            Meteor.call("editAthleteMeasurement", athlete.id, weight, height, fat, editingRecordFrom, function (error, response) {
                $inputs.val("");
                $inputs.prop('required', true);
                $modal.modal("hide");
                athlete = Athlete.find(athlete.id);
                drawCharts(athlete, $modal);
            })
        } else {
            Meteor.call("addAthleteMeasurement", athlete.id, weight, height, fat, function (error, response) {
                $inputs.val("");
                $inputs.prop('required', true);
                $modal.modal("hide");
                athlete = Athlete.find(athlete.id);
                drawCharts(athlete, $modal);
            })
        }
    });

    $discard.on("click", function () {
        $modal.modal("hide");
    });

    $formMeasurements.on('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();
    });

    $inputs.on('input', function () {
        let total = 0;
        $inputs.each(function () {
            total += $(this).val().length;
        });
        $inputs.not(this).prop('required', !total);
    });

    drawCharts(athlete, $modal);
});

Template.profileMeasurements.helpers({
    areThereMeasurements: function () {
        return Athlete.find(this.athleteId).measurements.length > 0
    }
});

/**
 *
 * @param {Athlete} athlete
 * @param $modal
 */
function drawCharts(athlete, $modal) {

    const $weightChart = $('#weight-chart')
        , $heightChart = $('#height-chart')
        , $fatChart = $('#fat-chart')
    ;

    let formatter = function () {
            return moment(this.value).format('MMM, DD');
        }
    ;

    let chartOptions = {
        "chart": {"type": "line", "backgroundColor": "#F8F8F8"},
        "title": {"text": "", "align": "left", "y": 5, "visible": false},
        "credits": {"enabled": false},
        "legend": {
            "enabled": false,
            "reversed": true,
            "itemStyle": {"color": "#A7A7A7", "fontSize": "7px", "fontFamily": "Roboto", "fontWeight": 900}
        },
        "tooltip": {"enabled": false},
        "colors": ["#666AAB"],
        "xAxis": {
            "type": "datetime",
            "labels": {"formatter": formatter, "style": {"color": "#A7A7A7", "fontSize": "8px", "fontFamily": "Roboto", "fontWeight": 900}},
            "crosshair": false,
            "gridLineColor": "#D9D9D9"
        },
        yAxis: {
            "title": {"text": ""},
            "labels": {"enabled": false},
            "stackLabels": {
                "enabled": true,
                "style": {"color": "#FFFFFF", "fontFamily": "Roboto", "fontSize": "10px", "fontWeight": 900}
            }
        },
        plotOptions: {
            line: {
                dataLabels: {
                    enabled: true
                },
                enableMouseTracking: true
            },
            series: {
                cursor: 'pointer',
                point: {
                    events: {}
                }
            }
        }
    };

    let fat = [], weight = [], height = [];
    for (let measure of athlete.measurements) {
        let when = new Date(measure.when);
        if (measure.weight !== null) weight.push([when, measure.weight]);
        if (measure.height !== null) height.push([when, measure.height]);
        if (measure.fat !== null) fat.push([when, measure.fat]);
    }

    chartOptions.series = [{"name": "weight", "data": getData(weight)}];
    chartOptions.xAxis.categories = getCategories(weight);
    chartOptions.plotOptions.series.point.events.click = getClickEventHandler(getCategories(weight), $modal, athlete);
    $weightChart.highcharts(chartOptions);

    chartOptions.series = [{"name": "height", "data": getData(height)}];
    chartOptions.xAxis.categories = getCategories(height);
    chartOptions.plotOptions.series.point.events.click = getClickEventHandler(getCategories(height), $modal, athlete);
    $heightChart.highcharts(chartOptions);

    chartOptions.series = [{"name": "fat", "data": getData(fat)}];
    chartOptions.xAxis.categories = getCategories(fat);
    chartOptions.plotOptions.series.point.events.click = getClickEventHandler(getCategories(fat), $modal, athlete);
    $fatChart.highcharts(chartOptions);

    $('.athlete-measurements-charts-container').on('mousedown', function () {
        $('#teste').show();
    });
}

function getCategories(series) {
    return series.map(function (entry) {
        return entry[0]
    })
}
function getData(series) {
    return series.map(function (entry) {
        return entry[1]
    })
}

/**
 *
 * @param categories
 * @param $modal
 * @param {Athlete} athlete
 * @returns {click}
 */
function getClickEventHandler(categories, $modal, athlete) {
    return function click(e) {
        const when = categories[this.x]
            , position = findMeasure(athlete.measurements, when)
            , measure = athlete.measurements[position];
        console.log(when, measure);

        // load values to modal inputs
        $('#weight-athlete').val(measure.weight);
        $('#height-athlete').val(measure.height);
        $('#fat-athlete').val(measure.fat);

        editing = true;
        editingRecordFrom = when.getTime();

        Utils.dialog($modal);
    }

}


/**
 *
 * @param {Array} measures
 * @param {Date} when
 * @returns {number}
 */
function findMeasure(measures, when) {
    let i = 0;
    for (let measure of measures) {
        if (measure.when === when.getTime()) return i;
        i++;
    }
    return -1;
}
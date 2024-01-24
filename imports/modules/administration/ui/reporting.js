import './reporting.html';
import './reporting.scss';

const defaultChartOptions = {
    chart: {type: 'column'},
    title: {text: '', align: 'left', y: 5},
    credits: {enabled: false},
    legend: {enabled: false},
    colors: ['#666AAB'],
    yAxis: {
        title: {text: ''},
        labels: {enabled: false}
    },
    plotOptions: {
        column: {
            dataLabels: {
                enabled: true
            },
            enableMouseTracking: false
        },
        line: {
            dataLabels: {
                enabled: true
            },
            enableMouseTracking: false
        },
        bar: {
            dataLabels: {
                enabled: true
            },
            enableMouseTracking: false
        }
    },
    series: []
};

Template.administrationReporting.onRendered(function () {
    Meteor.call('basicReport', function (err, data) {
        drawTrendCharts(data.series);
        drawMostActiveUsers(data.mostActiveUsers);
    });

    Meteor.call('basicReportPositions', function (err, data) {
        drawMostActiveCountries(data);
    })
});


function drawTrendCharts(series) {

    let weeks = Object.keys(series);
    let athletes = [], coaches = [], sessions = [], duration = [], distance = [], categories = {};
    for (let weekNbr of weeks) {
        weekNbr = parseInt(weekNbr);
        let week = series[weekNbr];
        let label = moment().day('Monday').week(weekNbr);
        categories[label.format('MMM-DD')] = true;
        athletes.push(week.athletes.created);
        coaches.push(week.coaches.created);
        sessions.push(week.sessions.count);
        duration.push(Math.round(week.sessions.duration / 3600000));
        distance.push(Math.round(week.sessions.distance));
    }

    categories = Object.keys(categories);
    drawChart($('#new-coaches'), categories, coaches);
    drawChart($('#new-athletes'), categories, athletes);
    drawChart($('#total-sessions'), categories, sessions);
    drawChart($('#total-hours'), categories, duration);
    drawChart($('#total-distance'), categories, distance);
}


function drawChart($target, categories, series) {
    let options = $.extend(defaultChartOptions, true);
    options.xAxis = {
        categories: categories
    };
    options.series = [{name: '', data: series}];

    $target.highcharts(options);
}

function drawMostActiveUsers(data) {
    let options = $.extend(defaultChartOptions, true);
    let categories = [], series = [];
    data.map(function (d) {
        series.push(Math.round(d.distance));
        categories.push(Meteor.users.findOne({_id: d.user}).profile.name);
    });

    options.chart.type = 'bar';
    options.xAxis = {
        categories: categories
    };
    options.series = [{name: '', data: series}];

    $('#users-ranking').highcharts(options);

}

function drawMostActiveCountries(data) {
    let countries = {}, series = [];
    data.map(function (rec) {
        if (countries[rec.country] === undefined) {
            countries[rec.country] = 0;
        }
        countries[rec.country] += rec.distance;
    });
    let options = $.extend(defaultChartOptions, true);
    options.chart.type = 'pie';
    options.colors = ['#666AAB', '#2B4570', '#A8D0DB', '#E49273', '#A37A74'];

    let countryNames = Object.keys(countries);
    for (let country of countryNames) {
        series.push([country, countries[country]]);
    }
    options.series = [{name: '', data: series}];

    options.plotOptions.pie = {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.y:.0f} km',
            style: {
                color: 'black'
            }
        }
    };

    $('#countries-ranking').highcharts(options);
}

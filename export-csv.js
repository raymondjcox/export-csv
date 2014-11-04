/**
 * A small plugin for getting the CSV of a rendered chart
 */
/*global Highcharts, document */
(function (Highcharts) {

    'use strict';

    var each = Highcharts.each,
        downloadAttrSupported = document.createElement('a').download !== undefined;


    Highcharts.Chart.prototype.getCSV = function () {
        var csv,
            options = (this.options.exporting || {}).csv || {},
            xAxis = this.xAxis[0],
            rows = {},
            rowArr = [],
            names = [],
            i,
            x,
            that = this,

            // Options
            dateFormat = options.dateFormat || '%Y-%m-%d %H:%M:%S',
            itemDelimiter = options.itemDelimiter || ';', // use ';' for direct import to Excel
            lineDelimiter = options.lineDelimiter || '\n'; // '\n' isn't working with the js csv data extraction

        // Loop the series and index values
        i = 0;
        each(this.series, function (series) {
            if (series.options.includeInCSVExport !== false) {
                names.push(series.name);
                each(series.points, function (point) {
                    if (that.userOptions.chart.type === 'map') {
                      if (point['iso-a2'] !== null && point['iso-a2'] !== undefined && point['iso-a2'].match(/^[A-Z]{2}$/g)) {
                        point.x = point['iso-a2'];
                      } else {
                        return true;
                      }
                    }

                    if (!rows[point.x]) {
                        rows[point.x] = [];
                    }
                    rows[point.x].x = point.x;

                    // Pies, funnels etc. use point name in X row
                    if (!series.xAxis) {
                        rows[point.x].name = point.name;
                    }

                    if (that.userOptions.chart.type === 'map') {
                      rows[point.x][i] = point.value;
                    } else {
                      rows[point.x][i] = point.y;
                    }
                });
                i += 1;
            }
        });

        // Make a sortable array
        for (x in rows) {
            if (rows.hasOwnProperty(x)) {
                rowArr.push(rows[x]);
            }
        }
        // Sort it by X values
        if (that.userOptions.chart.type === 'map') {
          rowArr.sort(function (a, b) {
            if (a.x < b.x){
              return -1;
            } else if (a.x > b.x) {
              return  1;
            } else {
              return 0;
            }
          });
        } else {
          rowArr.sort(function (a, b) {
              return a.x - b.x;
          });
        }


        // Add header row
        csv = (xAxis.isDatetimeAxis ? 'DateTime' : 'Category') + itemDelimiter +
            names.join(itemDelimiter) + lineDelimiter;

        // Transform the rows to CSV
        each(rowArr, function (row, i) {

            // Add the X/date/category
            csv += row.name || (xAxis.isDatetimeAxis ? Highcharts.dateFormat(dateFormat, row.x) : xAxis.categories ? Highcharts.pick(xAxis.categories[row.x], row.x) : row.x);
            csv += itemDelimiter;

            // Add the values
            csv += row.join(itemDelimiter);

            // Add the line delimiter
            if (i < rowArr.length - 1) {
                csv += lineDelimiter;
            }
        });

        return csv;
    };

    // Add "Download CSV" to the exporting menu. Use download attribute if supported, else
    // run a simple PHP script that returns a file. The source code for the PHP script can be viewed at
    // https://raw.github.com/highslide-software/highcharts.com/master/studies/csv-export/csv.php
    if (Highcharts.getOptions().exporting) {
        Highcharts.getOptions().exporting.buttons.contextButton.menuItems.push({
            text: Highcharts.getOptions().lang.downloadCSV || 'Download CSV',
            onclick: function () {
                var a;

                // Download attribute supported
                if (downloadAttrSupported) {
                    // Client side extraction
                    a = document.createElement('a');
                    a.href        = 'data:attachment/csv,' + this.getCSV().replace(/\n/g, '%0A');
                    a.target      = '_blank';
                    a.download    = (this.title ? this.title.textStr.replace(/ /g, '-').toLowerCase() : 'chart') + '.csv';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();

                // Fall back to server side handling
                } else {
                    Highcharts.post('http://www.highcharts.com/studies/csv-export/csv.php', {
                        csv: this.getCSV()
                    });
                }

            }
        });
    }
}(Highcharts));

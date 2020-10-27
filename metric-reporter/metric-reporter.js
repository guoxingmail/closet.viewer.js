"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Measurement = void 0;
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
class Measurement {
    constructor(unit, value) {
        this.unit = unit;
        this.value = value;
    }
}
exports.Measurement = Measurement;
function log(...args) {
    console.log('MetricReporter: ', ...args);
}
class MetricReporter {
    constructor() {
        this.benchmarkings = [];
    }
    report(b) {
        this.benchmarkings.push(b);
    }
    // https://jasmine.github.io/api/edge/Reporter.html
    jasmineStarted(suiteInfo) { }
    suiteStarted(result) { }
    specStarted(result) { }
    specDone(result) { }
    suiteDone(result) { }
    benchMarkingObj() {
        return this.benchmarkings.reduceRight(_.merge, {});
    }
    metaObj() {
        const envHead = 'REPORT_META_';
        const entries = Object.keys(process.env).filter(x => x.startsWith(envHead)).map(key => [key.substring(envHead.length), process.env[key]]);
        return _.fromPairs(entries);
    }
    jasmineDone(result) {
        if (result.failedExpectations.length > 0) {
            log('Test failed. Not reporting performance metrics.');
            return;
        }
        const benchmarkings = this.benchmarkings;
        if (benchmarkings.length == 0) {
            log('Nothing to report');
            return;
        }
        const reportingObj = {
            benchmarks: this.benchMarkingObj(),
            meta: this.metaObj()
        };
        const reportPath = path.resolve(__dirname, '..', 'metric-report.json');
        const existingReportObj = JSON.parse(fs.readFileSync(reportPath).toString('utf-8'));
        const json = JSON.stringify(_.merge(existingReportObj, reportingObj));
        fs.writeFileSync(reportPath, json);
    }
}
exports.default = MetricReporter;

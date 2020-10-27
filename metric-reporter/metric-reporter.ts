import * as fs from "fs";
import * as path from "path";
import * as _ from 'lodash';
import { AggregatedResult, Context, Reporter, ReporterOnStartOptions, Test, TestResult } from "@jest/reporters";
import { TestCaseResult } from "@jest/test-result";

export class Measurement {
    public constructor (
        public unit:string,
        public value: number
    ) {}
}

export type Benchmarking = Record<string, Record<string, Measurement>>


function log(...args) {
    console.log('MetricReporter: ', ...args);
}
export default class MetricReporter {

    report(b: Benchmarking) {
        this.benchmarkings.push(b);
    }
    constructor() {
        this.benchmarkings = [];
    }
    benchmarkings: Benchmarking[];

    // https://jasmine.github.io/api/edge/Reporter.html

    jasmineStarted(suiteInfo) {    }
    suiteStarted(result) {    }
    specStarted(result) {    }
    specDone(result) {    }
    suiteDone(result) {    }

    benchMarkingObj():any {
        return this.benchmarkings.reduceRight(_.merge, {})
    }
    metaObj():any {
        const envHead = 'REPORT_META_'
        const entries = Object.keys(process.env).filter(x=>x.startsWith(envHead)).map(key=> [key.substring(envHead.length), process.env[key]] )
        return _.fromPairs(entries)
    }
    jasmineDone(result) {
        
        if (result.failedExpectations.length > 0) {
            log('Test failed. Not reporting performance metrics.');
            return;
        }
        const benchmarkings: Benchmarking[] = this.benchmarkings

        if (benchmarkings.length == 0) {
            log('Nothing to report');
            return;
        }

        const reportingObj = {
            benchmarks: this.benchMarkingObj(),
            meta: this.metaObj()
        };

        const reportPath = path.resolve(__dirname, '..', 'metric-report.json');

        const existingReportObj = JSON.parse(fs.readFileSync(reportPath).toString('utf-8'))

        const json = JSON.stringify( _.merge(existingReportObj, reportingObj) );

        fs.writeFileSync(reportPath, json)
    }
}
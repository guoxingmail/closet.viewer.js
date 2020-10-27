import MetricReporter, {  } from "./metric-reporter";

const reporter = new MetricReporter();
(global as any).metricReporter = reporter;
jasmine.getEnv().addReporter(reporter);

declare namespace jasmine {
    function getEnv():any;
}
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const metric_reporter_1 = require("./MetricReporter");
const reporter = new metric_reporter_1.default();
global.metricReporter = reporter;
jasmine.getEnv().addReporter(reporter);

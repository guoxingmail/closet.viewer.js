import * as fs from "fs";
import * as path from "path";
import MetricReporter, { Measurement } from "./metric-reporter/metric-reporter";
import * as webpackConfig from "./webpack.config";

declare var metricReporter:MetricReporter;

test("Bundle size test", () => {
    const filename = webpackConfig.output.filename;
    const dist = webpackConfig.output["path"] ?? "./dist"
    const stats = fs.statSync(path.resolve(dist, filename))
    // console.log({bundleSize: stats.size / 1024 / 1024})
    expect(stats.size).toBeLessThan(2.5 * 1024 * 1024);
    metricReporter.report({
        "bundle size test": {
            "Bundle Size": new Measurement("bytes", stats.size)
        }
    });

});

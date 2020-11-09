import puppeteer from "puppeteer";
import * as fs from "fs";
import { isRight } from "fp-ts/Either";
import * as D from "io-ts/Decoder";
import MetricReporter, { Benchmarking, Measurement } from "../MetricReporter";
import * as webpackConfig from "../../webpack.config";
import P from "path";
import { streamPageEvents } from "../common";
import URL from "url";
import { last, map, tap } from "rxjs/operators";
import ReactDomServer from "react-dom/server";
import { template } from "./template";
import * as E from "fp-ts/Either";
import { identity } from "fp-ts/lib/function";


declare var metricReporter: MetricReporter;

const ChromeMetric = D.type({
  JSHeapUsedSize: D.number,
  JSHeapTotalSize: D.number,
  TaskDuration: D.number,
});

test("Bundle size test", () => {
  const filename = webpackConfig.output.filename;
  const dist = webpackConfig.output["path"] ?? "./dist";
  const bundleFileStat = fs.statSync(P.resolve(dist, filename));
  expect(bundleFileStat.size).toBeLessThan(2.5 * 1024 * 1024);
  metricReporter.report({
    "Bundle size test": {
      "Bundle Size": new Measurement("bytes", bundleFileStat.size),
    },
  });
});

const benchmarkName = "denim loading benchmarking"
test(benchmarkName, (done) => {
  const libPath = P.resolve(__dirname, "..", "..", "dist", "closet.viewer.js");
  const zrestPath = P.resolve(__dirname, "denim.zrest");
  const html = ReactDomServer.renderToStaticMarkup(
    template(
      URL.pathToFileURL(libPath),
      URL.pathToFileURL(zrestPath)
    )
  );

  streamPageEvents(html, (page) => page.metrics()).pipe(
    map(ChromeMetric.decode),
    map(E.fold(
      (notChromeMetric) => { throw notChromeMetric },
      (decoded) => ({
        [benchmarkName]: {
          JSHeapUsedSize: new Measurement("bytes", decoded.JSHeapUsedSize),
          JSHeapTotalSize: new Measurement("bytes", decoded.JSHeapTotalSize),
          TaskDuration: new Measurement("s", decoded.TaskDuration),
        }
      })
    )),
  ).subscribe({
    next: (metric) => metricReporter.report(metric),
    complete: done
  })
}, 120000);

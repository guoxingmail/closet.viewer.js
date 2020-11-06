import puppeteer from "puppeteer";
import * as fs from "fs";
import { isRight } from "fp-ts/Either";
import * as D from "io-ts/Decoder";
import MetricReporter, { Measurement } from "../MetricReporter";
import * as webpackConfig from "../../webpack.config";
import P from "path";
import { streamPageEvents } from "../common";
import URL from "url";
import { last } from "rxjs/operators";
import ReactDomServer from "react-dom/server";
import { template } from "./template";

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

test("Denim loading bechmark", async () => {
  const html = ReactDomServer.renderToStaticMarkup(
    template(
      URL.pathToFileURL(
        P.resolve(__dirname, "..", "..", "dist", "closet.viewer.js")
      ),
      URL.pathToFileURL(P.resolve(__dirname, "denim.zrest"))
    )
  );
  await streamPageEvents(
    html,
    reportMetric("denim loading benchmarking")
  ).toPromise();
  expect(true).toBeTruthy();
}, 120000);

const reportMetric = (testName: string) => async (page: puppeteer.Page) => {
  const metrics = await page.metrics();

  const decoded = ChromeMetric.decode(metrics);
  if (isRight(decoded)) {
    metricReporter.report({
      [testName]: {
        JSHeapUsedSize: new Measurement("bytes", decoded.right.JSHeapUsedSize),
        JSHeapTotalSize: new Measurement(
          "bytes",
          decoded.right.JSHeapTotalSize
        ),
        TaskDuration: new Measurement("s", decoded.right.TaskDuration),
      },
    });
  } else {
    console.log("failed to decode ChromeMetric", metrics);
  }
  return Promise.resolve("done"); // return anything to trigger the end of async task
};

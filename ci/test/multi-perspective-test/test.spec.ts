import fs from "fs";
import { hash } from "imghash";
import leven from "leven";
import puppeteer from "puppeteer";

import * as rx from "rxjs";
import {zip, from} from "rxjs";

import * as rxOp from "rxjs/operators";
import { map, filter, toArray } from "rxjs/operators";

import * as _ from "lodash";
import { streamScreenshots } from "../../common";
import { template } from "./template";
import * as U from "url";
import * as P from "path";
import ReactDomServer from "react-dom/server";
import * as D from "io-ts/Decoder";
import { fold } from "fp-ts/Either";
import { pipe, identity } from "fp-ts/function";
import {PNG} from "pngjs";
import { fst, snd } from "fp-ts/lib/ReadonlyTuple";

declare var reporter: any;
const casesPath = P.resolve(__dirname, "cases");
const ModelMeta = D.type({
  url: D.string,
});
const testCases = fs
  .readdirSync(casesPath)
  .map((x) => P.join(casesPath, x))
  .filter((x) => fs.statSync(x).isDirectory());

describe.each(testCases)("graphic", (casePath: string) => {
  const modelMeta = pipe(
    ModelMeta.decode(require(P.resolve(casePath, "model.js"))),
    fold((notMeta) => {
      console.error({
        msg: "Invalid meta format. Please conform to {url:string}",
        obj: notMeta,
      });
      throw notMeta;
    }, identity)
  );

  const testName = "rendering test: " + P.basename(casePath);

  it(
    testName,
    (done) => {
      const temp = template(
        U.pathToFileURL(
          P.resolve(__dirname, "..", "..", "..", "dist", "closet.viewer.js")
        ),
        new U.URL(modelMeta.url)
      );

      reporter.description(`${testName} multi-perspective test`);

      const expectPath = P.join(casePath, "expect");
      const expectImgs = fs
        .readdirSync(expectPath)
        .filter((x) => P.extname(x) === ".png")
        .sort()
        .map((x) => P.join(expectPath, x))
        .map((x) => fs.readFileSync(x));
      
      const html = ReactDomServer.renderToStaticMarkup(temp)
      const imagePairs = zip(
        streamScreenshots(html),
        from(expectImgs)
      )

      filter(isDifferent)(imagePairs).subscribe({
        next([expected, result]) {
          reporter.addAttachment(`Expected`, expected, "image/png");
          reporter.addAttachment(`instead of`, result, "image/png");
          expect(false).toBeTruthy();
        },
        complete: done,
      });
    },
    50000
  );
});

export function isDifferent([a, b]: [Buffer, Buffer]):boolean {
  const x = PNG.sync.read(a);
  const y = PNG.sync.read(b);
  return x.data.compare(y.data) !== 0;
}
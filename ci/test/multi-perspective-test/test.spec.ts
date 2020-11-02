import fs from "fs";
import { hash } from "imghash";
import leven from "leven";
import puppeteer from "puppeteer";

import * as rx from "rxjs";
import * as rxOp from "rxjs/operators";
import * as _ from "lodash";
import { streamScreenshots } from "../../common";
import { template } from "./template";
import * as U from "url";
import * as P from "path";
import ReactDomServer from "react-dom/server";
import * as D from "io-ts/Decoder";
import { fold } from "fp-ts/Either";
import { pipe, identity } from "fp-ts/function";

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
    async () => {
      const temp = template(new U.URL(modelMeta.url));

      const expectPath = P.join(casePath, "expect");
      const expectImgs = fs
        .readdirSync(expectPath)
        .filter((x) => P.extname(x) === ".png")
        .sort()
        .map((x) => P.join(expectPath, x))
        .map((x) => fs.readFileSync(x));

      const scores = await rx
        .zip(
          streamScreenshots(ReactDomServer.renderToStaticMarkup(temp)),
          rx.from(expectImgs)
        )
        .pipe(rxOp.map(calculateDifference), rxOp.mergeAll(), rxOp.toArray())
        .toPromise();

      console.log({ scores });
      scores.forEach((x) => {
        expect(x).toBeLessThan(8);
      });
    },
    50000
  );
});

async function calculateDifference([a, b]: [Buffer, Buffer]) {
  const hash1 = await hash(a, 64);
  const hash2 = await hash(b, 64);

  const dist = leven(hash1, hash2);

  return dist;
}

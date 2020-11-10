import fs from "fs";
import {zip, from, Observable} from "rxjs";

import { map, filter, concatMap, mergeMap, tap } from "rxjs/operators";

import * as _ from "lodash";
import { streamPageEvents } from "../../common";
import { template } from "./template";
import * as U from "url";
import * as P from "path";
import {PNG} from "pngjs";
import { zrestURLs } from "./zrestURLs";
import { renderToStaticMarkup } from "react-dom/server";
import * as D from "io-ts/Decoder";
import { fold } from "fp-ts/Either";
import { identity } from "fp-ts/lib/function";
declare var reporter: any;

describe("rendering test", ()=>{
  const libPath = P.resolve(__dirname, "..", "..", "..", "dist", "closet.viewer.js")
  const libURL = U.pathToFileURL(libPath);
  it("rendering test", (done)=>{
    const results = from(zrestURLs).pipe(
      map(zrestURL => renderToStaticMarkup(template(libURL, zrestURL))),
      concatMap(streamScreenshots),
    )

    const answers = from(answerPNGs).pipe(map((path) => fs.readFileSync(path)));
    
    filter(isDifferent)(zip(results, answers)).subscribe({
      next([x,y]) {
        reporter.addAttachment(`Expected`, x, "image/png");
        reporter.addAttachment(`instead of`, y, "image/png");
        expect(false).toBeTruthy();
      },
      complete: done
    })
  }, 10 * 60 * 1000)
})

function isDifferent([a, b]: [Buffer, Buffer]):boolean {
  const x = PNG.sync.read(a);
  const y = PNG.sync.read(b);
  return x.data.compare(y.data) !== 0;
}

const principleViewResponse = D.type({
  images: D.array(D.string),
});

function streamScreenshots(html: string): Observable<Buffer> {
  return streamPageEvents(html, async (page, req) => JSON.parse(req.postData())).pipe(
    map(principleViewResponse.decode),
    map(
      fold((x) => {
        throw x;
      }, identity)
    ),
    mergeMap((x) => x.images),
    map((dataURL) => {
      const header = "data:image/png;base64,";
      if (dataURL.startsWith(header)) {
        return dataURL.substring(header.length);
      } else {
        throw "invalid dataurl: " + dataURL.substring(0, 32) + "...";
      }
    }),
    map((base64) => Buffer.from(base64, "base64"))
  );
}

const answersDir = P.resolve(__dirname, "answers");
const answerPNGs = fs
    .readdirSync(answersDir)
    .map((x) => P.resolve(answersDir, x))
    .filter((x) => fs.statSync(x).isFile() && P.extname(x) == ".png")
    .sort();

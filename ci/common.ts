import puppeteer from "puppeteer";
import * as rx from "rxjs";
import { map, mapTo, mergeMap } from "rxjs/operators";
import URL from "url";
import P from "path";
import os from "os";

import { fst } from "fp-ts/lib/ReadonlyTuple";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import * as D from "io-ts/Decoder";
import { identity } from "fp-ts/lib/function";
import { fold } from "fp-ts/lib/Either";

const principleViewResponse = D.type({
  images: D.array(D.string)
})

export function streamScreenshots(html: string): rx.Observable<Buffer> {
  return streamPageEvents(html, async (page, req)=>JSON.parse(req.postData())).pipe(
      map(principleViewResponse.decode),
      map(fold((x)=>{throw x}, identity)),
      mergeMap(x=>x.images),
      map(dataURL => {
          const header = "data:image/png;base64,"
          if (dataURL.startsWith(header)) {
              return dataURL.substring(header.length)
          } else {
              throw "invalid dataurl: " + dataURL.substring(0,32) + "..."
          }
      }),
      map(base64 => Buffer.from(base64, 'base64'))
  )
}

declare global {
  var __BROWSER__: puppeteer.Browser;
}

export function streamPageEvents<T>(
  html: string,
  pageMap: (p: puppeteer.Page, r:puppeteer.Request) => Promise<T>
): rx.Observable<T> {
  const tmpHTMLpath = P.resolve(os.tmpdir(), `tmphtml-${uuidv4()}.html`);
  fs.writeFileSync(tmpHTMLpath, html);
  return new rx.Observable((subscriber) => {
    global.__BROWSER__.newPage().then(async (page) => {
      await page.setRequestInterception(true);
      page.on("request", async (req) => {
        // console.log(req)
        if (req.url().includes("screenshotrequest")) {
          subscriber.next(await pageMap(page, req));
          page.close();
          subscriber.complete();
        } else {
          req.continue();
        }
      });
      const url = URL.pathToFileURL(tmpHTMLpath).toString();
      await page.goto(url);
    });
  });
}

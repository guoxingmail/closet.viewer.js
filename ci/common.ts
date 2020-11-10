import puppeteer from "puppeteer";

import { Observable } from "rxjs";
import U from "url";
import P from "path";
import fs from "fs";

import os from "os";
import { v4 as uuidv4 } from "uuid";

declare global {
  var __BROWSER__: puppeteer.Browser;
}

export function streamPageEvents<T>(html: string, pageMap: (p: puppeteer.Page, r: puppeteer.Request) => Promise<T>): Observable<T> {
  const tmpHTMLpath = P.resolve(os.tmpdir(), `tmphtml-${uuidv4()}.html`);
  fs.writeFileSync(tmpHTMLpath, html);
  return new Observable((subscriber) => {
    global.__BROWSER__.newPage().then(async (page) => {
      await page.setRequestInterception(true);
      page.on("request", async (req) => {
        if (req.url().includes("screenshotrequest")) {
          if (req.method() == "DELETE") {
            subscriber.complete();
            page.close();
          } else if (req.method() == "PUT") {
            subscriber.next(await pageMap(page, req));
            subscriber.complete();
            page.close();
          } else {
            subscriber.next(await pageMap(page, req));
            req.respond({ status: 200 });
          }
        } else {
          req.continue();
        }
      });
      const url = U.pathToFileURL(tmpHTMLpath).toString();
      await page.goto(url);
    });
  });
}
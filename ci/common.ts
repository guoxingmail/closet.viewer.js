import puppeteer from "puppeteer";
import * as rx from "rxjs";
import { map, mapTo, mergeMap } from "rxjs/operators";
import URL from "url";
import P from "path";


export function streamScreenshots(html: string): rx.Observable<Buffer> {
    return streamPageEvents(html, async page=>{
        return (await (await page.$("canvas")).screenshot()) as unknown as Buffer
    })
}

declare global{
    var __BROWSER__:puppeteer.Browser
}

export function streamPageEvents<T>(html: string, pageMap:(p:puppeteer.Page)=>Promise<T>): rx.Observable<T> {
    return new rx.Observable(subscriber => {
        global.__BROWSER__.newPage().then(async page => {
            await page.setRequestInterception(true)
            page.on('request', async (req) => {
                // console.log(req)
                if (req.url().includes('screenshotrequest')) {
                    if (req.method() == "DELETE") {
                        await req.respond({status: 200})
                        // await page.close();
                        subscriber.complete();
                    } else {
                        subscriber.next(await pageMap(page));
                        await req.respond({ status: 200 })
                    }
                } else {
                    req.continue();
                }
            })
            await page.goto(URL.pathToFileURL(P.resolve(__dirname, 'empty.html')).toString());
            await page.setContent(html)
        })
    })
}



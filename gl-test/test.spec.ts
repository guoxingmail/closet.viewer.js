
import fs from "fs";
import URL from "url";
import PATH from "path"
import { hash } from "imghash";
import leven from "leven";
import puppeteer from "puppeteer";
import MetricReporter, { Measurement } from "../metric-reporter/metric-reporter";
import * as D from "io-ts/Decoder";
import { pipe } from "fp-ts/function";
import { bimap } from "fp-ts/Either";
import * as rx from "rxjs";
import * as rxOp from "rxjs/operators";
import * as _ from "lodash";
import { uniqueId } from "lodash";
// Consider using jest-puppeteer

declare var metricReporter:MetricReporter;

const casesPath = PATH.join(__dirname, 'cases')

const testCases = fs.readdirSync(casesPath).map(x => PATH.join(casesPath, x)).filter(x => fs.statSync(x).isDirectory())

var browser: puppeteer.Browser;
beforeAll(async () => {
    try {
        browser = await puppeteer.launch({
            // headless: false,
            args: ['--no-sandbox', '--disable-web-security']});
    } catch (error) {
        console.log(error);
    }
})
afterAll(async () => {
    await browser.close();
})

const ChromeMetric = D.type({
    JSHeapUsedSize: D.number,
    JSHeapTotalSize: D.number,
    TaskDuration: D.number
})

describe.each(testCases)("graphic", (casePath: string) => {
    const htmlFilePath = PATH.join(casePath, 'scenario.html');
    const testName = 'rendering test: ' + PATH.basename(casePath)

    it(testName, async () => {
        expect(fs.existsSync(htmlFilePath)).toBeTruthy();

        const htmlFileURL = URL.pathToFileURL(htmlFilePath);
        const [page, screenshotStream] = await streamScreenshots(htmlFileURL)
        const savedImgs = screenshotStream.pipe(
            rxOp.map((pngBuffer) => {
                const sampleImgPath = PATH.join(casePath, `result-${uniqueId()}.png`);
                fs.writeFileSync(sampleImgPath, pngBuffer, { encoding: 'base64' });
                return sampleImgPath;
            })
        )

        const expectPath = PATH.join(casePath, "expect")
        const expectImgs = fs.readdirSync(expectPath).filter(x=>PATH.extname(x) === '.png').sort().map(x => PATH.join(expectPath, x))

        const scores = await rx.zip(savedImgs, rx.from(expectImgs))
          .pipe(
            rxOp.map(calculateDifference),
            rxOp.mergeAll(),
            rxOp.toArray()
          )
          .toPromise();

        console.log({scores});
        scores.forEach(x=>{
            expect(x).toBeLessThan(8);
        })
        
        reportMetric(page, testName);

    }, 50000)
})

async function calculateDifference([sampleImagePath, expectedImagePath]: [string, string]) {
    const hash1 = await hash(sampleImagePath, 64);
    const hash2 = await hash(expectedImagePath, 64);

    const dist = leven(hash1, hash2);

    return dist;
}

async function streamScreenshots(url: URL): Promise<[puppeteer.Page, rx.Observable<Buffer>]> {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    return [page, new rx.Observable(subscriber => {
        page.on('request', (req) => {
            if (req.url().includes('screenshotrequest')) {
                if (req.method() == "DELETE") {
                    subscriber.complete();
                    req.respond({status: 200})
                } else {
                    page.$("canvas").then(element => {
                        element.screenshot().then((pngBuffer) => {
                            subscriber.next((pngBuffer as unknown as Buffer))
                            req.respond({ status: 200 })
                        })
                    })
                }
            } else {
                req.continue();
            }
        })
        page.goto(url.toString());
    })]
}

async function reportMetric(page: puppeteer.Page, testName: string) {
    const metrics = await page.metrics();

    const decoded = ChromeMetric.decode(metrics);
    pipe(decoded, bimap(
        (notChromeMetric) => console.log("failed to decode ChromeMetric", metrics),
        (chromeMetric) => {
            metricReporter.report({
                [testName]: {
                    JSHeapUsedSize: new Measurement("bytes", chromeMetric.JSHeapUsedSize),
                    JSHeapTotalSize: new Measurement("bytes", chromeMetric.JSHeapTotalSize),
                    TaskDuration: new Measurement("s", chromeMetric.TaskDuration)
                }
            })
        }
    ))
}
export class Measurement {
    public constructor (
        unit:string,
        value: number
    );
}
export type Benchmarking = Record<string, Record<string, Measurement>>
export default class MetricReporter {
    report(b: Benchmarking);
    benchmarkings: Benchmarking[];
}
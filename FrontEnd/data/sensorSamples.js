export const samples = [
  {
    name: "Sample 1",
    dhtStatus: "OK (ok=1, fail=0)",
    temp: 23.8,
    hum: 34.0,
    co2: 649,
    payloadLength: 34,
    payload: '{"co2":649,"temp":23.8,"hum":34.0}',
  },
  {
    name: "Sample 2",
    dhtStatus: "OK (ok=2, fail=0)",
    temp: 23.8,
    hum: 34.0,
    co2: 654,
    payloadLength: 34,
    payload: '{"co2":654,"temp":23.8,"hum":34.0}',
  },
];

const latestSample = samples[samples.length - 1];

export const summary = {
  temp: `${latestSample.temp} C`,
  hum: `${latestSample.hum.toFixed(1)} %`,
  co2: `${latestSample.co2} ppm`,
  payloadLength: latestSample.payloadLength,
};

export type ICoinGeckoPrices = ICoinGeckoPrice[];

export type ICoinGeckoPrice = [
    number, // Timestamp
    number  // Price
]

export type ITimeMode = 'h1'|'h2'|'h3'|'d1'|'d2'|'d3'|'d4'|'m1'|'m2'|'m3';
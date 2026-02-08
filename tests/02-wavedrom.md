# WaveDrom Diagrams Test

## Timing Diagram - Clock and Data

```wavedrom
{
  "signal": [
    { "name": "clk", "wave": "P........" },
    { "name": "data", "wave": "x.345678x", "data": ["D0", "D1", "D2", "D3", "D4", "D5"] },
    { "name": "enable", "wave": "0.1.....0" },
    { "name": "valid", "wave": "0..1...0." }
  ]
}
```

## I2C Protocol

```wavedrom
{
  "signal": [
    { "name": "SCL", "wave": "1.0..10..10..10..10..1" },
    { "name": "SDA", "wave": "1.0..=...=...=...=...1", "data": ["ADDR", "R/W", "ACK", "DATA"] }
  ],
  "head": { "text": "I2C Start & Address Phase" }
}
```

## Register Definition

```wavedrom
{
  "reg": [
    { "name": "CTRL", "bits": 8, "attr": "RW" },
    { "name": "STATUS", "bits": 8, "attr": "RO" },
    { "name": "DATA", "bits": 16, "attr": "RW" }
  ],
  "config": { "hspace": 600 }
}
```

## State Machine Timing

```wavedrom
{
  "signal": [
    { "name": "clk", "wave": "p......." },
    { "name": "state", "wave": "2.3.4.5.2", "data": ["IDLE", "FETCH", "EXEC", "WRITE", "IDLE"] },
    { "name": "busy", "wave": "0.1....0." }
  ]
}
```

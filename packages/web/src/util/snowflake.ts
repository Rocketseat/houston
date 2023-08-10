import { hexToDec } from 'hex2dec'

interface Options {
  mid?: number
  timeOffset?: number
}

export class Snowflake {
  private mid: number
  private timeOffset = 0
  private seq = 0
  private lastTime = 0

  constructor(options?: Options) {
    this.mid = (options?.mid ?? 1) % 1023
  }

  getUniqueID() {
    let time = Date.now()

    if (this.lastTime === time) {
      this.seq++

      if (this.seq > 4095) {
        this.seq = 0

        while (Date.now() <= time) {
          // make system wait till time is been shifted by one millisecond
        }

        time = Date.now()
      }
    } else {
      this.seq = 0
    }

    this.lastTime = time

    const bTime = (time - this.timeOffset).toString(2)

    let bSeq = this.seq.toString(2)
    let bMid = this.mid.toString(2)

    while (bSeq.length < 12) bSeq = '0' + bSeq
    while (bMid.length < 10) bMid = '0' + bMid

    const bid = bTime + bMid + bSeq
    let id = ''

    for (let i = bid.length; i > 0; i -= 4) {
      id = parseInt(bid.substring(i - 4, i), 2).toString(16) + id
    }

    const snowflake = hexToDec(id)

    if (!snowflake) {
      throw new Error('Snowflake ID error.')
    }

    return BigInt(snowflake)
  }
}

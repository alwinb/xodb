// const log = console.log.bind (console)
// getUUIDGenerator () .then (_ => {for (let i=0; i<10; i++) log(_())})

// UUUIDGenerator
// ==============

async function getUUIDGenerator () {
  let getRandomValues

  if (globalThis.crypto?.getRandomValues)
    getRandomValues = globalThis.crypto.getRandomValues

  else {
    const r = await import ('crypto')
    getRandomValues = r.randomFillSync
  }

  function uuidgen () {
    const rnd = new Uint16Array (8)
    getRandomValues (rnd)
    rnd[3] = rnd[3] & 0x0fff | 0x4000
    rnd[4] = rnd[4] & 0x3fff | 0x8000
    let out = [], n = 0, i = 0
    for (let x of [2,1,1,1,3]) {
      let str = ''
      n += x
      while (i < n) str += (rnd[i++] .toString (16) .padStart (4, '0'))
      out.push (str)
    }
    return out.join ('-')
  }

  return uuidgen
}

export { getUUIDGenerator }

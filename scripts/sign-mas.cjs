const { signAsync } = require('@electron/osx-sign')
const { openSync, readSync, closeSync, statSync } = require('node:fs')

const machoHeaders = new Set([
  0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe,
  0xcafebabe, 0xbebafeca, 0xcafebabf, 0xbfbafeca,
])

function isCode(file) {
  if (statSync(file).isDirectory()) return /\.(app|framework)$/.test(file)
  const descriptor = openSync(file, 'r')
  try {
    const header = Buffer.alloc(4)
    return readSync(descriptor, header, 0, 4, 0) === 4 && machoHeaders.has(header.readUInt32BE())
  } finally {
    closeSync(descriptor)
  }
}

module.exports = async (options) => {
  const inheritedIgnores = [options.ignore].flat().filter(Boolean)
  await signAsync({
    ...options,
    // Match the certificate embedded in build/embedded.provisionprofile; a
    // renewed certificate may have the same display name and a different key.
    identity: process.env.MAS_SIGNING_IDENTITY || 'C9E3656DB4A7440996F5431645970B4D071AA671',
    identityValidation: false,
    // osx-sign 1.x treats every binary resource as code. Locale .pak, icons and
    // snapshots are resources sealed by their enclosing signed bundle. Sign
    // every Mach-O executable/library and nested bundle, including .node files.
    ignore: (file) => !isCode(file) || inheritedIgnores.some((rule) =>
      typeof rule === 'function' ? rule(file) : new RegExp(rule).test(file)),
  })
}

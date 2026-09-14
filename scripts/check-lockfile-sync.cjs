// Diagnostic: is apps/Bizflow/package-lock.json in sync with its package.json?
// `npm ci` hard-fails when they disagree, which is the suspected cause of the
// install step failing in CI.
const path = require('path')

const appDir = path.resolve(process.cwd(), process.argv[2])
const pkg = require(path.join(appDir, 'package.json'))
const lock = require(path.join(appDir, 'package-lock.json'))
const rootEntry = lock.packages && lock.packages['']

if (!rootEntry) {
  console.log('  NO packages[""] ENTRY IN LOCK')
  process.exit(0)
}

let problems = 0

function cmp(label, a, b) {
  a = a || {}
  b = b || {}
  const onlyPkg = Object.keys(a).filter((k) => !(k in b))
  const onlyLock = Object.keys(b).filter((k) => !(k in a))
  const diffVer = Object.keys(a).filter((k) => k in b && a[k] !== b[k])

  console.log('  ' + label + ': package.json=' + Object.keys(a).length + ' lock=' + Object.keys(b).length)
  if (onlyPkg.length) {
    problems += onlyPkg.length
    console.log('    in package.json but MISSING from lock: ' + onlyPkg.join(', '))
  }
  if (onlyLock.length) {
    problems += onlyLock.length
    console.log('    in lock but missing from package.json: ' + onlyLock.join(', '))
  }
  if (diffVer.length) {
    problems += diffVer.length
    console.log('    RANGE MISMATCH:')
    for (const k of diffVer) console.log('      ' + k + '  package.json=' + a[k] + '  lock=' + b[k])
  }
  if (!onlyPkg.length && !onlyLock.length && !diffVer.length) console.log('    in sync')
}

cmp('dependencies', pkg.dependencies, rootEntry.dependencies)
cmp('devDependencies', pkg.devDependencies, rootEntry.devDependencies)

console.log('')
console.log('  lockfileVersion : ' + lock.lockfileVersion)
console.log('  lock name       : ' + lock.name)
console.log('  package name    : ' + pkg.name)
console.log('  lock total pkgs : ' + Object.keys(lock.packages).length)
console.log('')
console.log(problems === 0 ? '  RESULT: in sync (npm ci should be happy)' : '  RESULT: ' + problems + ' mismatches -> npm ci WILL fail')

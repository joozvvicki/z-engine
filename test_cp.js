const fs = require('fs')
const path = require('path')

async function testCp() {
  const testDir = path.join(__dirname, 'test_cp_sandbox')
  const src = path.join(testDir, 'src')
  const dest = path.join(testDir, 'dest')

  // Setup:
  // src/a.txt
  // dest/b.txt (simulating existing project file)

  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true })
  fs.mkdirSync(src, { recursive: true })
  fs.mkdirSync(dest, { recursive: true })

  fs.writeFileSync(path.join(src, 'a.txt'), 'content A')
  fs.writeFileSync(path.join(dest, 'b.txt'), 'content B')

  console.log('--- Before ---')
  console.log('Dest contents:', fs.readdirSync(dest))

  try {
    // Try copying src to dest with force: false
    // Note: Node cp semantics for directories:
    // If dest exists, it copies CONTENTS of src into dest?
    await fs.promises.cp(src, dest, { recursive: true, force: false, errorOnExist: true }) // force: false usually maps to errorOnExist: true logic?
    // Actually node docs say "force: Overwrite existing file or directory. Default: true."
    // If false, and dest exists, does it fail for directory?
  } catch (e) {
    console.log('CP threw error:', e.code)
  }

  console.log('--- After ---')
  console.log('Dest contents:', fs.readdirSync(dest))

  // Clean up
  fs.rmSync(testDir, { recursive: true })
}

testCp()

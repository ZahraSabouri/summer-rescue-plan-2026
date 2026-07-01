import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STUDY_MODULES } from '../src/data/studyModules.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const workspaceRoot = path.resolve(appRoot, '../..')
const publicRoot = path.join(appRoot, 'public', 'study-assets')
const manifestPath = path.join(appRoot, 'public', 'study-assets-manifest.json')

const SOURCE_FOLDERS = {
  aml: 'CMT307 Applied Machine Learning',
  timeSeries: 'MA4508 Time Series',
  mat700: 'MAT700 Mathematical Methods for Data Mining',
  amlPlan: 'Summer_Rescue_Campaign_2026/Module_Plans/CMT307',
  timeSeriesPlan: 'Summer_Rescue_Campaign_2026/Module_Plans/MAT508',
  mat700Plan: 'Summer_Rescue_Campaign_2026/Module_Plans/MAT700',
}

function uniqueResources() {
  const seen = new Set()
  const resources = []

  for (const module of STUDY_MODULES) {
    for (const resource of module.resources) {
      const sourceFolder = SOURCE_FOLDERS[resource.moduleKey]
      if (
        !sourceFolder ||
        resource.viewer === 'external' ||
        resource.viewer === 'youtube' ||
        /^https?:/i.test(resource.url ?? resource.path)
      ) continue

      const key = `${sourceFolder}/${resource.path}`.replace(/\\/g, '/')
      if (seen.has(key)) continue

      seen.add(key)
      resources.push({
        module: module.id,
        title: resource.title,
        sourceFolder,
        relativePath: resource.path,
        source: path.join(workspaceRoot, sourceFolder, resource.path),
        destination: path.join(publicRoot, sourceFolder, resource.path),
      })
    }
  }

  return resources
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function copyResource(resource) {
  await fs.mkdir(path.dirname(resource.destination), { recursive: true })
  await fs.copyFile(resource.source, resource.destination)
  const stat = await fs.stat(resource.destination)
  return stat.size
}

async function main() {
  const verifyOnly = process.argv.includes('--verify-only')
  const resources = uniqueResources()
  const missing = []
  const copied = []
  let totalBytes = 0

  for (const resource of resources) {
    try {
      await fs.access(resource.source)
    } catch {
      missing.push(resource)
      continue
    }

    if (verifyOnly) {
      try {
        const stat = await fs.stat(resource.destination)
        totalBytes += stat.size
        copied.push(resource)
      } catch {
        missing.push({ ...resource, source: resource.destination })
      }
      continue
    }

    const size = await copyResource(resource)
    totalBytes += size
    copied.push(resource)
  }

  const summary = {
    mode: verifyOnly ? 'verify-only' : 'copy',
    checked: resources.length,
    available: copied.length,
    missing: missing.map((item) => ({
      module: item.module,
      title: item.title,
      path: item.relativePath,
      checkedPath: item.source,
    })),
    totalSize: formatBytes(totalBytes),
    destination: publicRoot,
  }

  console.log(JSON.stringify(summary, null, 2))
  if (!verifyOnly) {
    await fs.writeFile(
      manifestPath,
      JSON.stringify(
        {
          ...summary,
          syncedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    )
  }
  if (missing.length > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

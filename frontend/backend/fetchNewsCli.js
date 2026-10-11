import { db } from './database.js'
import { getNewsJob, startNewsImport } from './newsImport.js'
import { writeNewsCsvExports } from './csvExports.js'

const requestedDays = Number(process.env.NEWS_DAYS) || 7
const { job, started } = startNewsImport({ days: requestedDays })
if (!started) {
  console.error('A news refresh is already running.')
  process.exitCode = 1
} else {
  console.log(`Refreshing ${job.total} company feeds from Google News RSS for the last ${requestedDays} days.`)
  const timer = setInterval(() => {
    const current = getNewsJob(job.id)
    if (!current || current.status === 'running') {
      if (current) console.log(`Progress: ${current.completed}/${current.total} companies; ${current.articleCount} article links stored.`)
      return
    }
    clearInterval(timer)
    const exported = writeNewsCsvExports(requestedDays)
    console.log(`Refresh status: ${current.status}`)
    console.log(`Companies fetched: ${current.completed}/${current.total}; articles stored: ${current.articleCount}.`)
    console.log(`Company snapshot: ${exported.snapshotPath}`)
    console.log(`Article links: ${exported.articlesPath}`)
    if (current.message) console.error(current.message)
    if (current.errors.length) console.error(`Company feed errors: ${current.errors.length}`)
    if (current.status !== 'completed') process.exitCode = 1
    db.close()
  }, 1000)
}

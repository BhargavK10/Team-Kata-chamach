import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import Brand from '../components/Brand.jsx'

export default function NotFoundPage() {
  return <main className="not-found-page"><header className="not-found-header"><Brand /></header><div><span className="eyebrow">404 · OFF THE RADAR</span><h1>We can’t find<br /><em>that signal.</em></h1><p>The page you’re looking for doesn’t exist or may have moved.</p><Link className="button" to="/"><ArrowLeft size={16} /> Return home</Link></div></main>
}

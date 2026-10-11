import { Link } from 'react-router-dom'

export default function Brand() {
  return (
    <Link className="brand" to="/" aria-label="COR.P ANALYSIS home">
      <span className="brand-name">COR.P <span>ANALYSIS</span></span>
    </Link>
  )
}

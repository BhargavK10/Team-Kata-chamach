import { useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Radar, UserRound } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Brand from '../components/Brand.jsx'
import { Interactive3D } from '../components/effects/CursorEffects.jsx'
import { login, signup } from '../services/authService.js'

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup'
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const location = useLocation()
  const [values, setValues] = useState({ name: '', email: location.state?.registeredEmail || '', password: '' })
  const navigate = useNavigate()
  const accountCreated = !isSignup && location.state?.accountCreated

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) { setError('Enter a valid email address.'); return }
    if (values.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (isSignup && values.name.trim().length < 2) { setError('Enter your name to create an account.'); return }
    setLoading(true)
    try {
      if (isSignup) {
        await signup(values)
        setValues({ name: '', email: values.email, password: '' })
        navigate('/login', { state: { accountCreated: true, registeredEmail: values.email } })
      } else {
        await login(values)
        navigate('/dashboard')
      }
    } catch (failure) {
      setError(failure.message || 'We could not complete sign in. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page"><div className="auth-backdrop" /><header className="auth-header"><Brand /><Link to="/" className="back-home"><ArrowLeft size={15} /> Back to home</Link></header>
      <main className="auth-main">
        <motion.div className="auth-intro" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}><span className="eyebrow"><span className="live-indicator" /> YOUR SIGNAL, IN FOCUS</span><h1>See beyond<br />the <em>surface.</em></h1><p>A considered view of the signals shaping business risk.</p><div className="auth-orb"><div className="auth-orbit one" /><div className="auth-orbit two" /><Radar size={30} /></div></motion.div>
        <Interactive3D className="auth-card" intensity={2}>
          <span className="auth-card-kicker">{isSignup ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</span><h2>{isSignup ? 'Start with clarity.' : 'Good to see you.'}</h2><p className="auth-card-description">{isSignup ? 'Create your account to explore COR.P ANALYSIS.' : 'Sign in to continue to your monitoring center.'}</p>
          <form onSubmit={onSubmit} noValidate>
            {isSignup && <label className="field-label">Full name<div className="input-wrap"><UserRound size={17} /><input autoComplete="name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} placeholder="Jordan Davis" /></div></label>}
            <label className="field-label">Email address<div className="input-wrap"><Mail size={17} /><input type="email" autoComplete="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} placeholder="you@company.com" /></div></label>
            <label className="field-label">Password<div className="input-wrap"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} placeholder="At least 8 characters" /><button className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {accountCreated && <div className="form-success" role="status">Account created. Sign in with your email and password to continue.</div>}
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button auth-submit" disabled={loading}>{loading ? <><span className="spinner" />{isSignup ? 'Creating account…' : 'Signing in…'}</> : <>{isSignup ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></>}</button>
          </form>
          <div className="auth-switch">{isSignup ? 'Already have an account?' : 'New to COR.P ANALYSIS?'} <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Log in' : 'Create an account'}</Link></div>
          <div className="demo-note"><span className="live-indicator" /> Secure account sign-in</div>
        </Interactive3D>
      </main>
      <footer className="auth-footer"><span>© 2025 COR.P ANALYSIS</span><span>Illustrative demo platform</span></footer>
    </div>
  )
}

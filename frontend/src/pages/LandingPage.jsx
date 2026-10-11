import { ArrowDown, ArrowRight, ArrowUpRight, ChartNoAxesCombined, CircleDot, ScanSearch, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Brand from '../components/Brand.jsx'
import { Interactive3D } from '../components/effects/CursorEffects.jsx'
import ParallaxGrid from '../components/effects/ParallaxGrid.jsx'

const metrics = [{ label: 'MONITORED ENTITIES', value: '2,480+' }, { label: 'SIGNALS ANALYZED', value: '12.6M' }, { label: 'RISK CATEGORIES', value: '08' }]

function RadarVisual() {
  return (
    <div className="radar-stage">
      <div className="radar-orbit orbit-one" /><div className="radar-orbit orbit-two" /><div className="radar-orbit orbit-three" />
      <div className="radar-sweep" />
      <div className="radar-cross horizontal" /><div className="radar-cross vertical" />
      <div className="radar-core"><div className="core-ring"><CircleDot size={25} /></div><span>RISK<br />SIGNAL</span></div>
      <span className="radar-point point-a" /><span className="radar-point point-b" /><span className="radar-point point-c" />
      <div className="radar-label label-a"><i /> <span>REGULATORY<br /><b>+ 14.2%</b></span></div>
      <div className="radar-label label-b"><i /> <span>OPERATIONS<br /><b>STABLE</b></span></div>
      <div className="radar-coordinate">42° 21′ N<br />71° 03′ W <span>· LIVE SCAN</span></div>
      <div className="radar-caption">GLOBAL RISK FIELD <span>01 — 05</span></div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="landing-page">
      <ParallaxGrid className="landing-grid" />
      <nav className="landing-nav"><Brand /><div className="landing-links"><a href="#about">About</a><a href="#services">Services</a><a href="#how-it-works">How it works</a></div><div className="landing-auth"><Link to="/login" className="nav-login">Log in</Link><Link to="/signup" className="button button-small">Get started <ArrowUpRight size={15} /></Link></div></nav>
      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <motion.div className="hero-badge" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}><span className="live-indicator" /> INTELLIGENCE FOR A CHANGING WORLD</motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.75 }}>See the Risk<br />Before It Becomes<br /><em>a Crisis.</em></motion.h1>
            <p className="hero-description">Clarity in a world of uncertainty. Bring emerging corporate risk signals into focus before they reshape your next decision.</p>
            <div className="hero-actions"><Link className="button" to="/signup">Explore the platform <ArrowRight size={16} /></Link><a className="text-link" href="#how-it-works">Discover how it works <ArrowDown size={14} /></a></div>
            <div className="hero-proof"><div className="proof-avatars"><span>R</span><span>A</span><span>M</span><i>+</i></div><span>Built for the people<br />who look beyond the numbers</span></div>
          </div>
          <Interactive3D className="hero-visual" intensity={1.7}><RadarVisual /></Interactive3D>
          <div className="hero-index"><span>01</span><i /> GLOBAL RISK INTELLIGENCE</div>
        </section>
        <div className="metric-strip">{metrics.map((metric) => <div className="strip-metric" key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span></div>)}<div className="strip-note"><span className="live-indicator" /> SAMPLE PLATFORM METRICS</div></div>
        <section id="about" className="content-section about-section"><div className="section-side"><span className="eyebrow">01 / THE PERSPECTIVE</span><h2>Risk doesn't<br />announce itself.</h2></div><div className="section-main"><p className="section-lead">It surfaces in fragments. A filing. A shift in sentiment. A pattern no single headline can explain.</p><p className="section-body">COR.P ANALYSIS brings those fragments together in one considered view—so your team can ask better questions, find context faster, and make decisions with their eyes open.</p><Link className="text-link" to="/dashboard">See the monitoring center <ArrowUpRight size={15} /></Link></div></section>
        <section id="services" className="services-section content-section"><div className="section-title"><span className="eyebrow">02 / THE PLATFORM</span><h2>Signals, made<br />meaningful.</h2><p>From scattered data to a clearer point of view.</p></div><div className="service-cards">
          <Interactive3D className="service-card" intensity={2}><span className="service-icon"><ScanSearch size={20} /></span><span className="service-number">01</span><h3>Early signal detection</h3><p>Find patterns across risk domains before they become impossible to ignore.</p><span className="service-arrow"><ArrowUpRight size={16} /></span></Interactive3D>
          <Interactive3D className="service-card" intensity={2}><span className="service-icon"><ChartNoAxesCombined size={20} /></span><span className="service-number">02</span><h3>Connected context</h3><p>Put company exposure, historical movement, and evidence in one place.</p><span className="service-arrow"><ArrowUpRight size={16} /></span></Interactive3D>
          <Interactive3D className="service-card" intensity={2}><span className="service-icon"><ShieldCheck size={20} /></span><span className="service-number">03</span><h3>Decisions with depth</h3><p>Give your team a shared view of what deserves a closer look next.</p><span className="service-arrow"><ArrowUpRight size={16} /></span></Interactive3D>
        </div></section>
        <section id="how-it-works" className="workflow-section"><div className="workflow-visual"><div className="workflow-ring"><div /><div /><div /><span><ChartNoAxesCombined size={28} /></span></div><span className="workflow-tag tag-top">SIGNAL DETECTED <i /></span><span className="workflow-tag tag-bottom"><i /> PATTERN CONNECTED</span></div><div className="workflow-copy"><span className="eyebrow">03 / HOW IT WORKS</span><h2>From noise<br />to knowing.</h2><p>One clear workflow turns a fast-moving world into a focused picture of the risks that matter to you.</p><ol><li><b>01</b><span><strong>Monitor</strong><small>Start with the companies and signals that matter.</small></span></li><li><b>02</b><span><strong>Connect</strong><small>See how events and exposure relate over time.</small></span></li><li><b>03</b><span><strong>Understand</strong><small>Explore the context behind each risk indicator.</small></span></li></ol><Link className="button button-outline" to="/signup">Build your view <ArrowRight size={16} /></Link></div></section>
        <section className="cta-section"><div className="cta-glow" /><span className="eyebrow">A CLEARER SIGNAL STARTS HERE</span><h2>Look closer.<br /><em>Move with confidence.</em></h2><Link className="button" to="/signup">Get started <ArrowRight size={16} /></Link><span className="cta-footnote">Demo platform · illustrative data only</span></section>
      </main>
      <footer className="landing-footer"><span>© 2025 COR.P ANALYSIS. Intelligence for a changing world.</span><div><a href="#about">About</a><a href="#services">Services</a><Link to="/login">Log in</Link></div></footer>
    </div>
  )
}

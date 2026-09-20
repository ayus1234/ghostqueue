export default function Home() {
  return (
    <main className="shell">
      <nav className="nav"><div className="brand">👻 GhostQueue</div><span>Human Process Abandonment Intelligence</span></nav>
      <section className="hero">
        <div className="eyebrow">OPERATIONAL INTELLIGENCE</div>
        <h1>See where your process<br /><em>loses people.</em></h1>
        <p>Discover where people abandon real-world processes, understand the operational patterns, and test what could change.</p>
        <div className="actions"><button>Analyze a Dataset</button><button className="secondary">Try Simulation</button></div>
      </section>
      <section className="features">
        {[["01","Ghost Zones","Find where abandonment concentrates."],["02","AI Investigator","Turn operational signals into evidence-backed insights."],["03","What-If Simulator","Explore interventions before changing the real process."],["04","Private Analysis","Analyze custom CSV/JSON data without persisting raw uploads in the application database."]].map(([n,t,d]) => <article key={n}><small>{n}</small><h2>{t}</h2><p>{d}</p></article>)}
      </section>
    </main>
  );
}

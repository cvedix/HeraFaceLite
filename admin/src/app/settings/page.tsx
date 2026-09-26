"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../route.module.css";

export default function SettingsPage() {
  const [threshold, setThreshold] = useState("0.70");
  const [camera, setCamera] = useState("gate-01");
  const [saved, setSaved] = useState(false);
  return <main className={styles.page}>
    <Link className={styles.back} href="/">← Back to console</Link>
    <span className={styles.kicker}>Recognition policy</span>
    <h1>Node settings</h1>
    <p className={styles.intro}>Configure the device behavior before applying the policy to the edge runtime.</p>
    <div className={styles.grid}>
      <section className={styles.card}><label className={styles.setting}>Similarity threshold<input type="range" min="0.5" max="0.95" step="0.01" value={threshold} onChange={(event) => setThreshold(event.target.value)} /><b>{threshold}</b></label><label className={styles.setting}>Default camera ID<input value={camera} onChange={(event) => setCamera(event.target.value)} /></label><label className={styles.check}><input type="checkbox" defaultChecked /> Enable mask model</label><label className={styles.check}><input type="checkbox" defaultChecked /> Store check-in events</label><button className={styles.primary} onClick={() => setSaved(true)}>Save settings</button>{saved && <p className={styles.saved}>Settings saved for node 01.</p>}</section>
      <section className={styles.card}><span className={styles.kicker}>Runtime</span><h2>Device information</h2><div className={styles.apiRow}><span>Node</span><b>HeraFace node 01</b></div><div className={styles.apiRow}><span>Model</span><b>SeetaFace6</b></div><div className={styles.apiRow}><span>Database</span><b>42 embeddings</b></div><div className={styles.apiRow}><span>Uptime</span><b>3 days, 4 hours</b></div></section>
    </div>
  </main>;
}

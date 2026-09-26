"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../route.module.css";

export default function TestPage() {
  const [mode, setMode] = useState("recognize");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("No request sent yet.");

  function runRequest() {
    if (!file) {
      setResult("Choose an image first.");
      return;
    }
    setResult(`Demo response\nrecognized: ${mode === "recognize"}\nperson_id: NV001\nsimilarity: 0.91\nsource: ${mode}`);
  }

  return <main className={styles.page}>
    <Link className={styles.back} href="/">← Back to console</Link>
    <span className={styles.kicker}>Live API test</span>
    <h1>Recognition playground</h1>
    <p className={styles.intro}>Test the same image flow that ERP clients use against the HeraFace edge service.</p>
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.segment}><button className={mode === "recognize" ? styles.selected : ""} onClick={() => setMode("recognize")}>Recognize</button><button className={mode === "enroll" ? styles.selected : ""} onClick={() => setMode("enroll")}>Enroll</button></div>
        <label className={styles.upload}>Image<input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        <button className={styles.primary} onClick={runRequest}>Send request →</button>
        <pre className={styles.apiResult}>{result}</pre>
      </section>
      <section className={styles.card}><span className={styles.kicker}>Request details</span><h2>Edge API contract</h2><div className={styles.apiRow}><span>Endpoint</span><b>/api/v1/faces/{mode}</b></div><div className={styles.apiRow}><span>Payload</span><b>multipart/form-data</b></div><div className={styles.apiRow}><span>Max image</span><b>5 MB</b></div><div className={styles.apiRow}><span>Latency target</span><b>&lt; 100 ms</b></div></section>
    </div>
  </main>;
}

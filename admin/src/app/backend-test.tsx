"use client";

import { useState } from "react";
import styles from "./page.module.css";

const apiUrl = process.env.NEXT_PUBLIC_HERAFACE_API_URL || "http://127.0.0.1:18083";

export default function BackendTest() {
  const [mode, setMode] = useState<"enroll" | "recognize">("enroll");
  const [file, setFile] = useState<File | null>(null);
  const [personId, setPersonId] = useState("");
  const [result, setResult] = useState("Chưa gửi request.");
  async function submit() {
    if (!file) { setResult("Vui lòng chọn ảnh."); return; }
    if (mode === "enroll" && !personId.trim()) { setResult("Vui lòng nhập person_id."); return; }
    const form = new FormData(); form.append("image", file); if (mode === "enroll") { form.append("person_id", personId.trim()); form.append("name", personId.trim()); } else form.append("camera_id", "backend-test");
    try { const response = await fetch(`${apiUrl}/api/v1/faces/${mode}`, { method: "POST", body: form }); setResult(JSON.stringify(await response.json(), null, 2)); } catch { setResult(`Không kết nối được ${apiUrl}.`); }
  }
  return <section className={styles.testPanel}><div className={styles.cardHead}><div><span className={styles.kicker}>Backend test</span><h3>Đăng ký và xác thực khuôn mặt</h3></div><span className={styles.pill}>REST API</span></div><div className={styles.segment}><button className={mode === "enroll" ? styles.selected : ""} onClick={() => setMode("enroll")}>Đăng ký khuôn mặt</button><button className={mode === "recognize" ? styles.selected : ""} onClick={() => setMode("recognize")}>Xác thực khuôn mặt</button></div><label className={styles.setting}>Ảnh khuôn mặt<input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>{mode === "enroll" && <label className={styles.setting}>Person ID<input value={personId} onChange={(event) => setPersonId(event.target.value)} placeholder="NV001" /></label>}<button className={styles.primary} onClick={submit}>{mode === "enroll" ? "Đăng ký" : "Xác thực"} →</button><pre className={styles.apiResult}>{result}</pre><small className={styles.muted}>Endpoint: {apiUrl}/api/v1/faces/{mode}</small></section>;
}

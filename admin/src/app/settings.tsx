"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const apiUrl = process.env.NEXT_PUBLIC_HERAFACE_API_URL || "http://127.0.0.1:18083";

type SettingsForm = {
  similarity_threshold: string;
  min_face_size: string;
  liveness_clarity_threshold: string;
  liveness_reality_threshold: string;
};

const empty: SettingsForm = { similarity_threshold: "", min_face_size: "", liveness_clarity_threshold: "", liveness_reality_threshold: "" };

export default function Settings() {
  const [form, setForm] = useState<SettingsForm>(empty);
  const [status, setStatus] = useState("Đang tải cấu hình...");
  const [saving, setSaving] = useState(false);

  function load() {
    fetch(`${apiUrl}/api/v1/settings`)
      .then((response) => response.json())
      .then((data) => {
        setForm({
          similarity_threshold: String(data.similarity_threshold ?? ""),
          min_face_size: String(data.min_face_size ?? ""),
          liveness_clarity_threshold: String(data.liveness?.clarity_threshold ?? ""),
          liveness_reality_threshold: String(data.liveness?.reality_threshold ?? ""),
        });
        setStatus("Đã tải cấu hình hiện tại.");
      })
      .catch(() => setStatus(`Không kết nối được ${apiUrl}.`));
  }

  useEffect(load, []);

  function update(field: keyof SettingsForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function save() {
    setSaving(true);
    setStatus("Đang lưu...");
    try {
      const response = await fetch(`${apiUrl}/api/v1/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          similarity_threshold: Number(form.similarity_threshold),
          min_face_size: Number(form.min_face_size),
          liveness_clarity_threshold: Number(form.liveness_clarity_threshold),
          liveness_reality_threshold: Number(form.liveness_reality_threshold),
        }),
      });
      const data = await response.json();
      setStatus(data.success ? "Đã lưu cấu hình." : `Lỗi: ${data.message || data.error_code}`);
    } catch {
      setStatus(`Không kết nối được ${apiUrl}.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <span className={styles.kicker}>Cấu hình node</span>
          <h3>Độ chính xác và liveness</h3>
        </div>
        <span className={styles.pill}>REST API</span>
      </div>
      <div className={styles.form}>
        <label>
          Ngưỡng tương đồng nhận diện (0–1)
          <input type="number" min="0" max="1" step="0.01" value={form.similarity_threshold}
            onChange={(event) => update("similarity_threshold", event.target.value)} />
        </label>
        <label>
          Kích thước mặt tối thiểu (px)
          <input type="number" min="1" step="1" value={form.min_face_size}
            onChange={(event) => update("min_face_size", event.target.value)} />
        </label>
        <label>
          Ngưỡng độ nét chống giả mạo — liveness.clarity (0–1)
          <input type="number" min="0" max="1" step="0.01" value={form.liveness_clarity_threshold}
            onChange={(event) => update("liveness_clarity_threshold", event.target.value)} />
        </label>
        <label>
          Ngưỡng độ thật chống giả mạo — liveness.reality (0–1)
          <input type="number" min="0" max="1" step="0.01" value={form.liveness_reality_threshold}
            onChange={(event) => update("liveness_reality_threshold", event.target.value)} />
        </label>
        <button className={styles.primary} onClick={save} disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </div>
      <small className={styles.muted}>{status}</small>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const serviceUrl = process.env.NEXT_PUBLIC_HERAFACE_API_URL || "http://127.0.0.1:18083";
type AccessKey = { name: string; prefix: string; scope: string; status: string };

type Metrics = { total: number; success: number; errors: number; average_latency_ms: number; last_endpoint: string };

type Props = { health: string; keys: AccessKey[]; go: (view: "requests") => void };

export default function LiveOverview({ health, keys, go }: Props) {
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, success: 0, errors: 0, average_latency_ms: 0, last_endpoint: "" });
  const [databaseSize, setDatabaseSize] = useState(0);
  useEffect(() => {
    const load = () => {
      Promise.all([fetch(`${serviceUrl}/api/v1/metrics`), fetch(`${serviceUrl}/api/v1/health`)]).then(async ([metricsResponse, healthResponse]) => {
        if (metricsResponse.ok) setMetrics(await metricsResponse.json());
        if (healthResponse.ok) setDatabaseSize((await healthResponse.json()).database_size ?? 0);
      }).catch(() => undefined);
    };
    load(); const timer = window.setInterval(load, 3000); return () => window.clearInterval(timer);
  }, []);
  return <><section className={styles.hero}><div><span className={styles.kicker}>Backend health</span><h2>Trung tâm vận hành HeraFace Lite.</h2><p>Giám sát node, API, model, database embedding và request nhận diện khuôn mặt.</p></div><div className={styles.health}><i /><b>{health}</b><small>{serviceUrl}</small></div></section><section className={styles.stats}><Stat label="Request nhận diện" value={metrics.total} detail="Đăng ký + xác thực" /><Stat label="Latency trung bình" value={`${metrics.average_latency_ms} ms`} detail="Từ API khuôn mặt" /><Stat label="Embedding" value={databaseSize} detail="Database cục bộ" /><Stat label="API key hoạt động" value={keys.filter((key) => key.status === "Đang hoạt động").length} detail="Quyền truy cập backend" /></section><section className={styles.twoCol}><div className={styles.card}><div className={styles.cardHead}><div><span className={styles.kicker}>Request monitor</span><h3>Request nhận diện gần đây</h3></div><button className={styles.textButton} onClick={() => go("requests")}>Mở giám sát →</button></div>{metrics.total === 0 ? <Empty text="Chưa có request nhận diện khuôn mặt." /> : <div className={styles.apiRow}><span>API gần nhất</span><b>{metrics.last_endpoint}</b></div>}</div><div className={styles.card}><div className={styles.cardHead}><div><span className={styles.kicker}>Runtime</span><h3>Thành phần hệ thống</h3></div><span className={styles.pill}>{health}</span></div><div className={styles.apiRow}><span>REST service</span><b>{health}</b></div><div className={styles.apiRow}><span>Request thành công</span><b>{metrics.success}</b></div><div className={styles.apiRow}><span>Request lỗi</span><b>{metrics.errors}</b></div><div className={styles.apiRow}><span>Embedding database</span><b>{databaseSize} bản ghi</b></div></div></section></>;
}
function Stat({ label, value, detail }: { label: string; value: string | number; detail: string }) { return <div className={styles.stat}><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>; }
function Empty({ text }: { text: string }) { return <div className={styles.empty}>{text}</div>; }

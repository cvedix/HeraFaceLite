"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const serviceUrl = process.env.NEXT_PUBLIC_HERAFACE_API_URL || "http://127.0.0.1:18083";
type FaceItem = { person_id: string; face_id: number };

export default function LiveData() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<FaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() { setLoading(true); try { const [healthResponse, facesResponse] = await Promise.all([fetch(`${serviceUrl}/api/v1/health`), fetch(`${serviceUrl}/api/v1/faces`)]); if (!healthResponse.ok || !facesResponse.ok) throw new Error(); const health = await healthResponse.json(); const faces = await facesResponse.json(); setCount(health.database_size ?? faces.total ?? 0); setItems(faces.items ?? []); setError(""); } catch { setError("Không đọc được dữ liệu từ REST service."); } finally { setLoading(false); } }
  async function remove(personId: string) { if (!window.confirm(`Xóa toàn bộ embedding của ${personId}?`)) return; try { const response = await fetch(`${serviceUrl}/api/v1/faces/${encodeURIComponent(personId)}`, { method: "DELETE" }); if (!response.ok) throw new Error(); await load(); } catch { setError(`Không thể xóa embedding của ${personId}.`); } }
  useEffect(() => { load(); }, []);
  return <section className={styles.card}><div className={styles.cardHead}><div><span className={styles.kicker}>Local storage</span><h3>Dữ liệu embedding</h3></div><button className={styles.secondary} onClick={load}>Làm mới</button></div>{error && <div className={styles.notice}>{error}</div>}<div className={styles.apiRow}><span>Standard database</span><b>{loading ? "Đang tải…" : `${count} embedding`}</b></div><div className={styles.apiRow}><span>Mask database</span><b>{loading ? "Đang tải…" : `${count} embedding`}</b></div><div className={styles.apiRow}><span>Registry mapping</span><b>{loading ? "Đang tải…" : `${items.length} người dùng`}</b></div>{!loading && items.length === 0 ? <Empty text="Database đang rỗng." /> : <div className={styles.embeddingTable}><div className={styles.embeddingHead}><span>Person ID</span><span>Face ID</span><span>Loại dữ liệu</span><span>Trạng thái</span><span>Thao tác</span></div>{items.map((item) => <div className={styles.embeddingRow} key={item.person_id}><span className={styles.mono}>{item.person_id}</span><span>{item.face_id}</span><span>Standard + Mask</span><strong className={styles.active}>Đã lưu</strong><button className={styles.deleteEmbedding} onClick={() => remove(item.person_id)}>Xóa</button></div>)}</div>}</section>;
}
function Empty({ text }: { text: string }) { return <div className={styles.empty}>{text}</div>; }

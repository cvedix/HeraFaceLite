"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../route.module.css";

export default function TestPage() {
  const [mode, setMode] = useState("recognize");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("Chưa gửi yêu cầu nào.");

  function runRequest() {
    if (!file) {
      setResult("Vui lòng chọn ảnh trước.");
      return;
    }
    setResult(`Phản hồi thử nghiệm\nrecognized: ${mode === "recognize"}\nperson_id: NV001\nsimilarity: 0.91\nsource: ${mode}`);
  }

  return <main className={styles.page}>
    <Link className={styles.back} href="/">← Quay lại bảng điều khiển</Link>
    <span className={styles.kicker}>Thử API trực tiếp</span>
    <h1>Khu vực thử nhận diện</h1>
    <p className={styles.intro}>Thử cùng luồng gửi ảnh mà hệ thống ERP sử dụng tới dịch vụ HeraFace trên thiết bị.</p>
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.segment}><button className={mode === "recognize" ? styles.selected : ""} onClick={() => setMode("recognize")}>Nhận diện</button><button className={mode === "enroll" ? styles.selected : ""} onClick={() => setMode("enroll")}>Đăng ký</button></div>
        <label className={styles.upload}>Ảnh khuôn mặt<input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        <button className={styles.primary} onClick={runRequest}>Gửi yêu cầu →</button>
        <pre className={styles.apiResult}>{result}</pre>
      </section>
      <section className={styles.card}><span className={styles.kicker}>Chi tiết yêu cầu</span><h2>Hợp đồng API thiết bị</h2><div className={styles.apiRow}><span>Endpoint</span><b>/api/v1/faces/{mode}</b></div><div className={styles.apiRow}><span>Dữ liệu gửi</span><b>multipart/form-data</b></div><div className={styles.apiRow}><span>Kích thước ảnh tối đa</span><b>5 MB</b></div><div className={styles.apiRow}><span>Mục tiêu độ trễ</span><b>&lt; 100 ms</b></div></section>
    </div>
  </main>;
}

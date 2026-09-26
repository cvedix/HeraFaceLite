"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "../route.module.css";

const API_URL = process.env.NEXT_PUBLIC_HERAFACE_API_URL || "http://127.0.0.1:18083";

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<"recognize" | "enroll">("recognize");
  const [cameraOn, setCameraOn] = useState(false);
  const [image, setImage] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  const [personId, setPersonId] = useState("");
  const [cameraId, setCameraId] = useState("camera-01");
  const [result, setResult] = useState("Chưa chụp ảnh.");

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 1280, height: 720 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
      setResult("Camera đã sẵn sàng.");
    } catch {
      setResult("Không thể mở webcam. Hãy cấp quyền camera cho trình duyệt.");
    }
  }

  function stopCamera() { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setCameraOn(false); }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) { setResult("Hãy bật webcam trước khi chụp."); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => { if (!blob) return; setImage(blob); setPreview(URL.createObjectURL(blob)); setResult("Đã chụp ảnh. Sẵn sàng gửi yêu cầu."); }, "image/jpeg", 0.9);
  }

  async function submit() {
    if (!image) { setResult("Hãy chụp ảnh trước."); return; }
    if (mode === "enroll" && !personId.trim()) { setResult("Vui lòng nhập mã người dùng."); return; }
    const form = new FormData();
    form.append("image", image, "webcam.jpg");
    if (mode === "enroll") { form.append("person_id", personId.trim()); form.append("name", personId.trim()); }
    if (mode === "recognize") form.append("camera_id", cameraId);
    try {
      const response = await fetch(`${API_URL}/api/v1/faces/${mode}`, { method: "POST", body: form });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult(`Không kết nối được REST service tại ${API_URL}.`);
    }
  }

  return <main className={styles.page}>
    <Link className={styles.back} href="/">← Quay lại bảng điều khiển</Link>
    <span className={styles.kicker}>Thiết bị đầu vào</span><h1>Chụp ảnh webcam</h1>
    <p className={styles.intro}>Chụp trực tiếp từ webcam để đăng ký hoặc nhận diện khuôn mặt trên thiết bị HeraFace.</p>
    <div className={styles.grid}>
      <section className={styles.card}><div className={styles.segment}><button className={mode === "recognize" ? styles.selected : ""} onClick={() => setMode("recognize")}>Nhận diện</button><button className={mode === "enroll" ? styles.selected : ""} onClick={() => setMode("enroll")}>Đăng ký</button></div><div className={styles.cameraFrame}>{preview ? <img src={preview} alt="Ảnh đã chụp" /> : <video ref={videoRef} autoPlay muted playsInline />}</div><canvas ref={canvasRef} hidden /><div className={styles.cameraActions}><button className={styles.primary} onClick={cameraOn ? stopCamera : startCamera}>{cameraOn ? "Tắt webcam" : "Bật webcam"}</button><button className={styles.primary} onClick={capture}>Chụp ảnh</button></div>{mode === "enroll" ? <label className={styles.setting}>Mã người dùng<input value={personId} onChange={(event) => setPersonId(event.target.value)} placeholder="NV001" /></label> : <label className={styles.setting}>Mã camera<input value={cameraId} onChange={(event) => setCameraId(event.target.value)} /></label>}<button className={styles.primaryWide} onClick={submit}>{mode === "enroll" ? "Đăng ký ảnh" : "Gửi ảnh nhận diện"} →</button></section>
      <section className={styles.card}><span className={styles.kicker}>Kết quả xử lý</span><h2>REST service</h2><div className={styles.apiRow}><span>Endpoint</span><b>/api/v1/faces/{mode}</b></div><div className={styles.apiRow}><span>Service</span><b>{API_URL}</b></div><pre className={styles.apiResult}>{result}</pre></section>
    </div>
  </main>;
}

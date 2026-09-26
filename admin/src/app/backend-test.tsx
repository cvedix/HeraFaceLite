"use client";

import { useState } from "react";
import styles from "./page.module.css";
import { useEffect, useRef } from "react";

const apiUrl = process.env.NEXT_PUBLIC_HERAFACE_API_URL || "http://127.0.0.1:18083";

export default function BackendTest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<"enroll" | "recognize">("enroll");
  const [file, setFile] = useState<File | Blob | null>(null);
  const [preview, setPreview] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [personId, setPersonId] = useState("");
  const [result, setResult] = useState("Chưa gửi request.");
  const [annotatedImage, setAnnotatedImage] = useState("");

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  function chooseFile(next: File | undefined) { if (!next) return; setFile(next); setPreview(URL.createObjectURL(next)); setAnnotatedImage(""); if (mode === "recognize") { setResult("Đã chọn ảnh, đang xác thực..."); submitFile(next); } else { setResult("Đã chọn ảnh."); } }
  async function startCamera() { try { const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; setCameraOn(true); setResult("Webcam đã sẵn sàng."); } catch { setResult("Không thể mở webcam. Hãy cấp quyền camera."); } }
  function stopCamera() { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setCameraOn(false); }
  function capture() { const video = videoRef.current, canvas = canvasRef.current; if (!video || !canvas || !video.videoWidth) { setResult("Hãy bật webcam trước."); return; } canvas.width = video.videoWidth; canvas.height = video.videoHeight; canvas.getContext("2d")?.drawImage(video, 0, 0); canvas.toBlob((blob) => { if (blob) { setFile(blob); setPreview(URL.createObjectURL(blob)); setAnnotatedImage(""); if (mode === "recognize") { setResult("Đã chụp ảnh, đang xác thực..."); submitFile(blob); } else { setResult("Đã chụp ảnh từ webcam."); } } }, "image/jpeg", .9); }
  async function submitFile(blob: File | Blob) { if (mode === "enroll" && !personId.trim()) { setResult("Vui lòng nhập person_id."); return; } const form = new FormData(); form.append("image", blob, "backend-test.jpg"); if (mode === "enroll") { form.append("person_id", personId.trim()); form.append("name", personId.trim()); } else form.append("camera_id", "backend-test"); try { const response = await fetch(`${apiUrl}/api/v1/faces/${mode}`, { method: "POST", body: form }); const data = await response.json(); setAnnotatedImage(typeof data.annotated_image === "string" ? data.annotated_image : ""); setResult(JSON.stringify(data, null, 2)); } catch { setAnnotatedImage(""); setResult(`Không kết nối được ${apiUrl}.`); } }
  async function submit() { if (!file) { setResult("Vui lòng chọn hoặc chụp ảnh."); return; } await submitFile(file); }
  return <section className={styles.testPanel}><div className={styles.cardHead}><div><span className={styles.kicker}>Backend test</span><h3>Đăng ký và xác thực khuôn mặt</h3></div><span className={styles.pill}>REST API</span></div><div className={styles.segment}><button className={mode === "enroll" ? styles.selected : ""} onClick={() => setMode("enroll")}>Đăng ký khuôn mặt</button><button className={mode === "recognize" ? styles.selected : ""} onClick={() => setMode("recognize")}>Xác thực khuôn mặt</button></div><div className={styles.testGrid} style={{ gridTemplateColumns: "1fr" }}><div><div className={styles.dualPreview}><div><small className={styles.muted}>Webcam / ảnh đầu vào</small><div className={styles.webcamBox}><video ref={videoRef} autoPlay muted playsInline style={{ display: cameraOn ? "block" : "none" }} />{!cameraOn && (preview ? <img src={preview} alt="Ảnh kiểm thử" /> : <span className={styles.previewHint}>Bật webcam hoặc chọn ảnh</span>)}</div></div><div><small className={styles.muted}>Kết quả nhận diện</small><div className={styles.webcamBox}>{annotatedImage ? <img src={annotatedImage} alt="Kết quả nhận diện" /> : <span className={styles.previewHint}>Chưa có kết quả</span>}</div></div></div><canvas ref={canvasRef} hidden /><input ref={uploadInputRef} type="file" accept="image/*" hidden onChange={(event) => chooseFile(event.target.files?.[0])} /><div className={styles.cameraActions}><button className={styles.primary} onClick={cameraOn ? stopCamera : startCamera}>{cameraOn ? "Tắt webcam" : "Bật webcam"}</button><button className={styles.primary} onClick={capture}>Chụp ảnh</button><button className={styles.primary} onClick={() => uploadInputRef.current?.click()}>Upload ảnh</button></div>{mode === "enroll" && <label className={styles.setting}>Person ID<input value={personId} onChange={(event) => setPersonId(event.target.value)} placeholder="NV001" /></label>}{mode === "enroll" && <button className={styles.primaryWide} onClick={submit}>Đăng ký →</button>}</div></div><pre className={styles.apiResult}>{result}</pre><small className={styles.muted}>Endpoint: {apiUrl}/api/v1/faces/{mode}</small></section>;
}


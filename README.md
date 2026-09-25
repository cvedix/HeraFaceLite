# HeraFaceLite

REST service for embedding HeraSDK face recognition into ERP systems.

## Build

Configure CoreAI with face support:

```bash
cmake -S . -B build -DCVEDIX_WITH_FACE=ON -DCVEDIX_BUILD_SAMPLES=ON
cmake --build build --target heraface_server -j2
```

## Run

```bash
./build/bin/heraface_server \
  ./cvedix_data/models/seetaface6 \
  ./cvedix_data/face_db/heraface_lite \
  8080
```

The server accepts multipart images and keeps the local SeetaFace6 database on disk.

## API

Health check:

```bash
curl http://127.0.0.1:8080/api/v1/health
```

Enroll one person:

```bash
curl -X POST http://127.0.0.1:8080/api/v1/faces/enroll \
  -F person_id=NV001 \
  -F name="Nguyen Van A" \
  -F image=@person.jpg
```

Recognize a person:

```bash
curl -X POST http://127.0.0.1:8080/api/v1/faces/recognize \
  -F camera_id=gate-01 \
  -F image=@person.jpg
```

List registered people:

```bash
curl http://127.0.0.1:8080/api/v1/faces
```

Delete a person:

```bash
curl -X DELETE http://127.0.0.1:8080/api/v1/faces/NV001
```

The registry file next to the database keeps the ERP `person_id` to SDK face ID mapping across restarts.

## Deployment

Keep model files under `/opt/heraface/models` and database files under `/var/lib/heraface`. Run the server under systemd and expose it only on the device network or behind an authenticated reverse proxy.

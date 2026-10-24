# HeraFaceLite

REST service for embedding HeraSDK face recognition into ERP systems.

## Build

### CPU (default)

```bash
cmake -S . -B build -DCVEDIX_WITH_FACE=ON -DCVEDIX_BUILD_SAMPLES=ON
cmake --build build --target heraface_server -j2
```

### NVIDIA GPU

Build SeetaFace6/TenniS with CUDA first, then reconfigure CoreAI so CMake picks up
the GPU-enabled SeetaFace backend:

```bash
cd third_party/seetaface6
bash build_seetaface6.sh --gpu --clean
cd ../..
cmake -S . -B build -DCVEDIX_WITH_FACE=ON -DCVEDIX_BUILD_SAMPLES=ON
cmake --build build --target heraface_server -j2
```

The GPU build requires a supported NVIDIA CUDA toolkit, `nvcc`, and an NVIDIA GPU
driver. The SeetaFace build script fails instead of silently switching to CPU if
the requested CUDA build cannot be configured.

## Run

CPU inference (default):

```bash
./build/bin/heraface_server \
  ./cvedix_data/models/seetaface6 \
  ./cvedix_data/face_db/heraface_lite \
  8080
```

GPU inference on device 0 (requires the CUDA-enabled build above):

```bash
./build/bin/heraface_server \
  ./cvedix_data/models/seetaface6 \
  ./cvedix_data/face_db/heraface_lite \
  8080 \
  --gpu
```

Select another GPU with `--gpu-id=1`. The health endpoint reports the configured
device. GPU selection applies to face recognition, liveness, age/gender, and eye
state models; image decoding and other server work remain on the CPU.

The server accepts multipart images and keeps the local SeetaFace6 database on disk.

## Admin panel

Open the server root in a browser:

```text
http://127.0.0.1:8080/
```

The panel provides health status, face enrollment, image recognition, registered-person listing, and deletion. It uses the same REST endpoints as an ERP integration.

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

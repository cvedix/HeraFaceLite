#include "cvedix/nodes/src/cvedix_app_src_node.h"
#include "cvedix/nodes/infers/cvedix_face_recognizer_node.h"
#include "cvedix/nodes/common/cvedix_des_node.h"
#include <seeta/FaceDetector.h>
#include <seeta/FaceLandmarker.h>
#include <seeta/FaceAntiSpoofing.h>
#include "cvedix/third_party/cpp_httplib/httplib.h"
#include "cvedix/third_party/nlohmann/json.hpp"
#include "cvedix/utils/logger/cvedix_logger.h"

#include <condition_variable>
#include <filesystem>
#include <iostream>
#include <mutex>
#include <optional>
#include <fstream>
#include <unordered_map>
#include <chrono>
#include <atomic>
#include <ctime>
#include <iomanip>
#include <sstream>
#include <string>
#include <vector>

#include <opencv2/imgcodecs.hpp>
#include <opencv2/imgproc.hpp>

using json = nlohmann::json;

namespace {

struct Settings {
    std::string model_dir = "./cvedix_data/models/seetaface6";
    std::string database_path = "./cvedix_data/face_db/heraface_lite";
    int port = 8080;
    float threshold = 0.70f;
    int min_face_size = 40;
};

class AuditStore {
public:
    explicit AuditStore(std::string path) : path_(std::move(path)) {}

    void append(const std::string& action, const json& detail, bool success) {
        const auto now = std::time(nullptr);
        std::tm local_time{};
        localtime_r(&now, &local_time);
        std::ostringstream timestamp;
        timestamp << std::put_time(&local_time, "%Y-%m-%dT%H:%M:%S");
        std::lock_guard<std::mutex> lock(mutex_);
        std::ofstream output(path_, std::ios::app);
        output << json{{"timestamp", timestamp.str()}, {"action", action},
                       {"success", success}, {"detail", detail}}.dump() << '\n';
    }

    json list(size_t limit = 100) const {
        std::vector<json> events;
        std::ifstream input(path_);
        std::string line;
        while (std::getline(input, line)) {
            try { events.push_back(json::parse(line)); } catch (...) {}
        }
        if (events.size() > limit) events.erase(events.begin(), events.end() - static_cast<std::ptrdiff_t>(limit));
        std::reverse(events.begin(), events.end());
        return events;
    }

private:
    std::string path_;
    mutable std::mutex mutex_;
};

class LivenessService {
public:
    explicit LivenessService(const std::string& model_dir) {
        try {
            const auto path = [&model_dir](const std::string& name) { return model_dir + "/" + name; };
            detector_ = std::make_unique<seeta::FaceDetector>(seeta::ModelSetting(path("face_detector.csta"), seeta::ModelSetting::CPU, 0));
            landmarker_ = std::make_unique<seeta::FaceLandmarker>(seeta::ModelSetting(path("face_landmarker_pts5.csta"), seeta::ModelSetting::CPU, 0));
            anti_spoofing_ = std::make_unique<seeta::FaceAntiSpoofing>(seeta::ModelSetting(path("fas_first.csta"), seeta::ModelSetting::CPU, 0));
            anti_spoofing_->SetThreshold(0.3f, 0.80f);
            available_ = true;
        } catch (const std::exception& error) {
            std::cerr << "Anti-spoofing disabled: " << error.what() << '\n';
        }
    }

    json check(const cv::Mat& image) const {
        if (!available_) return {{"success", false}, {"error_code", "LIVENESS_UNAVAILABLE"}};
        if (image.empty()) return {{"success", false}, {"error_code", "INVALID_IMAGE"}};
        SeetaImageData input{image.cols, image.rows, image.channels(), image.data};
        const auto faces = detector_->detect(input);
        if (faces.size == 0) return {{"success", false}, {"error_code", "NO_FACE"}, {"message", "No face detected"}};
        int best = 0;
        for (int index = 1; index < faces.size; ++index) {
            const auto current = faces.data[index].pos.width * faces.data[index].pos.height;
            const auto selected = faces.data[best].pos.width * faces.data[best].pos.height;
            if (current > selected) best = index;
        }
        const auto face = faces.data[best].pos;
        const auto points = landmarker_->mark(input, face);
        const auto status = anti_spoofing_->Predict(input, face, points.data());
        float clarity = 0.0f, reality = 0.0f;
        anti_spoofing_->GetPreFrameScore(&clarity, &reality);
        const bool real = status == seeta::FaceAntiSpoofing::REAL;
        return {{"success", true}, {"is_real", real}, {"status", statusName(status)},
                {"liveness_status", static_cast<int>(status)}, {"clarity", clarity},
                {"reality", reality}, {"face_count", faces.size}};
    }

private:
    static std::string statusName(seeta::FaceAntiSpoofing::Status status) {
        switch (status) {
            case seeta::FaceAntiSpoofing::REAL: return "REAL";
            case seeta::FaceAntiSpoofing::SPOOF: return "SPOOF";
            case seeta::FaceAntiSpoofing::FUZZY: return "FUZZY";
            default: return "DETECTING";
        }
    }
    std::unique_ptr<seeta::FaceDetector> detector_;
    std::unique_ptr<seeta::FaceLandmarker> landmarker_;
    std::unique_ptr<seeta::FaceAntiSpoofing> anti_spoofing_;
    bool available_ = false;
};

struct RequestMetrics {
    std::atomic<uint64_t> total{0};
    std::atomic<uint64_t> success{0};
    std::atomic<uint64_t> errors{0};
    std::atomic<uint64_t> total_latency_ms{0};
    mutable std::mutex mutex;
    std::unordered_map<std::string, uint64_t> by_endpoint;
    std::unordered_map<std::string, uint64_t> by_day;
    std::string last_endpoint;
    std::chrono::steady_clock::time_point last_request{};

    void begin(const httplib::Request& request) {
        if (!is_face_request(request)) return;
        total.fetch_add(1);
        std::lock_guard<std::mutex> lock(mutex);
        by_endpoint[request.path]++;
        const auto now = std::time(nullptr);
        std::tm local_time{};
        localtime_r(&now, &local_time);
        char day[11]{};
        std::strftime(day, sizeof(day), "%Y-%m-%d", &local_time);
        by_day[day]++;
        last_endpoint = request.path;
        last_request = std::chrono::steady_clock::now();
    }

    void finish(const httplib::Request& request, const httplib::Response& response,
                std::chrono::steady_clock::time_point started) {
        if (!is_face_request(request)) return;
        const auto latency = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now() - started).count();
        total_latency_ms.fetch_add(static_cast<uint64_t>(latency));
        if (response.status >= 200 && response.status < 400) success.fetch_add(1);
        else errors.fetch_add(1);
    }

    json snapshot() const {
        json endpoints = json::object();
        json daily = json::object();
        std::string last;
        {
            std::lock_guard<std::mutex> lock(mutex);
            for (const auto& [path, count] : by_endpoint) endpoints[path] = count;
            for (const auto& [day, count] : by_day) daily[day] = count;
            last = last_endpoint;
        }
        const auto count = total.load();
        return {{"total", count}, {"success", success.load()}, {"errors", errors.load()},
                {"average_latency_ms", count ? total_latency_ms.load() / count : 0},
                {"last_endpoint", last}, {"by_endpoint", endpoints}, {"daily", daily}};
    }

private:
    static bool is_face_request(const httplib::Request& request) {
        return request.method == "POST" &&
               (request.path == "/api/v1/faces/enroll" ||
                request.path == "/api/v1/faces/recognize" ||
                request.path == "/api/v1/faces/liveness");
    }
};

class RecognitionCollector final : public cvedix_nodes::cvedix_des_node {
public:
    RecognitionCollector() : cvedix_des_node("rest_collector", 0) {
        initialized();
    }

    ~RecognitionCollector() override {
        deinitialized();
    }

    std::shared_ptr<cvedix_objects::cvedix_frame_meta> wait_for_result() {
        std::unique_lock<std::mutex> lock(mutex_);
        condition_.wait_for(lock, std::chrono::seconds(10), [this] { return result_ != nullptr; });
        auto result = result_;
        result_.reset();
        return result;
    }

protected:
    std::shared_ptr<cvedix_objects::cvedix_meta> handle_frame_meta(
        std::shared_ptr<cvedix_objects::cvedix_frame_meta> meta) override {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            result_ = std::move(meta);
        }
        condition_.notify_one();
        return nullptr;
    }

    std::shared_ptr<cvedix_objects::cvedix_meta> handle_control_meta(
        std::shared_ptr<cvedix_objects::cvedix_control_meta> meta) override {
        return nullptr;
    }

private:
    std::mutex mutex_;
    std::condition_variable condition_;
    std::shared_ptr<cvedix_objects::cvedix_frame_meta> result_;
};

class HeraFaceService {
public:
    explicit HeraFaceService(const Settings& settings)
        : settings_(settings),
                    audit_(settings.database_path + ".audit.jsonl"),
          source_(std::make_shared<cvedix_nodes::cvedix_app_src_node>("rest_source", 0)),
          recognizer_(std::make_shared<cvedix_nodes::cvedix_face_recognizer_node>(
              "rest_recognizer", settings.model_dir, settings.database_path,
              settings.threshold, settings.min_face_size, false, false, 0,
              cvedix_nodes::FaceRecognizerMode::SYNC)),
          collector_(std::make_shared<RecognitionCollector>()) {
        load_registry();
        recognizer_->attach_to({source_});
        collector_->attach_to({recognizer_});
        source_->start();
    }

    ~HeraFaceService() {
        source_->detach_recursively();
    }

    json enroll(const cv::Mat& image, const std::string& person_id, const std::string& name) {
        std::lock_guard<std::mutex> lock(request_mutex_);
        if (image.empty() || person_id.empty()) {
            return { {"success", false}, {"error_code", "INVALID_INPUT"} };
        }
        const int64_t face_id = recognizer_->registerFace(image, person_id);
        if (face_id < 0) {
            return { {"success", false}, {"error_code", "NO_FACE"},
                     {"message", "No face could be registered"} };
        }
        if (!recognizer_->saveDatabase(settings_.database_path)) {
            return { {"success", false}, {"error_code", "DATABASE_SAVE_FAILED"} };
        }
        registry_[person_id] = face_id;
        save_registry();
        return { {"success", true}, {"person_id", person_id}, {"face_id", face_id} };
    }

    json remove(const std::string& person_id) {
        std::lock_guard<std::mutex> lock(request_mutex_);
        auto it = registry_.find(person_id);
        if (it == registry_.end() || !recognizer_->deleteFace(it->second)) {
            return { {"success", false}, {"error_code", "PERSON_NOT_FOUND"} };
        }
        registry_.erase(it);
        recognizer_->saveDatabase(settings_.database_path);
        save_registry();
        return { {"success", true}, {"person_id", person_id} };
    }

    json list() const {
        json items = json::array();
        for (const auto& [person_id, face_id] : registry_) {
            items.push_back({{"person_id", person_id}, {"face_id", face_id}});
        }
        return { {"success", true}, {"total", items.size()}, {"items", items} };
    }

    json recognize(const cv::Mat& image, const std::string& camera_id) {
        std::lock_guard<std::mutex> lock(request_mutex_);
        if (image.empty()) {
            return { {"success", false}, {"error_code", "INVALID_IMAGE"} };
        }
        // app_src_node requires a stable frame size; phone cameras send varying resolutions.
        cv::Mat normalized;
        cv::resize(image, normalized, cv::Size(640, 480), 0.0, 0.0, cv::INTER_AREA);
        if (!source_->push_frames({normalized})) {
            return { {"success", false}, {"error_code", "SOURCE_UNAVAILABLE"},
                     {"message", "Could not enqueue normalized frame"} };
        }
        auto result = collector_->wait_for_result();
        if (!result) {
            return { {"success", false}, {"error_code", "PROCESSING_TIMEOUT"} };
        }

        json response = { {"success", true}, {"recognized", false}, {"camera_id", camera_id} };
        if (result->face_targets.empty()) {
            response["message"] = "No face detected";
            return response;
        }
        const auto& face = result->face_targets.front();
        response["recognized"] = !face->identify.empty();
        response["person_id"] = face->identify.empty() ? json(nullptr) : json(face->identify);
        response["name"] = face->identify.empty() ? json(nullptr) : json(face->identify);
        response["similarity"] = face->identify_score;
        response["face_score"] = face->score;
        return response;
    }

    json health() const {
        return { {"status", "ok"}, {"model_loaded", true},
                 {"database_size", recognizer_->getDatabaseSize()} };
    }

    json audit(size_t limit = 100) const { return audit_.list(limit); }

    void record_request(const std::string& endpoint, int status, uint64_t latency_ms) {
        audit_.append("api.request", {{"endpoint", endpoint}, {"status", status}, {"latency_ms", latency_ms}}, status < 400);
    }

private:
    void load_registry() {
        std::ifstream input(settings_.database_path + ".registry.json");
        if (!input) return;
        try {
            const auto data = json::parse(input);
            for (const auto& item : data) {
                registry_[item.at("person_id").get<std::string>()] = item.at("face_id").get<int64_t>();
            }
        } catch (const std::exception&) {
            std::cerr << "Warning: could not load face registry\n";
        }
    }

    void save_registry() const {
        json data = json::array();
        for (const auto& [person_id, face_id] : registry_) {
            data.push_back({{"person_id", person_id}, {"face_id", face_id}});
        }
        std::ofstream output(settings_.database_path + ".registry.json");
        output << data.dump(2);
    }

    Settings settings_;
    AuditStore audit_;
    std::mutex request_mutex_;
    std::unordered_map<std::string, int64_t> registry_;
    std::shared_ptr<cvedix_nodes::cvedix_app_src_node> source_;
    std::shared_ptr<cvedix_nodes::cvedix_face_recognizer_node> recognizer_;
    std::shared_ptr<RecognitionCollector> collector_;
};

void reply_json(httplib::Response& response, const json& body, int status = 200) {
    response.status = status;
    response.set_content(body.dump(), "application/json");
}

std::optional<cv::Mat> request_image(const httplib::Request& request) {
    if (!request.form.has_file("image")) return std::nullopt;
    const auto file = request.form.get_file("image");
    std::vector<unsigned char> bytes(file.content.begin(), file.content.end());
    cv::Mat encoded(1, static_cast<int>(bytes.size()), CV_8UC1, bytes.data());
    cv::Mat image = cv::imdecode(encoded, cv::IMREAD_COLOR);
    if (image.empty()) return std::nullopt;
    return image;
}

std::optional<cv::Mat> decode_image(const httplib::FormData& file) {
    std::vector<unsigned char> bytes(file.content.begin(), file.content.end());
    cv::Mat encoded(1, static_cast<int>(bytes.size()), CV_8UC1, bytes.data());
    cv::Mat image = cv::imdecode(encoded, cv::IMREAD_COLOR);
    if (image.empty()) return std::nullopt;
    return image;
}

std::string request_value(const httplib::Request& request, const std::string& key) {
    if (request.form.has_field(key)) return request.form.get_field(key);
    if (request.has_param(key)) return request.get_param_value(key);
    return {};
}

} // namespace

int main(int argc, char** argv) {
    CVEDIX_SET_LOG_LEVEL(cvedix_utils::cvedix_log_level::INFO);
    CVEDIX_LOGGER_INIT();

    Settings settings;
    if (argc > 1) settings.model_dir = argv[1];
    if (argc > 2) settings.database_path = argv[2];
    if (argc > 3) settings.port = std::stoi(argv[3]);

    if (!std::filesystem::exists(settings.model_dir)) {
        std::cerr << "Model directory not found: " << settings.model_dir << '\n';
        return 1;
    }
    std::filesystem::create_directories(std::filesystem::path(settings.database_path).parent_path());

    HeraFaceService service(settings);
    LivenessService liveness(settings.model_dir);
    RequestMetrics metrics;
    httplib::Server server;
    server.set_payload_max_length(5 * 1024 * 1024);
    server.set_default_headers({
        {"Access-Control-Allow-Origin", "http://localhost:3001"},
        {"Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS"},
        {"Access-Control-Allow-Headers", "Content-Type, Authorization"}
    });
    server.Options(R"(/api/v1/.*)", [](const httplib::Request&, httplib::Response& response) {
        response.status = 204;
    });
    server.set_pre_routing_handler([&](const httplib::Request& request, httplib::Response&) {
        metrics.begin(request);
        return httplib::Server::HandlerResponse::Unhandled;
    });
    thread_local auto request_started = std::chrono::steady_clock::now();
    server.set_pre_request_handler([&](const httplib::Request&, httplib::Response&) {
        request_started = std::chrono::steady_clock::now();
        return httplib::Server::HandlerResponse::Unhandled;
    });
    server.set_post_routing_handler([&](const httplib::Request& request, httplib::Response& response) {
        metrics.finish(request, response, request_started);
        if (request.path == "/api/v1/faces/enroll" || request.path == "/api/v1/faces/recognize" || request.path == "/api/v1/faces/liveness") {
            const auto latency = std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::steady_clock::now() - request_started).count();
            service.record_request(request.path, response.status, static_cast<uint64_t>(latency));
        }
    });
    server.set_mount_point("/", HERAFACE_WEB_DIR);

    server.Get("/api/v1/health", [&](const httplib::Request&, httplib::Response& response) {
        reply_json(response, service.health());
    });

    server.Get("/api/v1/metrics", [&](const httplib::Request&, httplib::Response& response) {
        reply_json(response, metrics.snapshot());
    });

    server.Get("/api/v1/audit", [&](const httplib::Request& request, httplib::Response& response) {
        size_t limit = 100;
        if (request.has_param("limit")) limit = static_cast<size_t>(std::stoul(request.get_param_value("limit")));
        reply_json(response, {{"success", true}, {"items", service.audit(limit)}});
    });

    server.Post("/api/v1/faces/enroll", [&](const httplib::Request& request, httplib::Response& response) {
        auto image = request_image(request);
        const auto person_id = request_value(request, "person_id");
        const auto name = request_value(request, "name").empty() ? person_id : request_value(request, "name");
        reply_json(response, image ? service.enroll(*image, person_id, name)
                                   : json({{"success", false}, {"error_code", "INVALID_IMAGE"}}), image ? 200 : 400);
    });

    server.Post("/api/v1/faces/recognize", [&](const httplib::Request& request, httplib::Response& response) {
        auto image = request_image(request);
        const auto camera_id = request_value(request, "camera_id");
        reply_json(response, image ? service.recognize(*image, camera_id)
                                   : json({{"success", false}, {"error_code", "INVALID_IMAGE"}}), image ? 200 : 400);
    });

    server.Post("/api/v1/faces/liveness", [&](const httplib::Request& request, httplib::Response& response) {
        const auto image = request_image(request);
        reply_json(response, image ? liveness.check(*image) : json({{"success", false}, {"error_code", "INVALID_IMAGE"}}), image ? 200 : 400);
    });

    server.Get("/api/v1/faces", [&](const httplib::Request&, httplib::Response& response) {
        reply_json(response, service.list());
    });

    server.Delete(R"(/api/v1/faces/(.+))", [&](const httplib::Request& request, httplib::Response& response) {
        const auto result = service.remove(request.matches[1].str());
        reply_json(response, result, result.value("success", false) ? 200 : 404);
    });

    server.Post("/api/v1/faces/sync", [&](const httplib::Request& request, httplib::Response& response) {
        const auto person_ids = request.form.get_fields("person_id");
        const auto images = request.form.get_files("image");
        json results = json::array();
        if (person_ids.size() != images.size() || person_ids.empty()) {
            reply_json(response, {{"success", false}, {"error_code", "SYNC_FIELDS_MISMATCH"}}, 400);
            return;
        }
        bool success = true;
        for (size_t index = 0; index < person_ids.size(); ++index) {
            auto image = decode_image(images[index]);
            auto result = image ? service.enroll(*image, person_ids[index], person_ids[index])
                                : json({{"success", false}, {"error_code", "INVALID_IMAGE"}});
            success = success && result.value("success", false);
            results.push_back(result);
        }
        reply_json(response, {{"success", success}, {"results", results}}, success ? 200 : 400);
    });

    std::cout << "HeraFace Lite REST API listening on 0.0.0.0:" << settings.port << '\n';
    if (!server.listen("0.0.0.0", settings.port)) {
        std::cerr << "Could not start REST server on port " << settings.port << '\n';
        return 1;
    }
    return 0;
}

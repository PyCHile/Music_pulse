#include <celastro/astro.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#include <algorithm>
#include <atomic>
#include <cerrno>
#include <cmath>
#include <cstdlib>
#include <cstring>
#include <iomanip>
#include <iostream>
#include <optional>
#include <regex>
#include <sstream>
#include <stdexcept>
#include <string>
#include <thread>
#include <unordered_map>

using namespace celestia;

namespace {
constexpr const char* VERSION = "1.0.0";
constexpr std::size_t MAX_REQUEST_BYTES = 64 * 1024;

struct Request {
    std::string method;
    std::string path;
    std::unordered_map<std::string, std::string> headers;
    std::string body;
};

std::string lower(std::string v) {
    std::transform(v.begin(), v.end(), v.begin(), [](unsigned char c){ return static_cast<char>(std::tolower(c)); });
    return v;
}

std::string trim(std::string v) {
    const auto begin = v.find_first_not_of(" \t\r\n");
    if (begin == std::string::npos) return {};
    const auto end = v.find_last_not_of(" \t\r\n");
    return v.substr(begin, end - begin + 1);
}

bool constantTimeEqual(const std::string& a, const std::string& b) {
    if (a.size() != b.size()) return false;
    unsigned char diff = 0;
    for (std::size_t i = 0; i < a.size(); ++i) diff |= static_cast<unsigned char>(a[i] ^ b[i]);
    return diff == 0;
}

std::string jsonEscape(const std::string& value) {
    std::ostringstream out;
    for (const char c : value) {
        switch (c) {
            case '\\': out << "\\\\"; break;
            case '"': out << "\\\""; break;
            case '\n': out << "\\n"; break;
            case '\r': out << "\\r"; break;
            case '\t': out << "\\t"; break;
            default: out << c;
        }
    }
    return out.str();
}

std::optional<double> jsonNumber(const std::string& body, const std::string& key) {
    const std::regex pattern("\\\"" + key + "\\\"\\s*:\\s*(-?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?)");
    std::smatch match;
    if (!std::regex_search(body, match, pattern) || match.size() < 2) return std::nullopt;
    try {
        const double value = std::stod(match[1].str());
        if (!std::isfinite(value)) return std::nullopt;
        return value;
    } catch (...) {
        return std::nullopt;
    }
}

Request readRequest(int fd) {
    std::string raw;
    raw.reserve(8192);
    char buffer[4096];
    std::size_t headerEnd = std::string::npos;
    std::size_t contentLength = 0;

    while (raw.size() < MAX_REQUEST_BYTES) {
        const ssize_t n = ::recv(fd, buffer, sizeof(buffer), 0);
        if (n <= 0) break;
        raw.append(buffer, static_cast<std::size_t>(n));
        if (headerEnd == std::string::npos) {
            headerEnd = raw.find("\r\n\r\n");
            if (headerEnd != std::string::npos) {
                const std::string head = raw.substr(0, headerEnd);
                const std::regex cl("(?i:Content-Length)\\s*:\\s*([0-9]+)");
                std::smatch m;
                if (std::regex_search(head, m, cl)) contentLength = static_cast<std::size_t>(std::stoul(m[1].str()));
                if (contentLength > MAX_REQUEST_BYTES) throw std::runtime_error("request_too_large");
            }
        }
        if (headerEnd != std::string::npos && raw.size() >= headerEnd + 4 + contentLength) break;
    }
    if (headerEnd == std::string::npos) throw std::runtime_error("invalid_http_request");

    Request req;
    std::istringstream stream(raw.substr(0, headerEnd));
    std::string line;
    if (!std::getline(stream, line)) throw std::runtime_error("missing_request_line");
    if (!line.empty() && line.back() == '\r') line.pop_back();
    {
        std::istringstream first(line);
        std::string version;
        first >> req.method >> req.path >> version;
        if (req.method.empty() || req.path.empty()) throw std::runtime_error("invalid_request_line");
    }
    while (std::getline(stream, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        const auto colon = line.find(':');
        if (colon == std::string::npos) continue;
        req.headers[lower(trim(line.substr(0, colon)))] = trim(line.substr(colon + 1));
    }
    req.body = raw.substr(headerEnd + 4, contentLength);
    return req;
}

void sendResponse(int fd, int status, const std::string& body) {
    const char* reason = status == 200 ? "OK" : status == 400 ? "Bad Request" : status == 401 ? "Unauthorized" : status == 404 ? "Not Found" : status == 405 ? "Method Not Allowed" : status == 413 ? "Payload Too Large" : "Internal Server Error";
    std::ostringstream out;
    out << "HTTP/1.1 " << status << ' ' << reason << "\r\n"
        << "Content-Type: application/json; charset=utf-8\r\n"
        << "Cache-Control: no-store\r\n"
        << "X-Content-Type-Options: nosniff\r\n"
        << "Connection: close\r\n"
        << "Content-Length: " << body.size() << "\r\n\r\n"
        << body;
    const std::string response = out.str();
    std::size_t sent = 0;
    while (sent < response.size()) {
        const ssize_t n = ::send(fd, response.data() + sent, response.size() - sent, MSG_NOSIGNAL);
        if (n <= 0) break;
        sent += static_cast<std::size_t>(n);
    }
}

bool authorized(const Request& req, const std::string& secret) {
    if (secret.empty()) return false;
    const auto it = req.headers.find("authorization");
    if (it == req.headers.end()) return false;
    return constantTimeEqual(it->second, "Bearer " + secret);
}

std::string constantsJson() {
    std::ostringstream o; o << std::setprecision(15);
    o << "{\"engine\":\"Celestia\",\"version\":\"1.7.0\",\"native\":true,\"api\":\"celastro\","
      << "\"j2000ObliquityDeg\":" << astro::J2000Obliquity << ','
      << "\"speedOfLightKmS\":" << astro::speedOfLight << ','
      << "\"solarMassKg\":" << astro::SolarMass << ','
      << "\"earthMassKg\":" << astro::EarthMass << ','
      << "\"lunarMassKg\":" << astro::LunarMass << ','
      << "\"jupiterMassKg\":" << astro::JupiterMass << ','
      << "\"solarTemperatureK\":" << astro::SOLAR_TEMPERATURE << ','
      << "\"solarIrradianceWM2\":" << astro::SOLAR_IRRADIANCE << ','
      << "\"earthRadiusKm\":" << astro::EARTH_RADIUS<double> << ','
      << "\"jupiterRadiusKm\":" << astro::JUPITER_RADIUS<double> << ','
      << "\"solarRadiusKm\":" << astro::SOLAR_RADIUS<double> << '}';
    return o.str();
}

std::string capabilitiesJson() {
    return "{\"ok\":true,\"native\":true,\"engine\":\"Celestia 1.7.0\",\"sidecarVersion\":\"1.0.0\",\"linkedLibrary\":\"libcelestia\",\"modules\":[\"celastro\",\"celengine\",\"celephem\",\"celimage\",\"celmath\",\"celmodel\",\"celrender\",\"celscript\",\"celutil\"],\"nativeFunctions\":[\"magToIrradiance\",\"equatorialToCelestialCart\",\"anomaly\",\"meanEclipticObliquity\"],\"renderLoopDependency\":false}";
}

std::pair<int, std::string> route(const Request& req, const std::string& secret) {
    if (req.path == "/health" && req.method == "GET") {
        return {200, "{\"ok\":true,\"service\":\"urux-celestia-sidecar\",\"version\":\"1.0.0\",\"native\":true}"};
    }
    if (!authorized(req, secret)) return {401, "{\"ok\":false,\"error\":\"unauthorized\"}"};

    if (req.path == "/v1/capabilities" && req.method == "GET") return {200, capabilitiesJson()};
    if (req.path == "/v1/constants" && req.method == "GET") return {200, constantsJson()};

    if (req.path == "/v1/photometry" && req.method == "POST") {
        const auto magnitude = jsonNumber(req.body, "magnitude");
        if (!magnitude) return {400, "{\"ok\":false,\"error\":\"magnitude_required\"}"};
        std::ostringstream o; o << std::setprecision(15) << "{\"ok\":true,\"magnitude\":" << *magnitude << ",\"irradiance\":" << astro::magToIrradiance(static_cast<float>(*magnitude)) << '}';
        return {200, o.str()};
    }

    if (req.path == "/v1/equatorial" && req.method == "POST") {
        const auto raHours = jsonNumber(req.body, "raHours");
        const auto decDeg = jsonNumber(req.body, "decDeg");
        const auto distance = jsonNumber(req.body, "distance");
        if (!raHours || !decDeg || !distance) return {400, "{\"ok\":false,\"error\":\"raHours_decDeg_distance_required\"}"};
        const auto p = astro::equatorialToCelestialCart(*raHours, *decDeg, *distance);
        std::ostringstream o; o << std::setprecision(15) << "{\"ok\":true,\"raHours\":" << *raHours << ",\"decDeg\":" << *decDeg << ",\"distance\":" << *distance << ",\"celestial\":[" << p.x() << ',' << p.y() << ',' << p.z() << "]}";
        return {200, o.str()};
    }

    if (req.path == "/v1/anomaly" && req.method == "POST") {
        const auto mean = jsonNumber(req.body, "meanAnomalyRad");
        const auto eccentricity = jsonNumber(req.body, "eccentricity");
        if (!mean || !eccentricity || *eccentricity < 0 || *eccentricity >= 1) return {400, "{\"ok\":false,\"error\":\"valid_meanAnomalyRad_and_eccentricity_required\"}"};
        double trueAnomaly = 0.0, eccentricAnomaly = 0.0;
        astro::anomaly(*mean, *eccentricity, trueAnomaly, eccentricAnomaly);
        std::ostringstream o; o << std::setprecision(15) << "{\"ok\":true,\"meanAnomalyRad\":" << *mean << ",\"eccentricity\":" << *eccentricity << ",\"trueAnomalyRad\":" << trueAnomaly << ",\"eccentricAnomalyRad\":" << eccentricAnomaly << '}';
        return {200, o.str()};
    }

    if (req.path == "/v1/obliquity" && req.method == "POST") {
        const auto jd = jsonNumber(req.body, "julianDate");
        if (!jd) return {400, "{\"ok\":false,\"error\":\"julianDate_required\"}"};
        std::ostringstream o; o << std::setprecision(15) << "{\"ok\":true,\"julianDate\":" << *jd << ",\"meanEclipticObliquityRad\":" << astro::meanEclipticObliquity(*jd) << '}';
        return {200, o.str()};
    }

    if (req.path.rfind("/v1/", 0) == 0 && req.method != "GET" && req.method != "POST") return {405, "{\"ok\":false,\"error\":\"method_not_allowed\"}"};
    return {404, "{\"ok\":false,\"error\":\"not_found\"}"};
}

void handleClient(int fd, const std::string& secret) {
    try {
        const Request req = readRequest(fd);
        const auto [status, body] = route(req, secret);
        sendResponse(fd, status, body);
    } catch (const std::exception& e) {
        const std::string msg = e.what();
        const int status = msg == "request_too_large" ? 413 : 400;
        sendResponse(fd, status, "{\"ok\":false,\"error\":\"" + jsonEscape(msg) + "\"}");
    }
    ::close(fd);
}
}

int main() {
    const char* tokenEnv = std::getenv("URUX_SIDECAR_TOKEN");
    const std::string secret = tokenEnv ? tokenEnv : "";
    if (secret.size() < 24) {
        std::cerr << "URUX_SIDECAR_TOKEN must contain at least 24 characters\n";
        return 2;
    }
    const char* portEnv = std::getenv("PORT");
    const int port = portEnv ? std::atoi(portEnv) : 8788;
    if (port <= 0 || port > 65535) {
        std::cerr << "Invalid PORT\n";
        return 2;
    }

    const int server = ::socket(AF_INET, SOCK_STREAM, 0);
    if (server < 0) { std::perror("socket"); return 3; }
    int reuse = 1;
    ::setsockopt(server, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));
    sockaddr_in address{};
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = htonl(INADDR_ANY);
    address.sin_port = htons(static_cast<uint16_t>(port));
    if (::bind(server, reinterpret_cast<sockaddr*>(&address), sizeof(address)) < 0) { std::perror("bind"); ::close(server); return 4; }
    if (::listen(server, 128) < 0) { std::perror("listen"); ::close(server); return 5; }

    std::cout << "URUX Celestia native sidecar " << VERSION << " listening on 0.0.0.0:" << port << std::endl;
    while (true) {
        sockaddr_in client{}; socklen_t len = sizeof(client);
        const int fd = ::accept(server, reinterpret_cast<sockaddr*>(&client), &len);
        if (fd < 0) { if (errno == EINTR) continue; std::perror("accept"); continue; }
        std::thread(handleClient, fd, std::cref(secret)).detach();
    }
}

// URUX Celestia native sidecar.
// Links against the literal Celestia shared library and exposes a deliberately
// small HTTP surface to the Worker. No browser/render-loop networking occurs.

#include <celastro/astro.h>

#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#include <algorithm>
#include <cerrno>
#include <cmath>
#include <cstdlib>
#include <filesystem>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <unordered_map>

namespace fs = std::filesystem;
using celestia::astro::StateVectorToElements;

static std::string jsonEscape(const std::string& s) {
    std::ostringstream out;
    for (unsigned char c : s) {
        switch (c) {
            case '"': out << "\\\""; break;
            case '\\': out << "\\\\"; break;
            case '\n': out << "\\n"; break;
            case '\r': out << "\\r"; break;
            case '\t': out << "\\t"; break;
            default:
                if (c < 0x20) out << "?";
                else out << c;
        }
    }
    return out.str();
}

static std::unordered_map<std::string, std::string> parseQuery(const std::string& target) {
    std::unordered_map<std::string, std::string> q;
    auto pos = target.find('?');
    if (pos == std::string::npos) return q;
    std::string s = target.substr(pos + 1);
    std::stringstream ss(s);
    std::string part;
    while (std::getline(ss, part, '&')) {
        auto eq = part.find('=');
        if (eq != std::string::npos) q[part.substr(0, eq)] = part.substr(eq + 1);
    }
    return q;
}

static double qd(const std::unordered_map<std::string, std::string>& q, const char* key, double fallback) {
    auto it = q.find(key);
    if (it == q.end()) return fallback;
    try { return std::stod(it->second); } catch (...) { return fallback; }
}

struct ContentStats {
    std::map<std::string, std::uint64_t> counts;
    std::uint64_t totalFiles = 0;
    std::uint64_t totalBytes = 0;
};

static ContentStats scanContent(const fs::path& root) {
    ContentStats s;
    if (!fs::exists(root)) return s;
    const std::map<std::string, std::string> kinds = {
        {".ssc", "solarSystemCatalogs"}, {".stc", "starCatalogs"}, {".dsc", "deepSkyCatalogs"},
        {".cel", "celScripts"}, {".celx", "celxScripts"}, {".cmod", "celestiaModels"},
        {".3ds", "legacyModels"}, {".ctx", "virtualTextures"}, {".png", "pngTextures"},
        {".jpg", "jpegTextures"}, {".jpeg", "jpegTextures"}, {".dds", "ddsTextures"}, {".avif", "avifTextures"}
    };
    try {
        for (const auto& entry : fs::recursive_directory_iterator(root, fs::directory_options::skip_permission_denied)) {
            if (!entry.is_regular_file()) continue;
            ++s.totalFiles;
            std::error_code ec;
            s.totalBytes += entry.file_size(ec);
            auto ext = entry.path().extension().string();
            std::transform(ext.begin(), ext.end(), ext.begin(), [](unsigned char c){ return std::tolower(c); });
            auto it = kinds.find(ext);
            ++s.counts[it == kinds.end() ? "other" : it->second];
        }
    } catch (const std::exception& e) {
        std::cerr << "CelestiaContent scan warning: " << e.what() << "\n";
    }
    return s;
}

static std::string contentStatsJson(const ContentStats& s) {
    std::ostringstream o;
    o << "{\"totalFiles\":" << s.totalFiles << ",\"totalBytes\":" << s.totalBytes << ",\"counts\":{";
    bool first = true;
    for (const auto& [k, v] : s.counts) {
        if (!first) o << ',';
        first = false;
        o << '\"' << jsonEscape(k) << "\":" << v;
    }
    o << "}}";
    return o.str();
}

static std::string engineJson(const ContentStats& stats) {
    // Invoke real, non-inline symbols from libcelestia so /ready proves the native
    // shared library is loaded, not merely that this process started.
    const float zeroMagIrradiance = celestia::astro::magToIrradiance(0.0f);
    const double j2000Obliquity = celestia::astro::meanEclipticObliquity(2451545.0);
    std::ostringstream o;
    o.precision(15);
    o << "{\"ok\":true,\"service\":\"urux-celestia-sidecar\",\"native\":true,\"celestia\":\"1.7.0\","
      << "\"libraryProbe\":{\"magToIrradiance0\":" << zeroMagIrradiance << ",\"meanEclipticObliquityJ2000\":" << j2000Obliquity << "},"
      << "\"compiledSubsystems\":[\"cel3ds\",\"celastro\",\"celengine\",\"celephem\",\"celestia-core\",\"celimage\",\"celmath\",\"celmodel\",\"celrender\",\"celttf\",\"celutil\",\"celscript\",\"celx\",\"tools\"],"
      << "\"content\":" << contentStatsJson(stats) << "}";
    return o.str();
}

static std::string astroJson(const std::unordered_map<std::string, std::string>& q) {
    const double mag = qd(q, "mag", 0.0);
    const double ra = qd(q, "ra", 0.0);
    const double dec = qd(q, "dec", 0.0);
    const double distance = qd(q, "distance", 1.0);
    const double jd = qd(q, "jd", 2451545.0);
    const auto cart = celestia::astro::equatorialToCelestialCart(ra, dec, distance);
    const auto gal = celestia::astro::equatorialToGalactic(cart);
    std::ostringstream o;
    o.precision(15);
    o << "{\"ok\":true,\"native\":true,\"input\":{\"mag\":" << mag << ",\"ra\":" << ra << ",\"dec\":" << dec << ",\"distance\":" << distance << ",\"jd\":" << jd << "},"
      << "\"photometry\":{\"irradiance\":" << celestia::astro::magToIrradiance(static_cast<float>(mag)) << "},"
      << "\"coordinates\":{\"celestial\":[" << cart.x() << ',' << cart.y() << ',' << cart.z() << "],\"galactic\":[" << gal.x() << ',' << gal.y() << ',' << gal.z() << "]},"
      << "\"meanEclipticObliquity\":" << celestia::astro::meanEclipticObliquity(jd) << "}";
    return o.str();
}

static std::string orbitJson(const std::unordered_map<std::string, std::string>& q) {
    Eigen::Vector3d r(qd(q,"x",1.0), qd(q,"y",0.0), qd(q,"z",0.0));
    Eigen::Vector3d v(qd(q,"vx",0.0), qd(q,"vy",1.0), qd(q,"vz",0.0));
    double mu = qd(q,"mu",1.0);
    auto e = StateVectorToElements(r, v, mu);
    std::ostringstream o;
    o.precision(15);
    o << "{\"ok\":true,\"native\":true,\"kepler\":{"
      << "\"semimajorAxis\":" << e.semimajorAxis << ",\"eccentricity\":" << e.eccentricity
      << ",\"inclination\":" << e.inclination << ",\"longAscendingNode\":" << e.longAscendingNode
      << ",\"argPericenter\":" << e.argPericenter << ",\"meanAnomaly\":" << e.meanAnomaly
      << ",\"period\":" << e.period << "}}";
    return o.str();
}

static std::string responseFor(const std::string& target, const ContentStats& stats, int& status) {
    auto path = target.substr(0, target.find('?'));
    if (path == "/ready" || path == "/health" || path == "/v1/capabilities") return engineJson(stats);
    if (path == "/v1/content") return std::string("{\"ok\":true,\"native\":true,\"content\":") + contentStatsJson(stats) + "}";
    if (path == "/v1/astro") return astroJson(parseQuery(target));
    if (path == "/v1/orbit") return orbitJson(parseQuery(target));
    status = 404;
    return "{\"ok\":false,\"error\":\"not_found\"}";
}

static void sendHttp(int fd, int status, const std::string& body) {
    const char* text = status == 200 ? "OK" : "Not Found";
    std::ostringstream h;
    h << "HTTP/1.1 " << status << ' ' << text << "\r\n"
      << "Content-Type: application/json; charset=utf-8\r\n"
      << "Cache-Control: no-store\r\n"
      << "X-Content-Type-Options: nosniff\r\n"
      << "Content-Length: " << body.size() << "\r\n"
      << "Connection: close\r\n\r\n" << body;
    auto s = h.str();
    ::send(fd, s.data(), s.size(), MSG_NOSIGNAL);
}

int main() {
    const int port = std::getenv("PORT") ? std::atoi(std::getenv("PORT")) : 8080;
    const fs::path contentRoot = std::getenv("CELESTIA_CONTENT") ? std::getenv("CELESTIA_CONTENT") : "/opt/celestia/content";
    const ContentStats stats = scanContent(contentRoot);

    // Fail fast if libcelestia cannot execute.
    volatile float probe = celestia::astro::magToIrradiance(1.0f);
    (void)probe;

    int server = ::socket(AF_INET, SOCK_STREAM, 0);
    if (server < 0) { std::perror("socket"); return 1; }
    int one = 1;
    setsockopt(server, SOL_SOCKET, SO_REUSEADDR, &one, sizeof(one));
    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_ANY);
    addr.sin_port = htons(static_cast<uint16_t>(port));
    if (::bind(server, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) < 0) { std::perror("bind"); return 2; }
    if (::listen(server, 32) < 0) { std::perror("listen"); return 3; }
    std::cerr << "URUX Celestia sidecar listening on " << port << ", content files=" << stats.totalFiles << "\n";

    for (;;) {
        int client = ::accept(server, nullptr, nullptr);
        if (client < 0) { if (errno == EINTR) continue; std::perror("accept"); continue; }
        char buf[8192];
        ssize_t n = ::recv(client, buf, sizeof(buf) - 1, 0);
        if (n > 0) {
            buf[n] = 0;
            std::string req(buf);
            std::istringstream in(req);
            std::string method, target, version;
            in >> method >> target >> version;
            int status = 200;
            std::string body;
            if (method != "GET") { status = 404; body = "{\"ok\":false,\"error\":\"method_not_supported\"}"; }
            else body = responseFor(target, stats, status);
            sendHttp(client, status, body);
        }
        ::close(client);
    }
}

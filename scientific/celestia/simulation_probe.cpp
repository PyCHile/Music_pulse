#include <celestia/celestiacore.h>
#include <celengine/simulation.h>
#include <celengine/universe.h>
#include <celengine/selection.h>

#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

namespace {
class ProbeAlerter final : public CelestiaCore::Alerter {
public:
    void fatalError(const std::string& message) override { std::cerr << "Celestia fatal: " << message << '\n'; }
};

const char* typeName(SelectionType type) {
    switch (type) {
        case SelectionType::Star: return "star";
        case SelectionType::Body: return "body";
        case SelectionType::DeepSky: return "deep-sky";
        case SelectionType::Location: return "location";
        default: return "none";
    }
}

std::string esc(const std::string& value) {
    std::ostringstream out;
    for (char c : value) {
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
}

int main(int argc, char** argv) {
    if (argc != 4) {
        std::cerr << "usage: urux-celestia-simulation-probe <runtime-dir> <config> <output-json>\n";
        return 2;
    }
    const std::filesystem::path runtimeDir = argv[1];
    const std::filesystem::path configPath = std::filesystem::absolute(argv[2]);
    const std::filesystem::path outputPath = argv[3];
    std::error_code ec;
    std::filesystem::current_path(runtimeDir, ec);
    if (ec) {
        std::cerr << "cannot chdir to Celestia runtime: " << ec.message() << '\n';
        return 3;
    }

    CelestiaCore::initLocale();
    ProbeAlerter alerter;
    CelestiaCore core;
    core.setAlerter(&alerter);
    if (!core.initSimulation(configPath)) {
        std::cerr << "CelestiaCore::initSimulation failed\n";
        return 4;
    }

    Simulation* sim = core.getSimulation();
    if (!sim || !sim->getUniverse()) {
        std::cerr << "Celestia Simulation/Universe unavailable\n";
        return 5;
    }
    Universe* universe = sim->getUniverse();
    const auto* stars = universe->getStarCatalog();
    const auto* dsos = universe->getDSOCatalog();
    const auto* solar = universe->getSolarSystemCatalog();
    if (!stars || !dsos || !solar) {
        std::cerr << "Celestia catalogs unavailable\n";
        return 6;
    }

    constexpr double epoch = 2451545.0;
    sim->setTime(epoch);
    sim->update(0.0);

    const std::vector<std::string> names = {
        "Sol", "Sol/Earth", "Sol/Moon", "Sol/Mars", "Sol/Jupiter", "Sol/Saturn", "Sirius", "M 31"
    };

    std::ostringstream json;
    json << std::setprecision(15)
         << "{\n  \"schema\":\"urux-celestia-simulation-v1\",\n"
         << "  \"native\":true,\n"
         << "  \"engine\":\"Celestia 1.7.0\",\n"
         << "  \"api\":\"CelestiaCore + Simulation + Universe\",\n"
         << "  \"simulationInitialized\":true,\n"
         << "  \"epochJD\":" << epoch << ",\n"
         << "  \"catalogCounts\":{\"stars\":" << stars->size()
         << ",\"deepSky\":" << dsos->size()
         << ",\"solarSystems\":" << solar->size() << "},\n"
         << "  \"objects\":[\n";

    bool first = true;
    std::size_t found = 0;
    for (const auto& name : names) {
        Selection sel = sim->findObjectFromPath(name, false);
        if (!first) json << ",\n";
        first = false;
        json << "    {\"name\":\"" << esc(name) << "\",\"found\":" << (sel.empty() ? "false" : "true");
        if (!sel.empty()) {
            ++found;
            const auto velocity = sel.getVelocity(epoch);
            json << ",\"type\":\"" << typeName(sel.getType()) << "\""
                 << ",\"radiusKm\":" << sel.radius()
                 << ",\"velocityKmPerSec\":[" << velocity.x() << ',' << velocity.y() << ',' << velocity.z() << ']';
        }
        json << '}';
    }
    json << "\n  ],\n  \"objectsFound\":" << found
         << ",\n  \"renderingInvoked\":false,\n"
         << "  \"renderingReason\":\"URUX keeps Three.js/postprocessing as the superior integrated interactive renderer while Celestia provides literal simulation, universe, catalogs, ephemeris/orbit models and physical astronomy data.\"\n}\n";

    std::filesystem::create_directories(outputPath.parent_path());
    std::ofstream out(outputPath);
    if (!out) return 7;
    out << json.str();
    out.close();
    std::cout << json.str();
    return stars->size() > 1000 && dsos->size() > 0 && solar->size() > 0 && found >= 5 ? 0 : 8;
}

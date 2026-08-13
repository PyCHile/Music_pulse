#include <celastro/astro.h>
#include <cmath>
#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <string>

using namespace celestia;

namespace {
void usage() {
    std::cerr << "usage: urux-celestia-bridge <constants|photometry|equatorial|anomaly> [args...]\n";
}

double number(const char* value) {
    char* end = nullptr;
    const double v = std::strtod(value, &end);
    if (!end || *end != '\0' || !std::isfinite(v)) {
        throw std::runtime_error("invalid numeric argument");
    }
    return v;
}
}

int main(int argc, char** argv) {
    std::cout << std::setprecision(15);
    if (argc < 2) { usage(); return 2; }

    try {
        const std::string cmd = argv[1];
        if (cmd == "constants") {
            std::cout
                << "{\"engine\":\"Celestia\",\"api\":\"celastro\","
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
                << "\"solarRadiusKm\":" << astro::SOLAR_RADIUS<double>
                << "}\n";
            return 0;
        }

        if (cmd == "photometry") {
            if (argc != 3) { usage(); return 2; }
            const double mag = number(argv[2]);
            std::cout << "{\"magnitude\":" << mag
                      << ",\"irradiance\":" << astro::magToIrradiance(static_cast<float>(mag))
                      << "}\n";
            return 0;
        }

        if (cmd == "equatorial") {
            if (argc != 5) { usage(); return 2; }
            const double raDeg = number(argv[2]);
            const double decDeg = number(argv[3]);
            const double distance = number(argv[4]);
            const auto p = astro::equatorialToCelestialCart(raDeg, decDeg, distance);
            std::cout << "{\"raDeg\":" << raDeg << ",\"decDeg\":" << decDeg
                      << ",\"distance\":" << distance
                      << ",\"celestial\":[" << p.x() << ',' << p.y() << ',' << p.z() << "]}\n";
            return 0;
        }

        if (cmd == "anomaly") {
            if (argc != 4) { usage(); return 2; }
            const double mean = number(argv[2]);
            const double eccentricity = number(argv[3]);
            double trueAnomaly = 0.0;
            double eccentricAnomaly = 0.0;
            astro::anomaly(mean, eccentricity, trueAnomaly, eccentricAnomaly);
            std::cout << "{\"meanAnomalyRad\":" << mean
                      << ",\"eccentricity\":" << eccentricity
                      << ",\"trueAnomalyRad\":" << trueAnomaly
                      << ",\"eccentricAnomalyRad\":" << eccentricAnomaly << "}\n";
            return 0;
        }

        usage();
        return 2;
    } catch (const std::exception& e) {
        std::cerr << e.what() << '\n';
        return 3;
    }
}

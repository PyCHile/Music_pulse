FROM debian:bookworm AS build

ARG CELESTIA_REF=84153ded046fbea46c9f411dd0232e5426373ead
ARG CELESTIA_CONTENT_REF=e4d5d2754b6224f04e440e53b189f9ee96b6d1fe

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates git build-essential cmake ninja-build pkg-config \
    libepoxy-dev libeigen3-dev libfmt-dev libpng-dev libjpeg-dev libfreetype6-dev \
    gperf libboost-dev liblua5.4-dev gettext python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN git clone --filter=blob:none https://github.com/CelestiaProject/Celestia.git Celestia \
    && cd Celestia && git checkout "$CELESTIA_REF"
RUN git clone --depth 1 https://github.com/CelestiaProject/CelestiaContent.git CelestiaContent \
    && cd CelestiaContent && git fetch --depth 1 origin "$CELESTIA_CONTENT_REF" && git checkout "$CELESTIA_CONTENT_REF"

WORKDIR /build/celestia
RUN cmake -S /src/Celestia -B . -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DENABLE_CELX=ON \
    -DENABLE_SPICE=OFF \
    -DENABLE_NLS=OFF \
    -DENABLE_QT6=OFF \
    -DENABLE_SDL=OFF \
    -DENABLE_WIN=OFF \
    -DENABLE_FFMPEG=OFF \
    -DENABLE_LIBAVIF=OFF \
    -DENABLE_MINIAUDIO=OFF \
    -DENABLE_TOOLS=ON \
    -DENABLE_TESTS=OFF \
    -DENABLE_GLES=OFF \
    -DENABLE_LTO=OFF \
    -DUSE_ICU=OFF \
    -DUSE_MESHOPTIMIZER=OFF \
    && cmake --build . --parallel 2

COPY server.cpp /src/urux-sidecar/server.cpp
RUN LIBDIR="$(dirname "$(find /build/celestia -type f -name 'libcelestia.so*' | head -n1)")" \
    && test -n "$LIBDIR" \
    && g++ -std=c++17 -O2 -DNDEBUG \
       -I/src/Celestia/src -I/build/celestia -I/usr/include/eigen3 \
       /src/urux-sidecar/server.cpp \
       -L"$LIBDIR" -Wl,-rpath,/opt/celestia/lib -lcelestia \
       -o /build/urux-celestia-sidecar \
    && mkdir -p /stage/opt/celestia/lib /stage/opt/celestia/content /stage/usr/local/bin \
    && cp "$LIBDIR"/libcelestia.so* /stage/opt/celestia/lib/ \
    && cp /build/urux-celestia-sidecar /stage/usr/local/bin/urux-celestia-sidecar \
    && cp -a /src/CelestiaContent/. /stage/opt/celestia/content/

FROM debian:bookworm-slim
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    libepoxy0 libeigen3-dev libfmt9 libpng16-16 libjpeg62-turbo libfreetype6 \
    liblua5.4-0 libboost1.74.0 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /stage/ /
ENV PORT=8080
ENV CELESTIA_CONTENT=/opt/celestia/content
ENV LD_LIBRARY_PATH=/opt/celestia/lib
EXPOSE 8080
USER 65532:65532
ENTRYPOINT ["/usr/local/bin/urux-celestia-sidecar"]

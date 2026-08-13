FROM ubuntu:24.04 AS build

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake ninja-build git ca-certificates pkg-config \
    libepoxy-dev libeigen3-dev libfmt-dev libpng-dev libjpeg-dev \
    libfreetype6-dev libboost-dev gperf liblua5.4-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/urux
COPY . /opt/urux

ARG CELESTIA_COMMIT=84153ded046fbea46c9f411dd0232e5426373ead
RUN git clone --filter=blob:none https://github.com/CelestiaProject/Celestia.git /opt/celestia \
    && git -C /opt/celestia fetch --depth=1 origin ${CELESTIA_COMMIT} \
    && git -C /opt/celestia checkout --detach ${CELESTIA_COMMIT} \
    && git -C /opt/celestia submodule update --init --recursive

RUN cmake -S /opt/celestia -B /opt/celestia-build -G Ninja \
      -DCMAKE_BUILD_TYPE=Release \
      -DENABLE_NLS=OFF \
      -DENABLE_CELX=ON \
      -DENABLE_TOOLS=OFF \
      -DENABLE_QT6=OFF \
      -DENABLE_SDL=OFF \
      -DENABLE_WIN=OFF \
      -DENABLE_TESTS=OFF \
      -DENABLE_GLES=OFF \
      -DENABLE_LTO=ON \
      -DENABLE_SPICE=OFF \
      -DENABLE_FFMPEG=OFF \
      -DENABLE_LIBAVIF=OFF \
      -DENABLE_MINIAUDIO=OFF \
      -DUSE_MESHOPTIMIZER=OFF \
    && cmake --build /opt/celestia-build --target celestia --parallel

RUN cmake -S /opt/urux/scientific/celestia/bridge -B /opt/urux-sidecar-build -G Ninja \
      -DCELESTIA_SOURCE_DIR=/opt/celestia \
      -DCELESTIA_BUILD_DIR=/opt/celestia-build \
      -DCMAKE_BUILD_TYPE=Release \
      -DCMAKE_INSTALL_PREFIX=/opt/urux-native \
    && cmake --build /opt/urux-sidecar-build --target urux-celestia-sidecar --parallel \
    && cmake --install /opt/urux-sidecar-build

FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libepoxy0 libeigen3-dev libfmt9 libpng16-16t64 libjpeg-turbo8 libfreetype6 liblua5.4-0 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /opt/urux-native /opt/urux-native
ENV PORT=8788
EXPOSE 8788
ENTRYPOINT ["/opt/urux-native/bin/urux-celestia-sidecar"]

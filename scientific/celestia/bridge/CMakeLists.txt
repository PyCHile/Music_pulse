cmake_minimum_required(VERSION 3.19)
project(urux_celestia_bridge LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT DEFINED CELESTIA_SOURCE_DIR)
  message(FATAL_ERROR "CELESTIA_SOURCE_DIR must point to a literal Celestia source checkout")
endif()
if(NOT DEFINED CELESTIA_BUILD_DIR)
  message(FATAL_ERROR "CELESTIA_BUILD_DIR must point to the completed Celestia build tree")
endif()

find_package(Eigen3 3.3 CONFIG REQUIRED NO_MODULE)
find_package(Threads REQUIRED)
find_library(CELESTIA_LIBRARY
  NAMES celestia celestia-1.7
  PATHS "${CELESTIA_BUILD_DIR}/src/celestia"
  NO_DEFAULT_PATH
)
if(NOT CELESTIA_LIBRARY)
  message(FATAL_ERROR "libcelestia was not found under ${CELESTIA_BUILD_DIR}/src/celestia")
endif()

function(urux_link_celestia target)
  target_include_directories(${target} PRIVATE
    "${CELESTIA_SOURCE_DIR}/src"
    "${CELESTIA_BUILD_DIR}"
  )
  target_link_libraries(${target} PRIVATE Eigen3::Eigen "${CELESTIA_LIBRARY}")
  set_target_properties(${target} PROPERTIES
    BUILD_RPATH "${CELESTIA_BUILD_DIR}/src/celestia"
    INSTALL_RPATH "$ORIGIN/../lib"
  )
endfunction()

add_executable(urux-celestia-bridge bridge.cpp)
urux_link_celestia(urux-celestia-bridge)

add_executable(urux-celestia-sidecar ../sidecar/server.cpp)
urux_link_celestia(urux-celestia-sidecar)
target_link_libraries(urux-celestia-sidecar PRIVATE Threads::Threads)

install(TARGETS urux-celestia-bridge urux-celestia-sidecar RUNTIME DESTINATION bin)
install(FILES "${CELESTIA_LIBRARY}" DESTINATION lib)

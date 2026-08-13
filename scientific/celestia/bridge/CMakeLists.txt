cmake_minimum_required(VERSION 3.19)
project(urux_celestia_bridge LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT DEFINED CELESTIA_SOURCE_DIR)
  message(FATAL_ERROR "CELESTIA_SOURCE_DIR must point to a literal Celestia source checkout")
endif()

# Build the upstream library as-is. These options expose the scientific engine,
# catalog loaders, ephemerides, scripting and tools without selecting a GUI.
set(ENABLE_CELX ON CACHE BOOL "" FORCE)
set(ENABLE_TOOLS ON CACHE BOOL "" FORCE)
set(ENABLE_QT6 OFF CACHE BOOL "" FORCE)
set(ENABLE_SDL OFF CACHE BOOL "" FORCE)
set(ENABLE_WIN OFF CACHE BOOL "" FORCE)
set(ENABLE_TESTS OFF CACHE BOOL "" FORCE)
set(ENABLE_GLES OFF CACHE BOOL "" FORCE)
set(ENABLE_LTO ON CACHE BOOL "" FORCE)
set(ENABLE_SPICE ${URUX_CELESTIA_ENABLE_SPICE} CACHE BOOL "" FORCE)
set(ENABLE_FFMPEG ${URUX_CELESTIA_ENABLE_FFMPEG} CACHE BOOL "" FORCE)
set(ENABLE_LIBAVIF ${URUX_CELESTIA_ENABLE_LIBAVIF} CACHE BOOL "" FORCE)
set(ENABLE_MINIAUDIO ${URUX_CELESTIA_ENABLE_MINIAUDIO} CACHE BOOL "" FORCE)
set(USE_MESHOPTIMIZER ${URUX_CELESTIA_USE_MESHOPTIMIZER} CACHE BOOL "" FORCE)

add_subdirectory("${CELESTIA_SOURCE_DIR}" "${CMAKE_BINARY_DIR}/celestia-upstream")

add_executable(urux-celestia-bridge bridge.cpp)
target_include_directories(urux-celestia-bridge PRIVATE
  "${CELESTIA_SOURCE_DIR}/src"
  "${CMAKE_BINARY_DIR}/celestia-upstream"
)
target_link_libraries(urux-celestia-bridge PRIVATE celestia)

install(TARGETS urux-celestia-bridge RUNTIME DESTINATION bin)

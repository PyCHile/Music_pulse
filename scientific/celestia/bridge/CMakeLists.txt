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
find_library(CELESTIA_LIBRARY
  NAMES celestia celestia-1.7
  PATHS "${CELESTIA_BUILD_DIR}/src/celestia"
  NO_DEFAULT_PATH
)
if(NOT CELESTIA_LIBRARY)
  message(FATAL_ERROR "libcelestia was not found under ${CELESTIA_BUILD_DIR}/src/celestia")
endif()

add_executable(urux-celestia-bridge bridge.cpp)
target_include_directories(urux-celestia-bridge PRIVATE
  "${CELESTIA_SOURCE_DIR}/src"
  "${CELESTIA_BUILD_DIR}"
)
target_link_libraries(urux-celestia-bridge PRIVATE Eigen3::Eigen "${CELESTIA_LIBRARY}")
set_target_properties(urux-celestia-bridge PROPERTIES
  BUILD_RPATH "${CELESTIA_BUILD_DIR}/src/celestia"
  INSTALL_RPATH "$ORIGIN/../lib"
)

install(TARGETS urux-celestia-bridge RUNTIME DESTINATION bin)
install(FILES "${CELESTIA_LIBRARY}" DESTINATION lib)

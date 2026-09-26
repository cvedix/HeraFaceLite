cmake_minimum_required(VERSION 3.16)

find_package(Threads REQUIRED)

add_executable(heraface_server
    src/heraface_server.cpp
)

target_include_directories(heraface_server PRIVATE
    ${CMAKE_SOURCE_DIR}
    ${CMAKE_SOURCE_DIR}/third_party
    ${CMAKE_SOURCE_DIR}/third_party/cpp_httplib
)

target_compile_definitions(heraface_server PRIVATE CVEDIX_WITH_FACE)
target_compile_definitions(heraface_server PRIVATE HERAFACE_WEB_DIR="${CMAKE_CURRENT_SOURCE_DIR}/web")
target_link_libraries(heraface_server PRIVATE cvedix_core Threads::Threads)

set_target_properties(heraface_server PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin
)

install(TARGETS heraface_server DESTINATION bin OPTIONAL)
install(FILES README.md DESTINATION share/heraface-lite OPTIONAL)
install(DIRECTORY web/ DESTINATION share/heraface-lite/web OPTIONAL)

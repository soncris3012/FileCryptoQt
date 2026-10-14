cmake_minimum_required(VERSION 3.21)
project(FileCryptoQt VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)

find_package(Qt6 REQUIRED COMPONENTS Widgets Multimedia MultimediaWidgets Concurrent)
find_package(OpenSSL REQUIRED)

qt_add_executable(FileCryptoQt
    main.cpp
    mainwindow.cpp
    mainwindow.h
    mainwindow.ui
    cryptoengine.cpp
    cryptoengine.h
    filepreview.cpp
    filepreview.h
    transmissionwidget.cpp
    transmissionwidget.h
)

target_link_libraries(FileCryptoQt PRIVATE Qt6::Widgets Qt6::Multimedia Qt6::MultimediaWidgets Qt6::Concurrent OpenSSL::Crypto)
target_include_directories(FileCryptoQt PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})

set_target_properties(FileCryptoQt PROPERTIES
    MACOSX_BUNDLE TRUE
    WIN32_EXECUTABLE TRUE
)

include(GNUInstallDirs)
install(TARGETS FileCryptoQt
    BUNDLE DESTINATION .
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)

set(CPACK_PACKAGE_NAME "FileCryptoQt")
set(CPACK_PACKAGE_VENDOR "NCKH2627")
set(CPACK_PACKAGE_VERSION ${PROJECT_VERSION})
include(CPack)


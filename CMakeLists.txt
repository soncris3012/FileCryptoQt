cmake_minimum_required(VERSION 3.21)
project(FileCryptoQt VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)

find_package(Qt6 REQUIRED COMPONENTS Widgets)
find_package(OpenSSL REQUIRED)

qt_add_executable(FileCryptoQt
    main.cpp
    mainwindow.cpp
    mainwindow.h
    mainwindow.ui
    cryptoengine.cpp
    cryptoengine.h
)

target_link_libraries(FileCryptoQt PRIVATE Qt6::Widgets OpenSSL::Crypto)

set_target_properties(FileCryptoQt PROPERTIES
    MACOSX_BUNDLE TRUE
    WIN32_EXECUTABLE TRUE
)


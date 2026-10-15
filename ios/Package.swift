// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "FileCrypto",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "FileCryptoKit",
            targets: ["FileCryptoKit"]
        )
    ],
    dependencies: [],
    targets: [
        .target(
            name: "FileCryptoKit",
            path: "FileCrypto/Models"
        ),
        .testTarget(
            name: "FileCryptoTests",
            dependencies: ["FileCryptoKit"],
            path: "Tests"
        )
    ]
)

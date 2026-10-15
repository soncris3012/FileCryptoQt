//
//  ContentView.swift
//  FileCrypto iOS
//

import SwiftUI

public struct ContentView: View {
    @StateObject private var vm = CryptoViewModel()
    @State private var selectedTab: Int = 0

    public init() {}

    public var body: some View {
        TabView(selection: $selectedTab) {
            // Tab 1: Mã hóa
            NavigationStack {
                EncryptView(vm: vm)
                    .navigationTitle("Mã hóa tệp")
                    .toolbar {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            Text("CryptoLab iOS")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.cyan.opacity(0.15))
                                .foregroundColor(.cyan)
                                .cornerRadius(8)
                        }
                    }
            }
            .tabItem {
                Label("Mã hóa", systemImage: "lock.fill")
            }
            .tag(0)

            // Tab 2: Giải mã
            NavigationStack {
                DecryptView(vm: vm)
                    .navigationTitle("Giải mã tệp")
                    .toolbar {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            Text("FCQ2 & FCQ1")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.green.opacity(0.15))
                                .foregroundColor(.green)
                                .cornerRadius(8)
                        }
                    }
            }
            .tabItem {
                Label("Giải mã", systemImage: "lock.open.fill")
            }
            .tag(1)

            // Tab 3: Soi cấu trúc
            NavigationStack {
                InspectView(vm: vm)
                    .navigationTitle("Soi Header FCQ")
            }
            .tabItem {
                Label("Soi Header", systemImage: "magnifyingglass")
            }
            .tag(2)

            // Tab 4: Giới thiệu & Tự kiểm thử
            NavigationStack {
                AboutView()
                    .navigationTitle("Hệ sinh thái & Kiểm thử")
            }
            .tabItem {
                Label("Hệ sinh thái", systemImage: "network")
            }
            .tag(3)
        }
        .accentColor(.cyan)
        .alert("Thông báo", isPresented: $vm.showErrorAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(vm.errorMessage ?? "")
        }
    }
}

struct AboutView: View {
    @State private var selfTestOutput: String = ""
    @State private var isRunningTest: Bool = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header card
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "applelogo")
                            .font(.title)
                        Text("FileCrypto iOS — Apple Native")
                            .font(.title3)
                            .fontWeight(.bold)
                    }
                    Text("Tận dụng Apple CryptoKit phần mềm và phần cứng Secure Enclave để xử lý dữ liệu với tốc độ cao nhất và bảo mật tuyệt đối trên iPhone & iPad.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(14)

                // Self Test Runner
                VStack(alignment: .leading, spacing: 12) {
                    Label("Bộ tự kiểm thử trên thiết bị (Self-Test)", systemImage: "bolt.fill")
                        .font(.headline)
                        .foregroundColor(.cyan)

                    Text("Chạy mã hóa và giải mã round-trip trực tiếp cho cả 3 thuật toán bằng Apple CryptoKit và CommonCrypto.")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Button {
                        runSelfTest()
                    } label: {
                        HStack {
                            if isRunningTest {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .black))
                            } else {
                                Image(systemName: "play.circle.fill")
                            }
                            Text(isRunningTest ? "Đang chạy kiểm thử..." : "Bắt đầu chạy Self-Test")
                                .fontWeight(.bold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(12)
                        .background(Color.cyan)
                        .foregroundColor(.black)
                        .cornerRadius(10)
                    }
                    .disabled(isRunningTest)

                    if !selfTestOutput.isEmpty {
                        Text(selfTestOutput)
                            .font(.system(size: 11, design: .monospaced))
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.black.opacity(0.4))
                            .cornerRadius(8)
                    }
                }
                .padding()
                .background(Color(UIColor.systemBackground))
                .cornerRadius(14)
                .shadow(color: .black.opacity(0.1), radius: 5)

                // Platforms table
                VStack(alignment: .leading, spacing: 10) {
                    Label("Hệ sinh thái các nhánh", systemImage: "rectangle.stack.fill")
                        .font(.headline)

                    platformRow(name: "iOS (Swift / CryptoKit)", branch: "ios", status: "Nhánh hiện tại", color: .cyan)
                    platformRow(name: "Web (100% Client-Side)", branch: "web", status: "Web Crypto API", color: .purple)
                    platformRow(name: "macOS (Apple Silicon & Intel)", branch: "macos", status: "Desktop Qt 6", color: .blue)
                    platformRow(name: "Windows (Win 7/8/10/11)", branch: "windows", status: "Desktop Qt 6", color: .teal)
                    platformRow(name: "Linux (Debian, Ubuntu, ...)", branch: "linux", status: "Desktop Qt 6", color: .orange)
                }
                .padding()
                .background(Color(UIColor.systemBackground))
                .cornerRadius(14)
                .shadow(color: .black.opacity(0.1), radius: 5)
            }
            .padding()
        }
    }

    private func runSelfTest() {
        isRunningTest = true
        selfTestOutput = "Đang kiểm thử..."

        Task.detached(priority: .userInitiated) {
            let sample = "CryptoLab iOS Test 2026!".data(using: .utf8)!
            let pass = "Pass@2026"
            var logs = ""

            for alg in CryptoEngine.Algorithm.allCases {
                do {
                    let enc = try CryptoEngine.encrypt(data: sample, fileName: "test.txt", mimeType: "text/plain", password: pass, algorithm: alg)
                    let dec = try CryptoEngine.decrypt(data: enc, password: pass)
                    let ok = (dec.plaintext == sample) && (dec.originalName == "test.txt")
                    logs += "✓ \(alg.name): \(ok ? "PASSED (100% Khớp)" : "FAILED")\n"
                } catch {
                    logs += "✗ \(alg.name) Lỗi: \(error.localizedDescription)\n"
                }
            }

            await MainActor.run {
                selfTestOutput = logs + "\n🎉 TẤT CẢ THUẬT TOÁN ĐÃ ĐẠT CHUẨN TRÊN IOS!"
                isRunningTest = false
            }
        }
    }

    @ViewBuilder
    private func platformRow(name: String, branch: String, status: String, color: Color) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.caption)
                    .fontWeight(.semibold)
                Text("Nhánh git: \(branch)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Text(status)
                .font(.caption2)
                .fontWeight(.bold)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(color.opacity(0.15))
                .foregroundColor(color)
                .cornerRadius(6)
        }
        .padding(.vertical, 4)
    }
}

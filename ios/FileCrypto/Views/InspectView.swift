//
//  InspectView.swift
//  FileCrypto iOS
//

import SwiftUI
import UniformTypeIdentifiers

public struct InspectView: View {
    @ObservedObject var vm: CryptoViewModel
    @State private var isShowingFilePicker = false

    public init(vm: CryptoViewModel) {
        self.vm = vm
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // File Picker
                VStack(alignment: .leading, spacing: 12) {
                    Label("Chọn tệp .fcq để phân tích cấu trúc", systemImage: "magnifyingglass.circle.fill")
                        .font(.headline)

                    if vm.selectedFileData != nil {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(vm.selectedFileName)
                                    .font(.subheadline)
                                    .fontWeight(.bold)
                                Text("\(formatBytes(vm.selectedFileSize))")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Button("Đổi tệp") {
                                isShowingFilePicker = true
                            }
                            .buttonStyle(.bordered)
                        }
                        .padding(12)
                        .background(Color.purple.opacity(0.1))
                        .cornerRadius(10)
                    } else {
                        Button {
                            isShowingFilePicker = true
                        } label: {
                            VStack(spacing: 8) {
                                Image(systemName: "doc.badge.gearshape.fill")
                                    .font(.system(size: 32))
                                    .foregroundColor(.purple)
                                Text("Nhấn để chọn tệp .fcq")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Text("Đọc và phân tích Header không cần giải mã hoặc nhập mật khẩu")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 24)
                            .background(Color(UIColor.secondarySystemBackground))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.white.opacity(0.15), style: StrokeStyle(lineWidth: 1.5, dash: [6]))
                            )
                        }
                    }
                }
                .padding()
                .background(Color(UIColor.systemBackground))
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.15), radius: 6, y: 3)

                // Inspect Result Card
                if let info = vm.inspectedInfo {
                    VStack(alignment: .leading, spacing: 16) {
                        Label("Thông tin định dạng FCQ", systemImage: "info.circle.fill")
                            .font(.headline)
                            .foregroundColor(.purple)

                        VStack(spacing: 10) {
                            infoRow(label: "Định dạng Magic:", value: "\(info.magic) (Phiên bản \(info.version))", badgeColor: .purple)
                            infoRow(label: "Thuật toán mã hóa:", value: info.algorithm.name, badgeColor: .cyan)
                            infoRow(label: "Tên tệp gốc:", value: info.originalName.isEmpty ? "(Không lưu trong FCQ1)" : info.originalName)
                            infoRow(label: "Loại MIME gốc:", value: info.mimeType)
                            infoRow(label: "Kích thước Payload:", value: "\(formatBytes(info.payloadSize)) (\(info.payloadSize) bytes)")
                            infoRow(label: "Kích thước Auth Tag/MAC:", value: "\(info.authSize) bytes (\(info.authenticated ? "AEAD/HMAC xác thực" : "Không xác thực"))")
                            infoRow(label: "Độ dài Header:", value: "\(info.headerLength) bytes")

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Salt dẫn xuất (16 bytes):")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                                Text(hexString(info.salt))
                                    .font(.system(size: 11, design: .monospaced))
                                    .foregroundColor(.cyan)
                                    .textSelection(.enabled)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(8)
                            .background(Color(UIColor.secondarySystemBackground))
                            .cornerRadius(8)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("IV / Nonce (\(info.iv.count) bytes):")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                                Text(hexString(info.iv))
                                    .font(.system(size: 11, design: .monospaced))
                                    .foregroundColor(.cyan)
                                    .textSelection(.enabled)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(8)
                            .background(Color(UIColor.secondarySystemBackground))
                            .cornerRadius(8)
                        }
                    }
                    .padding()
                    .background(Color(UIColor.systemBackground))
                    .cornerRadius(16)
                    .shadow(color: .black.opacity(0.15), radius: 6, y: 3)
                }

                // FCQ2 Format Spec Box
                VStack(alignment: .leading, spacing: 10) {
                    Label("Đặc tả kiến trúc FCQ2", systemImage: "cube.transparent.fill")
                        .font(.headline)

                    Text("""
                    FCQ2 header
                    ├── magic (4 bytes): "FCQ2"
                    ├── mã thuật toán (1 byte): 1=CBC+HMAC, 2=GCM, 3=ChaCha20
                    ├── salt ngẫu nhiên (16 bytes)
                    ├── độ dài IV (1 byte: 12 hoặc 16)
                    ├── IV ngẫu nhiên
                    ├── độ dài tên tệp (2 bytes BE)
                    ├── tên tệp gốc (UTF-8)
                    ├── độ dài MIME (2 bytes BE)
                    ├── loại MIME gốc (UTF-8)
                    ├── ciphertext toàn bộ tệp
                    └── 16B AEAD tag hoặc 32B HMAC-SHA256
                    """)
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(.secondary)
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(10)
                }
                .padding()
                .background(Color(UIColor.systemBackground))
                .cornerRadius(16)
            }
            .padding()
        }
        .fileImporter(
            isPresented: $isShowingFilePicker,
            allowedContentTypes: [.item],
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case .success(let urls):
                if let url = urls.first {
                    vm.selectFile(url: url)
                    vm.inspectCurrentFile()
                }
            case .failure(let err):
                print("Lỗi chọn tệp: \(err)")
            }
        }
    }

    @ViewBuilder
    private func infoRow(label: String, value: String, badgeColor: Color? = nil) -> some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            Spacer()
            if let badgeColor = badgeColor {
                Text(value)
                    .font(.caption)
                    .fontWeight(.bold)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(badgeColor.opacity(0.15))
                    .foregroundColor(badgeColor)
                    .cornerRadius(6)
            } else {
                Text(value)
                    .font(.caption)
                    .fontWeight(.medium)
            }
        }
        .padding(.vertical, 2)
    }

    private func hexString(_ data: Data) -> String {
        data.map { String(format: "%02X ", $0) }.joined()
    }

    private func formatBytes(_ bytes: Int) -> String {
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useAll]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(bytes))
    }
}

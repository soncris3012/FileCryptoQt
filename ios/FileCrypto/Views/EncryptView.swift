//
//  EncryptView.swift
//  FileCrypto iOS
//

import SwiftUI
import UniformTypeIdentifiers

public struct EncryptView: View {
    @ObservedObject var vm: CryptoViewModel
    @State private var isShowingFilePicker = false
    @State private var isShowingExporter = false

    public init(vm: CryptoViewModel) {
        self.vm = vm
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // 1. File Selection Card
                VStack(alignment: .leading, spacing: 12) {
                    Label("Chọn tệp cần bảo vệ", systemImage: "folder.badge.plus")
                        .font(.headline)

                    if let data = vm.selectedFileData {
                        HStack(spacing: 12) {
                            Image(systemName: "doc.fill")
                                .font(.system(size: 28))
                                .foregroundColor(.cyan)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(vm.selectedFileName)
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .lineLimit(1)

                                Text("\(formatBytes(data.count)) • \(vm.selectedFileMime)")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            Button {
                                vm.clearFile()
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.red)
                                    .font(.title3)
                            }
                        }
                        .padding(12)
                        .background(Color.cyan.opacity(0.1))
                        .cornerRadius(10)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color.cyan.opacity(0.3), lineWidth: 1)
                        )
                    } else {
                        Button {
                            isShowingFilePicker = true
                        } label: {
                            VStack(spacing: 8) {
                                Image(systemName: "arrow.down.doc.fill")
                                    .font(.system(size: 32))
                                    .foregroundColor(.cyan)
                                Text("Nhấn để chọn tệp từ ứng dụng Tệp (Files)")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Text("Hỗ trợ mọi định dạng: Văn bản, Hình ảnh, Video, Nhị phân")
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

                // 2. Algorithm & Password Configuration
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Thuật toán mã hóa:")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Picker("Thuật toán", selection: $vm.selectedAlgorithm) {
                            ForEach(CryptoEngine.Algorithm.allCases) { alg in
                                Text(alg.name).tag(alg)
                            }
                        }
                        .pickerStyle(.menu)
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(UIColor.secondarySystemBackground))
                        .cornerRadius(10)

                        Text(vm.selectedAlgorithm.shortDescription)
                            .font(.caption2)
                            .foregroundColor(.cyan)
                    }

                    // Password
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Mật khẩu mã hóa:")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        HStack {
                            if vm.isPasswordVisible {
                                TextField("Nhập mật khẩu an toàn...", text: $vm.password)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            } else {
                                SecureField("Nhập mật khẩu an toàn...", text: $vm.password)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            }

                            Button {
                                vm.isPasswordVisible.toggle()
                            } label: {
                                Image(systemName: vm.isPasswordVisible ? "eye.slash.fill" : "eye.fill")
                                    .foregroundColor(.secondary)
                            }

                            Button {
                                vm.generateRandomPassword()
                            } label: {
                                Image(systemName: "dice.fill")
                                    .foregroundColor(.purple)
                            }
                        }
                        .padding(12)
                        .background(Color(UIColor.secondarySystemBackground))
                        .cornerRadius(10)

                        // Strength indicator
                        let strength = vm.passwordStrength
                        HStack(spacing: 8) {
                            ProgressView(value: Double(strength.score), total: 100.0)
                                .accentColor(strength.color)
                            Text(strength.label)
                                .font(.caption2)
                                .foregroundColor(strength.color)
                        }
                    }

                    // Encrypt Action Button
                    Button {
                        vm.runEncrypt()
                    } label: {
                        HStack {
                            if vm.isProcessing {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Image(systemName: "lock.fill")
                            }
                            Text(vm.isProcessing ? "Đang mã hóa..." : "Bắt đầu mã hóa tệp")
                                .fontWeight(.bold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(14)
                        .background(
                            LinearGradient(colors: [.cyan, .blue], startPoint: .leading, endPoint: .trailing)
                        )
                        .foregroundColor(.black)
                        .cornerRadius(12)
                        .shadow(color: .cyan.opacity(0.4), radius: 6, y: 3)
                    }
                    .disabled(vm.isProcessing || vm.selectedFileData == nil)
                    .opacity(vm.selectedFileData == nil ? 0.6 : 1.0)
                }
                .padding()
                .background(Color(UIColor.systemBackground))
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.15), radius: 6, y: 3)

                // 3. Progress Box
                if vm.isProcessing {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(vm.progressMessage)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("\(Int(vm.progressValue * 100))%")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(.cyan)
                        }
                        ProgressView(value: vm.progressValue, total: 1.0)
                            .accentColor(.cyan)
                    }
                    .padding()
                    .background(Color(UIColor.systemBackground))
                    .cornerRadius(12)
                }

                // 4. Result Card
                if vm.isCompleted, let outURL = vm.outputURL {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.title)
                                .foregroundColor(.green)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Mã hóa thành công!")
                                    .font(.headline)
                                Text(vm.completionMessage)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }

                        ShareLink(item: outURL) {
                            HStack {
                                Image(systemName: "square.and.arrow.up.fill")
                                Text("Chia sẻ / Lưu tệp .fcq (AirDrop, Files)")
                                    .fontWeight(.bold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(12)
                            .background(Color.green)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                        }
                    }
                    .padding()
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.green.opacity(0.3), lineWidth: 1)
                    )
                }

                // 5. File Preview View
                FilePreviewView(
                    data: vm.outputData ?? vm.selectedFileData,
                    filename: vm.outputFileName.isEmpty ? vm.selectedFileName : vm.outputFileName,
                    mimeType: vm.selectedFileMime
                )
                .padding()
                .background(Color(UIColor.systemBackground))
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.15), radius: 6, y: 3)

                // 6. Transmission Simulator
                TransmissionView(
                    isProcessing: vm.isProcessing,
                    progress: vm.progressValue,
                    algorithmName: vm.selectedAlgorithm.name,
                    isCompleted: vm.isCompleted
                )
                .padding()
                .background(Color(UIColor.systemBackground))
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.15), radius: 6, y: 3)
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
                }
            case .failure(let err):
                print("Lỗi chọn tệp: \(err)")
            }
        }
    }

    private func formatBytes(_ bytes: Int) -> String {
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useAll]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(bytes))
    }
}
